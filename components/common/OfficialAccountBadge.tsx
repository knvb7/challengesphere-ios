import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type OfficialAccountBadgeProps = {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function OfficialAccountBadge({
  compact = false,
  style,
}: OfficialAccountBadgeProps) {
  return (
    <View
      style={[styles.badge, compact && styles.compactBadge, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Verified ChallengeSphere account"
    >
      <MaterialIcons
        name="verified"
        size={compact ? 16 : 20}
        color="#9B6DFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A45CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 5,
    elevation: 2,
  },
  compactBadge: {
    width: 16,
    height: 16,
  },
});
