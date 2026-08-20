import { Platform } from 'react-native';
import {
  NativeAdChoicesPlacement,
  NativeMediaAspectRatio,
  TestIds,
} from 'react-native-google-mobile-ads';
import type { NativeAdRequestOptions } from 'react-native-google-mobile-ads';

export type InlineAdPlacement = 'feed' | 'explore';

const ADMOB_AD_UNIT_ID_PATTERN = /^ca-app-pub-\d{16}\/\d{10}$/;

const configuredUnitIds: Record<InlineAdPlacement, string | undefined> = {
  feed: Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_FEED_NATIVE_AD_UNIT_ID_ANDROID,
    ios: process.env.EXPO_PUBLIC_ADMOB_FEED_NATIVE_AD_UNIT_ID_IOS,
  }),
  explore: Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_EXPLORE_NATIVE_AD_UNIT_ID_ANDROID,
    ios: process.env.EXPO_PUBLIC_ADMOB_EXPLORE_NATIVE_AD_UNIT_ID_IOS,
  }),
};

export const INLINE_NATIVE_AD_REQUEST_OPTIONS: NativeAdRequestOptions = {
  adChoicesPlacement: NativeAdChoicesPlacement.TOP_RIGHT,
  aspectRatio: NativeMediaAspectRatio.LANDSCAPE,
  requestNonPersonalizedAdsOnly: true,
  startVideoMuted: true,
};

export function getInlineAdUnitId(placement: InlineAdPlacement): string | null {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;
  // Google's Ad Manager native demo unit is deterministic and exercises the
  // same native ad rendering path. Production still uses our AdMob unit IDs.
  if (__DEV__) return TestIds.GAM_NATIVE;

  const configuredId = configuredUnitIds[placement]?.trim();
  return configuredId && ADMOB_AD_UNIT_ID_PATTERN.test(configuredId) ? configuredId : null;
}
