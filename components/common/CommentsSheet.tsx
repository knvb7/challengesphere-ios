import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable as NativePressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import type { Comment } from '../../types/api';
import AvatarImage from './AvatarImage';

const ACCENT_LIGHT = '#6C42E8';
const SHEET_BACKGROUND = '#FFFFFF';
const MAX_COMMENT_LENGTH = 2000;
const POSITIVE_QUICK_EMOJIS = ['❤️', '🙌', '🔥', '👏', '😍', '🎉', '💯', '✨'] as const;

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (Number.isNaN(date.getTime()) || diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const getCommentId = (comment: Comment) => comment.id ?? comment.commentId ?? 0;

interface CommentCardProps {
  comment: Comment;
  currentUserId: number;
  isLast: boolean;
  onDelete?: (commentId: number) => void;
  onReport?: (commentId: number) => void;
  onUserPress?: (userId: number, username: string) => void;
}

const CommentCard = memo(function CommentCard({
  comment,
  currentUserId,
  isLast,
  onDelete,
  onReport,
  onUserPress,
}: CommentCardProps) {
  const commentId = getCommentId(comment);
  const isOwn = comment.userId === currentUserId;
  const username = comment.username?.trim() || `User #${comment.userId}`;

  return (
    <View style={styles.commentRow}>
      <View style={styles.avatarRail}>
        <TouchableOpacity
          onPress={onUserPress ? () => onUserPress(comment.userId, username) : undefined}
          activeOpacity={0.72}
          accessibilityLabel={`Open ${username}'s profile`}
        >
          <LinearGradient
            colors={isOwn ? ['#8B68F2', '#5B3FE5'] : ['#DDD4FF', '#BBA7FF']}
            style={styles.avatarRing}
          >
            <AvatarImage uri={comment.profilePicUrl} size={36} style={styles.avatar} />
          </LinearGradient>
        </TouchableOpacity>
        {!isLast ? <View style={styles.threadLine} /> : null}
      </View>

      <View
        style={[
          styles.commentBody,
          isOwn && styles.ownCommentBody,
        ]}
      >
        <View style={styles.commentMetaRow}>
          <TouchableOpacity
            style={styles.usernameButton}
            onPress={onUserPress ? () => onUserPress(comment.userId, username) : undefined}
            activeOpacity={0.72}
          >
            <Text style={styles.commentUser} numberOfLines={1}>{username}</Text>
          </TouchableOpacity>
          <View style={styles.metaDot} />
          <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
        </View>

        <Text style={styles.commentText}>{comment.content}</Text>

        {(isOwn && onDelete) || (!isOwn && onReport) ? (
          <TouchableOpacity
            style={styles.commentOptionsButton}
            onPress={() => (isOwn ? onDelete?.(commentId) : onReport?.(commentId))}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={isOwn ? 'Open comment options' : 'Report comment'}
          >
            <Ionicons name="ellipsis-horizontal" size={17} color="#8A8A92" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
});

function CommentSkeleton() {
  return (
    <View style={styles.skeletonWrap} accessibilityLabel="Loading comments">
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonCopy}>
            <View style={[styles.skeletonLine, styles.skeletonName]} />
            <View style={[styles.skeletonLine, styles.skeletonText]} />
            <View style={[styles.skeletonLine, styles.skeletonTextShort]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyConversation() {
  return (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={['rgba(143, 107, 255,0.22)', 'rgba(143, 107, 255,0.04)']}
        style={styles.emptyIconWell}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={28} color={ACCENT_LIGHT} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No comments yet</Text>
    </View>
  );
}

export interface CommentsSheetProps {
  comments: Comment[];
  commentCount: number;
  currentUserId: number;
  currentUserAvatar?: string | null;
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSubmit: () => void;
  onClose?: () => void;
  onDelete?: (commentId: number) => void;
  onReport?: (commentId: number) => void;
  onUserPress?: (userId: number, username: string) => void;
  isLoading?: boolean;
  isRefreshing?: boolean;
  isSubmitting?: boolean;
  bottomInset?: number;
  embedded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function CommentsSheet({
  comments,
  commentCount,
  currentUserId,
  currentUserAvatar,
  composerValue,
  onComposerChange,
  onSubmit,
  onClose,
  onDelete,
  onReport,
  onUserPress,
  isLoading = false,
  isRefreshing = false,
  isSubmitting = false,
  bottomInset = 0,
  embedded = false,
  style,
}: CommentsSheetProps) {
  const hasDraft = composerValue.trim().length > 0;
  const canSubmit = hasDraft && !isSubmitting;
  const appendQuickEmoji = useCallback((emoji: string) => {
    if (composerValue.length + emoji.length > MAX_COMMENT_LENGTH) return;
    onComposerChange(`${composerValue}${emoji}`);
  }, [composerValue, onComposerChange]);

  const renderComment = useCallback(({ item, index }: { item: Comment; index: number }) => (
    <CommentCard
      comment={item}
      currentUserId={currentUserId}
      isLast={index === comments.length - 1}
      onDelete={onDelete}
      onReport={onReport}
      onUserPress={onUserPress}
    />
  ), [comments.length, currentUserId, onDelete, onReport, onUserPress]);

  return (
    <Animated.View
      testID="comments-sheet"
      style={[styles.sheet, embedded ? styles.embeddedSheet : styles.modalSheet, style as any]}
    >
      <LinearGradient
        colors={['#FFFFFF', '#FBFAFD', '#F8F7FC']}
        locations={[0, 0.46, 1]}
        style={StyleSheet.absoluteFill}
      />
      {!embedded ? <View style={styles.handleBar} /> : null}

      <View testID="comments-header" style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.titleRow}>
            <Text testID="comments-title" style={styles.headerTitle}>Comments</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.refreshSlot}>
            {isRefreshing && !isLoading ? (
              <ActivityIndicator size="small" color={ACCENT_LIGHT} />
            ) : null}
          </View>

          <View testID="comments-count" style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{commentCount}</Text>
          </View>

          {onClose ? (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close comments"
            >
              <Ionicons name="close" size={20} color="#18142F" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <LinearGradient
        colors={['#8F6BFF', 'rgba(143, 107, 255,0.16)', 'rgba(143, 107, 255,0)']}
        locations={[0, 0.35, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerRule}
      />

      <View style={styles.sheetBody}>
        {isLoading ? (
          <CommentSkeleton />
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item, index) => (item.id ?? item.commentId ?? `comment-${index}`).toString()}
            renderItem={renderComment}
            style={styles.list}
            showsVerticalScrollIndicator
            contentContainerStyle={[
              styles.commentListContent,
              comments.length === 0 && styles.emptyListContent,
            ]}
            ListEmptyComponent={<EmptyConversation />}
            scrollEnabled
            alwaysBounceVertical
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            nestedScrollEnabled
            removeClippedSubviews={false}
          />
        )}

        <View
          testID="comment-input-dock"
          style={[
            styles.inputDock,
            { paddingBottom: Math.max(bottomInset, 12) },
          ]}
        >
          <View style={styles.quickEmojiRow} accessibilityLabel="Quick positive reactions">
            {POSITIVE_QUICK_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.quickEmojiButton}
                onPress={() => appendQuickEmoji(emoji)}
                haptic="selection"
                accessibilityRole="button"
                accessibilityLabel={`Add ${emoji} to comment`}
              >
                <Text style={styles.quickEmojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <LinearGradient
            testID="comment-composer"
            colors={['#DDD4FF', '#E7E3EF', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.composerFrame}
          >
            <View style={styles.composerShell}>
              <AvatarImage uri={currentUserAvatar} size={34} style={styles.inputAvatar} />
              <TextInput
                value={composerValue}
                onChangeText={onComposerChange}
                placeholder="Add a comment…"
                accessibilityLabel="Write a comment"
                placeholderTextColor="#75757D"
                style={styles.input}
                multiline
                maxLength={MAX_COMMENT_LENGTH}
                returnKeyType="default"
                blurOnSubmit={false}
                scrollEnabled
                textAlignVertical="center"
              />
              <NativePressable
                style={({ pressed }) => [
                  styles.sendButtonTouch,
                  canSubmit && styles.sendButtonActive,
                  !canSubmit && styles.sendButtonDisabled,
                  pressed && canSubmit && styles.sendButtonPressed,
                ]}
                onPress={onSubmit}
                disabled={!canSubmit}
                hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                accessibilityRole="button"
                accessibilityLabel="Post comment"
                accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
              >
                <LinearGradient
                  colors={canSubmit ? ['#7B55E7', '#4700EC'] : ['#EDEAF2', '#E7E3EF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendButton}
                >
                  <Ionicons
                    name="send"
                    size={17}
                    color={canSubmit ? '#FFFFFF' : '#8F8996'}
                    style={styles.sendIcon}
                  />
                </LinearGradient>
              </NativePressable>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: SHEET_BACKGROUND,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 -24px 80px rgba(0,0,0,0.52)',
      } as ViewStyle,
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -14 },
        shadowOpacity: 0.38,
        shadowRadius: 28,
        elevation: 24,
      },
    }),
  },
  modalSheet: {
    height: '82%',
    maxHeight: 760,
    maxWidth: 620,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomWidth: 0,
  },
  embeddedSheet: {
    flex: 1,
    borderRadius: 28,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C8C3D0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 0,
  },
  header: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#18142F',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -0.45,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  refreshSlot: {
    width: 18,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  countBadgeText: {
    color: '#4700EC',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRule: {
    width: 138,
    height: 2,
    marginLeft: 20,
    marginBottom: 2,
    borderRadius: 1,
  },
  sheetBody: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
  },
  commentListContent: {
    paddingTop: 14,
    paddingBottom: 18,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 82,
    paddingHorizontal: 18,
    gap: 12,
  },
  avatarRail: {
    width: 42,
    alignItems: 'center',
  },
  avatarRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    borderWidth: 1.5,
    borderColor: '#E7E3EF',
  },
  threadLine: {
    flex: 1,
    width: 1,
    minHeight: 28,
    marginTop: 7,
    marginBottom: 5,
    backgroundColor: '#E7E3EF',
  },
  commentBody: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    marginBottom: 9,
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 11,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
  },
  ownCommentBody: {
    paddingRight: 38,
  },
  commentMetaRow: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  usernameButton: {
    maxWidth: '68%',
  },
  commentUser: {
    color: '#18142F',
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '700',
  },
  metaDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#B7B1BF',
    marginHorizontal: 8,
  },
  commentTime: {
    color: '#77777f',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
  commentText: {
    color: '#4B4654',
    fontSize: 13.25,
    lineHeight: 20,
  },
  commentOptionsButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonWrap: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  skeletonCard: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 78,
    marginBottom: 7,
  },
  skeletonAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EDEAF2',
  },
  skeletonCopy: {
    flex: 1,
    gap: 7,
    paddingTop: 4,
    paddingBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E7E3EF',
  },
  skeletonLine: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EDEAF2',
  },
  skeletonName: {
    width: '28%',
  },
  skeletonText: {
    width: '92%',
  },
  skeletonTextShort: {
    width: '61%',
  },
  emptyState: {
    flex: 1,
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 42,
    paddingBottom: 26,
  },
  emptyIconWell: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(143, 107, 255,0.24)',
  },
  emptyTitle: {
    color: '#18142F',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  inputDock: {
    paddingTop: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E7E3EF',
  },
  quickEmojiRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  quickEmojiButton: {
    flex: 1,
    maxWidth: 44,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickEmojiText: {
    fontSize: 23,
    lineHeight: 30,
  },
  composerFrame: {
    padding: 1,
    borderRadius: 25,
  },
  composerShell: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 7,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  inputAvatar: {
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 36,
    maxHeight: 104,
    paddingHorizontal: 3,
    paddingTop: 8,
    paddingBottom: 7,
    color: '#18142F',
    fontSize: 13,
    lineHeight: 19,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  sendButtonTouch: {
    width: 44,
    minWidth: 44,
    height: 44,
    flexShrink: 0,
    padding: 2,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEE9FF',
    borderWidth: 1,
    borderColor: '#CDBFFF',
  },
  sendButtonActive: {
    shadowColor: '#4700EC',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: '#F4F2F7',
    borderColor: '#E7E3EF',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonPressed: {
    transform: [{ scale: 0.94 }],
    shadowOpacity: 0.16,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
  },
  sendIcon: {
    marginLeft: 1,
    transform: [{ rotate: '-4deg' }],
  },
});
