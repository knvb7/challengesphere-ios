import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { FEED_COMING_SOON_MESSAGE, formatChallengerCount } from '../../constants/feed';
import { useTotalUserCount } from '../../hooks/useUsers';

const activityRows = [
  { icon: 'flame-outline' as const, color: '#ffb86b', title: 'Momentum', detail: 'Daily progress from your circle' },
  { icon: 'trophy-outline' as const, color: '#b7a0ff', title: 'Milestones', detail: 'Challenge wins worth celebrating' },
  { icon: 'people-outline' as const, color: '#66e0b8', title: 'Together', detail: 'Friends showing up consistently' },
];

export default function FeedComingSoon() {
  const { data: totalUserCountData, isError, isLoading } = useTotalUserCount();
  const float = useSharedValue(0);
  const orbitSpin = useSharedValue(0);
  const reveal = useSharedValue(0);
  const challengerCountLabel = isError
    ? 'Unavailable'
    : formatChallengerCount(totalUserCountData?.totalUsers);

  useEffect(() => {
    reveal.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    orbitSpin.value = withRepeat(
      withTiming(1, { duration: 7600, easing: Easing.linear }),
      -1,
      false,
    );
    float.value = withDelay(
      500,
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [float, orbitSpin, reveal]);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: (1 - reveal.value) * 14 + float.value * -4 },
      { scale: 0.96 + reveal.value * 0.04 },
    ],
  }));

  const orbitSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitSpin.value * 360}deg` }],
  }));

  const flameIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitSpin.value * -360}deg` }],
  }));

  const trophyIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitSpin.value * -360}deg` }],
  }));

  const peopleIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitSpin.value * -360}deg` }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.hero, heroStyle]}>
        <LinearGradient
          colors={['rgba(71,0,236,0.28)', 'rgba(20,20,20,0.96)']}
          style={styles.heroGlow}
        >
          <View style={styles.orbit}>
            <Animated.View style={[styles.signalOrbit, orbitSpinStyle]}>
              <View style={[styles.signal, styles.signalTop]}>
                <Animated.View style={flameIconStyle}>
                  <Ionicons name="flame" size={18} color="#FFB86B" />
                </Animated.View>
              </View>
              <View style={[styles.signal, styles.signalRight]}>
                <Animated.View style={trophyIconStyle}>
                  <Ionicons name="trophy" size={18} color="#B7A0FF" />
                </Animated.View>
              </View>
              <View style={[styles.signal, styles.signalLeft]}>
                <Animated.View style={peopleIconStyle}>
                  <Ionicons name="people" size={18} color="#66E0B8" />
                </Animated.View>
              </View>
            </Animated.View>
            <View style={styles.centerMark}>
              <Ionicons name="pulse" size={34} color="#ffffff" />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Text style={styles.title}>The feed is coming soon</Text>
      <Text style={styles.message}>{FEED_COMING_SOON_MESSAGE}</Text>

      <View style={styles.preview}>
        {activityRows.map((row) => (
          <View key={row.title} style={styles.activityRow}>
            <View style={[styles.activityIcon, { backgroundColor: `${row.color}18` }]}>
              <Ionicons name={row.icon} size={18} color={row.color} />
            </View>
            <View style={styles.activityCopy}>
              <Text style={styles.activityTitle}>{row.title}</Text>
              <Text style={styles.activityDetail}>{row.detail}</Text>
            </View>
            <View style={[styles.activityDot, { backgroundColor: row.color }]} />
          </View>
        ))}
      </View>

      <View style={styles.challengerCount}>
        <View>
          <Text style={styles.challengerCountLabel}>Current challengers</Text>
          <Text style={styles.challengerCountHint}>The community is growing</Text>
        </View>
        <View style={styles.challengerCountValue}>
          {isLoading ? <ActivityIndicator size="small" color="#B7A0FF" /> : null}
          <Text style={styles.challengerCountNumber}>{challengerCountLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingBottom: 52,
  },
  hero: {
    width: 136,
    height: 136,
    marginBottom: 22,
  },
  heroGlow: {
    width: '100%',
    height: '100%',
    borderRadius: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(183,160,255,0.28)',
  },
  orbit: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  signalOrbit: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
  },
  centerMark: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4700ec',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7B4DFF',
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 8,
    zIndex: 2,
  },
  signal: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalTop: {
    top: 0,
    left: 41,
  },
  signalRight: {
    right: 4,
    bottom: 16,
  },
  signalLeft: {
    left: 4,
    bottom: 16,
  },
  title: {
    color: '#18142F',
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    maxWidth: 330,
    color: '#989898',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  preview: {
    width: '100%',
    maxWidth: 390,
    marginTop: 22,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E7E3EF',
  },
  activityRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E7E3EF',
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCopy: {
    flex: 1,
    marginLeft: 11,
  },
  activityTitle: {
    color: '#18142F',
    fontSize: 13,
    fontWeight: '600',
  },
  activityDetail: {
    color: '#777777',
    fontSize: 11,
    marginTop: 2,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  challengerCount: {
    width: '100%',
    maxWidth: 390,
    minHeight: 66,
    marginTop: 16,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  challengerCountLabel: {
    color: '#18142F',
    fontSize: 12,
    fontWeight: '600',
  },
  challengerCountHint: {
    color: '#6f6f6f',
    fontSize: 10,
    marginTop: 3,
  },
  challengerCountValue: {
    minWidth: 66,
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  challengerCountNumber: {
    color: '#18142F',
    fontSize: 18,
    fontWeight: '700',
  },
});
