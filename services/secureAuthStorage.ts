import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { UserProfileResponse } from '../types/api';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_SNAPSHOT_KEY = 'auth_user_snapshot_v1';
const APPLE_USER_IDENTIFIER_KEY = 'apple_user_identifier';
const LEGACY_USER_DATA_KEY = 'user_data';
const TOKEN_KEYS = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY] as const;
const MAX_USER_SNAPSHOT_BYTES = 1900;
const MAX_SNAPSHOT_PROFILE_URL_LENGTH = 1000;

type TokenKey = (typeof TOKEN_KEYS)[number];

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'com.challengesphere.app.auth',
};

const webMemory = new Map<
  TokenKey | typeof USER_SNAPSHOT_KEY | typeof APPLE_USER_IDENTIFIER_KEY,
  string
>();
let migrationPromise: Promise<void> | null = null;

const migrateLegacyPlaintextData = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.multiRemove([...TOKEN_KEYS, LEGACY_USER_DATA_KEY]);
    return;
  }

  for (const key of TOKEN_KEYS) {
    try {
      const secureValue = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
      if (!secureValue) {
        const legacyValue = await AsyncStorage.getItem(key);
        if (legacyValue) {
          await SecureStore.setItemAsync(key, legacyValue, SECURE_STORE_OPTIONS);
        }
      }
      await AsyncStorage.removeItem(key);
    } catch (error) {
      // A failed migration must log the user out rather than leave a reusable plaintext token.
      await AsyncStorage.removeItem(key);
      throw error;
    }
  }

  await AsyncStorage.removeItem(LEGACY_USER_DATA_KEY);
};

const ensureMigrated = (): Promise<void> => {
  migrationPromise ??= migrateLegacyPlaintextData();
  return migrationPromise;
};

const getToken = async (key: TokenKey): Promise<string | null> => {
  await ensureMigrated();
  if (Platform.OS === 'web') {
    return webMemory.get(key) ?? null;
  }
  return SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
};

const setToken = async (key: TokenKey, value: string): Promise<void> => {
  if (!value) {
    throw new Error('Auth token must not be empty');
  }
  await ensureMigrated();
  if (Platform.OS === 'web') {
    webMemory.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
  await AsyncStorage.removeItem(key);
};

export const getAccessToken = () => getToken(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => getToken(REFRESH_TOKEN_KEY);
export const setAccessToken = (token: string) => setToken(ACCESS_TOKEN_KEY, token);
export const setRefreshToken = (token: string) => setToken(REFRESH_TOKEN_KEY, token);

export const getAppleUserIdentifier = async (): Promise<string | null> => {
  await ensureMigrated();
  if (Platform.OS === 'web') {
    return webMemory.get(APPLE_USER_IDENTIFIER_KEY) ?? null;
  }
  return SecureStore.getItemAsync(APPLE_USER_IDENTIFIER_KEY, SECURE_STORE_OPTIONS);
};

export const setAppleUserIdentifier = async (identifier: string): Promise<void> => {
  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier) {
    throw new Error('Apple user identifier must not be empty');
  }

  await ensureMigrated();
  if (Platform.OS === 'web') {
    webMemory.set(APPLE_USER_IDENTIFIER_KEY, normalizedIdentifier);
    return;
  }
  await SecureStore.setItemAsync(
    APPLE_USER_IDENTIFIER_KEY,
    normalizedIdentifier,
    SECURE_STORE_OPTIONS,
  );
};

const isStoredUser = (value: unknown): value is UserProfileResponse => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<UserProfileResponse>;
  return typeof candidate.id === 'number'
    && Number.isInteger(candidate.id)
    && candidate.id > 0
    && typeof candidate.username === 'string'
    && candidate.username.trim().length > 0;
};

const utf8ByteLength = (value: string): number => {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);
    if (codePoint <= 0x7f) {
      bytes += 1;
    } else if (codePoint <= 0x7ff) {
      bytes += 2;
    } else if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
      bytes += 4;
      index += 1;
    } else {
      bytes += 3;
    }
  }
  return bytes;
};

const createUserSnapshot = (user: UserProfileResponse): UserProfileResponse => {
  const profilePicUrl = typeof user.profilePicUrl === 'string'
    && user.profilePicUrl.length <= MAX_SNAPSHOT_PROFILE_URL_LENGTH
    ? user.profilePicUrl
    : null;
  const firstName = typeof user.firstName === 'string'
    ? user.firstName.slice(0, 100)
    : null;

  return {
    id: user.id,
    username: user.username,
    createdAt: '',
    active: user.active !== false,
    challengesCreated: user.challengesCreated ?? 0,
    challengesAccepted: user.challengesAccepted ?? 0,
    followers: user.followers ?? 0,
    following: user.following ?? 0,
    profilePicUrl,
    premiumUser: user.premiumUser ?? 0,
    notifications: user.notifications,
    bio: null,
    firstName,
    profileComplete: user.profileComplete,
  };
};

const serializeUserSnapshot = (user: UserProfileResponse): string => {
  const snapshot = createUserSnapshot(user);
  let serializedUser = JSON.stringify(snapshot);
  if (utf8ByteLength(serializedUser) <= MAX_USER_SNAPSHOT_BYTES) {
    return serializedUser;
  }

  // Signed image URLs account for most oversized profiles and are not needed
  // to establish an offline session. The avatar's disk cache remains separate.
  snapshot.profilePicUrl = null;
  snapshot.firstName = null;
  serializedUser = JSON.stringify(snapshot);
  if (utf8ByteLength(serializedUser) > MAX_USER_SNAPSHOT_BYTES) {
    throw new Error('Auth user snapshot exceeds secure storage limit');
  }
  return serializedUser;
};

export const getUserSnapshot = async (): Promise<UserProfileResponse | null> => {
  await ensureMigrated();
  const rawValue = Platform.OS === 'web'
    ? webMemory.get(USER_SNAPSHOT_KEY) ?? null
    : await SecureStore.getItemAsync(USER_SNAPSHOT_KEY, SECURE_STORE_OPTIONS);

  if (!rawValue) return null;

  try {
    const user = JSON.parse(rawValue) as unknown;
    if (isStoredUser(user)) return user;
  } catch {
    // Invalid snapshots are removed below and must never establish a session.
  }

  if (Platform.OS === 'web') {
    webMemory.delete(USER_SNAPSHOT_KEY);
  } else {
    await SecureStore.deleteItemAsync(USER_SNAPSHOT_KEY, SECURE_STORE_OPTIONS);
  }
  return null;
};

export const setUserSnapshot = async (user: UserProfileResponse): Promise<void> => {
  if (!isStoredUser(user)) {
    throw new Error('Auth user snapshot is invalid');
  }

  await ensureMigrated();
  const serializedUser = serializeUserSnapshot(user);
  if (Platform.OS === 'web') {
    webMemory.set(USER_SNAPSHOT_KEY, serializedUser);
    return;
  }
  await SecureStore.setItemAsync(USER_SNAPSHOT_KEY, serializedUser, SECURE_STORE_OPTIONS);
};

export const clearAuthStorage = async (): Promise<void> => {
  webMemory.clear();
  migrationPromise = null;
  if (Platform.OS === 'web') {
    await AsyncStorage.multiRemove([...TOKEN_KEYS, LEGACY_USER_DATA_KEY]);
    return;
  }
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS),
    SecureStore.deleteItemAsync(USER_SNAPSHOT_KEY, SECURE_STORE_OPTIONS),
    SecureStore.deleteItemAsync(APPLE_USER_IDENTIFIER_KEY, SECURE_STORE_OPTIONS),
    AsyncStorage.multiRemove([...TOKEN_KEYS, LEGACY_USER_DATA_KEY]),
  ]);
};
