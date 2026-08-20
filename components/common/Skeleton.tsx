import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SHIMMER_WIDTH = SCREEN_WIDTH * 1.5;

// ─── Hook: shared shimmer value ───────────────────────────────────────────────
export const useSkeletonShimmer = () => {
  const translateX = useSharedValue(-SHIMMER_WIDTH);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(SHIMMER_WIDTH, { duration: 1100, easing: Easing.linear }),
      -1,
      false
    );
  }, [translateX]);

  return translateX;
};

// ─── Single shimmer block ─────────────────────────────────────────────────────
interface SkeletonBlockProps {
  translateX: SharedValue<number>;
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  translateX,
  width = '100%',
  height,
  borderRadius = 6,
  style,
}) => {
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        styles.block,
        { width: width as any, height, borderRadius },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmer, shimmerStyle]}>
        <LinearGradient
          colors={['#1a1a1a', '#2a2a2a', '#333', '#2a2a2a', '#1a1a1a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

// ─── Row of shimmer blocks (convenience) ─────────────────────────────────────
export const SkeletonRow: React.FC<{
  translateX: SharedValue<number>;
  children: React.ReactNode;
  gap?: number;
  style?: ViewStyle;
}> = ({ children, gap = 8, style }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>
    {children}
  </View>
);

// ─── Preset: user avatar + two text lines ────────────────────────────────────
export const SkeletonUserRow: React.FC<{
  translateX: SharedValue<number>;
  avatarSize?: number;
  style?: ViewStyle;
}> = ({ translateX, avatarSize = 40, style }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>
    <SkeletonBlock translateX={translateX} width={avatarSize} height={avatarSize} borderRadius={avatarSize / 2} />
    <View style={{ gap: 6, flex: 1 }}>
      <SkeletonBlock translateX={translateX} width="55%" height={12} borderRadius={6} />
      <SkeletonBlock translateX={translateX} width="35%" height={10} borderRadius={5} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  block: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SHIMMER_WIDTH,
  },
});
