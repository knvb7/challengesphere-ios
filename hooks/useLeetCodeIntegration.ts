import { useCallback, useEffect, useMemo, useState } from 'react';
import { syncLeetCodeProfile } from '../services/leetcodeService';
import { localIntegrationsService } from '../services/localIntegrationsService';
import { LeetCodeConnection, LeetCodeProfileSnapshot } from '../types/integrations';
import { getApiErrorMessage } from '../utils/apiError';
import { formatIntegrationUnlockDate, isIntegrationLockedUntil } from '../utils/integrationLocks';

export const useLeetCodeIntegration = (
  userId: number | string | null | undefined,
  enabled = true,
) => {
  const [connection, setConnection] = useState<LeetCodeConnection | null>(null);
  const [draftUsername, setDraftUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<LeetCodeProfileSnapshot | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!enabled) {
      setConnection(null);
      setDraftUsername('');
      setLatestSnapshot(null);
      setError(null);
      setIsLoading(false);
      return () => {
        mounted = false;
      };
    }

    async function loadConnection() {
      setIsLoading(true);
      try {
        const storedConnection = await localIntegrationsService.getLeetCodeConnection(userId);
        if (!mounted) return;
        setConnection(storedConnection);
        setDraftUsername(storedConnection?.username || '');
        setLatestSnapshot(null);
      } catch (loadError) {
        if (mounted) {
          setError(getApiErrorMessage(loadError, 'Could not load your saved LeetCode connection.'));
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadConnection();
    return () => {
      mounted = false;
    };
  }, [enabled, userId]);

  const saveUsername = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const nextUsername = draftUsername.trim().replace(/^@+/, '');
      const currentUsername = connection?.username || '';
      const isChangingLockedUsername = Boolean(
        connection?.usernameLockedAt &&
        currentUsername &&
        nextUsername &&
        nextUsername.toLowerCase() !== currentUsername.toLowerCase() &&
        isIntegrationLockedUntil(connection.usernameLockedAt)
      );

      if (isChangingLockedUsername) {
        throw new Error(`You can change this username after ${formatIntegrationUnlockDate(connection?.usernameLockedAt)}.`);
      }

      const savedConnection = await localIntegrationsService.saveLeetCodeUsername(
        userId,
        draftUsername,
        connection,
      );
      setConnection(savedConnection);
      setDraftUsername(savedConnection.username);
      return savedConnection;
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, 'Could not save this LeetCode username.'));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, [connection, draftUsername, userId]);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const usernameToSync = draftUsername || connection?.username || '';
      const snapshot = await syncLeetCodeProfile(usernameToSync);
      setLatestSnapshot(snapshot);
      const savedConnection = await localIntegrationsService.markLeetCodeSynced(
        userId,
        snapshot.username,
        snapshot.syncedAt,
        connection,
      );
      setConnection(savedConnection);
      setDraftUsername(savedConnection.username);
      return savedConnection;
    } catch (syncError) {
      setError(getApiErrorMessage(syncError, 'Could not sync LeetCode right now.'));
      throw syncError;
    } finally {
      setIsSyncing(false);
    }
  }, [connection, draftUsername, userId]);

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      await localIntegrationsService.clearLeetCodeConnection(userId);
      setConnection(null);
      setDraftUsername('');
      setLatestSnapshot(null);
    } catch (disconnectError) {
      setError(getApiErrorMessage(disconnectError, 'Could not disconnect LeetCode.'));
      throw disconnectError;
    }
  }, [userId]);

  return useMemo(() => ({
    connection,
    latestSnapshot,
    draftUsername,
    setDraftUsername,
    isConnected: Boolean(connection?.username),
    isUsernameLocked: isIntegrationLockedUntil(connection?.usernameLockedAt),
    unlocksAtLabel: formatIntegrationUnlockDate(connection?.usernameLockedAt),
    isLoading,
    isSaving,
    isSyncing,
    error,
    saveUsername,
    sync,
    disconnect,
  }), [
    connection,
    latestSnapshot,
    draftUsername,
    isLoading,
    isSaving,
    isSyncing,
    error,
    saveUsername,
    sync,
    disconnect,
  ]);
};
