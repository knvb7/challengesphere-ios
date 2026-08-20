import { Ionicons } from '@expo/vector-icons';
import React, { memo, useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type DailyCompletionBannerProps = {
  completedCount: number;
};

const DailyCompletionBanner = memo(function DailyCompletionBanner({
  completedCount,
}: DailyCompletionBannerProps) {
  const entrance = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0.72)).current;
  const completionText = completedCount === 1
    ? 'Your check-in is complete.'
    : `All ${completedCount} check-ins are complete.`;
  const accessibilityLabel = `All done for today. ${completionText}`;

  useEffect(() => {
    let mounted = true;
    let animation: Animated.CompositeAnimation | undefined;

    const startAnimation = () => {
      animation = Animated.parallel([
        Animated.timing(entrance, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(80),
          Animated.spring(checkScale, {
            toValue: 1,
            speed: 18,
            bounciness: 7,
            useNativeDriver: true,
          }),
        ]),
      ]);
      animation.start();
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotionEnabled) => {
        if (!mounted) return;
        if (reduceMotionEnabled) {
          entrance.setValue(1);
          checkScale.setValue(1);
          return;
        }
        startAnimation();
      })
      .catch(() => {
        if (mounted) startAnimation();
      });

    return () => {
      mounted = false;
      animation?.stop();
    };
  }, [checkScale, entrance]);

  const animatedStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [5, 0],
        }),
      },
    ],
  };

  return (
    <Animated.View
      testID="daily-completion-banner"
      style={[styles.container, animatedStyle]}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion="polite"
    >
      <Animated.View
        style={[styles.icon, { transform: [{ scale: checkScale }] }]}
        accessible={false}
      >
        <Ionicons name="checkmark" size={20} color="#07150B" />
      </Animated.View>
      <View style={styles.copy}>
        <Text style={styles.title}>All done for today</Text>
        <Text style={styles.body}>{completionText} Enjoy the rest of your day.</Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    minHeight: 78,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#32db65',
    backgroundColor: '#ECFDF3',
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#42e875',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#187A3D',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  body: {
    marginTop: 3,
    color: '#557060',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
  },
});

export default DailyCompletionBanner;
