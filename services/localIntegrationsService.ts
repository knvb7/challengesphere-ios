import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CodeforcesConnection,
  LeetCodeConnection,
} from '../types/integrations';
import { normalizeCodeforcesHandle } from './codeforcesService';
import { normalizeLeetCodeUsername } from './leetcodeService';

const keyForCodeforcesConnection = (userId: number | string | null | undefined) =>
  `integration_codeforces_user_${userId || 'device'}`;

const keyForLeetCodeConnection = (userId: number | string | null | undefined) =>
  `integration_leetcode_user_${userId || 'device'}`;

const stripStoredSnapshot = <T extends Record<string, any>>(connection: T): Omit<T, 'snapshot'> => {
  const { snapshot: _discarded, ...metadata } = connection;
  return metadata;
};

class LocalIntegrationsService {
  async getCodeforcesConnection(userId: number | string | null | undefined): Promise<CodeforcesConnection | null> {
    const raw = await AsyncStorage.getItem(keyForCodeforcesConnection(userId));
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as CodeforcesConnection & { snapshot?: unknown };
      const connection = stripStoredSnapshot(parsed) as CodeforcesConnection;
      if ('snapshot' in parsed) {
        await AsyncStorage.setItem(keyForCodeforcesConnection(userId), JSON.stringify(connection));
      }
      return connection;
    } catch {
      await this.clearCodeforcesConnection(userId);
      return null;
    }
  }

  async saveCodeforcesHandle(
    userId: number | string | null | undefined,
    handle: string,
    currentConnection?: CodeforcesConnection | null,
  ): Promise<CodeforcesConnection> {
    const normalizedHandle = normalizeCodeforcesHandle(handle);
    if (!normalizedHandle) {
      throw new Error('Enter a Codeforces handle first.');
    }

    const now = new Date().toISOString();
    const sameHandle = currentConnection?.handle.toLowerCase() === normalizedHandle.toLowerCase();
    const connection: CodeforcesConnection = {
      provider: 'CODEFORCES',
      handle: normalizedHandle,
      connectedAt: currentConnection?.connectedAt || now,
      updatedAt: now,
      handleLockedAt: sameHandle ? currentConnection?.handleLockedAt || now : now,
      lastSyncedAt: sameHandle ? currentConnection?.lastSyncedAt : undefined,
    };

    await AsyncStorage.setItem(keyForCodeforcesConnection(userId), JSON.stringify(connection));
    return connection;
  }

  async markCodeforcesSynced(
    userId: number | string | null | undefined,
    handle: string,
    syncedAt: string,
    currentConnection?: CodeforcesConnection | null,
  ): Promise<CodeforcesConnection> {
    const normalizedHandle = normalizeCodeforcesHandle(handle);
    if (!normalizedHandle) {
      throw new Error('Enter a Codeforces handle first.');
    }

    const now = new Date().toISOString();
    const connection: CodeforcesConnection = {
      provider: 'CODEFORCES',
      handle: normalizedHandle,
      connectedAt: currentConnection?.connectedAt || now,
      updatedAt: now,
      handleLockedAt: currentConnection?.handleLockedAt || now,
      lastSyncedAt: syncedAt,
    };

    await AsyncStorage.setItem(keyForCodeforcesConnection(userId), JSON.stringify(connection));
    return connection;
  }

  async clearCodeforcesConnection(userId: number | string | null | undefined): Promise<void> {
    await AsyncStorage.removeItem(keyForCodeforcesConnection(userId));
  }

  async getLeetCodeConnection(userId: number | string | null | undefined): Promise<LeetCodeConnection | null> {
    const raw = await AsyncStorage.getItem(keyForLeetCodeConnection(userId));
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as LeetCodeConnection & { snapshot?: unknown };
      const connection = stripStoredSnapshot(parsed) as LeetCodeConnection;
      if ('snapshot' in parsed) {
        await AsyncStorage.setItem(keyForLeetCodeConnection(userId), JSON.stringify(connection));
      }
      return connection;
    } catch {
      await this.clearLeetCodeConnection(userId);
      return null;
    }
  }

  async saveLeetCodeUsername(
    userId: number | string | null | undefined,
    username: string,
    currentConnection?: LeetCodeConnection | null,
  ): Promise<LeetCodeConnection> {
    const normalizedUsername = normalizeLeetCodeUsername(username);
    if (!normalizedUsername) {
      throw new Error('Enter a LeetCode username first.');
    }

    const now = new Date().toISOString();
    const sameUsername = currentConnection?.username.toLowerCase() === normalizedUsername.toLowerCase();
    const connection: LeetCodeConnection = {
      provider: 'LEETCODE',
      username: normalizedUsername,
      connectedAt: currentConnection?.connectedAt || now,
      updatedAt: now,
      usernameLockedAt: sameUsername ? currentConnection?.usernameLockedAt || now : now,
      lastSyncedAt: sameUsername ? currentConnection?.lastSyncedAt : undefined,
    };

    await AsyncStorage.setItem(keyForLeetCodeConnection(userId), JSON.stringify(connection));
    return connection;
  }

  async markLeetCodeSynced(
    userId: number | string | null | undefined,
    username: string,
    syncedAt: string,
    currentConnection?: LeetCodeConnection | null,
  ): Promise<LeetCodeConnection> {
    const normalizedUsername = normalizeLeetCodeUsername(username);
    if (!normalizedUsername) {
      throw new Error('Enter a LeetCode username first.');
    }

    const now = new Date().toISOString();
    const connection: LeetCodeConnection = {
      provider: 'LEETCODE',
      username: normalizedUsername,
      connectedAt: currentConnection?.connectedAt || now,
      updatedAt: now,
      usernameLockedAt: currentConnection?.usernameLockedAt || now,
      lastSyncedAt: syncedAt,
    };

    await AsyncStorage.setItem(keyForLeetCodeConnection(userId), JSON.stringify(connection));
    return connection;
  }

  async clearLeetCodeConnection(userId: number | string | null | undefined): Promise<void> {
    await AsyncStorage.removeItem(keyForLeetCodeConnection(userId));
  }
}

export const localIntegrationsService = new LocalIntegrationsService();
