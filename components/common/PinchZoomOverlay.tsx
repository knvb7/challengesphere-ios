import { Image as ExpoImage } from 'expo-image';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

type ZoomImageSource = NonNullable<React.ComponentProps<typeof ExpoImage>['source']>;
type ZoomContentFit = React.ComponentProps<typeof ExpoImage>['contentFit'];

/**
 * Transient zoom images register an invisible clone at the app root when they mount.
 * Activating the clone is then a UI-thread-only operation, so the image can lift out
 * of a clipped feed card on the first pinch frame without waiting for a React commit.
 */
export interface PinchZoomOverlayRegistration {
  id: number;
  source: ZoomImageSource;
  width: number;
  height: number;
  borderRadius: number;
  contentFit: ZoomContentFit;
  active: SharedValue<number>;
  pageX: SharedValue<number>;
  pageY: SharedValue<number>;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
}

interface PinchZoomOverlayContextValue {
  registerOverlay: (registration: PinchZoomOverlayRegistration) => void;
  unregisterOverlay: (id: number) => void;
}

const PinchZoomOverlayContext = createContext<PinchZoomOverlayContextValue | null>(null);

function PinchZoomOverlay({ overlay }: { overlay: PinchZoomOverlayRegistration }) {
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: overlay.active.value * interpolate(
      overlay.scale.value,
      [1, 1.08, 1.5],
      [0, 0.3, 0.72],
      Extrapolation.CLAMP,
    ),
  }));
  const imageStyle = useAnimatedStyle(() => ({
    left: overlay.pageX.value,
    top: overlay.pageY.value,
    opacity: overlay.active.value,
    transform: [
      { translateX: overlay.translateX.value },
      { translateY: overlay.translateY.value },
      { scale: overlay.scale.value },
    ],
  }));

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <Animated.View
        style={[
          styles.imageLayer,
          {
            width: overlay.width,
            height: overlay.height,
            borderRadius: overlay.borderRadius,
          },
          imageStyle,
        ]}
      >
        <ExpoImage
          source={overlay.source}
          style={[
            styles.image,
            {
              width: overlay.width,
              height: overlay.height,
              borderRadius: overlay.borderRadius,
            },
          ]}
          contentFit={overlay.contentFit}
          cachePolicy="memory-disk"
        />
      </Animated.View>
    </View>
  );
}

export function PinchZoomOverlayProvider({ children }: React.PropsWithChildren) {
  const [overlays, setOverlays] = useState<PinchZoomOverlayRegistration[]>([]);

  const registerOverlay = useCallback((registration: PinchZoomOverlayRegistration) => {
    setOverlays((current) => [
      ...current.filter((overlay) => overlay.id !== registration.id),
      registration,
    ]);
  }, []);

  const unregisterOverlay = useCallback((id: number) => {
    setOverlays((current) => current.filter((overlay) => overlay.id !== id));
  }, []);

  const value = useMemo(
    () => ({ registerOverlay, unregisterOverlay }),
    [registerOverlay, unregisterOverlay],
  );

  return (
    <PinchZoomOverlayContext.Provider value={value}>
      {children}
      {overlays.map((overlay) => (
        <PinchZoomOverlay key={overlay.id} overlay={overlay} />
      ))}
    </PinchZoomOverlayContext.Provider>
  );
}

export function usePinchZoomOverlay() {
  return useContext(PinchZoomOverlayContext);
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  imageLayer: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: '#111111',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 24,
  },
  image: {
    backgroundColor: '#111111',
  },
});
