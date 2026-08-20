import { Image as ExpoImage } from 'expo-image';
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { useSignedMediaRecovery } from '../../hooks/useSignedMediaRecovery';
import { createCachedRemoteImageSource } from '../../utils/remoteImageCache';
import SubmissionMediaViewer from './SubmissionMediaViewer';

interface ChallengePhotoCarouselProps {
  photoUrls: string[];
  height: number;
  overlay?: ReactNode;
  autoPlayIntervalMs?: number;
}

export default function ChallengePhotoCarousel({
  photoUrls,
  height,
  overlay,
  autoPlayIntervalMs = 3500,
}: ChallengePhotoCarouselProps) {
  const recoverSignedMedia = useSignedMediaRecovery();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<string>>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    activeIndexRef.current = 0;
    setActivePhotoIndex(0);
    if (photoUrls.length > 0) {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [photoUrls]);

  useEffect(() => {
    if (photoUrls.length <= 1) {
      return;
    }

    const intervalId = setInterval(() => {
      const nextIndex = (activeIndexRef.current + 1) % photoUrls.length;
      activeIndexRef.current = nextIndex;
      setActivePhotoIndex(nextIndex);
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, autoPlayIntervalMs);

    return () => clearInterval(intervalId);
  }, [autoPlayIntervalMs, photoUrls.length]);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    activeIndexRef.current = index;
    setActivePhotoIndex(index);
  };

  return (
    <View style={[styles.container, { height }]}>
      <FlatList
        ref={listRef}
        data={photoUrls}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index, animated: true });
          }, 150);
        }}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => {
              activeIndexRef.current = index;
              setActivePhotoIndex(index);
              setViewerVisible(true);
            }}
            accessibilityLabel="Open image fullscreen"
            accessibilityRole="button"
          >
            <ExpoImage
              source={createCachedRemoteImageSource(item)}
              style={[styles.photo, { width, height }]}
              contentFit="contain"
              cachePolicy="memory-disk"
              onError={() => recoverSignedMedia(item)}
            />
          </Pressable>
        )}
      />

      {overlay}

      {photoUrls.length > 1 && (
        <View style={styles.photoDots}>
          {photoUrls.map((_, index) => (
            <View
              key={index}
              style={[styles.photoDot, index === activePhotoIndex && styles.photoDotActive]}
            />
          ))}
        </View>
      )}
      <SubmissionMediaViewer
        visible={viewerVisible}
        mediaUrls={photoUrls}
        initialIndex={activePhotoIndex}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#111017',
  },
  photo: {
    backgroundColor: '#111017',
  },
  photoDots: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  photoDotActive: {
    width: 16,
    backgroundColor: '#ffffff',
  },
});
