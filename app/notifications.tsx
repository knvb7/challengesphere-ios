import { Ionicons } from '@expo/vector-icons';
import { AppAlert as Alert } from '@/utils/appAlert';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useClearActivityNotifications,
  useIgnoreChallengeInvite,
  useMarkNotificationRead,
  useNotifications,
} from '../hooks/useNotifications';
import { useAuthContext } from '../providers/AuthProvider';
import {
  NotificationInboxState,
  notificationInboxStateService,
  sanitizeNotificationInboxItem,
} from '../services/notificationInboxStateService';
import { NotificationActionObject, NotificationItem } from '../types/api';
import { getApiErrorMessage } from '../utils/apiError';

type NotificationCategory = 'activity' | 'invites' | 'follows';

const EMPTY_INBOX_STATE: NotificationInboxState = {
  savedItems: [],
  dismissedActivityIds: [],
  removedSavedIds: [],
};

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  activity: 'Activity',
  invites: 'Invites',
  follows: 'Follows',
};

function getNotificationCategory(item: NotificationItem): NotificationCategory {
  const type = item.type?.toLowerCase();
  if (type === 'challenge_invite' || type === 'invite') return 'invites';
  if (type === 'follow') return 'follows';
  return 'activity';
}

function parseActionObject(actionObject?: string): NotificationActionObject {
  if (!actionObject) return {};
  try {
    return JSON.parse(actionObject);
  } catch {
    return {};
  }
}

function formatTime(
  timestamp?: string,
  timestampEpochMs?: number,
  serverTimeEpochMs?: number,
): string {
  const eventTimeMs = typeof timestampEpochMs === 'number' && Number.isFinite(timestampEpochMs)
    ? timestampEpochMs
    : timestamp
      ? new Date(timestamp).getTime()
      : Number.NaN;
  if (!Number.isFinite(eventTimeMs)) return '';

  const referenceTimeMs = typeof serverTimeEpochMs === 'number' && Number.isFinite(serverTimeEpochMs)
    ? serverTimeEpochMs
    : Date.now();
  const date = new Date(eventTimeMs);
  const diffMs = Math.max(0, referenceTimeMs - eventTimeMs);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type?.toLowerCase()) {
    case 'follow':
      return 'person-add';
    case 'submission':
    case 'submission_update':
      return 'image';
    case 'glory':
      return 'star';
    case 'comment':
      return 'chatbubble';
    case 'challenge_invite':
    case 'challenge_update':
    case 'invite':
      return 'trophy';
    case 'challenge_removal':
      return 'person-remove';
    case 'momentum_milestone':
      return 'trending-up';
    default:
      return 'notifications';
  }
}

function getAccentColor(type: string): string {
  switch (type?.toLowerCase()) {
    case 'follow':
      return '#22c55e';
    case 'submission':
    case 'submission_update':
      return '#38bdf8';
    case 'glory':
      return '#f8c744';
    case 'comment':
      return '#f97316';
    case 'challenge_invite':
    case 'challenge_update':
    case 'invite':
      return '#8F6BFF';
    case 'challenge_removal':
      return '#FF6B6B';
    case 'momentum_milestone':
      return '#9D7BFF';
    default:
      return '#4700ec';
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { currentUserId, user: authUser } = useAuthContext();
  const userId = currentUserId;

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useNotifications(userId, 200);
  const markReadMutation = useMarkNotificationRead();
  const {
    mutateAsync: clearActivity,
    isPending: isClearingActivity,
  } = useClearActivityNotifications();
  const ignoreInviteMutation = useIgnoreChallengeInvite();
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('activity');
  const [inboxState, setInboxState] = useState<NotificationInboxState>(EMPTY_INBOX_STATE);
  const [inboxStateReady, setInboxStateReady] = useState(false);
  const inboxUserIdRef = useRef(0);

  const notifications = useMemo(() => data?.notifications ?? [], [data?.notifications]);

  useEffect(() => {
    let active = true;
    const userChanged = inboxUserIdRef.current !== userId;
    inboxUserIdRef.current = userId;
    if (userChanged) {
      setInboxState(EMPTY_INBOX_STATE);
      setInboxStateReady(false);
    }

    if (userId <= 0) {
      setInboxState(EMPTY_INBOX_STATE);
      setInboxStateReady(true);
      return () => {
        active = false;
      };
    }

    void notificationInboxStateService.sync(userId, notifications)
      .then((nextState) => {
        if (!active) return;
        setInboxState(nextState);
        setInboxStateReady(true);
      })
      .catch(() => {
        if (!active) return;
        setInboxState({
          savedItems: notifications
            .filter((item) => getNotificationCategory(item) !== 'activity')
            .map(sanitizeNotificationInboxItem),
          dismissedActivityIds: [],
          removedSavedIds: [],
        });
        setInboxStateReady(true);
      });

    return () => {
      active = false;
    };
  }, [notifications, userId]);

  const dismissedActivityIds = useMemo(
    () => new Set(inboxState.dismissedActivityIds),
    [inboxState.dismissedActivityIds],
  );
  const activityNotifications = useMemo(
    () => notifications.filter((item) => (
      getNotificationCategory(item) === 'activity' && !dismissedActivityIds.has(item.id)
    )),
    [dismissedActivityIds, notifications],
  );
  const inviteNotifications = useMemo(
    () => inboxState.savedItems.filter((item) => getNotificationCategory(item) === 'invites'),
    [inboxState.savedItems],
  );
  const followNotifications = useMemo(
    () => inboxState.savedItems.filter((item) => getNotificationCategory(item) === 'follows'),
    [inboxState.savedItems],
  );
  const notificationsByCategory = useMemo<Record<NotificationCategory, NotificationItem[]>>(() => ({
    activity: activityNotifications,
    invites: inviteNotifications,
    follows: followNotifications,
  }), [activityNotifications, followNotifications, inviteNotifications]);
  const selectedNotifications = notificationsByCategory[selectedCategory];
  const selectedUnreadCount = selectedNotifications.filter((item) => !item.read).length;

  useFocusEffect(
    useCallback(() => {
      if (userId > 0) {
        refetch();
      }
    }, [refetch, userId])
  );

  const removeSavedNotification = useCallback(async (notificationId: number) => {
    if (userId <= 0) return;
    try {
      const nextState = await notificationInboxStateService.removeSaved(userId, notificationId);
      setInboxState(nextState);
    } catch {
      setInboxState((current) => ({
        ...current,
        savedItems: current.savedItems.filter((item) => item.id !== notificationId),
      }));
    }
  }, [userId]);

  const openNotification = useCallback((item: NotificationItem) => {
    const action = parseActionObject(item.actionObject);
    const type = item.type?.toLowerCase();

    if (type === 'challenge_invite' || type === 'invite') {
      router.push({
        pathname: '/challenge-invite-details',
        params: { notificationId: String(item.id) },
      });
      return;
    }

    if (!item.read && userId > 0) {
      markReadMutation.mutate({ userId, notificationId: item.id });
    }

    if (type === 'challenge_removal') {
      return;
    }

    if (type === 'follow' && action.actorUserId) {
      router.push({
        pathname: '/user-profile',
        params: {
          id: String(action.actorUserId),
          username: action.actorUsername ?? '',
        },
      });
      return;
    }

    if ((type === 'submission' || type === 'glory' || type === 'comment') && action.submissionId) {
      const isOwnerNotification = type === 'glory' || type === 'comment';
      const ownerUsername = isOwnerNotification
        ? action.targetUsername ?? authUser?.username
        : action.actorUsername;
      const ownerPhoto = isOwnerNotification
        ? action.targetProfilePicUrl ?? authUser?.profilePicUrl
        : action.actorProfilePicUrl;

      router.push({
        pathname: '/photo-details',
        params: {
          id: String(action.submissionId),
          submissionId: String(action.submissionId),
          photoUrl: action.mediaUrl ?? '',
          challengeId: action.challengeId ? String(action.challengeId) : '',
          challengeTitle: action.challengeTitle ?? 'Challenge submission',
          challengeName: action.challengeTitle ?? 'Challenge',
          dayNumber: action.dayNumber ? String(action.dayNumber) : '',
          userId: String(isOwnerNotification ? action.targetUserId ?? userId : action.actorUserId ?? ''),
          userName: ownerUsername ? `@${ownerUsername}` : 'ChallengeSphere',
          userPhoto: ownerPhoto ?? '',
        },
      });
      return;
    }

    if (action.challengeId) {
      if (type === 'daily_upload_reminder') {
        router.push({
          pathname: '/(tabs)/challenges',
          params: { uploadChallengeId: String(action.challengeId) },
        });
        return;
      }

      if (type === 'momentum_milestone') {
        router.push({
          pathname: '/(tabs)/challenges',
          params: {
            openChallengeId: String(action.challengeId),
            notificationRouteNonce: String(action.notificationId ?? item.id),
          },
        });
        return;
      }

      router.push({
        pathname: '/(tabs)/challenges',
        params: { focusChallengeId: String(action.challengeId) },
      });
    }
  }, [authUser?.profilePicUrl, authUser?.username, markReadMutation, router, userId]);

  const handleIgnoreInvite = useCallback((item: NotificationItem) => {
    ignoreInviteMutation.mutate(item.id, {
      onSuccess: () => {
        void removeSavedNotification(item.id);
      },
      onError: (err: any) => {
        Alert.alert(
          'Could Not Ignore',
          getApiErrorMessage(err, 'Failed to ignore this challenge invite. Please try again.'),
        );
      },
    });
  }, [ignoreInviteMutation, removeSavedNotification]);

  const handleRemoveFollow = useCallback((item: NotificationItem) => {
    void removeSavedNotification(item.id);
    if (!item.read && userId > 0) {
      markReadMutation.mutate({ userId, notificationId: item.id });
    }
  }, [markReadMutation, removeSavedNotification, userId]);

  const handleClearActivity = useCallback(() => {
    if (!userId || activityNotifications.length === 0) return;
    Alert.alert('Clear activity?', 'Invites and follows will stay saved in their tabs.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          const activityIds = activityNotifications.map((item) => item.id);
          try {
            await clearActivity(userId);
          } catch {
            Alert.alert('Could Not Clear Activity', 'Please try again.');
            return;
          }

          try {
            const nextState = await notificationInboxStateService.dismissActivity(userId, activityIds);
            setInboxState(nextState);
          } catch {
            setInboxState((current) => ({
              ...current,
              dismissedActivityIds: [...new Set([
                ...current.dismissedActivityIds,
                ...activityIds,
              ])].slice(-500),
            }));
          }
        },
      },
    ]);
  }, [activityNotifications, clearActivity, userId]);

  const renderItem = useCallback(({ item }: { item: NotificationItem }) => {
    const accent = getAccentColor(item.type);
    const action = parseActionObject(item.actionObject);
    const category = getNotificationCategory(item);
    const isActionableChallengeInvite = item.type?.toLowerCase() === 'challenge_invite' && !item.read;
    const canRemoveSavedItem = category === 'follows' || (category === 'invites' && !isActionableChallengeInvite);
    const inviteActionPending = ignoreInviteMutation.isPending;

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unreadItem]}
        onPress={() => openNotification(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${accent}22` }]}>
          <Ionicons
            name={getNotificationIcon(item.type)}
            size={20}
            color={accent}
          />
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.messageRow}>
            <Text style={styles.notificationMessage}>{item.message}</Text>
            <View style={styles.trailingActions}>
              {!item.read && <View style={styles.unreadDot} />}
              {canRemoveSavedItem && (
                <TouchableOpacity
                  accessibilityLabel={`Remove ${CATEGORY_LABELS[category].toLowerCase()} notification`}
                  accessibilityRole="button"
                  onPress={(event) => {
                    event.stopPropagation();
                    if (category === 'follows') {
                      handleRemoveFollow(item);
                    } else {
                      void removeSavedNotification(item.id);
                    }
                  }}
                  style={styles.removeSavedButton}
                >
                  <Ionicons name="close" size={16} color="#777389" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.notificationTime}>
              {formatTime(item.sentAt, item.sentAtEpochMs, data?.serverTimeEpochMs)}
            </Text>
            {action.challengeTitle && (
              <>
                <Text style={styles.metaSeparator}>•</Text>
                <Text style={styles.challengeText} numberOfLines={1}>{action.challengeTitle}</Text>
              </>
            )}
            {category !== 'activity' && (
              <Text style={styles.savedLabel}>Saved</Text>
            )}
          </View>
          {isActionableChallengeInvite && (
            <View style={styles.inviteActions}>
              <TouchableOpacity
                style={[styles.inviteActionButton, styles.ignoreButton]}
                onPress={(event) => {
                  event.stopPropagation();
                  handleIgnoreInvite(item);
                }}
                disabled={inviteActionPending}
              >
                <Text style={styles.ignoreButtonText}>Ignore</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inviteActionButton, styles.acceptButton, inviteActionPending && styles.inviteActionDisabled]}
                onPress={(event) => {
                  event.stopPropagation();
                  openNotification(item);
                }}
                disabled={inviteActionPending}
              >
                <Text style={styles.acceptButtonText}>View details</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [
    handleIgnoreInvite,
    handleRemoveFollow,
    ignoreInviteMutation.isPending,
    openNotification,
    removeSavedNotification,
    data?.serverTimeEpochMs,
  ]);

  const categoryCounts: Record<NotificationCategory, number> = {
    activity: activityNotifications.length,
    invites: inviteNotifications.length,
    follows: followNotifications.length,
  };
  const categoryUnreadCounts: Record<NotificationCategory, number> = {
    activity: activityNotifications.filter((item) => !item.read).length,
    invites: inviteNotifications.filter((item) => !item.read).length,
    follows: followNotifications.filter((item) => !item.read).length,
  };
  const headerSubtitle = selectedCategory === 'activity'
    ? (selectedUnreadCount > 0
        ? `${selectedUnreadCount} unread activity notification${selectedUnreadCount === 1 ? '' : 's'}`
        : `${activityNotifications.length} recent notification${activityNotifications.length === 1 ? '' : 's'}`)
    : `${selectedNotifications.length} saved ${selectedCategory === 'invites' ? 'invite' : 'follow notification'}${selectedNotifications.length === 1 ? '' : 's'}`;
  const emptyState = selectedCategory === 'activity'
    ? {
        icon: 'notifications-off-outline' as const,
        title: 'Activity is clear',
        message: 'New milestones, comments, glories, and submissions will show up here.',
      }
    : selectedCategory === 'invites'
      ? {
          icon: 'trophy-outline' as const,
          title: 'No saved invites',
          message: 'New challenge invites will stay here until you handle them.',
        }
      : {
          icon: 'person-add-outline' as const,
          title: 'No saved follows',
          message: 'New follow notifications will stay here until you remove them.',
        };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#18142F" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
        </View>
        {selectedCategory === 'activity' && activityNotifications.length > 0 && (
          <TouchableOpacity
            onPress={handleClearActivity}
            style={styles.clearButton}
            disabled={isClearingActivity}
            accessibilityState={{ disabled: isClearingActivity }}
          >
            {isClearingActivity ? (
              <ActivityIndicator size="small" color="#4700EC" />
            ) : (
              <Text style={styles.clearText}>Clear activity</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.categoryTabs} accessibilityRole="tablist">
        {(Object.keys(CATEGORY_LABELS) as NotificationCategory[]).map((category) => {
          const selected = selectedCategory === category;
          const hasUnread = categoryUnreadCounts[category] > 0;
          return (
            <TouchableOpacity
              key={category}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${CATEGORY_LABELS[category]}, ${categoryCounts[category]} items${hasUnread ? ', new activity' : ''}`}
              onPress={() => setSelectedCategory(category)}
              style={[styles.categoryTab, selected && styles.selectedCategoryTab]}
            >
              <View style={styles.categoryTabContent}>
                {hasUnread && <View style={styles.categoryUnreadDot} />}
                <Text style={[styles.categoryTabText, selected && styles.selectedCategoryTabText]}>
                  {CATEGORY_LABELS[category]}
                </Text>
                <View style={[styles.categoryCount, selected && styles.selectedCategoryCount]}>
                  <Text style={[styles.categoryCountText, selected && styles.selectedCategoryCountText]}>
                    {categoryCounts[category]}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading || !inboxStateReady ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#4700ec" size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={40} color="#666" />
          <Text style={styles.errorText}>Failed to load notifications</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : selectedNotifications.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name={emptyState.icon} size={28} color="#4700EC" />
          </View>
          <Text style={styles.emptyTitle}>{emptyState.title}</Text>
          <Text style={styles.emptyText}>{emptyState.message}</Text>
        </View>
      ) : (
        <FlatList
          data={selectedNotifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#4700ec"
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#18142F',
  },
  headerSubtitle: {
    color: '#777389',
    fontSize: 11,
    marginTop: 2,
  },
  clearButton: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1DDEA',
  },
  clearText: {
    color: '#4700EC',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryTabs: {
    flexDirection: 'row',
    height: 54,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  categoryTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  selectedCategoryTab: {
    borderBottomColor: '#4700EC',
  },
  categoryTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  categoryUnreadDot: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4700EC',
  },
  categoryTabText: {
    color: '#777389',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedCategoryTabText: {
    color: '#4700EC',
    fontWeight: '700',
  },
  categoryCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFEDF4',
  },
  selectedCategoryCount: {
    backgroundColor: '#EEE9FF',
  },
  categoryCountText: {
    color: '#6F6A7B',
    fontSize: 10,
    fontWeight: '600',
  },
  selectedCategoryCountText: {
    color: '#4700EC',
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 28,
  },
  errorText: {
    color: '#777389',
    fontSize: 14,
  },
  emptyTitle: {
    color: '#18142F',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyText: {
    color: '#777389',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEE9FF',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4700ec',
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 13,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E4EE',
    borderRadius: 18,
    backgroundColor: '#FBFAFD',
    gap: 12,
  },
  unreadItem: {
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  trailingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationMessage: {
    flex: 1,
    color: '#18142F',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4700ec',
    marginTop: 5,
  },
  removeSavedButton: {
    width: 30,
    height: 30,
    marginTop: -5,
    marginRight: -3,
    borderWidth: 1,
    borderColor: '#E3DFEA',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 6,
  },
  notificationTime: {
    color: '#777389',
    fontSize: 11,
  },
  metaSeparator: {
    color: '#444',
    fontSize: 11,
  },
  challengeText: {
    color: '#777',
    fontSize: 11,
    flexShrink: 1,
  },
  savedLabel: {
    marginLeft: 'auto',
    color: '#777389',
    fontSize: 10,
    fontWeight: '600',
  },
  inviteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  inviteActionButton: {
    minWidth: 86,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  ignoreButton: {
    borderWidth: 1,
    borderColor: '#DDD4FF',
    backgroundColor: '#F0ECFF',
  },
  ignoreButtonText: {
    color: '#4700EC',
    fontSize: 12,
    fontWeight: '700',
  },
  acceptButton: {
    backgroundColor: '#4700ec',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  inviteActionDisabled: {
    opacity: 0.6,
  },
});
