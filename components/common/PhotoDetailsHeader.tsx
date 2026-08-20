import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';

interface PhotoDetailsHeaderProps {
  title?: string;
  onBackPress: () => void;
  rightAction?: React.ReactNode;
}

export default function PhotoDetailsHeader({
  title = 'Photo',
  onBackPress,
  rightAction,
}: PhotoDetailsHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBackPress}
        style={styles.headerButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={23} color="#18142F" />
      </TouchableOpacity>

      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>

      <View style={styles.actionSlot}>
        {rightAction ?? <View style={styles.headerButtonPlaceholder} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 62,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F7FC',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  headerTitle: {
    flex: 1,
    paddingHorizontal: 12,
    color: '#18142F',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionSlot: {
    width: 40,
    height: 40,
  },
  headerButtonPlaceholder: {
    width: 40,
    height: 40,
  },
});
