import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { OFFICIAL_ACCOUNT_AVATAR_SOURCE } from '../utils/globalChallenges';

export default function StartupIntro() {
  const { width, height } = useWindowDimensions();
  const compact = height < 720 || width < 370;
  const intro = useSharedValue(0);
  const orbit = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    intro.value = withTiming(1, {
      duration: 760,
      easing: Easing.out(Easing.cubic),
    });
    orbit.value = withRepeat(
      withTiming(1, {
        duration: 5200,
        easing: Easing.linear,
      }),
      -1,
      false
    );
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 1600,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, [intro, orbit, pulse]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [
      { translateY: interpolate(intro.value, [0, 1], [18, 0]) },
      { scale: interpolate(intro.value, [0, 1], [0.88, 1]) },
      { rotate: `${interpolate(orbit.value, [0, 1], [-2.5, 2.5])}deg` },
    ],
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(intro.value, [0.2, 1], [0, 1]),
    transform: [
      { translateY: interpolate(intro.value, [0.2, 1], [16, 0]) },
      { scale: interpolate(pulse.value, [0, 1], [0.995, 1.015]) },
    ],
  }));

  const logoSize = Math.min(width * 0.34, compact ? 112 : 140);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#F7F4FF', '#FFFFFF']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.ambientGlow, styles.emeraldGlow]} />
      <View style={[styles.ambientGlow, styles.goldGlow]} />
      <View style={[styles.ambientGlow, styles.blueGlow]} />

      <View style={[styles.stage, { minHeight: compact ? 420 : 520 }]}>
        <View style={styles.brandLockup}>
          <View style={[styles.logoAnchor, { width: logoSize, height: logoSize }]}>
            <Animated.View style={[styles.logoMark, { width: logoSize, height: logoSize }, logoStyle]}>
              <Image
                source={OFFICIAL_ACCOUNT_AVATAR_SOURCE}
                style={{ width: logoSize, height: logoSize, borderRadius: logoSize * 0.22 }}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          <Animated.View style={[styles.wordmarkWrap, wordmarkStyle]}>
            <Text style={[styles.wordmark, compact && styles.wordmarkCompact]}>challengesphere</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 24,
  },
  ambientGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.55,
  },
  emeraldGlow: {
    backgroundColor: '#E4DCFF',
    top: 92,
    left: -112,
  },
  goldGlow: {
    backgroundColor: '#F0ECFF',
    bottom: 112,
    right: -126,
  },
  blueGlow: {
    backgroundColor: '#DDD4FF',
    top: 244,
    right: -154,
  },
  stage: {
    width: '100%',
    maxWidth: 430,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLockup: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoAnchor: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkWrap: {
    marginTop: 22,
    alignItems: 'center',
  },
  wordmark: {
    color: '#18142F',
    fontSize: 25,
    fontWeight: '700',
  },
  wordmarkCompact: {
    fontSize: 22,
  },
});
