import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppTouchableOpacity as TouchableOpacity } from './AppPressable';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface FloatingScreenAction {
  icon: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  loading?: boolean;
}

interface FloatingScreenControlsProps {
  onBackPress?: () => void;
  backIcon?: IoniconName;
  backAccessibilityLabel?: string;
  actions?: FloatingScreenAction[];
  tone?: 'media' | 'surface';
  topOffset?: number;
  horizontalInset?: number;
}

export default function FloatingScreenControls({
  onBackPress,
  backIcon = 'arrow-back',
  backAccessibilityLabel = 'Go back',
  actions = [],
  tone = 'surface',
  topOffset = 8,
  horizontalInset = 20,
}: FloatingScreenControlsProps) {
  const insets = useSafeAreaInsets();
  const mediaTone = tone === 'media';
  const iconColor = mediaTone ? '#FFFFFF' : '#18142F';

  if (!onBackPress && actions.length === 0) {
    return null;
  }

  const renderButton = (
    key: string,
    icon: IoniconName,
    onPress: () => void,
    accessibilityLabel: string,
    disabled = false,
    loading = false,
  ) => (
    <TouchableOpacity
      key={key}
      style={[styles.button, mediaTone ? styles.mediaButton : styles.surfaceButton]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <Ionicons name={icon} size={23} color={iconColor} />
      )}
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.container,
        {
          top: insets.top + topOffset,
          left: Math.max(horizontalInset, insets.left + 8),
          right: Math.max(horizontalInset, insets.right + 8),
        },
      ]}
      pointerEvents="box-none"
    >
      {onBackPress
        ? renderButton('back', backIcon, onBackPress, backAccessibilityLabel)
        : <View />}

      <View style={styles.actions} pointerEvents="box-none">
        {actions.map((action, index) => renderButton(
          `${action.accessibilityLabel}-${index}`,
          action.icon,
          action.onPress,
          action.accessibilityLabel,
          action.disabled,
          action.loading,
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  mediaButton: {
    backgroundColor: 'rgba(10, 8, 14, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  surfaceButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#E7E2F0',
  },
});
