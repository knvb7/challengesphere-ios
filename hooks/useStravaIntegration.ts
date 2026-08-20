import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  connectStrava,
  disconnectStrava,
  getStravaAuthorizationUrl,
  getStravaConnection,
  syncStrava,
} from '../services/stravaService';
import { StravaConnection } from '../types/integrations';
import { getApiErrorMessage } from '../utils/apiError';

WebBrowser.maybeCompleteAuthSession();

const extractQueryParam = (url: string, name: string): string => {
  try {
    return new URL(url).searchParams.get(name) || '';
  } catch {
    const [, query = ''] = url.split('?');
    return new URLSearchParams(query).get(name) || '';
  }
};

export const useStravaIntegration = (_userId: number | string | null | undefined) => {
  const [connection, setConnection] = useState<StravaConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setConnection(await getStravaConnection());
    } catch (loadError) {
      setConnection(null);
      setError(getApiErrorMessage(loadError, 'Could not load your Strava connection.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'myapp',
        path: 'integration-detail',
      });
      const { authorizationUrl, state } = await getStravaAuthorizationUrl(redirectUri);
      const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, redirectUri);
      if (result.type !== 'success' || !result.url) {
        throw new Error('Strava connection was cancelled.');
      }
      const errorParam = extractQueryParam(result.url, 'error');
      if (errorParam) {
        throw new Error('Strava authorization was denied.');
      }
      const code = extractQueryParam(result.url, 'code');
      const returnedState = extractQueryParam(result.url, 'state');
      const scope = extractQueryParam(result.url, 'scope');
      if (!code || returnedState !== state) {
        throw new Error('Strava authorization could not be verified.');
      }
      const nextConnection = await connectStrava({
        code,
        state,
        redirectUri,
        scope,
      });
      setConnection(nextConnection);
      return nextConnection;
    } catch (connectError) {
      setError(getApiErrorMessage(connectError, 'Could not connect Strava.'));
      throw connectError;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const nextConnection = await syncStrava();
      setConnection(nextConnection);
      return nextConnection;
    } catch (syncError) {
      setError(getApiErrorMessage(syncError, 'Could not sync Strava right now.'));
      throw syncError;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      await disconnectStrava();
      setConnection(null);
    } catch (disconnectError) {
      setError(getApiErrorMessage(disconnectError, 'Could not disconnect Strava.'));
      throw disconnectError;
    }
  }, []);

  return useMemo(() => ({
    connection,
    isConnected: Boolean(connection?.athleteId),
    isLoading,
    isConnecting,
    isSyncing,
    error,
    connect,
    sync,
    disconnect,
    refresh: loadConnection,
  }), [
    connection,
    isLoading,
    isConnecting,
    isSyncing,
    error,
    connect,
    sync,
    disconnect,
    loadConnection,
  ]);
};
