import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Centralized haptic feedback utility for ChallengeSphere
 * Provides consistent haptic feedback across the app
 */

export const HapticFeedback = {
  // Light impact for subtle interactions
  light: () => {
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    } else if (Platform.OS === 'android') {
      void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key).catch(() => undefined);
    }
  },

  // Medium impact for standard interactions
  medium: () => {
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    } else if (Platform.OS === 'android') {
      void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click).catch(() => undefined);
    }
  },

  // Heavy impact for significant interactions
  heavy: () => {
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
    } else if (Platform.OS === 'android') {
      void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press).catch(() => undefined);
    }
  },

  // Success feedback for positive actions
  success: () => {
    if (Platform.OS === 'ios') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } else if (Platform.OS === 'android') {
      void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm).catch(() => undefined);
    }
  },

  // Warning feedback for cautionary actions
  warning: () => {
    if (Platform.OS === 'ios') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    } else if (Platform.OS === 'android') {
      void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Gesture_End).catch(() => undefined);
    }
  },

  // Error feedback for negative actions
  error: () => {
    if (Platform.OS === 'ios') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } else if (Platform.OS === 'android') {
      void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject).catch(() => undefined);
    }
  },

  // Selection feedback for navigation and selection
  selection: () => {
    if (Platform.OS === 'ios') {
      void Haptics.selectionAsync().catch(() => undefined);
    } else if (Platform.OS === 'android') {
      void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick).catch(() => undefined);
    }
  },

  // Custom haptic patterns for specific actions
  
  // Button press - light feedback
  buttonPress: () => {
    HapticFeedback.light();
  },

  // Tab switch - selection feedback
  tabSwitch: () => {
    HapticFeedback.selection();
  },

  // Challenge creation success
  challengeCreated: () => {
    HapticFeedback.success();
  },

  // Challenge joined
  challengeJoined: () => {
    HapticFeedback.medium();
  },

  // Challenge completed
  challengeCompleted: () => {
    // Double success for achievement
    HapticFeedback.success();
    setTimeout(() => HapticFeedback.success(), 100);
  },

  // Upload complete
  uploadComplete: () => {
    HapticFeedback.success();
  },

  // Like/heart action
  like: () => {
    HapticFeedback.light();
  },

  // Follow/unfollow action
  follow: () => {
    HapticFeedback.medium();
  },

  // Delete/destructive action
  delete: () => {
    HapticFeedback.warning();
  },

  // Error action (failed upload, network error, etc.)
  actionError: () => {
    HapticFeedback.error();
  },

  // Swipe/scroll through content
  swipe: () => {
    HapticFeedback.light();
  },

  // Long press actions
  longPress: () => {
    HapticFeedback.medium();
  },

  // Refresh/pull to refresh
  refresh: () => {
    HapticFeedback.light();
  },

  // Navigation back
  navigationBack: () => {
    HapticFeedback.light();
  },

  // Alert/modal appear
  modalPresent: () => {
    HapticFeedback.light();
  },

  // Alert/modal dismiss
  modalDismiss: () => {
    HapticFeedback.light();
  },

  // Search action
  search: () => {
    HapticFeedback.selection();
  },

  // Camera/media capture
  capture: () => {
    HapticFeedback.medium();
  },

  // Achievement unlocked
  achievement: () => {
    // Triple light for celebration
    HapticFeedback.light();
    setTimeout(() => HapticFeedback.medium(), 80);
    setTimeout(() => HapticFeedback.light(), 160);
  },

  // Level up
  levelUp: () => {
    // Progressive feedback for level up
    HapticFeedback.light();
    setTimeout(() => HapticFeedback.medium(), 100);
    setTimeout(() => HapticFeedback.heavy(), 200);
  },

  // Streak milestone
  streakMilestone: () => {
    HapticFeedback.success();
    setTimeout(() => HapticFeedback.medium(), 150);
  },

  // Invitation sent
  invitationSent: () => {
    HapticFeedback.success();
  },

  // Invitation received
  invitationReceived: () => {
    HapticFeedback.medium();
  }
};

export default HapticFeedback;
