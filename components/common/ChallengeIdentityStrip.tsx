import { Ionicons } from '@expo/vector-icons';
import { AppPressable as Pressable } from '@/components/common/AppPressable';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type ChallengeIdentityStripProps = {
  title: string;
  dayNumber?: number;
  onPress?: () => void;
};

export default function ChallengeIdentityStrip({
  title,
  dayNumber,
  onPress,
}: ChallengeIdentityStripProps) {
  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={styles.icon}>
        <Ionicons name="trophy-outline" size={16} color="#4700EC" />
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{dayNumber ? `DAY ${dayNumber}` : 'CHALLENGE'}</Text>
        <Text style={styles.title} numberOfLines={2} selectable>{title}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={17} color="#777389" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E7E3EF',
    paddingVertical: 9,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
  },
  copy: { flex: 1, marginLeft: 10, marginRight: 8 },
  eyebrow: { color: '#777389', fontSize: 9, fontWeight: '700' },
  title: { color: '#18142F', fontSize: 14, lineHeight: 18, fontWeight: '600', marginTop: 2 },
});
