import { Ionicons } from '@expo/vector-icons';
import { AppPressable as Pressable } from '@/components/common/AppPressable';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppMessage,
  AppMessageType,
  subscribeToAppMessages,
} from '../utils/appMessage';

const DISPLAY_DURATION_MS = 3200;

const MESSAGE_TREATMENT: Record<
  AppMessageType,
  {
    accent: string;
    background: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
  }
> = {
  success: { accent: '#35d98a', background: '#10251d', icon: 'checkmark-circle' },
  error: { accent: '#ff6b70', background: '#2b1518', icon: 'alert-circle' },
  warning: { accent: '#f6c453', background: '#2a2314', icon: 'warning' },
  info: { accent: '#8f7cff', background: '#19182c', icon: 'information-circle' },
};

export default function AppMessageHost() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<AppMessage | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = useSharedValue(-24);
  const opacity = useSharedValue(0);

  const clearTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const finishDismiss = useCallback(() => setMessage(null), []);

  const dismiss = useCallback(() => {
    clearTimer();
    translateY.value = withTiming(-18, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
    opacity.value = withTiming(
      0,
      { duration: 160, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) {
          runOnJS(finishDismiss)();
        }
      }
    );
  }, [clearTimer, finishDismiss, opacity, translateY]);

  useEffect(() => {
    return subscribeToAppMessages((nextMessage) => {
      clearTimer();
      setMessage(nextMessage);
      translateY.value = -24;
      opacity.value = 0;
      translateY.value = withTiming(0, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, { duration: 180 });
      hideTimer.current = setTimeout(
        dismiss,
        nextMessage.duration ?? DISPLAY_DURATION_MS
      );
    });
  }, [clearTimer, dismiss, opacity, translateY]);

  useEffect(() => clearTimer, [clearTimer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!message) {
    return null;
  }

  const treatment = MESSAGE_TREATMENT[message.type];

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { paddingTop: Math.max(insets.top, 10) }]}
    >
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          styles.message,
          {
            backgroundColor: treatment.background,
            borderColor: `${treatment.accent}66`,
          },
          animatedStyle,
        ]}
      >
        <View style={[styles.iconFrame, { backgroundColor: `${treatment.accent}1f` }]}>
          <Ionicons name={treatment.icon} size={21} color={treatment.accent} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{message.title}</Text>
          {!!message.message && (
            <Text style={styles.body} numberOfLines={3}>
              {message.message}
            </Text>
          )}
        </View>
        <Pressable
          accessibilityLabel="Dismiss message"
          accessibilityRole="button"
          hitSlop={10}
          onPress={dismiss}
          style={styles.dismissButton}
        >
          <Ionicons name="close" size={18} color="#a7a7b1" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
    paddingHorizontal: 14,
  },
  message: {
    minHeight: 62,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingLeft: 12,
    paddingRight: 8,
    borderWidth: 1,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  iconFrame: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 11,
  },
  title: {
    color: '#f7f7fb',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  body: {
    color: '#b8b8c2',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
  dismissButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
