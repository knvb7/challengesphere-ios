import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import {
  type AccessibilityActionEvent,
  ImageSourcePropType,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  measure,
  runOnJS,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  type WithSpringConfig,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSignedMediaRecovery } from '../../hooks/useSignedMediaRecovery';
import { createCachedRemoteImageSource } from '../../utils/remoteImageCache';
import { usePinchZoomOverlay } from './PinchZoomOverlay';

interface PinchZoomImageProps {
  source: ImageSourcePropType;
  width: number;
  height: number;
  borderRadius?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  style?: ViewStyle;
  /** Min scale allowed (default 1) */
  minScale?: number;
  /** Max scale allowed (default 5) */
  maxScale?: number;
  /** Persistent is for fullscreen inspection; transient springs back like an Instagram post. */
  zoomMode?: 'persistent' | 'transient';
  /** Keep root clones bounded to active/adjacent carousel pages. */
  rootOverlayEnabled?: boolean;
  onZoomChange?: (zoomed: boolean) => void;
  onPress?: () => void;
  accessibilityLabel?: string;
  resetKey?: string | number;
}

const SPRING_CONFIG = {
  damping: 22,
  stiffness: 180,
  mass: 0.6,
  overshootClamping: false,
  energyThreshold: 0.00001,
} satisfies WithSpringConfig;

const DOUBLE_TAP_TIMING_CONFIG = {
  duration: 240,
  easing: Easing.out(Easing.cubic),
};

const EDGE_RESISTANCE = 0.28;
const SCALE_RESISTANCE = 0.35;
const ZOOM_EPSILON = 0.01;

let nextOverlayId = 0;

const clampTranslate = (
  translate: number,
  containerSize: number,
  scaledSize: number,
): number => {
  'worklet';
  const overflow = (scaledSize - containerSize) / 2;
  if (overflow <= 0) return 0;
  return Math.min(Math.max(translate, -overflow), overflow);
};

const rubberBandTranslate = (
  translate: number,
  containerSize: number,
  scaledSize: number,
): number => {
  'worklet';
  const overflow = (scaledSize - containerSize) / 2;

  if (overflow <= 0) {
    return translate * EDGE_RESISTANCE;
  }

  if (translate > overflow) {
    return overflow + (translate - overflow) * EDGE_RESISTANCE;
  }

  if (translate < -overflow) {
    return -overflow + (translate + overflow) * EDGE_RESISTANCE;
  }

  return translate;
};

const rubberBandScale = (rawScale: number, minScale: number, maxScale: number): number => {
  'worklet';

  if (rawScale < minScale) {
    return minScale - (minScale - rawScale) * SCALE_RESISTANCE;
  }

  if (rawScale > maxScale) {
    return maxScale + (rawScale - maxScale) * SCALE_RESISTANCE;
  }

  return rawScale;
};

const PinchZoomImage: React.FC<PinchZoomImageProps> = ({
  source,
  width,
  height,
  borderRadius = 0,
  resizeMode = 'cover',
  style,
  minScale = 1,
  maxScale = 5,
  zoomMode = 'persistent',
  rootOverlayEnabled = true,
  onZoomChange,
  onPress,
  accessibilityLabel,
  resetKey,
}) => {
  const recoverSignedMedia = useSignedMediaRecovery();
  const zoomOverlay = usePinchZoomOverlay();
  const [overlayId] = React.useState(() => {
    nextOverlayId += 1;
    return nextOverlayId;
  });
  const containerRef = useAnimatedRef<Animated.View>();
  const onZoomChangeRef = React.useRef(onZoomChange);
  const onPressRef = React.useRef(onPress);
  onZoomChangeRef.current = onZoomChange;
  onPressRef.current = onPress;
  const isPressable = Boolean(onPress);

  const remoteUri = typeof source === 'object'
    && source !== null
    && !Array.isArray(source)
    && 'uri' in source
    && typeof source.uri === 'string'
    ? source.uri
    : undefined;
  const localSource = remoteUri ? undefined : source;
  const cachedSource = React.useMemo(
    () => remoteUri ? createCachedRemoteImageSource(remoteUri) : localSource,
    [localSource, remoteUri],
  );
  const contentFit: NonNullable<React.ComponentProps<typeof ExpoImage>['contentFit']> =
    resizeMode === 'stretch' ? 'fill' : resizeMode === 'center' ? 'none' : resizeMode;
  const usesRootOverlay = zoomMode === 'transient'
    && rootOverlayEnabled
    && Boolean(zoomOverlay);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const startFocalX = useSharedValue(0);
  const startFocalY = useSharedValue(0);
  const currentFocalX = useSharedValue(0);
  const currentFocalY = useSharedValue(0);
  const reportedZoomed = useSharedValue(false);
  const pinchActive = useSharedValue(false);
  const panActive = useSharedValue(false);
  const overlayActive = useSharedValue(0);
  const overlayPageX = useSharedValue(0);
  const overlayPageY = useSharedValue(0);
  const resetSequence = useSharedValue(0);
  const completedResetAnimations = useSharedValue(0);

  const notifyZoomChange = React.useCallback((zoomed: boolean) => {
    onZoomChangeRef.current?.(zoomed);
  }, []);

  const handlePress = React.useCallback(() => {
    onPressRef.current?.();
  }, []);

  const handleAccessibilityAction = React.useCallback((event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'activate') {
      handlePress();
    }
  }, [handlePress]);

  const reportZoomState = React.useCallback((zoomed: boolean) => {
    'worklet';
    if (reportedZoomed.value === zoomed) return;

    reportedZoomed.value = zoomed;
    runOnJS(notifyZoomChange)(zoomed);
  }, [notifyZoomChange, reportedZoomed]);

  const stopAnimations = React.useCallback(() => {
    'worklet';
    cancelAnimation(scale);
    cancelAnimation(translateX);
    cancelAnimation(translateY);
  }, [scale, translateX, translateY]);

  const completeResetAnimation = React.useCallback((
    finished: boolean | undefined,
    sequence: number,
  ) => {
    'worklet';
    if (!finished || resetSequence.value !== sequence) return;

    completedResetAnimations.value += 1;
    if (completedResetAnimations.value < 3) return;

    // The root clone and parent scrolling remain active until every transform
    // has reached identity, preventing a clipped snap during the last frames.
    overlayActive.value = 0;
    reportZoomState(false);
  }, [completedResetAnimations, overlayActive, reportZoomState, resetSequence]);

  const resetToIdentity = React.useCallback(() => {
    'worklet';
    stopAnimations();
    resetSequence.value += 1;
    const sequence = resetSequence.value;
    completedResetAnimations.value = 0;
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    scale.value = withSpring(1, SPRING_CONFIG, (finished) => {
      completeResetAnimation(finished, sequence);
    });
    translateX.value = withSpring(0, SPRING_CONFIG, (finished) => {
      completeResetAnimation(finished, sequence);
    });
    translateY.value = withSpring(0, SPRING_CONFIG, (finished) => {
      completeResetAnimation(finished, sequence);
    });
  }, [
    completeResetAnimation,
    completedResetAnimations,
    resetSequence,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    stopAnimations,
    translateX,
    translateY,
  ]);

  const settlePersistentZoom = React.useCallback(() => {
    'worklet';
    if (scale.value <= minScale + ZOOM_EPSILON) {
      resetToIdentity();
      return;
    }

    const settledScale = Math.min(scale.value, maxScale);
    const clampedX = clampTranslate(translateX.value, width, width * settledScale);
    const clampedY = clampTranslate(translateY.value, height, height * settledScale);

    scale.value = withSpring(settledScale, SPRING_CONFIG);
    translateX.value = withSpring(clampedX, SPRING_CONFIG);
    translateY.value = withSpring(clampedY, SPRING_CONFIG);
    savedScale.value = settledScale;
    savedTranslateX.value = clampedX;
    savedTranslateY.value = clampedY;
    reportZoomState(true);
  }, [
    height,
    maxScale,
    minScale,
    reportZoomState,
    resetToIdentity,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    translateX,
    translateY,
    width,
  ]);

  React.useEffect(() => {
    if (!usesRootOverlay || !zoomOverlay || !cachedSource) return;

    zoomOverlay.registerOverlay({
      id: overlayId,
      source: cachedSource as NonNullable<React.ComponentProps<typeof ExpoImage>['source']>,
      width,
      height,
      borderRadius,
      contentFit,
      active: overlayActive,
      pageX: overlayPageX,
      pageY: overlayPageY,
      scale,
      translateX,
      translateY,
    });

    return () => {
      overlayActive.value = 0;
      zoomOverlay.unregisterOverlay(overlayId);
    };
  }, [
    borderRadius,
    cachedSource,
    contentFit,
    height,
    overlayActive,
    overlayId,
    overlayPageX,
    overlayPageY,
    scale,
    translateX,
    translateY,
    usesRootOverlay,
    width,
    zoomOverlay,
  ]);

  React.useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    reportedZoomed.value = false;
    pinchActive.value = false;
    panActive.value = false;
    overlayActive.value = 0;
    resetSequence.value += 1;
    completedResetAnimations.value = 0;
    onZoomChangeRef.current?.(false);

    return () => {
      overlayActive.value = 0;
    };
  }, [
    completedResetAnimations,
    height,
    overlayActive,
    panActive,
    pinchActive,
    reportedZoomed,
    resetKey,
    resetSequence,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    translateX,
    translateY,
    width,
    zoomMode,
  ]);

  const pinch = React.useMemo(() => {
    const pinchGesture = Gesture.Pinch()
      .onStart((event) => {
        stopAnimations();
        pinchActive.value = true;
        if (usesRootOverlay) {
          const frame = measure(containerRef);
          if (frame) {
            overlayPageX.value = frame.pageX;
            overlayPageY.value = frame.pageY;
            overlayActive.value = 1;
          }
        }
        reportZoomState(true);
        savedScale.value = scale.value;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        startFocalX.value = event.focalX - width / 2;
        startFocalY.value = event.focalY - height / 2;
        currentFocalX.value = startFocalX.value;
        currentFocalY.value = startFocalY.value;
      })
      .onUpdate((event) => {
        currentFocalX.value = event.focalX - width / 2;
        currentFocalY.value = event.focalY - height / 2;

        const newScale = rubberBandScale(savedScale.value * event.scale, minScale, maxScale);
        const scaleRatio = newScale / savedScale.value;
        scale.value = newScale;

        const nextTranslateX = currentFocalX.value
          + (savedTranslateX.value - startFocalX.value) * scaleRatio;
        const nextTranslateY = currentFocalY.value
          + (savedTranslateY.value - startFocalY.value) * scaleRatio;

        translateX.value = rubberBandTranslate(nextTranslateX, width, width * newScale);
        translateY.value = rubberBandTranslate(nextTranslateY, height, height * newScale);
      })
      .onFinalize(() => {
        if (!pinchActive.value) return;
        pinchActive.value = false;

        if (zoomMode === 'transient') {
          resetToIdentity();
        } else {
          settlePersistentZoom();
        }
      });

    return pinchGesture;
  }, [
    containerRef,
    currentFocalX,
    currentFocalY,
    height,
    maxScale,
    minScale,
    overlayActive,
    overlayPageX,
    overlayPageY,
    pinchActive,
    reportZoomState,
    resetToIdentity,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    settlePersistentZoom,
    startFocalX,
    startFocalY,
    stopAnimations,
    translateX,
    translateY,
    width,
    zoomMode,
    usesRootOverlay,
  ]);

  const pan = React.useMemo(() => Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .averageTouches(true)
    .manualActivation(true)
    .onTouchesMove((_event, manager) => {
      if (scale.value > minScale + ZOOM_EPSILON) {
        manager.activate();
      } else {
        manager.fail();
      }
    })
    .onStart(() => {
      stopAnimations();
      panActive.value = true;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      reportZoomState(true);
      const nextTranslateX = savedTranslateX.value + event.translationX;
      const nextTranslateY = savedTranslateY.value + event.translationY;

      translateX.value = rubberBandTranslate(nextTranslateX, width, width * scale.value);
      translateY.value = rubberBandTranslate(nextTranslateY, height, height * scale.value);
    })
    .onFinalize(() => {
      if (!panActive.value) return;
      panActive.value = false;
      settlePersistentZoom();
    }), [
    height,
    minScale,
    panActive,
    reportZoomState,
    savedTranslateX,
    savedTranslateY,
    scale,
    settlePersistentZoom,
    stopAnimations,
    translateX,
    translateY,
    width,
  ]);

  const doubleTap = React.useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      if (scale.value > minScale + ZOOM_EPSILON) {
        resetToIdentity();
        return;
      }

      stopAnimations();
      const targetScale = Math.min(2.5, maxScale);
      const tapOriginX = event.x - width / 2;
      const tapOriginY = event.y - height / 2;
      const ratio = 1 - targetScale;
      const targetX = clampTranslate(tapOriginX * ratio, width, width * targetScale);
      const targetY = clampTranslate(tapOriginY * ratio, height, height * targetScale);

      scale.value = withTiming(targetScale, DOUBLE_TAP_TIMING_CONFIG);
      translateX.value = withTiming(targetX, DOUBLE_TAP_TIMING_CONFIG);
      translateY.value = withTiming(targetY, DOUBLE_TAP_TIMING_CONFIG);
      savedScale.value = targetScale;
      savedTranslateX.value = targetX;
      savedTranslateY.value = targetY;
      reportZoomState(true);
    }), [
    height,
    maxScale,
    minScale,
    reportZoomState,
    resetToIdentity,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    stopAnimations,
    translateX,
    translateY,
    width,
  ]);

  const singleTap = React.useMemo(() => Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(220)
    .onEnd(() => {
      runOnJS(handlePress)();
    }), [handlePress]);

  const gesture = React.useMemo(() => {
    if (zoomMode === 'transient') {
      return isPressable ? Gesture.Race(pinch, singleTap) : pinch;
    }

    const manipulation = Gesture.Simultaneous(pinch, pan);
    return isPressable
      ? Gesture.Exclusive(doubleTap, singleTap, manipulation)
      : Gesture.Exclusive(doubleTap, manipulation);
  }, [doubleTap, isPressable, pan, pinch, singleTap, zoomMode]);
  const isAccessible = isPressable || Boolean(accessibilityLabel);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: usesRootOverlay ? 1 - overlayActive.value : 1,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        ref={containerRef}
        accessible={isAccessible}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={isPressable ? 'button' : isAccessible ? 'image' : undefined}
        accessibilityActions={isPressable ? [{ name: 'activate' }] : undefined}
        onAccessibilityAction={isPressable ? handleAccessibilityAction : undefined}
        onAccessibilityTap={isPressable ? handlePress : undefined}
        style={[
          {
            width,
            height,
            overflow: 'hidden',
            borderRadius,
          },
          style,
        ]}
      >
        <Animated.View style={[{ width, height }, animatedStyle]}>
          <ExpoImage
            source={cachedSource as React.ComponentProps<typeof ExpoImage>['source']}
            style={{ width, height }}
            contentFit={contentFit}
            cachePolicy="memory-disk"
            onError={() => recoverSignedMedia(remoteUri)}
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

export default PinchZoomImage;
