import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { notificationKeys } from '../hooks/useNotifications';
import { queryClient } from '../providers/QueryProvider';
import { getDeviceTimeZone } from '../utils/deviceTime';
import { notificationService } from './notificationService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DEFAULT_ANDROID_CHANNEL_ID = 'default';
const PUSH_NOTIFICATIONS_BIT = 1;
const PUSH_TOKEN_STORAGE_KEY = 'expo_push_token_registration';
const MAX_HANDLED_NOTIFICATION_RESPONSES = 100;
const PUSH_TOKEN_SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'com.challengesphere.app.push-notifications',
};

interface RegisteredPushToken {
  expoPushToken: string;
  userId: number;
}

interface PushRegistrationInFlight {
  userId: number;
  promise: Promise<RegisteredPushToken | null>;
}

type NotificationRoutingState = 'WAITING_FOR_AUTH' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

const getProjectId = (): string | undefined =>
  Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;

let registeredPushToken: RegisteredPushToken | null = null;
let pushRegistrationGeneration = 0;
let registrationInFlight: PushRegistrationInFlight | null = null;
let disableInFlight: Promise<void> | null = null;

let notificationRoutingState: NotificationRoutingState = 'WAITING_FOR_AUTH';
let notificationRoutingUserId = 0;
const pendingNotificationResponses = new Map<string, Notifications.NotificationResponse>();
const handledNotificationResponseKeys = new Set<string>();
const handledNotificationResponseOrder: string[] = [];

export const isPushNotificationsOptedIn = (
  notificationsMask?: number | null,
  pushNotificationsEnabled?: boolean | null,
): boolean => {
  const legacyPushEnabled = notificationsMask == null
    || (notificationsMask & PUSH_NOTIFICATIONS_BIT) === PUSH_NOTIFICATIONS_BIT;
  return legacyPushEnabled && pushNotificationsEnabled !== false;
};

const isValidExpoPushToken = (value: unknown): value is string =>
  typeof value === 'string'
  && (value.startsWith('ExpoPushToken[') || value.startsWith('ExponentPushToken['));

const readPersistedPushToken = async (): Promise<RegisteredPushToken | null> => {
  if (Platform.OS === 'web') {
    return null;
  }

  const storedValue = await SecureStore.getItemAsync(
    PUSH_TOKEN_STORAGE_KEY,
    PUSH_TOKEN_SECURE_STORE_OPTIONS,
  );
  if (!storedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<RegisteredPushToken>;
    if (isValidExpoPushToken(parsed.expoPushToken)) {
      return {
        expoPushToken: parsed.expoPushToken,
        userId: Number.isInteger(parsed.userId) && Number(parsed.userId) > 0
          ? Number(parsed.userId)
          : 0,
      };
    }
  } catch {
    if (isValidExpoPushToken(storedValue)) {
      return { expoPushToken: storedValue, userId: 0 };
    }
  }

  return null;
};

const persistPushToken = (registration: RegisteredPushToken): Promise<void> =>
  SecureStore.setItemAsync(
    PUSH_TOKEN_STORAGE_KEY,
    JSON.stringify(registration),
    PUSH_TOKEN_SECURE_STORE_OPTIONS,
  );

const clearPersistedPushToken = (): Promise<void> =>
  SecureStore.deleteItemAsync(PUSH_TOKEN_STORAGE_KEY, PUSH_TOKEN_SECURE_STORE_OPTIONS);

const ensureDefaultAndroidChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(DEFAULT_ANDROID_CHANNEL_ID, {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
  });
};

const routeFromNotificationData = (data: Record<string, unknown>) => {
  const type = String(data.type ?? '').toUpperCase();
  const submissionId = data.submissionId ? String(data.submissionId) : '';
  const challengeId = data.challengeId ? String(data.challengeId) : '';
  const notificationId = data.notificationId ? String(data.notificationId) : '';
  const commentId = data.commentId ? String(data.commentId) : '';
  const actorUserId = data.actorUserId ? String(data.actorUserId) : '';
  const actorUsername = data.actorUsername ? String(data.actorUsername).replace(/^@/, '') : '';

  if (type === 'CHALLENGE_CREATION_PROMPT') {
    router.push('/(tabs)/create');
    return;
  }

  if (type === 'DAILY_UPLOAD_REMINDER') {
    if (challengeId) {
      router.push({
        pathname: '/(tabs)/challenges',
        params: {
          uploadChallengeId: challengeId,
        },
      });
    } else {
      router.push('/(tabs)/challenges');
    }
    return;
  }

  if ((type === 'COMMENT' || type === 'GLORY' || type === 'SUBMISSION') && submissionId) {
    router.push({
      pathname: '/photo-details',
      params: {
        submissionId,
        challengeId,
        ...(type === 'COMMENT'
          ? { commentId, openComments: '1' }
          : {}),
      },
    });
    return;
  }

  if (type === 'CHALLENGE_INVITE') {
    if (notificationId) {
      router.push({
        pathname: '/challenge-invite-details',
        params: { notificationId },
      });
    } else {
      router.push('/notifications');
    }
    return;
  }

  if (type === 'MOMENTUM_MILESTONE' && challengeId) {
    router.push({
      pathname: '/(tabs)/challenges',
      params: {
        openChallengeId: challengeId,
        notificationRouteNonce: notificationId,
      },
    });
    return;
  }

  if (type === 'CHALLENGE_UPDATE' && challengeId) {
    router.push({
      pathname: '/(tabs)/challenges',
      params: {
        focusChallengeId: challengeId,
      },
    });
    return;
  }

  if (type === 'FOLLOW' && actorUserId) {
    router.push({
      pathname: '/user-profile',
      params: {
        id: actorUserId,
        username: actorUsername,
      },
    });
    return;
  }

  router.push('/notifications');
};

const getNotificationResponseKey = (response: Notifications.NotificationResponse): string => {
  const requestIdentifier = response.notification.request.identifier;
  return `${requestIdentifier}:${response.actionIdentifier}`;
};

const rememberHandledNotificationResponse = (responseKey: string) => {
  handledNotificationResponseKeys.add(responseKey);
  handledNotificationResponseOrder.push(responseKey);
  if (handledNotificationResponseOrder.length > MAX_HANDLED_NOTIFICATION_RESPONSES) {
    const oldestKey = handledNotificationResponseOrder.shift();
    if (oldestKey) {
      handledNotificationResponseKeys.delete(oldestKey);
    }
  }
};

const clearLastNotificationResponseIfHandled = (response: Notifications.NotificationResponse) => {
  try {
    const lastResponse = Notifications.getLastNotificationResponse();
    if (
      lastResponse?.notification.request.identifier
      === response.notification.request.identifier
    ) {
      Notifications.clearLastNotificationResponse();
    }
  } catch {
    // Some development runtimes do not expose last-response state.
  }
};

const markNotificationReadFromResponse = (data: Record<string, unknown>) => {
  const type = String(data.type ?? '').toUpperCase();
  const notificationId = Number(data.notificationId);
  if (
    notificationRoutingUserId <= 0
    || !Number.isInteger(notificationId)
    || notificationId <= 0
    || type === 'CHALLENGE_INVITE'
  ) {
    return;
  }

  void notificationService
    .markAsRead(notificationRoutingUserId, notificationId)
    .catch(() => undefined)
    .finally(() => queryClient.invalidateQueries({ queryKey: notificationKeys.all }));
};

const routeNotificationResponse = (responseKey: string, response: Notifications.NotificationResponse) => {
  const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
  routeFromNotificationData(data);
  pendingNotificationResponses.delete(responseKey);
  rememberHandledNotificationResponse(responseKey);
  markNotificationReadFromResponse(data);
  clearLastNotificationResponseIfHandled(response);
};

const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
  queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  const responseKey = getNotificationResponseKey(response);
  if (
    handledNotificationResponseKeys.has(responseKey)
    || pendingNotificationResponses.has(responseKey)
  ) {
    return;
  }

  if (notificationRoutingState === 'UNAUTHENTICATED') {
    rememberHandledNotificationResponse(responseKey);
    clearLastNotificationResponseIfHandled(response);
    return;
  }

  if (notificationRoutingState !== 'AUTHENTICATED') {
    pendingNotificationResponses.set(responseKey, response);
    return;
  }

  routeNotificationResponse(responseKey, response);
};

export const setPushNotificationRoutingReady = (ready: boolean, userId = 0) => {
  const authenticated = ready && userId > 0;
  notificationRoutingState = authenticated ? 'AUTHENTICATED' : 'WAITING_FOR_AUTH';
  notificationRoutingUserId = authenticated ? userId : 0;
  if (!authenticated || pendingNotificationResponses.size === 0) {
    return;
  }

  for (const [responseKey, response] of [...pendingNotificationResponses.entries()]) {
    if (!handledNotificationResponseKeys.has(responseKey)) {
      routeNotificationResponse(responseKey, response);
    }
  }
};

export const clearPendingPushNotificationResponses = () => {
  notificationRoutingState = 'UNAUTHENTICATED';
  notificationRoutingUserId = 0;
  for (const [responseKey, response] of pendingNotificationResponses.entries()) {
    rememberHandledNotificationResponse(responseKey);
    clearLastNotificationResponseIfHandled(response);
  }
  pendingNotificationResponses.clear();
};

const performPushRegistration = async (
  userId: number,
  registrationGeneration: number,
): Promise<RegisteredPushToken | null> => {
  await ensureDefaultAndroidChannel();

  const projectId = getProjectId();
  if (!projectId) {
    return null;
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermissions.status;
  if (finalStatus !== 'granted') {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const registration = {
    expoPushToken: tokenResponse.data,
    userId,
  };
  await notificationService.registerPushToken({
    expoPushToken: registration.expoPushToken,
    platform: Platform.OS,
    timezone: getDeviceTimeZone(),
  });
  registeredPushToken = registration;

  if (registrationGeneration !== pushRegistrationGeneration) {
    return registration;
  }

  await persistPushToken(registration);
  return registration;
};

export const registerForPushNotifications = async (userId: number): Promise<string | null> => {
  if (Platform.OS === 'web' || !Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  if (disableInFlight) {
    await disableInFlight;
  }

  if (registrationInFlight) {
    const activeRegistration = registrationInFlight;
    const existingResult = await activeRegistration.promise;
    if (activeRegistration.userId === userId) {
      return existingResult?.expoPushToken ?? null;
    }
  }

  const registrationGeneration = pushRegistrationGeneration;
  const operation = performPushRegistration(userId, registrationGeneration);
  const activeRegistration = { userId, promise: operation };
  registrationInFlight = activeRegistration;

  try {
    const result = await operation;
    return result?.expoPushToken ?? null;
  } finally {
    if (registrationInFlight === activeRegistration) {
      registrationInFlight = null;
    }
  }
};

export const disableRegisteredPushToken = async (userId = 0): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }
  if (disableInFlight) {
    return disableInFlight;
  }

  pushRegistrationGeneration += 1;
  const activeRegistration = registrationInFlight?.promise ?? null;
  const operation = (async () => {
    const inFlightRegistration = activeRegistration
      ? await activeRegistration.catch(() => null)
      : null;
    const persistedRegistration = await readPersistedPushToken();
    const candidates = new Map<string, RegisteredPushToken>();

    for (const registration of [registeredPushToken, inFlightRegistration, persistedRegistration]) {
      if (!registration) {
        continue;
      }
      if (userId > 0 && registration.userId > 0 && registration.userId !== userId) {
        continue;
      }
      candidates.set(registration.expoPushToken, registration);
    }

    let firstError: unknown = null;
    const disabledTokens = new Set<string>();
    const failedRegistrations: RegisteredPushToken[] = [];
    for (const registration of candidates.values()) {
      try {
        await notificationService.disablePushToken(registration.expoPushToken);
        disabledTokens.add(registration.expoPushToken);
      } catch (error) {
        firstError ??= error;
        failedRegistrations.push(registration);
      }
    }

    if (registeredPushToken && disabledTokens.has(registeredPushToken.expoPushToken)) {
      registeredPushToken = null;
    }
    if (
      persistedRegistration
      && disabledTokens.has(persistedRegistration.expoPushToken)
    ) {
      await clearPersistedPushToken();
    }
    if (failedRegistrations.length > 0) {
      const registrationToRetry = failedRegistrations[failedRegistrations.length - 1];
      registeredPushToken = registrationToRetry;
      await persistPushToken(registrationToRetry);
    }
    if (firstError) {
      throw firstError;
    }
  })();
  disableInFlight = operation;

  try {
    await operation;
  } finally {
    if (disableInFlight === operation) {
      disableInFlight = null;
    }
  }
};

export const setupPushNotificationResponseListener = () => {
  const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  });
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    handleNotificationResponse,
  );

  try {
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      handleNotificationResponse(lastResponse);
    }
  } catch {
    // Some development runtimes do not expose last-response state.
  }

  return {
    remove: () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    },
  };
};
