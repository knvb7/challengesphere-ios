import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AvatarImage from './AvatarImage';
import OfficialAccountBadge from './OfficialAccountBadge';
import {
  getGlobalCreatorDisplayUsername,
  isOfficialGlobalCreator,
  OFFICIAL_ACCOUNT_AVATAR_SOURCE,
} from '../../utils/globalChallenges';

interface FollowActionSheetProps {
  visible: boolean;
  username: string;
  profilePicUrl?: string | null;
  isFollowing: boolean;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function FollowActionSheet({
  visible,
  username,
  profilePicUrl,
  isFollowing,
  pending = false,
  onCancel,
  onConfirm,
}: FollowActionSheetProps) {
  const cleanUsername = username.replace(/^@/, '');
  const isOfficialAccount = isOfficialGlobalCreator(cleanUsername);
  const visibleUsername = getGlobalCreatorDisplayUsername(cleanUsername);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={pending ? undefined : onCancel}
    >
      <View style={styles.screen}>
        <Pressable
          style={styles.backdrop}
          onPress={pending ? undefined : onCancel}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />
          <View style={styles.identity}>
            <AvatarImage
              uri={profilePicUrl}
              fallbackSource={isOfficialAccount ? OFFICIAL_ACCOUNT_AVATAR_SOURCE : undefined}
              size={54}
              style={isOfficialAccount ? styles.officialAvatar : undefined}
            />
            <View style={styles.identityCopy}>
              <Text style={styles.title}>
                {isFollowing ? 'Unfollow this challenger?' : 'Follow this challenger?'}
              </Text>
              <View style={styles.usernameRow}>
                <Text style={styles.username} numberOfLines={1}>@{visibleUsername}</Text>
                {isOfficialAccount && <OfficialAccountBadge compact />}
              </View>
            </View>
            <View style={[styles.actionIcon, isFollowing && styles.actionIconDestructive]}>
              <Ionicons
                name={isFollowing ? 'person-remove-outline' : 'person-add-outline'}
                size={21}
                color={isFollowing ? '#FF8A8A' : '#B7A0FF'}
              />
            </View>
          </View>

          <Text style={styles.message}>
            {isFollowing
              ? 'Their updates will no longer appear in your social activity.'
              : 'Stay connected to their challenges, progress, and milestones.'}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={pending}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, isFollowing && styles.unfollowButton]}
              onPress={onConfirm}
              disabled={pending}
              activeOpacity={0.82}
              feedbackTiming="after-paint"
            >
              {pending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons
                  name={isFollowing ? 'person-remove' : 'person-add'}
                  size={17}
                  color="#ffffff"
                />
              )}
              <Text style={styles.confirmText}>{isFollowing ? 'Unfollow' : 'Follow'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#2b2b2b',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444444',
    alignSelf: 'center',
    marginBottom: 20,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
  },
  title: {
    color: '#18142F',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  username: {
    color: '#8e8e8e',
    fontSize: 13,
    marginTop: 3,
    flexShrink: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  officialAvatar: {
    borderWidth: 2,
    borderColor: '#8d67ff',
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(71,0,236,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconDestructive: {
    backgroundColor: 'rgba(255,82,82,0.12)',
  },
  message: {
    color: '#969696',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#343434',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#5F5968',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1.25,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#4700ec',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  unfollowButton: {
    backgroundColor: '#b93b45',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
