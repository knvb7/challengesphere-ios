import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export default function PublicChallengeBroadcastAnimation() {
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    floatLoop.start();

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
    };
  }, [float, pulse]);

  const firstRingStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.44, 0] }),
    transform: [
      {
        scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1.12] }),
      },
    ],
  };
  const secondRingStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.18, 0.34, 0] }),
    transform: [
      {
        scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.34] }),
      },
    ],
  };
  const globeFloatStyle = {
    transform: [
      {
        translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }),
      },
    ],
  };
  const beaconFloatStyle = {
    transform: [
      {
        translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.broadcastRing, styles.broadcastRingOuter, secondRingStyle]} />
      <Animated.View style={[styles.broadcastRing, firstRingStyle]} />

      <Animated.View style={[styles.globeOrb, globeFloatStyle]}>
        <Ionicons name="globe-outline" size={56} color="#DFFFE8" />
      </Animated.View>

      <Animated.View style={[styles.beaconBadge, beaconFloatStyle]}>
        <Ionicons name="radio-outline" size={18} color="#07140f" />
      </Animated.View>

      <View style={styles.discoveryLine}>
        <View style={styles.discoveryDot} />
        <View style={styles.discoveryTrack} />
        <View style={styles.discoveryDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    height: 132,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  broadcastRing: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 1,
    borderColor: '#6effa3',
    backgroundColor: '#42ff9420',
  },
  broadcastRingOuter: {
    width: 212,
    height: 212,
    borderRadius: 106,
    borderColor: '#9dffbf',
    backgroundColor: '#42ff9414',
  },
  globeOrb: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d3323',
    borderWidth: 1,
    borderColor: '#4fe58b',
    shadowColor: '#4FE58B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 7,
    zIndex: 2,
  },
  beaconBadge: {
    position: 'absolute',
    right: 76,
    top: 21,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b7ffd0',
    borderWidth: 2,
    borderColor: '#07140f',
    zIndex: 3,
  },
  discoveryLine: {
    position: 'absolute',
    left: 54,
    right: 54,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  discoveryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6effa3',
  },
  discoveryTrack: {
    flex: 1,
    height: 1,
    backgroundColor: '#2a7c50',
    marginHorizontal: 8,
  },
});
