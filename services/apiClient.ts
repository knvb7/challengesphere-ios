import { AxiosInstance, AxiosRequestConfig, AxiosResponse, create } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { normalizeApiError } from '../utils/apiError';
import { createSingleFlight } from '../utils/singleFlight';
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  setAccessToken as writeAccessToken,
  setRefreshToken as writeRefreshToken,
} from './secureAuthStorage';

// URL is injected dynamically by app.config.ts (auto-detects Mac's LAN IP).
const CONFIGURED_API_BASE_URL: string =
  Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://localhost:8080/api/v1';

const normalizeApiBaseUrl = (baseUrl: string): string => {
  if (Platform.OS !== 'android') {
    return baseUrl;
  }

  try {
    const url = new URL(baseUrl);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1' || url.hostname === '[::1]') {
      url.hostname = '10.0.2.2';
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    return baseUrl;
  }

  return baseUrl;
};

const API_BASE_URL = normalizeApiBaseUrl(CONFIGURED_API_BASE_URL);

export const getApiBaseUrl = () => API_BASE_URL;

type AuthFailureHandler = () => void;

let authFailureHandler: AuthFailureHandler | null = null;

export const setAuthFailureHandler = (handler: AuthFailureHandler | null) => {
  authFailureHandler = handler;
};

class ApiClient {
  private instance: AxiosInstance;
  private authGeneration = 0;
  private authStorageQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.instance = create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add the access token without logging credentials.
    this.instance.interceptors.request.use(
      async (config) => {
        await this.authStorageQueue;
        const token = await getAccessToken();
        if (token && !config.headers.Authorization && !config.headers.authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(normalizeApiError(error))
    );

    // Response interceptor handles token refresh without retaining request URLs or payloads in logs.
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        const statusCode = error.response?.status;
        const requestUrl: string = originalRequest?.url ?? '';
        const isAuthRoute = requestUrl.includes('/auth/apple')
          || requestUrl.includes('/auth/refresh')
          || requestUrl.includes('/auth/logout');

        if (statusCode === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
          originalRequest._retry = true;

          try {
            const latestAccessToken = await getAccessToken();
            const requestAccessToken = originalRequest.headers?.Authorization
              ?? originalRequest.headers?.authorization;
            originalRequest.headers = originalRequest.headers ?? {};

            // Another request may already have refreshed the rotating token.
            if (latestAccessToken && requestAccessToken !== `Bearer ${latestAccessToken}`) {
              originalRequest.headers.Authorization = `Bearer ${latestAccessToken}`;
              return this.instance(originalRequest);
            }

            const refreshedAccessToken = await this.refreshAccessToken();
            if (refreshedAccessToken) {
              originalRequest.headers.Authorization = `Bearer ${refreshedAccessToken}`;
              return this.instance(originalRequest);
            }
          } catch (refreshError) {
            return Promise.reject(normalizeApiError(refreshError));
          }
        }

        return Promise.reject(normalizeApiError(error));
      }
    );
  }

  // Public methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get(url, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.post(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.put(url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.patch(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.delete(url, config);
  }

  // Auth methods
  async setAuthToken(token: string) {
    this.authGeneration += 1;
    await this.enqueueAuthStorageMutation(() => writeAccessToken(token));
  }

  async setRefreshToken(token: string) {
    this.authGeneration += 1;
    await this.enqueueAuthStorageMutation(() => writeRefreshToken(token));
  }

  async setAuthSession(accessToken: string, refreshToken?: string | null) {
    this.authGeneration += 1;
    await this.enqueueAuthStorageMutation(async () => {
      if (refreshToken) {
        await writeRefreshToken(refreshToken);
      }
      await writeAccessToken(accessToken);
    });
  }

  async logout() {
    this.authGeneration += 1;
    await this.enqueueAuthStorageMutation(clearAuthStorage);
  }

  async refreshAuthToken(): Promise<string | null> {
    return this.refreshAccessToken();
  }

  private refreshAccessToken = createSingleFlight(async (): Promise<string | null> => {
    const refreshGeneration = this.authGeneration;
    await this.authStorageQueue;
    if (refreshGeneration !== this.authGeneration) return null;

    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      await this.handleAuthFailure();
      return null;
    }

    try {
      const response = await this.instance.post('/auth/refresh', { refreshToken });
      const accessToken = response.data?.accessToken;
      const nextRefreshToken = response.data?.refreshToken;

      if (refreshGeneration !== this.authGeneration) return null;

      if (typeof accessToken !== 'string' || !accessToken.trim()) {
        await this.handleAuthFailure();
        throw Object.assign(
          new Error('Refresh response did not include an access token'),
          { status: 401 },
        );
      }

      await this.enqueueAuthStorageMutation(async () => {
        if (refreshGeneration !== this.authGeneration) return;
        if (nextRefreshToken) {
          await writeRefreshToken(nextRefreshToken);
        }
        await writeAccessToken(accessToken);
      });
      if (refreshGeneration !== this.authGeneration) return null;
      return accessToken;
    } catch (refreshError) {
      const refreshStatus = (refreshError as { response?: { status?: number } })?.response?.status;
      if (refreshStatus === 401 || refreshStatus === 403) {
        await this.handleAuthFailure();
      }
      throw refreshError;
    }
  });

  private enqueueAuthStorageMutation(operation: () => Promise<void>): Promise<void> {
    const mutation = this.authStorageQueue.then(operation);
    this.authStorageQueue = mutation.then(
      () => undefined,
      () => undefined,
    );
    return mutation;
  }

  private async handleAuthFailure() {
    await this.logout();
    authFailureHandler?.();
  }

  // File upload helper
  async uploadFile(url: string, file: any, onProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('file', file);

    return this.instance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();
export default apiClient;
