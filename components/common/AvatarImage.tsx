import { Image as ExpoImage, type ImageProps } from 'expo-image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSignedMediaRecovery } from '../../hooks/useSignedMediaRecovery';
import { createCachedRemoteImageSource } from '../../utils/remoteImageCache';
import GenericUserAvatar from './GenericUserAvatar';

type AvatarImageProps = {
  uri?: string | null;
  size?: number;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
  fallbackSource?: ImageProps['source'];
};

const MAX_AUTOMATIC_RETRIES = 2;
const RETRY_DELAY_MS = 700;

export default function AvatarImage({
  uri,
  size = 44,
  style,
  accessibilityLabel = 'Profile picture',
  fallbackSource,
}: AvatarImageProps) {
  const recoverSignedMedia = useSignedMediaRecovery();
  const [retryKey, setRetryKey] = useState(0);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    retryCountRef.current = 0;
    setRetryKey(0);

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [uri]);

  const handleLoad = useCallback(() => {
    retryCountRef.current = 0;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const handleError = useCallback(() => {
    if (!uri) return;

    recoverSignedMedia(uri);
    if (retryCountRef.current >= MAX_AUTOMATIC_RETRIES) return;

    retryCountRef.current += 1;
    const retryNumber = retryCountRef.current;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      setRetryKey((current) => current + 1);
    }, RETRY_DELAY_MS * retryNumber);
  }, [recoverSignedMedia, uri]);

  const source = uri ? createCachedRemoteImageSource(uri) : null;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        style as StyleProp<ViewStyle>,
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    >
      {fallbackSource ? (
        <ExpoImage
          source={fallbackSource}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityElementsHidden
        />
      ) : (
        <GenericUserAvatar
          size={size}
          style={styles.fallback}
          accessibilityLabel={accessibilityLabel}
        />
      )}

      {source ? (
        <ExpoImage
          key={`${uri}:${retryKey}`}
          source={source}
          style={StyleSheet.absoluteFill}
          cachePolicy="memory-disk"
          contentFit="cover"
          priority="high"
          recyclingKey={`${uri}:${retryKey}`}
          transition={120}
          accessibilityElementsHidden
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#F0ECFF',
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
  },
});
