import AsyncStorage from '@react-native-async-storage/async-storage';

import { NotificationItem } from '../types/api';

const STORAGE_VERSION = 2;
const LEGACY_STORAGE_VERSIONS = [1] as const;
const MAX_SAVED_ITEMS = 200;
const MAX_REMEMBERED_IDS = 500;
const PRIVATE_INVITE_MESSAGE = 'You received a private challenge invitation';

export interface NotificationInboxState {
  savedItems: NotificationItem[];
  dismissedActivityIds: number[];
  removedSavedIds: number[];
}

interface StoredNotificationInboxState extends NotificationInboxState {
  version: number;
}

const pendingUpdates = new Map<number, Promise<NotificationInboxState>>();

const storageKey = (userId: number, version = STORAGE_VERSION) => (
  `notification-inbox-state:v${version}:${userId}`
);

const purgeLegacyStates = async (): Promise<void> => {
  const legacyPrefixes = LEGACY_STORAGE_VERSIONS.map(
    (version) => `notification-inbox-state:v${version}:`,
  );
  const legacyKeys = (await AsyncStorage.getAllKeys()).filter((key) => (
    legacyPrefixes.some((prefix) => key.startsWith(prefix))
  ));
  if (legacyKeys.length > 0) {
    await AsyncStorage.multiRemove(legacyKeys);
  }
};

const emptyState = (): StoredNotificationInboxState => ({
  version: STORAGE_VERSION,
  savedItems: [],
  dismissedActivityIds: [],
  removedSavedIds: [],
});

const isSavedType = (type?: string): boolean => {
  const normalizedType = type?.toLowerCase();
  return normalizedType === 'challenge_invite'
    || normalizedType === 'invite'
    || normalizedType === 'follow';
};

export const sanitizeNotificationInboxItem = (item: NotificationItem): NotificationItem => {
  const isOpaquePrivateInvite = item.type?.toLowerCase() === 'challenge_invite'
    && item.message?.trim().toLowerCase() === PRIVATE_INVITE_MESSAGE.toLowerCase();

  if (!isOpaquePrivateInvite) return item;

  return {
    ...item,
    message: PRIVATE_INVITE_MESSAGE,
    actionObject: '{}',
    data: undefined,
  };
};

const validIds = (value: unknown): number[] => (
  Array.isArray(value)
    ? value.filter((id): id is number => Number.isInteger(id) && id > 0).slice(-MAX_REMEMBERED_IDS)
    : []
);

const validSavedItems = (value: unknown): NotificationItem[] => (
  Array.isArray(value)
    ? value.filter((item): item is NotificationItem => (
        Boolean(item)
        && typeof item === 'object'
        && Number.isInteger((item as NotificationItem).id)
        && typeof (item as NotificationItem).type === 'string'
        && isSavedType((item as NotificationItem).type)
      )).map(sanitizeNotificationInboxItem).slice(0, MAX_SAVED_ITEMS)
    : []
);

const loadState = async (userId: number): Promise<StoredNotificationInboxState> => {
  if (userId <= 0) return emptyState();

  try {
    await purgeLegacyStates();
    const stored = await AsyncStorage.getItem(storageKey(userId));
    if (!stored) return emptyState();

    const parsed = JSON.parse(stored) as Partial<StoredNotificationInboxState>;
    return {
      version: STORAGE_VERSION,
      savedItems: validSavedItems(parsed.savedItems),
      dismissedActivityIds: validIds(parsed.dismissedActivityIds),
      removedSavedIds: validIds(parsed.removedSavedIds),
    };
  } catch {
    return emptyState();
  }
};

const saveState = async (userId: number, state: StoredNotificationInboxState): Promise<void> => {
  if (userId <= 0) return;
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(state));
};

const publicState = (state: StoredNotificationInboxState): NotificationInboxState => ({
  savedItems: state.savedItems,
  dismissedActivityIds: state.dismissedActivityIds,
  removedSavedIds: state.removedSavedIds,
});

const updateState = (
  userId: number,
  updater: (state: StoredNotificationInboxState) => StoredNotificationInboxState,
): Promise<NotificationInboxState> => {
  const previousUpdate = pendingUpdates.get(userId) ?? Promise.resolve(publicState(emptyState()));
  const nextUpdate = previousUpdate
    .catch(() => publicState(emptyState()))
    .then(async () => {
      const current = await loadState(userId);
      const next = updater(current);
      await saveState(userId, next);
      return publicState(next);
    });

  pendingUpdates.set(userId, nextUpdate);
  const clearPendingUpdate = () => {
    if (pendingUpdates.get(userId) === nextUpdate) {
      pendingUpdates.delete(userId);
    }
  };
  void nextUpdate.then(clearPendingUpdate, clearPendingUpdate);
  return nextUpdate;
};

const notificationTime = (item: NotificationItem): number => {
  if (typeof item.sentAtEpochMs === 'number' && Number.isFinite(item.sentAtEpochMs)) {
    return item.sentAtEpochMs;
  }
  const timestamp = new Date(item.sentAt ?? item.createdAt ?? 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const notificationInboxStateService = {
  sync(userId: number, incomingNotifications: NotificationItem[]): Promise<NotificationInboxState> {
    return updateState(userId, (current) => {
      const removedIds = new Set(current.removedSavedIds);
      const itemsById = new Map<number, NotificationItem>();

      current.savedItems.forEach((item) => {
        if (!removedIds.has(item.id)) itemsById.set(item.id, item);
      });
      incomingNotifications.forEach((item) => {
        if (isSavedType(item.type) && !removedIds.has(item.id)) {
          itemsById.set(item.id, sanitizeNotificationInboxItem(item));
        }
      });

      return {
        ...current,
        savedItems: [...itemsById.values()]
          .sort((first, second) => notificationTime(second) - notificationTime(first))
          .slice(0, MAX_SAVED_ITEMS),
      };
    });
  },

  dismissActivity(userId: number, notificationIds: number[]): Promise<NotificationInboxState> {
    return updateState(userId, (current) => ({
      ...current,
      dismissedActivityIds: [...new Set([
        ...current.dismissedActivityIds,
        ...notificationIds.filter((id) => Number.isInteger(id) && id > 0),
      ])].slice(-MAX_REMEMBERED_IDS),
    }));
  },

  removeSaved(userId: number, notificationId: number): Promise<NotificationInboxState> {
    return updateState(userId, (current) => ({
      ...current,
      savedItems: current.savedItems.filter((item) => item.id !== notificationId),
      removedSavedIds: [...new Set([...current.removedSavedIds, notificationId])]
        .slice(-MAX_REMEMBERED_IDS),
    }));
  },
};

export default notificationInboxStateService;
