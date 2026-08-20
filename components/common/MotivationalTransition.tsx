import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';
import type { ResolvedMotivationalMessage } from '../../utils/motivationalMessages';

type MotivationalTransitionVariant = 'create' | 'join';

interface MotivationalTransitionProps {
  visible: boolean;
  message: ResolvedMotivationalMessage | null;
  variant?: MotivationalTransitionVariant;
}

const MotivationalTransition = ({
  visible,
  message,
}: MotivationalTransitionProps) => {
  const [rendered, setRendered] = useState(visible);
  const renderedRef = useRef(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let exitAnimation: Animated.CompositeAnimation | null = null;

    if (visible) {
      renderedRef.current = true;
      setRendered(true);
      pulseLoop.current?.stop();
      opacity.setValue(0);
      scale.setValue(0.94);
      translateY.setValue(18);
      pulse.setValue(0);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();

      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 760,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 760,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.current = loop;
      loop.start();
      return () => loop.stop();
    }

    if (renderedRef.current) {
      pulseLoop.current?.stop();
      exitAnimation = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.98,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -10,
          duration: 180,
          useNativeDriver: true,
        }),
      ]);
      exitAnimation.start(({ finished }) => {
        if (finished) {
          renderedRef.current = false;
          setRendered(false);
        }
      });
    }

    return () => exitAnimation?.stop();
  }, [visible, opacity, pulse, scale, translateY]);

  if (!rendered || !message) {
    return null;
  }

  const dotScale = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.9, 1.16, 0.9],
  });

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale }, { translateY }],
            },
          ]}
        >
          <Text style={styles.emoji}>🏆</Text>
          <Text style={styles.greeting}>{message.greeting}</Text>
          <Text
            style={styles.title}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {message.displayTitle}!
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {message.subtitle}
          </Text>
          <View style={styles.loading}>
            <Animated.View
              style={[
                styles.loadingDot,
                { transform: [{ scale: dotScale }] },
              ]}
            />
            <Animated.View
              style={[
                styles.loadingDot,
                styles.loadingDotDelay,
                { transform: [{ scale: dotScale }] },
              ]}
            />
            <Animated.View
              style={[
                styles.loadingDot,
                styles.loadingDotDelay2,
                { transform: [{ scale: dotScale }] },
              ]}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: '100%',
    alignItems: 'center',
    padding: 40,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    color: '#777389',
    fontWeight: '500',
    marginBottom: 8,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: '#4700ec',
    marginBottom: 12,
    textAlign: 'center',
    width: '100%',
    textShadowColor: 'rgba(71, 0, 236, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#ffd700',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 40,
  },
  loading: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4700ec',
  },
  loadingDotDelay: {
    opacity: 0.7,
  },
  loadingDotDelay2: {
    opacity: 0.4,
  },
});

export default MotivationalTransition;
