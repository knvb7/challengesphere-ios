import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  connectHevy,
  disconnectHevy,
  getHevyConnection,
  syncHevy,
} from '../services/hevyService';
import { HevyConnection } from '../types/integrations';
import { getApiErrorMessage } from '../utils/apiError';

export const useHevyIntegration = (_userId: number | string | null | undefined) => {
  const [connection, setConnection] = useState<HevyConnection | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setConnection(await getHevyConnection());
    } catch (loadError) {
      setConnection(null);
      setError(getApiErrorMessage(loadError, 'Could not load your Hevy connection.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  const saveApiKey = useCallback(async () => {
    const normalizedKey = apiKey.trim();
    if (!normalizedKey) {
      throw new Error('Enter your Hevy API key first.');
    }

    setIsSaving(true);
    setError(null);
    try {
      const nextConnection = await connectHevy(normalizedKey);
      setConnection(nextConnection);
      setApiKey('');
      return nextConnection;
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, 'Could not save this Hevy API key.'));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, [apiKey]);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const nextConnection = await syncHevy();
      setConnection(nextConnection);
      return nextConnection;
    } catch (syncError) {
      setError(getApiErrorMessage(syncError, 'Could not sync Hevy workouts right now.'));
      throw syncError;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      await disconnectHevy();
      setConnection(null);
      setApiKey('');
    } catch (disconnectError) {
      setError(getApiErrorMessage(disconnectError, 'Could not disconnect Hevy.'));
      throw disconnectError;
    }
  }, []);

  return useMemo(() => ({
    connection,
    apiKey,
    setApiKey,
    isConnected: Boolean(connection?.connectedAt),
    isLoading,
    isSaving,
    isSyncing,
    error,
    saveApiKey,
    sync,
    disconnect,
    refresh: loadConnection,
  }), [
    connection,
    apiKey,
    isLoading,
    isSaving,
    isSyncing,
    error,
    saveApiKey,
    sync,
    disconnect,
    loadConnection,
  ]);
};
