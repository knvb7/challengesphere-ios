import { createContext, useContext } from 'react';

import { useAuthContext } from '@/providers/AuthProvider';
import { isAdsEligible } from '@/utils/adsEligibility';

export interface AdsContextValue {
  isEligible: boolean;
  isInitializing: boolean;
  isReady: boolean;
  canRequestAds: boolean;
  isPrivacyOptionsRequired: boolean;
  showPrivacyOptions: () => Promise<void>;
}

export interface AdsEligibility {
  currentUserId: number;
  isEligible: boolean;
  isLoading: boolean;
}

export const AdsContext = createContext<AdsContextValue | null>(null);

export function useAdsEligibility(): AdsEligibility {
  const { currentUserId, isAuthenticated, isLoading, user } = useAuthContext();
  const eligibilityInput = {
    currentUserId,
    dateOfBirth: user?.dateOfBirth,
    isAuthenticated,
    isLoading,
    premiumUser: user?.premiumUser,
  };
  const isEligibleForProduction = isAdsEligible(eligibilityInput);
  const hasKnownDateOfBirth = typeof user?.dateOfBirth === 'string'
    && user.dateOfBirth.trim().length > 0;
  const isKnownNonPremium = user?.premiumUser === 0;
  const canPreviewTestAdsWithoutBirthDate = __DEV__
    && !isLoading
    && isAuthenticated
    && currentUserId > 0
    && isKnownNonPremium
    && !hasKnownDateOfBirth;
  const isEligible = isEligibleForProduction || canPreviewTestAdsWithoutBirthDate;

  return { currentUserId, isEligible, isLoading };
}

export function useAds(): AdsContextValue {
  const context = useContext(AdsContext);
  if (!context) {
    throw new Error('useAds must be used inside AdsProvider');
  }
  return context;
}
