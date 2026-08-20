import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthResponse } from '../types/api';
import {
  getAuthResponseUserId,
  getOnboardingSeenKey,
  getProfileSetupPendingKey,
} from '../utils/onboardingIntro';

const COMPLETED_VALUE = 'true';

export type PostAuthRoute = '/onboarding' | '/profile-setup' | '/(tabs)/challenges';
type CompletedIntroRoute = Exclude<PostAuthRoute, '/onboarding'>;

class OnboardingService {
  private async syncProfileSetupStatus(
    userId: number | string | null | undefined,
    profileComplete?: boolean
  ): Promise<void> {
    if (profileComplete === false) {
      await this.markProfileSetupPendingForUser(userId);
    } else if (profileComplete === true) {
      await this.completeProfileSetupForUser(userId);
    }
  }

  async hasCompletedIntroForUser(userId: number | string | null | undefined): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(getOnboardingSeenKey(userId));
      return value === COMPLETED_VALUE;
    } catch {
      return false;
    }
  }

  async markIntroCompletedForUser(userId: number | string | null | undefined): Promise<void> {
    try {
      await AsyncStorage.setItem(getOnboardingSeenKey(userId), COMPLETED_VALUE);
    } catch {
    }
  }

  async markProfileSetupPendingForUser(userId: number | string | null | undefined): Promise<void> {
    try {
      await AsyncStorage.setItem(getProfileSetupPendingKey(userId), COMPLETED_VALUE);
    } catch {
    }
  }

  async hasPendingProfileSetupForUser(userId: number | string | null | undefined): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(getProfileSetupPendingKey(userId));
      return value === COMPLETED_VALUE;
    } catch {
      return false;
    }
  }

  async completeProfileSetupForUser(userId: number | string | null | undefined): Promise<void> {
    try {
      await AsyncStorage.removeItem(getProfileSetupPendingKey(userId));
    } catch {
    }
  }

  async getPostIntroRouteForUser(
    userId: number | string | null | undefined,
    profileComplete?: boolean
  ): Promise<CompletedIntroRoute> {
    await this.syncProfileSetupStatus(userId, profileComplete);
    if (profileComplete === false) return '/profile-setup';
    if (profileComplete === true) return '/(tabs)/challenges';
    const hasPendingProfileSetup = await this.hasPendingProfileSetupForUser(userId);
    return hasPendingProfileSetup ? '/profile-setup' : '/(tabs)/challenges';
  }

  async getStartupRouteForUser(
    userId: number | string | null | undefined,
    profileComplete?: boolean
  ): Promise<PostAuthRoute> {
    await this.syncProfileSetupStatus(userId, profileComplete);
    const hasCompletedIntro = await this.hasCompletedIntroForUser(userId);
    return hasCompletedIntro ? this.getPostIntroRouteForUser(userId, profileComplete) : '/onboarding';
  }

  async getPostAuthRoute(authData: AuthResponse): Promise<PostAuthRoute> {
    const userId = getAuthResponseUserId(authData);
    if (authData.isNewUser || authData.user?.profileComplete === false) {
      await this.markProfileSetupPendingForUser(userId);
    } else if (authData.user?.profileComplete === true) {
      await this.completeProfileSetupForUser(userId);
    }
    return this.getStartupRouteForUser(userId, authData.user?.profileComplete);
  }
}

export const onboardingService = new OnboardingService();
export const getPostAuthRoute = (authData: AuthResponse) => onboardingService.getPostAuthRoute(authData);
export default onboardingService;
