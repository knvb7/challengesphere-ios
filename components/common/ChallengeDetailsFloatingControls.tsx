import React from 'react';
import FloatingScreenControls, { FloatingScreenAction } from './FloatingScreenControls';

interface ChallengeDetailsFloatingControlsProps {
  onBackPress: () => void;
  onSharePress?: () => void;
  onOptionsPress?: () => void;
  optionsAccessibilityLabel?: string;
}

export default function ChallengeDetailsFloatingControls({
  onBackPress,
  onSharePress,
  onOptionsPress,
  optionsAccessibilityLabel = 'Challenge options',
}: ChallengeDetailsFloatingControlsProps) {
  const actions: FloatingScreenAction[] = [];

  if (onSharePress) {
    actions.push({
      icon: 'share-outline',
      onPress: onSharePress,
      accessibilityLabel: 'Share challenge',
    });
  }

  if (onOptionsPress) {
    actions.push({
      icon: 'ellipsis-horizontal',
      onPress: onOptionsPress,
      accessibilityLabel: optionsAccessibilityLabel,
    });
  }

  return (
    <FloatingScreenControls
      onBackPress={onBackPress}
      actions={actions}
      tone="media"
      topOffset={34}
      horizontalInset={34}
    />
  );
}
