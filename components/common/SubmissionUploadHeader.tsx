import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppTouchableOpacity as TouchableOpacity } from './AppPressable';

type SubmissionUploadHeaderProps = {
  challengeName: string;
  dayLabel: string;
  dateLabel: string;
  onClose: () => void;
  closeDisabled?: boolean;
};

export default function SubmissionUploadHeader({
  challengeName,
  dayLabel,
  dateLabel,
  onClose,
  closeDisabled = false,
}: SubmissionUploadHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          Upload to: {challengeName}
        </Text>
        <View style={styles.dayInfo}>
          <Ionicons name="calendar" size={16} color="#4700EC" />
          <Text style={styles.dayText} numberOfLines={1}>
            {dayLabel} • {dateLabel}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        disabled={closeDisabled}
        accessibilityRole="button"
        accessibilityLabel="Close submission upload"
      >
        <Ionicons name="close" size={22} color="#4700EC" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  title: {
    color: '#18142F',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 5,
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayText: {
    flex: 1,
    color: '#4700ec',
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F0ECFF',
  },
});
