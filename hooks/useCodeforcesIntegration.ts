import { useCallback, useEffect, useMemo, useState } from 'react';
import { syncCodeforcesProfile } from '../services/codeforcesService';
import { localIntegrationsService } from '../services/localIntegrationsService';
import { CodeforcesConnection, CodeforcesProfileSnapshot } from '../types/integrations';
import { getApiErrorMessage } from '../utils/apiError';
import { formatIntegrationUnlockDate, isIntegrationLockedUntil } from '../utils/integrationLocks';

export const useCodeforcesIntegration = (
  userId: number | string | null | undefined,
  enabled = true,
) => {
  const [connection, setConnection] = useState<CodeforcesConnection | null>(null);
  const [draftHandle, setDraftHandle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<CodeforcesProfileSnapshot | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!enabled) {
      setConnection(null);
      setDraftHandle('');
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
        const storedConnection = await localIntegrationsService.getCodeforcesConnection(userId);
        if (!mounted) return;
        setConnection(storedConnection);
        setDraftHandle(storedConnection?.handle || '');
        setLatestSnapshot(null);
      } catch (loadError) {
        if (mounted) {
          setError(getApiErrorMessage(loadError, 'Could not load your saved Codeforces connection.'));
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

  const saveHandle = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const nextHandle = draftHandle.trim().replace(/^@+/, '');
      const currentHandle = connection?.handle || '';
      const isChangingLockedHandle = Boolean(
        connection?.handleLockedAt &&
        currentHandle &&
        nextHandle &&
        nextHandle.toLowerCase() !== currentHandle.toLowerCase() &&
        isIntegrationLockedUntil(connection.handleLockedAt)
      );

      if (isChangingLockedHandle) {
        throw new Error(`You can change this handle after ${formatIntegrationUnlockDate(connection?.handleLockedAt)}.`);
      }

      const savedConnection = await localIntegrationsService.saveCodeforcesHandle(
        userId,
        draftHandle,
        connection,
      );
      setConnection(savedConnection);
      setDraftHandle(savedConnection.handle);
      return savedConnection;
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, 'Could not save this Codeforces handle.'));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, [connection, draftHandle, userId]);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const handleToSync = draftHandle || connection?.handle || '';
      const snapshot = await syncCodeforcesProfile(handleToSync);
      setLatestSnapshot(snapshot);
      const savedConnection = await localIntegrationsService.markCodeforcesSynced(
        userId,
        snapshot.handle,
        snapshot.syncedAt,
        connection,
      );
      setConnection(savedConnection);
      setDraftHandle(savedConnection.handle);
      return savedConnection;
    } catch (syncError) {
      setError(getApiErrorMessage(syncError, 'Could not sync Codeforces right now.'));
      throw syncError;
    } finally {
      setIsSyncing(false);
    }
  }, [connection, draftHandle, userId]);

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      await localIntegrationsService.clearCodeforcesConnection(userId);
      setConnection(null);
      setDraftHandle('');
      setLatestSnapshot(null);
    } catch (disconnectError) {
      setError(getApiErrorMessage(disconnectError, 'Could not disconnect Codeforces.'));
      throw disconnectError;
    }
  }, [userId]);

  return useMemo(() => ({
    connection,
    latestSnapshot,
    draftHandle,
    setDraftHandle,
    isConnected: Boolean(connection?.handle),
    isHandleLocked: isIntegrationLockedUntil(connection?.handleLockedAt),
    unlocksAtLabel: formatIntegrationUnlockDate(connection?.handleLockedAt),
    isLoading,
    isSaving,
    isSyncing,
    error,
    saveHandle,
    sync,
    disconnect,
  }), [
    connection,
    latestSnapshot,
    draftHandle,
    isLoading,
    isSaving,
    isSyncing,
    error,
    saveHandle,
    sync,
    disconnect,
  ]);
};
