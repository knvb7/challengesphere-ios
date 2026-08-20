import { Image as ExpoImage } from 'expo-image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { useSignedMediaRecovery } from '../../hooks/useSignedMediaRecovery';
import { createCachedRemoteImageSource } from '../../utils/remoteImageCache';
import PinchZoomImage from './PinchZoomImage';
import SubmissionMediaViewer from './SubmissionMediaViewer';

interface SubmissionMediaCarouselProps {
  mediaUrls: string[];
  width: number;
  height: number;
  autoPlay?: boolean;
  autoPlayIntervalMs?: number;
  expandable?: boolean;
  borderRadius?: number;
  contentFit?: 'cover' | 'contain';
  containBackdrop?: boolean;
  /** Mount the root-level pinch clone only for media currently visible onscreen. */
  rootOverlayEnabled?: boolean;
  onMediaPress?: (index: number) => void;
  onZoomChange?: (zoomed: boolean) => void;
}

export default function SubmissionMediaCarousel({
  mediaUrls,
  width,
  height,
  autoPlay = false,
  autoPlayIntervalMs = 3200,
  expandable = false,
  borderRadius = 0,
  contentFit = 'cover',
  containBackdrop = false,
  rootOverlayEnabled = true,
  onMediaPress,
  onZoomChange,
}: SubmissionMediaCarouselProps) {
  const recoverSignedMedia = useSignedMediaRecovery();
  const listRef = useRef<FlatList<string>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
  const [autoplayPaused, setAutoplayPaused] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const activeIndexRef = useRef(0);
  const zoomedIndexRef = useRef<number | null>(null);
  const scrollOffsetRef = useRef(0);
  const onZoomChangeRef = useRef(onZoomChange);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaKey = useMemo(() => mediaUrls.join('\u0000'), [mediaUrls]);
  onZoomChangeRef.current = onZoomChange;

  const pauseAutoplay = React.useCallback(() => {
    if (!autoPlay) return;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setAutoplayPaused(true);
  }, [autoPlay]);

  const resumeAutoplay = React.useCallback(() => {
    if (!autoPlay) return;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setAutoplayPaused(false);
      resumeTimerRef.current = null;
    }, 2200);
  }, [autoPlay]);

  const clearZoomState = React.useCallback((index?: number) => {
    if (index !== undefined && zoomedIndexRef.current !== index) return;
    if (zoomedIndexRef.current === null) return;

    zoomedIndexRef.current = null;
    setZoomedIndex(null);
    onZoomChangeRef.current?.(false);
  }, []);

  const handleZoomChange = React.useCallback((index: number, zoomed: boolean) => {
    if (zoomed) {
      // Freeze any in-flight page deceleration at its current offset before a
      // stale momentum-end event can move or reset the pinched image.
      listRef.current?.scrollToOffset({
        offset: scrollOffsetRef.current,
        animated: false,
      });
      activeIndexRef.current = index;
      setActiveIndex(index);
      zoomedIndexRef.current = index;
      setZoomedIndex(index);
      pauseAutoplay();
      onZoomChangeRef.current?.(true);
      return;
    }

    if (zoomedIndexRef.current !== index) return;
    clearZoomState(index);
    listRef.current?.scrollToOffset({ offset: width * index, animated: true });
    resumeAutoplay();
  }, [clearZoomState, pauseAutoplay, resumeAutoplay, width]);

  useEffect(() => {
    activeIndexRef.current = 0;
    scrollOffsetRef.current = 0;
    setActiveIndex(0);
    clearZoomState();
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [clearZoomState, mediaKey]);

  useEffect(() => () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    if (zoomedIndexRef.current !== null) {
      onZoomChangeRef.current?.(false);
    }
  }, []);

  useEffect(() => {
    if (!autoPlay || autoplayPaused || mediaUrls.length <= 1) {
      return;
    }

    const intervalId = setInterval(() => {
      const nextIndex = (activeIndexRef.current + 1) % mediaUrls.length;
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, autoPlayIntervalMs);

    return () => clearInterval(intervalId);
  }, [autoPlay, autoplayPaused, autoPlayIntervalMs, mediaKey, mediaUrls.length]);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (zoomedIndexRef.current !== null) return;

    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    clearZoomState();
    resumeAutoplay();
  };

  const renderMediaItem = ({ item, index }: { item: string; index: number }) => {
    const imageSource = createCachedRemoteImageSource(item);
    const openMedia = () => {
      pauseAutoplay();
      activeIndexRef.current = index;
      setActiveIndex(index);
      if (onMediaPress) {
        onMediaPress(index);
        return;
      }
      if (!expandable) {
        setViewerVisible(true);
      }
    };

    if (expandable) {
      return (
        <View style={{ width, height, borderRadius, overflow: 'hidden' }}>
          {containBackdrop && contentFit === 'contain' ? (
            <>
              <ExpoImage
                source={imageSource}
                style={[StyleSheet.absoluteFill, styles.containBackdrop]}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={100}
                onError={() => recoverSignedMedia(item)}
              />
              <View style={styles.containBackdropOverlay} pointerEvents="none" />
            </>
          ) : null}
          <PinchZoomImage
            source={imageSource as any}
            width={width}
            height={height}
            borderRadius={borderRadius}
            resizeMode={contentFit}
            maxScale={4}
            zoomMode="transient"
            rootOverlayEnabled={rootOverlayEnabled && Math.abs(index - activeIndex) <= 1}
            onPress={onMediaPress ? openMedia : undefined}
            accessibilityLabel={onMediaPress ? 'Open submission details' : undefined}
            onZoomChange={(zoomed) => handleZoomChange(index, zoomed)}
            resetKey={`${mediaKey}-${index}`}
            style={contentFit === 'contain' ? undefined : styles.inlineZoomImage}
          />
        </View>
      );
    }

    return (
      <Pressable
        accessibilityLabel={onMediaPress ? 'Open submission details' : 'Open image fullscreen'}
        accessibilityRole="button"
        onPress={(event) => {
          event.stopPropagation();
          openMedia();
        }}
        style={{ width, height, borderRadius }}
      >
        {containBackdrop && contentFit === 'contain' ? (
          <>
            <ExpoImage
              source={imageSource}
              style={[StyleSheet.absoluteFill, styles.containBackdrop]}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={100}
              onError={() => recoverSignedMedia(item)}
            />
            <View style={styles.containBackdropOverlay} pointerEvents="none" />
          </>
        ) : null}
        <ExpoImage
          source={imageSource}
          style={{ width, height, borderRadius }}
          contentFit={contentFit}
          cachePolicy="memory-disk"
          transition={100}
          onError={() => recoverSignedMedia(item)}
        />
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { width, height, borderRadius }]}>
      {mediaUrls.length === 1 ? (
        renderMediaItem({ item: mediaUrls[0], index: 0 })
      ) : (
        <FlatList
          ref={listRef}
          data={mediaUrls}
          horizontal
          pagingEnabled
          disableIntervalMomentum
          scrollEnabled={zoomedIndex === null}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(url, index) => `${url}-${index}`}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onScroll={(event) => {
            scrollOffsetRef.current = event.nativeEvent.contentOffset.x;
          }}
          scrollEventThrottle={16}
          onScrollBeginDrag={pauseAutoplay}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScrollToIndexFailed={({ index }) => {
            listRef.current?.scrollToOffset({ offset: width * index, animated: true });
          }}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}
          renderItem={renderMediaItem}
        />
      )}

      {mediaUrls.length > 1 ? (
        <View style={styles.indicator} pointerEvents="none">
          {mediaUrls.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === activeIndex && styles.activeDot]}
            />
          ))}
        </View>
      ) : null}

      <SubmissionMediaViewer
        visible={viewerVisible}
        mediaUrls={mediaUrls}
        initialIndex={activeIndex}
        onClose={() => {
          setViewerVisible(false);
          resumeAutoplay();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  containBackdrop: {
    opacity: 0.52,
    transform: [{ scale: 1.08 }],
  },
  containBackdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  inlineZoomImage: {
    backgroundColor: '#111',
  },
  indicator: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.52)',
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 14,
  },
});
