import type { ComponentType, ReactNode } from 'react';

import { IOS_ADS_ENABLED } from '@/constants/releaseFeatures';
import { AdsProvider as NoAdsProvider } from '@/providers/AdsProvider.web';
import { useAds } from '@/providers/AdsContext';

type AdsProviderProps = { children: ReactNode };

const MobileAdsProvider = IOS_ADS_ENABLED
  // The no-ads profile excludes this native module from CocoaPods, so it must
  // be resolved only after the build-time release flag selects the ads path.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? (require('./AdsProvider.native').AdsProvider as ComponentType<AdsProviderProps>)
  : NoAdsProvider;

export function AdsProvider(props: AdsProviderProps) {
  return <MobileAdsProvider {...props} />;
}

export { useAds };

export default AdsProvider;
