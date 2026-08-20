import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type GenericUserAvatarProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export default function GenericUserAvatar({
  size = 44,
  style,
  accessibilityLabel = 'Profile picture',
}: GenericUserAvatarProps) {
  const iconSize = Math.max(18, Math.round(size * 0.52));

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <Ionicons name="person" size={iconSize} color="#D8D2E0" />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    overflow: 'hidden',
  },
});
