import hapticFeedback from '@/utils/haptics';
import type { BottomTabBarButtonProps, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import {
  CommonActions,
  NavigationHelpersContext,
} from '@react-navigation/native';
import { useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

type HapticTabProps = BottomTabBarButtonProps & {
  routeName: string;
};

export function HapticTab({ routeName, ...props }: HapticTabProps) {
  const navigation = useContext(NavigationHelpersContext) as BottomTabBarProps['navigation'] | undefined;
  const handledOnPressInRef = useRef(false);
  const resetHandledRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetHandledRef.current) clearTimeout(resetHandledRef.current);
  }, []);

  const activateTab = () => {
    if (!navigation) return false;

    const state = navigation.getState();
    const targetRoute = state.routes.find((candidate) => candidate.name === routeName);
    if (!targetRoute) return false;

    const tabPressEvent = navigation.emit({
      type: 'tabPress',
      target: targetRoute.key,
      canPreventDefault: true,
    });

    if (tabPressEvent.defaultPrevented) return true;

    // Read from the live navigator store. Render-time `focused` can be stale
    // during A -> B -> A and otherwise discard the user's newest intent.
    if (state.routes[state.index]?.key === targetRoute.key) return true;

    navigation.dispatch({
      ...CommonActions.navigate(targetRoute.name, targetRoute.params),
      target: state.key,
    });
    return true;
  };

  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (Platform.OS !== 'web') {
          if (resetHandledRef.current) {
            clearTimeout(resetHandledRef.current);
            resetHandledRef.current = null;
            handledOnPressInRef.current = false;
          }

          // Pressability can fire press-in again when a pointer leaves and
          // re-enters the press rect. Treat the whole touch as one tab intent.
          if (!handledOnPressInRef.current) {
            handledOnPressInRef.current = activateTab();
            hapticFeedback.tabSwitch();
          }
        } else {
          hapticFeedback.tabSwitch();
        }
        props.onPressIn?.(ev);
      }}
      onTouchEnd={(ev) => {
        props.onTouchEnd?.(ev);
        if (Platform.OS === 'web') return;

        if (resetHandledRef.current) clearTimeout(resetHandledRef.current);
        resetHandledRef.current = setTimeout(() => {
          handledOnPressInRef.current = false;
          resetHandledRef.current = null;
        }, 100);
      }}
      onTouchCancel={(ev) => {
        props.onTouchCancel?.(ev);
        if (resetHandledRef.current) {
          clearTimeout(resetHandledRef.current);
          resetHandledRef.current = null;
        }
        handledOnPressInRef.current = false;
      }}
      onPress={(ev) => {
        if (Platform.OS === 'web') {
          // PlatformPressable has already filtered modifier clicks and links;
          // use live state here too so rapid A -> B -> A is never discarded.
          if (!activateTab()) props.onPress?.(ev);
          return;
        }

        if (handledOnPressInRef.current) {
          if (resetHandledRef.current) {
            clearTimeout(resetHandledRef.current);
            resetHandledRef.current = null;
          }
          handledOnPressInRef.current = false;
          return;
        }

        // Accessibility activation can fire onPress without pointer press-in.
        if (!activateTab()) props.onPress?.(ev);
      }}
    />
  );
}
