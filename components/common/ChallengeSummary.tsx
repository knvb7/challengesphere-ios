import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ChallengeIdentityStrip from './ChallengeIdentityStrip';

interface ChallengeSummaryProps {
  challengeName: string;
  title: string;
  onPress?: () => void;
}

const ChallengeSummary: React.FC<ChallengeSummaryProps> = ({ challengeName, title, onPress }) => {
  return (
    <View style={styles.container}>
      <ChallengeIdentityStrip title={challengeName} onPress={onPress} />

      <Text style={styles.description} numberOfLines={2} selectable>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 6,
  },
  description: {
    fontSize: 12,
    color: '#000000',
    lineHeight: 17,
  },
});

export default ChallengeSummary;
