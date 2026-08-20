import { apiClient } from './apiClient';
import { HevyConnection } from '../types/integrations';
import { normalizeApiError } from '../utils/apiError';

export function toHevyServiceError<T>(error: T, fallback: string): T | Error {
  return normalizeApiError(error, fallback);
}

export async function getHevyConnection(): Promise<HevyConnection | null> {
  try {
    const response = await apiClient.get<HevyConnection>('/integrations/hevy');
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw toHevyServiceError(error, 'Could not load your Hevy connection.');
  }
}

export async function connectHevy(apiKey: string): Promise<HevyConnection> {
  try {
    const response = await apiClient.post<HevyConnection>('/integrations/hevy/connect', { apiKey });
    return response.data;
  } catch (error) {
    throw toHevyServiceError(error, 'Could not save this Hevy API key.');
  }
}

export async function syncHevy(): Promise<HevyConnection> {
  try {
    const response = await apiClient.post<HevyConnection>('/integrations/hevy/sync');
    return response.data;
  } catch (error) {
    throw toHevyServiceError(error, 'Could not sync Hevy workouts right now.');
  }
}

export async function disconnectHevy(): Promise<void> {
  try {
    await apiClient.delete('/integrations/hevy');
  } catch (error) {
    throw toHevyServiceError(error, 'Could not disconnect Hevy.');
  }
}
