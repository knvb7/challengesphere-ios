import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import ChallengeSummary from './ChallengeSummary';
import CommentAndCount from './CommentAndCount';
import GenuinityAndCount from './GenuinityAndCount';
import AvatarImage from './AvatarImage';
import PinchZoomImage from './PinchZoomImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface PhotoFeedItemData {
  id: string;
  photoUrl: string;
  challengeSummary?: string;
  userName: string;
  userPhoto: string;
  challengeTitle?: string;
  challengeName?: string;
  participantCount?: number;
  genuineCount?: number;
  ingenuineCount?: number;
  commentCount?: number;
  submissionId?: number;
}

interface PhotoFeedItemProps {
  data: PhotoFeedItemData;
  isGloried?: boolean;
  isUngloried?: boolean;
  onGenuinePress?: () => void;
  onIngenuinePress?: () => void;
  onCommentSubmit?: (comment: string) => void;
  onUserPress?: () => void;
}

const PhotoFeedItem: React.FC<PhotoFeedItemProps> = ({
  data,
  isGloried = false,
  isUngloried = false,
  onGenuinePress,
  onIngenuinePress,
  onCommentSubmit,
  onUserPress,
}) => {
  const submissionId = data.submissionId || parseInt(data.id, 10) || 0;
  return (
    <View style={styles.feedItem}>
      {/* User header */}
      <TouchableOpacity style={styles.userHeader} onPress={onUserPress} activeOpacity={onUserPress ? 0.8 : 1}>
        <AvatarImage uri={data.userPhoto} size={40} style={styles.avatar} />
        <Text style={styles.username}>{data.userName}</Text>
      </TouchableOpacity>

      {/* Photo */}
      <PinchZoomImage
        source={{ uri: data.photoUrl }}
        width={SCREEN_WIDTH - 20}
        height={SCREEN_WIDTH - 20}
        borderRadius={0}
        resizeMode="cover"
        style={{ backgroundColor: '#111' }}
      />

      {/* Challenge + description below photo */}
      <View style={styles.contentSection}>
        <ChallengeSummary
          challengeName={data.challengeName || 'Challenge'}
          title={data.challengeTitle || data.challengeSummary || 'Challenge Photo'}
        />
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <GenuinityAndCount
          genuineCount={data.genuineCount || 0}
          ingenuineCount={data.ingenuineCount || 0}
          submissionId={submissionId}
          isGloried={isGloried}
          isUngloried={isUngloried}
          onGenuinePress={onGenuinePress}
          onIngenuinePress={onIngenuinePress}
        />
        <View style={styles.spacer} />
        <CommentAndCount
          commentCount={data.commentCount || 0}
          submissionId={submissionId}
          onCommentSubmit={onCommentSubmit}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  feedItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 10,
    marginVertical: 14,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#E7E3EF',
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18142F',
  },
  contentSection: {
    paddingBottom: 0,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  spacer: {
    flex: 1,
  },
});

export default PhotoFeedItem;
