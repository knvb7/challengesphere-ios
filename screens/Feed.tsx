import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  type ViewToken,
  useWindowDimensions,
  View,
} from 'react-native';
import CommentAndCount from '../components/common/CommentAndCount';
import AvatarImage from '../components/common/AvatarImage';
import ChallengeIdentityStrip from '../components/common/ChallengeIdentityStrip';
import GenuinityAndCount from '../components/common/GenuinityAndCount';
import OfficialAccountBadge from '../components/common/OfficialAccountBadge';
import PremiumBadge from '../components/common/PremiumBadge';
import RecommendedFriendsCarousel from '../components/common/RecommendedFriendsCarousel';
import InlineNativeAd from '../components/ads/InlineNativeAd';
import { SkeletonBlock, SkeletonUserRow, useSkeletonShimmer } from '../components/common/Skeleton';
import SubmissionMediaCarousel from '../components/common/SubmissionMediaCarousel';
import { useInfiniteConnectionsFeed, useOptimisticGloryToggle } from '../hooks/useFeed';
import { useFollowUser, useSuggestedUsers } from '../hooks/useUsers';
import { useAuthContext } from '../providers/AuthProvider';
import { FeedItem, User } from '../types/api';
import { buildSubmissionDetailRouteParams } from '../utils/submissionDetail';
import { parseSubmissionMediaUrls } from '../utils/submissionMedia';
import { getApiErrorMessage } from '../utils/apiError';
import { shouldInsertInlineAd } from '../utils/inlineAdPlacement';
import { isOfficialGlobalCreator } from '../utils/globalChallenges';

const MAX_FEED_WIDTH = 680;
const FEED_AD_INTERVAL = 3;

const getFeedMediaMetrics = (viewportWidth: number) => {
  const width = Math.max(280, Math.min(viewportWidth - 22, MAX_FEED_WIDTH));
  return { width, height: Math.min(width * 1.1, 620) };
};

type FeedProps = {
  headerComponent?: React.ReactElement | null;
};

// ─── Submission date formatting ───
function formatSubmissionDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Actions row with glory ───
const FeedActions = ({ item, currentUserId }: { item: FeedItem; currentUserId: number }) => {
  const {
    count,
    isGloried,
    isUngloried,
    handleGloryPress,
    handleUngloryPress,
  } = useOptimisticGloryToggle({
    submissionId: item.submissionId,
    userId: currentUserId,
    submissionOwnerUserId: item.userId,
    initialCount: item.gloriesCount,
    initialIsGloried: item.isGloriedByCurrentUser ?? false,
    initialIsUngloried: item.isUngloriedByCurrentUser ?? false,
  });

  return (
    <View style={styles.actionBar}>
      <GenuinityAndCount
        genuineCount={count}
        ingenuineCount={0}
        submissionId={item.submissionId}
        isGloried={isGloried}
        isUngloried={isUngloried}
        onGenuinePress={handleGloryPress}
        onIngenuinePress={handleUngloryPress}
      />
      <View style={styles.spacer} />
      <CommentAndCount
        commentCount={item.commentsCount}
        submissionId={item.submissionId}
      />
    </View>
  );
};

// ─── Single Feed Card ───
const FeedCardComponent = ({
  item,
  currentUserId,
  onChallengePress,
  onUserPress,
  onSubmissionPress,
  onMediaZoomChange,
  mediaWidth,
  mediaHeight,
  mediaOverlayEnabled,
}: {
  item: FeedItem;
  currentUserId: number;
  onChallengePress: () => void;
  onUserPress: () => void;
  onSubmissionPress: () => void;
  onMediaZoomChange: (zoomed: boolean) => void;
  mediaWidth: number;
  mediaHeight: number;
  mediaOverlayEnabled: boolean;
}) => {
  const mediaUrls = parseSubmissionMediaUrls(item.mediaUrls);
  const submissionDate = formatSubmissionDate(item.createdAt);
  const handleMediaZoomChange = useCallback((zoomed: boolean) => {
    onMediaZoomChange(zoomed);
  }, [onMediaZoomChange]);

  return (
    <View style={styles.card}>
      {/* ── User header ── */}
      <TouchableOpacity style={styles.userHeader} onPress={onUserPress} activeOpacity={0.8}>
        <AvatarImage uri={item.userProfilePicUrl} size={34} style={styles.avatar} />
        <View style={styles.userInfo}>
          <View style={styles.userIdentityRow}>
            <Text style={styles.username} numberOfLines={1}>{item.username}</Text>
            {isOfficialGlobalCreator(item.username) ? (
              <OfficialAccountBadge compact />
            ) : Number(item.premiumUser ?? 0) > 0 ? (
              <PremiumBadge />
            ) : null}
          </View>
          {submissionDate ? <Text style={styles.timeText}>{submissionDate}</Text> : null}
        </View>
      </TouchableOpacity>

      <View style={[styles.photoContainer, { height: mediaHeight }]}>
        {mediaUrls.length > 0 ? (
          <SubmissionMediaCarousel
            mediaUrls={mediaUrls}
            width={mediaWidth}
            height={mediaHeight}
            expandable
            contentFit="contain"
            containBackdrop
            rootOverlayEnabled={mediaOverlayEnabled}
            onMediaPress={onSubmissionPress}
            onZoomChange={handleMediaZoomChange}
          />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="image-outline" size={48} color="#222" />
          </View>
        )}

        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>DAY {item.dayNumber}</Text>
        </View>
      </View>

      {/* ── Challenge + Description below photo ── */}
      <View style={styles.contentSection}>
        <ChallengeIdentityStrip
          title={item.challengeTitle}
          dayNumber={item.dayNumber}
          onPress={onChallengePress}
        />

        {item.description ? (
          <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
        ) : null}
      </View>

      {/* ── Actions ── */}
      <FeedActions item={item} currentUserId={currentUserId} />
    </View>
  );
};

// Zoom locking updates the parent list once at gesture start/end. Keep all
// unaffected rows out of those renders so the UI thread stays free for pinch.
const FeedCard = React.memo(
  FeedCardComponent,
  (previous, next) => previous.item === next.item
    && previous.currentUserId === next.currentUserId
    && previous.mediaWidth === next.mediaWidth
    && previous.mediaHeight === next.mediaHeight
    && previous.mediaOverlayEnabled === next.mediaOverlayEnabled,
);

const FeedSkeletonCard = () => {
  const shimmer = useSkeletonShimmer();
  const { width: viewportWidth } = useWindowDimensions();
  const { height: mediaHeight } = getFeedMediaMetrics(viewportWidth);

  return (
    <View style={styles.card}>
      <View style={styles.userHeader}>
        <SkeletonUserRow translateX={shimmer} avatarSize={34} style={{ flex: 1 }} />
      </View>

      <View style={[styles.photoContainer, { height: mediaHeight }]}>
        <SkeletonBlock translateX={shimmer} height={mediaHeight} borderRadius={0} />
        <View style={styles.dayBadge}>
          <SkeletonBlock translateX={shimmer} width={56} height={12} borderRadius={6} />
        </View>
      </View>

      <View style={styles.contentSection}>
        <SkeletonBlock translateX={shimmer} width="42%" height={24} borderRadius={16} />
        <SkeletonBlock translateX={shimmer} width="92%" height={14} borderRadius={7} />
        <SkeletonBlock translateX={shimmer} width="68%" height={14} borderRadius={7} />
      </View>

      <View style={styles.skeletonActionBar}>
        <SkeletonBlock translateX={shimmer} width={112} height={26} borderRadius={13} />
        <View style={styles.spacer} />
        <SkeletonBlock translateX={shimmer} width={54} height={26} borderRadius={13} />
      </View>
    </View>
  );
};

const FeedSkeleton = ({ headerComponent }: FeedProps) => (
  <FlatList
    data={[1, 2, 3]}
    keyExtractor={(item) => item.toString()}
    renderItem={() => <FeedSkeletonCard />}
    style={styles.list}
    contentContainerStyle={styles.listContent}
    ListHeaderComponent={headerComponent}
    showsVerticalScrollIndicator={false}
  />
);

type FeedRow =
  | { type: 'submission'; item: FeedItem }
  | { type: 'suggestions'; id: string }
  | { type: 'ad'; id: string };

// ─── Feed List ───
const Feed = ({ headerComponent }: FeedProps) => {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { width: viewportWidth } = useWindowDimensions();
  const { width: mediaWidth, height: mediaHeight } = getFeedMediaMetrics(viewportWidth);
  const { currentUserId } = useAuthContext();
  const CURRENT_USER_ID = currentUserId;
  const followUserMutation = useFollowUser();
  const [followedSuggestedUserIds, setFollowedSuggestedUserIds] = useState<Set<number>>(() => new Set());
  const [zoomedSubmissionId, setZoomedSubmissionId] = useState<number | null>(null);
  const [visibleSubmissionIds, setVisibleSubmissionIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 15,
    minimumViewTime: 80,
  }).current;
  const onViewableItemsChanged = React.useRef(({
    viewableItems,
  }: {
    viewableItems: ViewToken<FeedRow>[];
  }) => {
    const nextVisibleIds = new Set<number>();
    for (const token of viewableItems) {
      const row = token.item;
      if (row?.type === 'submission') {
        nextVisibleIds.add(row.item.submissionId);
      }
    }

    setVisibleSubmissionIds((current) => {
      if (
        current.size === nextVisibleIds.size
        && [...current].every((id) => nextVisibleIds.has(id))
      ) {
        return current;
      }
      return nextVisibleIds;
    });
  }).current;

  React.useEffect(() => {
    if (!isFocused) {
      setVisibleSubmissionIds(new Set());
    }
  }, [isFocused]);

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteConnectionsFeed(CURRENT_USER_ID, 20);

  const allItems = useMemo(() => {
    const seenSubmissionIds = new Set<number>();
    return (data?.pages.flatMap((page) => page.items) ?? []).filter((item) => {
      if (seenSubmissionIds.has(item.submissionId)) {
        return false;
      }
      seenSubmissionIds.add(item.submissionId);
      return true;
    });
  }, [data]);
  const { data: suggestedPeopleData, refetch: refetchSuggestedPeople } = useSuggestedUsers(
    1,
    10,
    CURRENT_USER_ID > 0,
  );

  const [refreshing, setRefreshing] = useState(false);

  const feedRows = useMemo<FeedRow[]>(() => {
    const submissionRows: FeedRow[] = [];
    const suggestedUsers = suggestedPeopleData?.users || [];
    const suggestionInsertionIndex = Math.ceil(allItems.length / 2) - 1;

    allItems.forEach((item, index) => {
      submissionRows.push({ type: 'submission', item });

      if (suggestedUsers.length > 0 && index === suggestionInsertionIndex) {
        submissionRows.push({ type: 'suggestions', id: 'connection-suggestions' });
      }

      if (shouldInsertInlineAd(index, allItems.length, FEED_AD_INTERVAL)) {
        submissionRows.push({
          type: 'ad',
          id: `feed-ad-after-${item.submissionId}`,
        });
      }
    });

    if (allItems.length === 0 && suggestedUsers.length > 0) {
      submissionRows.push({ type: 'suggestions', id: 'connection-suggestions' });
    }

    return submissionRows;
  }, [allItems, suggestedPeopleData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchSuggestedPeople()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchSuggestedPeople]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSubmissionZoomChange = useCallback((submissionId: number, zoomed: boolean) => {
    setZoomedSubmissionId((current) => {
      if (zoomed) return submissionId;
      return current === submissionId ? null : current;
    });
  }, []);

  const handleChallengePress = (item: FeedItem) => {
    router.push({
      pathname: '/challenge-details',
      params: { id: String(item.challengeId), title: item.challengeTitle },
    });
  };

  const handleUserPress = (item: FeedItem) => {
    router.push({
      pathname: '/user-profile',
      params: { id: item.userId.toString(), username: item.username },
    });
  };

  const handleSubmissionPress = (item: FeedItem) => {
    router.push({
      pathname: '/photo-details',
      params: buildSubmissionDetailRouteParams({
        submission: {
          id: item.submissionId,
          userId: item.userId,
          challengeId: item.challengeId,
          dayNumber: item.dayNumber,
          description: item.description,
          mediaUrls: JSON.stringify(item.mediaUrls || []),
          submissionTime: item.createdAt,
          gloriesCount: item.gloriesCount,
          commentsCount: item.commentsCount,
        },
        userName: item.username,
        userPhoto: item.userProfilePicUrl || '',
        challengeTitle: item.challengeTitle,
      }),
    });
  };

  const handleSuggestedUserPress = (user: User) => {
    router.push({
      pathname: '/user-profile',
      params: { id: user.id.toString(), username: user.username },
    });
  };

  const renderSuggestedPeopleCarousel = () => (
    <RecommendedFriendsCarousel
      users={suggestedPeopleData?.users || []}
      onUserPress={handleSuggestedUserPress}
      onFollowPress={(user) => followUserMutation.mutate(
        { followerId: CURRENT_USER_ID, followingId: user.id },
        {
          onSuccess: () => {
            setFollowedSuggestedUserIds((current) => new Set(current).add(user.id));
            void Promise.all([refetchSuggestedPeople(), refetch()]);
          },
        }
      )}
      isFollowing={followUserMutation.isPending}
      followedUserIds={followedSuggestedUserIds}
    />
  );

  const renderConnectionEmptyState = () => (
    <View style={styles.connectionEmptyState}>
      <View style={styles.connectionEmptyIcon}>
        <Ionicons name="people-outline" size={25} color="#B99BFF" />
      </View>
      <Text style={styles.emptyTitle}>No connection check-ins yet</Text>
      <Text style={styles.emptySubtext}>
        Public check-ins from followers and people you follow will appear here.
      </Text>
      <View style={styles.privateVisibilityNote}>
        <Ionicons name="lock-closed-outline" size={13} color="#9B91AB" />
        <Text style={styles.privateVisibilityText}>
          Private posts only appear when you share that challenge.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.connectionsButton}
        onPress={() => router.push('/followers')}
        activeOpacity={0.84}
        accessibilityRole="button"
        accessibilityLabel="View your followers and following"
      >
        <Text style={styles.connectionsButtonText}>View connections</Text>
        <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: FeedRow }) => {
    if (item.type === 'suggestions') {
      return renderSuggestedPeopleCarousel();
    }

    if (item.type === 'ad') {
      return <InlineNativeAd placement="feed" />;
    }

    return (
      <FeedCard
        item={item.item}
        currentUserId={CURRENT_USER_ID}
        onChallengePress={() => handleChallengePress(item.item)}
        onUserPress={() => handleUserPress(item.item)}
        onSubmissionPress={() => handleSubmissionPress(item.item)}
        onMediaZoomChange={(zoomed) => handleSubmissionZoomChange(item.item.submissionId, zoomed)}
        mediaWidth={mediaWidth}
        mediaHeight={mediaHeight}
        mediaOverlayEnabled={visibleSubmissionIds.has(item.item.submissionId)}
      />
    );
  };

  if (isLoading && !refreshing) {
    return <FeedSkeleton headerComponent={headerComponent} />;
  }

  if (error) {
    return (
      <FlatList
        data={[]}
        renderItem={() => null}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4700ec" colors={['#4700ec']} />
        }
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color="#333" />
            <Text style={styles.emptyTitle}>Could not load connections</Text>
            <Text style={styles.emptySubtext}>
              {getApiErrorMessage(error, 'Could not load your connections. Pull down to try again.')}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        }
        ListHeaderComponent={headerComponent}
      />
    );
  }

  return (
    <FlatList
      data={feedRows}
      renderItem={renderItem}
      keyExtractor={(item) => {
        if (item.type === 'submission') {
          return `submission-${item.item.submissionId}`;
        }
        return item.id;
      }}
      showsVerticalScrollIndicator={false}
      scrollEnabled={zoomedSubmissionId === null}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      updateCellsBatchingPeriod={50}
      windowSize={5}
      removeClippedSubviews={Platform.OS === 'android'}
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4700ec" colors={['#4700ec']} />
      }
      ListHeaderComponent={(
        <>
          {headerComponent}
          {allItems.length === 0 ? renderConnectionEmptyState() : null}
        </>
      )}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color="#4700ec" />
          </View>
        ) : null
      }
      ListEmptyComponent={null}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 24,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    marginVertical: 6,
    width: '95%',
    maxWidth: MAX_FEED_WIDTH,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },

  // User header
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#E7E3EF',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  userIdentityRow: {
    minWidth: 0,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  username: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18142F',
    flexShrink: 1,
  },
  timeText: {
    fontSize: 11,
    color: '#777389',
    fontWeight: '500',
    flexShrink: 0,
  },

  // Photo
  photoContainer: {
    position: 'relative',
    backgroundColor: '#111',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(71,0,236,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },

  // Content below photo
  contentSection: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 6,
  },
  challengePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#4700ec14',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  challengeName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5B3FE5',
    flexShrink: 1,
  },
  description: {
    fontSize: 13,
    color: '#000000',
    lineHeight: 18,
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skeletonActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  spacer: {
    flex: 1,
  },

  // States
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  connectionEmptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 18,
  },
  connectionEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDD4FF',
    backgroundColor: '#F0ECFF',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#18142F',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#8e8796',
    textAlign: 'center',
    paddingHorizontal: 18,
    lineHeight: 17,
  },
  privateVisibilityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  privateVisibilityText: {
    color: '#777389',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
  },
  connectionsButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 15,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#4700EC',
  },
  connectionsButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: '#4700ec',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 24,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default Feed;
