import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PastChallengesRowProps {
  count: number;
  onPress: () => void;
}

const PastChallengesRow: React.FC<PastChallengesRowProps> = ({
  count,
  onPress,
}) => (
  <TouchableOpacity
    style={styles.container}
    onPress={onPress}
    activeOpacity={0.78}
    accessibilityRole="button"
    accessibilityLabel={`Open ${count} past challenges`}
  >
    <View>
      <Text style={styles.title}>Past challenges</Text>
      <Text style={styles.subtitle}>Completed and left · {count}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#9C79FF" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    minHeight: 62,
    marginTop: 18,
    paddingTop: 15,
    paddingHorizontal: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#2A2831',
  },
  title: {
    color: '#18142F',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: '#7e7885',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    marginTop: 3,
  },
});

export default PastChallengesRow;
