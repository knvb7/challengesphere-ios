import { useMemo } from 'react';
import type { ReactNode } from 'react';

import {
  AdsContext,
  useAdsEligibility,
} from '@/providers/AdsContext';
import type { AdsContextValue } from '@/providers/AdsContext';

const showPrivacyOptions = async () => {};

export function AdsProvider({ children }: { children: ReactNode }) {
  const { isEligible } = useAdsEligibility();
  const value = useMemo<AdsContextValue>(() => ({
    isEligible,
    isInitializing: false,
    isReady: false,
    canRequestAds: false,
    isPrivacyOptionsRequired: false,
    showPrivacyOptions,
  }), [isEligible]);

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export { useAds } from '@/providers/AdsContext';

export default AdsProvider;
