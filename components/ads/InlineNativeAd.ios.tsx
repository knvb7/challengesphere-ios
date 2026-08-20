import type { ComponentType } from 'react';

import { IOS_ADS_ENABLED } from '@/constants/releaseFeatures';

import type { InlineNativeAdProps } from './InlineNativeAd.types';

const MobileInlineNativeAd = IOS_ADS_ENABLED
  // The no-ads profile excludes this native module from CocoaPods, so it must
  // be resolved only after the build-time release flag selects the ads path.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? (require('./InlineNativeAd.native').default as ComponentType<InlineNativeAdProps>)
  : null;

const InlineNativeAd = (props: InlineNativeAdProps) => {
  if (!MobileInlineNativeAd) return null;
  return <MobileInlineNativeAd {...props} />;
};

export default InlineNativeAd;
export type { InlineNativeAdPlacement, InlineNativeAdProps } from './InlineNativeAd.types';
