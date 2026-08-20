import {
    AppleAuthRequest,
    AuthResponse,
    UserProfileResponse,
} from '../types/api';
import { apiClient } from './apiClient';
import { getStoredAppleCredentialState } from './appleAuthService';
import {
  getAccessToken as readAccessToken,
  getRefreshToken as readRefreshToken,
  getUserSnapshot as readUserSnapshot,
  setAppleUserIdentifier,
  setUserSnapshot as writeUserSnapshot,
} from './secureAuthStorage';

let inMemoryUser: UserProfileResponse | null = null;

class AuthService {
  async loginWithApple(appleData: AppleAuthRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/apple', appleData);
    const authData = response.data;
    await this.storeAuthData(authData);
    await setAppleUserIdentifier(appleData.user);
    return authData;
  }

  // Logout
  async logout(): Promise<void> {
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    try {
      [accessToken, refreshToken] = await Promise.all([
        readAccessToken(),
        readRefreshToken(),
      ]);
    } catch {
      // Local logout must continue even if secure storage is unreadable.
    }

    await this.clearAuthData();
    void this.completeRemoteLogout(accessToken, refreshToken).catch(() => undefined);
  }

  private async completeRemoteLogout(
    accessToken: string | null,
    refreshToken: string | null
  ): Promise<void> {
    await apiClient.post(
      '/auth/logout',
      refreshToken ? { refreshToken } : undefined,
      {
        timeout: 5000,
        ...(accessToken
          ? { headers: { Authorization: `Bearer ${accessToken}` } }
          : {}),
      }
    );
  }

  // Refresh access token
  async refreshToken(): Promise<string> {
    const accessToken = await apiClient.refreshAuthToken();
    if (!accessToken) {
      throw Object.assign(new Error('No refresh token available'), { status: 401 });
    }
    return accessToken;
  }

  // Get current user profile
  async getCurrentUser(): Promise<UserProfileResponse> {
    try {
      const response = await apiClient.get<UserProfileResponse>('/auth/me');
      const user = response.data;
      await this.storeUser(user);
      return user;
    } catch (error) {

      throw error;
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await readAccessToken();
      return !!token;
    } catch {

      return false;
    }
  }

  async restoreSession(): Promise<UserProfileResponse | null> {
    try {
      const appleCredentialState = await getStoredAppleCredentialState();
      if (appleCredentialState === 'missing' || appleCredentialState === 'revoked') {
        await this.clearAuthData();
        return null;
      }

      const [accessToken, storedUser] = await Promise.all([
        readAccessToken(),
        this.getStoredUser(),
      ]);
      if (!accessToken) {
        await this.clearAuthData();
        return null;
      }

      if (this.isAccessTokenExpired(accessToken)) {
        try {
          await this.refreshToken();
        } catch (error) {
          return this.restoreStoredUserAfterRequestFailure(error, storedUser);
        }
      }

      try {
        return await this.getCurrentUser();
      } catch (error) {
        return this.restoreStoredUserAfterRequestFailure(error, storedUser);
      }
    } catch {
      return null;
    }
  }

  async getStoredUser(): Promise<UserProfileResponse | null> {
    if (inMemoryUser) return inMemoryUser;

    try {
      inMemoryUser = await readUserSnapshot();
      return inMemoryUser;
    } catch {
      return null;
    }
  }

  async storeUser(user: UserProfileResponse): Promise<void> {
    inMemoryUser = user;
    await writeUserSnapshot(user);
  }

  // Get stored access token
  async getAccessToken(): Promise<string | null> {
    try {
      return await readAccessToken();
    } catch {

      return null;
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return null;
    }

    if (this.isAccessTokenExpired(accessToken)) {
      return this.refreshToken();
    }

    return accessToken;
  }

  // Private helper methods
  private async storeAuthData(authData: AuthResponse): Promise<void> {
    await apiClient.setAuthSession(authData.accessToken, authData.refreshToken);

    const user = authData.user ?? this.createLegacyAuthUser(authData);
    if (user) {
      await this.storeUser(user);
    }
  }

  private createLegacyAuthUser(authData: AuthResponse): UserProfileResponse | null {
    const id = Number(authData.userId);
    const username = authData.username?.trim();
    if (!Number.isInteger(id) || id <= 0 || !username) return null;

    return {
      id,
      username,
      emailId: authData.email ?? '',
      createdAt: '',
      active: true,
      challengesCreated: 0,
      challengesAccepted: 0,
      followers: 0,
      following: 0,
      profilePicUrl: null,
      premiumUser: 0,
      bio: null,
    };
  }

  private async restoreStoredUserAfterRequestFailure(
    error: unknown,
    storedUser: UserProfileResponse | null,
  ): Promise<UserProfileResponse | null> {
    const status = this.getErrorStatus(error);
    if (status === 401 || status === 403) {
      await this.clearAuthData();
      return null;
    }

    // Network, timeout, and server failures must not turn a persisted session
    // into a logout. A cached identity is accepted only while credentials still
    // exist; confirmed refresh rejection clears them in ApiClient.
    const remainingAccessToken = await readAccessToken().catch(() => null);
    if (!remainingAccessToken || !storedUser) return null;

    inMemoryUser = storedUser;
    return storedUser;
  }

  private getErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') return undefined;
    const candidate = error as {
      status?: unknown;
      response?: { status?: unknown };
    };
    const status = candidate.response?.status ?? candidate.status;
    return typeof status === 'number' ? status : undefined;
  }

  private isAccessTokenExpired(token: string): boolean {
    const payload = token.split('.')[1];
    if (!payload) return false;

    try {
      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(
        normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
        '='
      );
      const atobFn = (globalThis as typeof globalThis & { atob?: (input: string) => string }).atob;
      if (!atobFn) return false;

      const decodedPayload = JSON.parse(atobFn(paddedPayload));
      if (!decodedPayload?.exp) return false;

      return decodedPayload.exp * 1000 <= Date.now() + 30_000;
    } catch {
      return false;
    }
  }

  private async clearAuthData(): Promise<void> {
    inMemoryUser = null;
    await apiClient.logout();
  }
}

export const authService = new AuthService();
export default authService;
