import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  MaxAdContentRating,
} from 'react-native-google-mobile-ads';
import type { ReactNode } from 'react';
import type { AdsConsentInfo } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

import {
  AdsContext,
  useAdsEligibility,
} from '@/providers/AdsContext';
import type { AdsContextValue } from '@/providers/AdsContext';

let mobileAdsInitialized = false;
let mobileAdsInitializationPromise: Promise<void> | null = null;

async function requestIosTrackingChoiceIfNeeded(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const current = await getTrackingPermissionsAsync();
  if (current.status === 'undetermined') {
    await requestTrackingPermissionsAsync();
  }
}

async function initializeMobileAdsOnce(): Promise<void> {
  if (mobileAdsInitialized) return;

  if (!mobileAdsInitializationPromise) {
    mobileAdsInitializationPromise = (async () => {
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
        ...(__DEV__ ? { testDeviceIdentifiers: ['EMULATOR'] } : {}),
      });
      await mobileAds().initialize();
      mobileAdsInitialized = true;
    })();
  }

  try {
    await mobileAdsInitializationPromise;
  } catch (error) {
    mobileAdsInitializationPromise = null;
    throw error;
  }
}

async function gatherConsent(): Promise<AdsConsentInfo | null> {
  try {
    return await AdsConsent.gatherConsent();
  } catch {
    try {
      return await AdsConsent.getConsentInfo();
    } catch {
      return null;
    }
  }
}

function privacyOptionsRequired(consentInfo: AdsConsentInfo): boolean {
  return consentInfo.privacyOptionsRequirementStatus
    === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
}

export function AdsProvider({ children }: { children: ReactNode }) {
  const { currentUserId, isEligible } = useAdsEligibility();
  const activeProfileRef = useRef({ currentUserId, isEligible });
  activeProfileRef.current = { currentUserId, isEligible };

  const [isInitializing, setIsInitializing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [canRequestAds, setCanRequestAds] = useState(false);
  const [isPrivacyOptionsRequired, setIsPrivacyOptionsRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!isEligible) {
      setIsInitializing(false);
      setIsReady(false);
      setCanRequestAds(false);
      setIsPrivacyOptionsRequired(false);
      return undefined;
    }

    setIsInitializing(true);
    setIsReady(false);
    setCanRequestAds(false);
    setIsPrivacyOptionsRequired(false);

    const prepareAds = async () => {
      await requestIosTrackingChoiceIfNeeded();
      if (cancelled) return;

      const consentInfo = await gatherConsent();
      if (cancelled) return;

      if (!consentInfo) {
        setIsPrivacyOptionsRequired(false);
        return;
      }

      setIsPrivacyOptionsRequired(privacyOptionsRequired(consentInfo));
      if (!consentInfo.canRequestAds) return;

      await initializeMobileAdsOnce();
      if (cancelled) return;

      setIsReady(true);
      setCanRequestAds(true);
    };

    void prepareAds()
      .catch(() => {
        if (!cancelled) {
          setIsReady(false);
          setCanRequestAds(false);
        }
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserId, isEligible]);

  const showPrivacyOptions = useCallback(async () => {
    if (!isEligible || !isPrivacyOptionsRequired) return;

    const profileId = currentUserId;
    const consentInfo = await AdsConsent.showPrivacyOptionsForm();
    const activeProfile = activeProfileRef.current;
    if (!activeProfile.isEligible || activeProfile.currentUserId !== profileId) return;

    setIsPrivacyOptionsRequired(privacyOptionsRequired(consentInfo));
    if (!consentInfo.canRequestAds) {
      setIsReady(false);
      setCanRequestAds(false);
      return;
    }

    setIsInitializing(true);
    try {
      await initializeMobileAdsOnce();
      const latestProfile = activeProfileRef.current;
      if (!latestProfile.isEligible || latestProfile.currentUserId !== profileId) return;
      setIsReady(true);
      setCanRequestAds(true);
    } finally {
      const latestProfile = activeProfileRef.current;
      if (latestProfile.isEligible && latestProfile.currentUserId === profileId) {
        setIsInitializing(false);
      }
    }
  }, [currentUserId, isEligible, isPrivacyOptionsRequired]);

  const value = useMemo<AdsContextValue>(() => ({
    isEligible,
    isInitializing,
    isReady,
    canRequestAds,
    isPrivacyOptionsRequired,
    showPrivacyOptions,
  }), [
    canRequestAds,
    isEligible,
    isInitializing,
    isPrivacyOptionsRequired,
    isReady,
    showPrivacyOptions,
  ]);

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export { useAds } from '@/providers/AdsContext';

export default AdsProvider;
