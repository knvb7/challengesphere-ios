import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatItemProps {
  count?: number;
  label: string;
  onPress?: () => void;
  hidden?: boolean;
}

interface ProfileStatsProps {
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  challengesCount?: number;
  onPostsPress?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  onChallengesPress?: () => void;
}

const StatItem: React.FC<StatItemProps> = ({ count, label, onPress }) => {
  const isHidden = count === undefined;
  const isDisabled = isHidden || !onPress;

  const formatCount = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <TouchableOpacity
      onPress={isDisabled ? undefined : onPress}
      style={styles.statItem}
      activeOpacity={isDisabled ? 1 : 0.7}
      disabled={isDisabled}
    >
      <Text style={[styles.statNumber, isHidden && styles.statHidden]}>{isHidden ? '—' : formatCount(count!)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

const ProfileStats: React.FC<ProfileStatsProps> = ({
  postsCount = 0,
  followersCount = 0,
  followingCount = 0,
  challengesCount = 0,
  onPostsPress,
  onFollowersPress,
  onFollowingPress,
  onChallengesPress,
}) => {
  return (
    <View style={styles.statsContainer}>
      <StatItem
        count={postsCount}
        label="Posts"
        onPress={onPostsPress}
      />
      <StatItem
        count={challengesCount}
        label="Challenges"
        onPress={onChallengesPress}
      />
      <StatItem
        count={followersCount}
        label="Followers"
        onPress={onFollowersPress}
      />
      <StatItem
        count={followingCount}
        label="Following"
        onPress={onFollowingPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '700', // Instagram uses bold numbers
    color: '#000000',
    marginBottom: 0,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '400',
    textTransform: 'lowercase',
    letterSpacing: 0.2,
  },
  statHidden: {
    color: '#000000',
    fontSize: 15,
  },
});

export default ProfileStats;
