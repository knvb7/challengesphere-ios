import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { VioletColors } from '../../constants/Colors';
import type { ProfileInterest } from '../../utils/profileInterests';

type ProfileTopInterestsProps = {
  interests: ProfileInterest[];
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const getInterestIcon = (label: string): IoniconName => {
  const normalizedLabel = label.toLocaleLowerCase();

  if (/code|coding|software|program/.test(normalizedLabel)) return 'code-slash-outline';
  if (/fitness|workout|gym|health|sport|run/.test(normalizedLabel)) return 'barbell-outline';
  if (/learn|study|read|book|education/.test(normalizedLabel)) return 'book-outline';
  if (/creative|art|design|photo|music/.test(normalizedLabel)) return 'color-palette-outline';
  if (/food|cook|nutrition/.test(normalizedLabel)) return 'restaurant-outline';
  if (/mind|meditat|wellness/.test(normalizedLabel)) return 'leaf-outline';
  if (/productiv|career|business/.test(normalizedLabel)) return 'briefcase-outline';

  return 'pricetag-outline';
};

export default function ProfileTopInterests({ interests }: ProfileTopInterestsProps) {
  const visibleInterests = interests.slice(0, 3);

  if (visibleInterests.length === 0) return null;

  return (
    <View style={styles.container} accessibilityLabel="Top interests based on challenges created">
      <View style={styles.interestsRow}>
        {visibleInterests.map((interest) => (
          <View
            key={interest.label.toLocaleLowerCase()}
            style={styles.interestPill}
            accessibilityLabel={`${interest.label}, ${interest.count} challenges created`}
          >
            <Ionicons
              name={getInterestIcon(interest.label)}
              size={12}
              color={VioletColors.primary}
            />
            <Text style={styles.interestLabel} numberOfLines={1}>
              {interest.label}
            </Text>
            <Text style={styles.interestCount}>· {interest.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 7,
    marginTop: 5,
  },
  interestsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 6,
  },
  interestPill: {
    minWidth: 0,
    height: 26,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: VioletColors.border,
    borderRadius: 17,
    backgroundColor: VioletColors.surface,
  },
  interestLabel: {
    minWidth: 0,
    flexShrink: 1,
    color: '#000000',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  interestCount: {
    flexShrink: 0,
    color: '#000000',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
});
