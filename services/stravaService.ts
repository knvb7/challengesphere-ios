import { apiClient } from './apiClient';
import { StravaConnection } from '../types/integrations';
import { normalizeApiError } from '../utils/apiError';

export interface StravaAuthorizeUrlResponse {
  authorizationUrl: string;
  state: string;
}

export interface StravaConnectRequest {
  code: string;
  state: string;
  redirectUri: string;
  scope?: string;
}

export function toStravaServiceError<T>(error: T, fallback: string): T | Error {
  return normalizeApiError(error, fallback);
}

export async function getStravaAuthorizationUrl(redirectUri: string): Promise<StravaAuthorizeUrlResponse> {
  try {
    const response = await apiClient.post<StravaAuthorizeUrlResponse>('/integrations/strava/authorize-url', {
      redirectUri,
    });
    return response.data;
  } catch (error) {
    throw toStravaServiceError(error, 'Could not start Strava authorization.');
  }
}

export async function getStravaConnection(): Promise<StravaConnection | null> {
  try {
    const response = await apiClient.get<StravaConnection>('/integrations/strava');
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw toStravaServiceError(error, 'Could not load your Strava connection.');
  }
}

export async function connectStrava(request: StravaConnectRequest): Promise<StravaConnection> {
  try {
    const response = await apiClient.post<StravaConnection>('/integrations/strava/connect', request);
    return response.data;
  } catch (error) {
    throw toStravaServiceError(error, 'Could not connect Strava.');
  }
}

export async function syncStrava(): Promise<StravaConnection> {
  try {
    const response = await apiClient.post<StravaConnection>('/integrations/strava/sync');
    return response.data;
  } catch (error) {
    throw toStravaServiceError(error, 'Could not sync Strava right now.');
  }
}

export async function disconnectStrava(): Promise<void> {
  try {
    await apiClient.delete('/integrations/strava');
  } catch (error) {
    throw toStravaServiceError(error, 'Could not disconnect Strava.');
  }
}
