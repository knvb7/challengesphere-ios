import { getInlineAdUnitId, INLINE_NATIVE_AD_REQUEST_OPTIONS } from '@/constants/ads';
import { useAds } from '@/providers/AdsProvider';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
  TestIds,
} from 'react-native-google-mobile-ads';

import type { InlineNativeAdProps } from './InlineNativeAd.types';

const MAX_LOAD_ATTEMPTS = __DEV__ ? 3 : 1;
const TEST_RETRY_DELAY_MS = 2_000;

const InlineNativeAd = ({ placement }: InlineNativeAdProps) => {
  const { canRequestAds, isEligible, isInitializing, isReady } = useAds();
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const primaryAdUnitId = useMemo(() => getInlineAdUnitId(placement), [placement]);
  const adUnitId = __DEV__ && loadAttempt > 0 ? TestIds.GAM_NATIVE_VIDEO : primaryAdUnitId;
  const canLoad =
    Boolean(adUnitId) && isEligible && !isInitializing && isReady && canRequestAds;

  useEffect(() => {
    setLoadAttempt(0);
  }, [canLoad, primaryAdUnitId]);

  useEffect(() => {
    let disposed = false;
    let loadedAd: NativeAd | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    setNativeAd(null);
    if (!canLoad || !adUnitId) {
      return undefined;
    }

    void NativeAd.createForAdRequest(adUnitId, INLINE_NATIVE_AD_REQUEST_OPTIONS)
      .then((ad) => {
        if (disposed) {
          ad.destroy();
          return;
        }

        loadedAd = ad;
        setNativeAd(ad);
      })
      .catch((error: unknown) => {
        if (disposed) return;

        setNativeAd(null);
        if (__DEV__) {
          console.warn(`[Ads] ${placement} native test ad failed to load`, error);
        }
        if (loadAttempt + 1 < MAX_LOAD_ATTEMPTS) {
          retryTimer = setTimeout(() => {
            setLoadAttempt((attempt) => attempt + 1);
          }, TEST_RETRY_DELAY_MS);
        }
      });

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      loadedAd?.destroy();
      loadedAd = null;
    };
  }, [adUnitId, canLoad, loadAttempt, placement]);

  if (!canLoad || !nativeAd) {
    return null;
  }

  const isFeedPlacement = placement === 'feed';

  return (
    <View style={isFeedPlacement ? styles.feedCell : styles.exploreCell}>
      <View style={styles.card}>
        <NativeAdView
          nativeAd={nativeAd}
          style={styles.nativeAd}
          accessibilityLabel={`Sponsored advertisement: ${nativeAd.headline}`}
        >
          {nativeAd.mediaContent ? (
            <NativeMediaView
              resizeMode="cover"
              style={[styles.media, isFeedPlacement ? styles.feedMedia : styles.exploreMedia]}
            />
          ) : null}

          <View style={styles.details}>
            <View style={styles.identityRow}>
              {nativeAd.icon ? (
                <NativeAsset assetType={NativeAssetType.ICON}>
                  <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
                </NativeAsset>
              ) : null}
              <View style={styles.titleColumn}>
                <View style={styles.attributionRow}>
                  <View style={styles.sponsorBadge} pointerEvents="none">
                    <Text style={styles.sponsorText}>Sponsored</Text>
                  </View>
                  {nativeAd.advertiser ? (
                    <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                      <Text style={styles.advertiser} numberOfLines={1}>
                        {nativeAd.advertiser}
                      </Text>
                    </NativeAsset>
                  ) : null}
                </View>
                <NativeAsset assetType={NativeAssetType.HEADLINE}>
                  <Text style={styles.headline} numberOfLines={2}>
                    {nativeAd.headline}
                  </Text>
                </NativeAsset>
              </View>
            </View>

            {nativeAd.body ? (
              <NativeAsset assetType={NativeAssetType.BODY}>
                <Text style={styles.body} numberOfLines={2}>
                  {nativeAd.body}
                </Text>
              </NativeAsset>
            ) : null}

            {nativeAd.callToAction ? (
              <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                <Text style={styles.callToAction} accessibilityRole="button">
                  {nativeAd.callToAction}
                </Text>
              </NativeAsset>
            ) : null}
          </View>
        </NativeAdView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  feedCell: {
    width: '95%',
    maxWidth: 680,
    alignSelf: 'center',
    marginVertical: 6,
  },
  exploreCell: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD4FF',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  nativeAd: {
    backgroundColor: '#FFFFFF',
  },
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sponsorBadge: {
    minWidth: 62,
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#B9A7FF',
    backgroundColor: '#F0ECFF',
  },
  sponsorText: {
    color: '#4700EC',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  advertiser: {
    flex: 1,
    color: '#777389',
    fontSize: 11,
    fontWeight: '600',
  },
  media: {
    width: '100%',
    backgroundColor: '#F1EFF7',
  },
  feedMedia: {
    height: 190,
  },
  exploreMedia: {
    height: 150,
  },
  details: {
    gap: 8,
    padding: 12,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleColumn: {
    flex: 1,
    gap: 4,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1EFF7',
  },
  headline: {
    color: '#18142F',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  body: {
    color: '#777389',
    fontSize: 12,
    lineHeight: 17,
  },
  callToAction: {
    minHeight: 38,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#4700EC',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default InlineNativeAd;
export type { InlineNativeAdPlacement, InlineNativeAdProps } from './InlineNativeAd.types';
