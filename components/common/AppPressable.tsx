import hapticFeedback from '@/utils/haptics';
import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable as NativePressable,
  type PressableProps,
  type PressableStateCallbackType,
  TouchableOpacity as NativeTouchableOpacity,
  type TouchableOpacityProps,
  type GestureResponderEvent,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';

type FeedbackHaptic = 'none' | 'light' | 'selection';
type FeedbackTiming = 'immediate' | 'after-paint';

interface FeedbackProps {
  /** Prevents presses and exposes the busy state to assistive technology. */
  busy?: boolean;
  /** Visual strength while the finger is down. */
  feedbackOpacity?: number;
  /** Expensive actions can wait until one feedback frame has painted. */
  feedbackTiming?: FeedbackTiming;
  /** Visual feedback is universal; haptics remain opt-in to avoid double vibration. */
  haptic?: FeedbackHaptic;
}

export type AppTouchableOpacityProps = TouchableOpacityProps & FeedbackProps;
export type AppPressableProps = PressableProps & FeedbackProps & {
  /** For non-button responder surfaces such as modal event blockers. */
  feedbackDisabled?: boolean;
};

const DEFAULT_FEEDBACK_OPACITY = 0.68;
const MAX_SUBTLE_OPACITY = 0.72;

const triggerHaptic = (haptic: FeedbackHaptic) => {
  if (haptic === 'light') {
    hapticFeedback.buttonPress();
  } else if (haptic === 'selection') {
    hapticFeedback.selection();
  }
};

function useFeedbackPress(
  onPress: ((event: GestureResponderEvent) => void) | null | undefined,
  timing: FeedbackTiming,
  haptic: FeedbackHaptic,
) {
  const onPressRef = useRef(onPress);
  const firstFrameRef = useRef<number | null>(null);
  const secondFrameRef = useRef<number | null>(null);
  const waitingForPaintRef = useRef(false);

  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  useEffect(() => () => {
    if (firstFrameRef.current !== null) cancelAnimationFrame(firstFrameRef.current);
    if (secondFrameRef.current !== null) cancelAnimationFrame(secondFrameRef.current);
  }, []);

  return useCallback((event: GestureResponderEvent) => {
    triggerHaptic(haptic);

    if (timing === 'immediate') {
      onPressRef.current?.(event);
      return;
    }

    // Keep the event valid for handlers that read it after the feedback frame.
    event.persist?.();
    if (waitingForPaintRef.current) return;
    waitingForPaintRef.current = true;

    // A callback scheduled from the first RAF still runs before that frame paints.
    // The second RAF guarantees at least one visible pressed frame before costly work.
    firstFrameRef.current = requestAnimationFrame(() => {
      secondFrameRef.current = requestAnimationFrame(() => {
        waitingForPaintRef.current = false;
        firstFrameRef.current = null;
        secondFrameRef.current = null;
        onPressRef.current?.(event);
      });
    });
  }, [haptic, timing]);
}

export const AppTouchableOpacity = forwardRef<
  React.ElementRef<typeof NativeTouchableOpacity>,
  AppTouchableOpacityProps
>(function AppTouchableOpacity(
  {
    accessibilityRole,
    accessibilityState,
    activeOpacity,
    busy = false,
    disabled = false,
    feedbackOpacity = DEFAULT_FEEDBACK_OPACITY,
    feedbackTiming = 'immediate',
    haptic = 'none',
    onPress,
    ...props
  },
  ref,
) {
  const inactive = disabled || busy;
  const handlePress = useFeedbackPress(onPress, feedbackTiming, haptic);
  const hasPressAction = !!onPress || !!props.onLongPress;
  const accessibilityDisabled = inactive || accessibilityState?.disabled === true;
  const accessibilityBusy = busy || accessibilityState?.busy === true;
  const requestedOpacity = activeOpacity ?? feedbackOpacity;
  const resolvedActiveOpacity = hasPressAction && !inactive
    ? Math.min(requestedOpacity, MAX_SUBTLE_OPACITY)
    : 1;

  return (
    <NativeTouchableOpacity
      {...props}
      ref={ref}
      accessibilityRole={accessibilityRole ?? (hasPressAction ? 'button' : undefined)}
      accessibilityState={{
        ...accessibilityState,
        busy: accessibilityBusy,
        disabled: accessibilityDisabled,
      }}
      activeOpacity={resolvedActiveOpacity}
      delayPressIn={0}
      disabled={inactive}
      onPress={onPress ? handlePress : undefined}
    />
  );
});

export const AppPressable = forwardRef<View, AppPressableProps>(function AppPressable(
  {
    accessibilityRole,
    accessibilityState,
    busy = false,
    disabled = false,
    feedbackDisabled = false,
    feedbackOpacity = DEFAULT_FEEDBACK_OPACITY,
    feedbackTiming = 'immediate',
    haptic = 'none',
    onPress,
    onPressIn,
    onPressOut,
    style,
    ...props
  },
  ref,
) {
  const inactive = disabled || busy;
  const handlePress = useFeedbackPress(onPress, feedbackTiming, haptic);
  const hasPressAction = !!onPress || !!props.onLongPress;
  const accessibilityDisabled = inactive || accessibilityState?.disabled === true;
  const accessibilityBusy = busy || accessibilityState?.busy === true;
  const [pressed, setPressed] = useState(false);

  const resolveDynamicStyle = useCallback((state: PressableStateCallbackType): StyleProp<ViewStyle> => [
    typeof style === 'function' ? style(state) : null,
    !feedbackDisabled && !inactive && state.pressed
      ? { opacity: Math.min(feedbackOpacity, MAX_SUBTLE_OPACITY) }
      : null,
  ], [feedbackDisabled, feedbackOpacity, inactive, style]);

  const handlePressIn = useCallback((event: GestureResponderEvent) => {
    if (!feedbackDisabled && !inactive) {
      setPressed(true);
    }
    onPressIn?.(event);
  }, [feedbackDisabled, inactive, onPressIn]);

  const handlePressOut = useCallback((event: GestureResponderEvent) => {
    setPressed(false);
    onPressOut?.(event);
  }, [onPressOut]);

  const resolvedStyle = typeof style === 'function'
    ? resolveDynamicStyle
    : [
        style,
        !feedbackDisabled && !inactive && pressed
          ? { opacity: Math.min(feedbackOpacity, MAX_SUBTLE_OPACITY) }
          : null,
      ];

  return (
    <NativePressable
      {...props}
      ref={ref}
      accessibilityRole={accessibilityRole ?? (!feedbackDisabled && hasPressAction ? 'button' : undefined)}
      accessibilityState={{
        ...accessibilityState,
        busy: accessibilityBusy,
        disabled: accessibilityDisabled,
      }}
      disabled={inactive}
      onPress={onPress ? handlePress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={resolvedStyle}
    />
  );
});
