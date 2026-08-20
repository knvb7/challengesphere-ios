import { Ionicons } from '@expo/vector-icons';
import { AppAlert as Alert } from '@/utils/appAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MyChallengeGalleryCard from '../components/challenges/MyChallengeGalleryCard';
import AvatarImage from '../components/common/AvatarImage';
import FloatingScreenControls from '../components/common/FloatingScreenControls';
import OfficialAccountBadge from '../components/common/OfficialAccountBadge';
import PremiumBadge from '../components/common/PremiumBadge';
import { mapChallenge, mapMyChallenge, type MappedChallenge } from '../components/common/ChallengeCard';
import FollowActionSheet from '../components/common/FollowActionSheet';
import ProfileStats from '../components/common/ProfileStats';
import ProfileStatsTab from '../components/common/ProfileStatsTab';
import ProfileTopInterests from '../components/common/ProfileTopInterests';
import Separator from '../components/common/Separator';
import SubmissionMediaCarousel from '../components/common/SubmissionMediaCarousel';
import { useAllUserSubmissions, useChallengesByIds, useInfiniteChallengesByCreator, useInfiniteUserSubmissions, useMyActiveChallenges } from '../hooks/useChallenges';
import { useBlockUser, useFollowRelationship, useFollowUser, useReportUser, useUnfollowUser, useUser, useUserFollowers, useUserFollowing } from '../hooks/useUsers';
import { SkeletonBlock, useSkeletonShimmer } from '../components/common/Skeleton';
import { useAuthContext } from '../providers/AuthProvider';
import { buildSubmissionDetailRouteParams } from '../utils/submissionDetail';
import { parseSubmissionMediaUrls } from '../utils/submissionMedia';
import { showAppMessage } from '../utils/appMessage';
import { getProfileDisplayName } from '../utils/userDisplay';
import {
  getGlobalCreatorDisplayUsername,
  isOfficialGlobalCreator,
  OFFICIAL_ACCOUNT_AVATAR_SOURCE,
} from '../utils/globalChallenges';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 8;
const GRID_HORIZONTAL_PADDING = 12;
const GRID_ITEM_SIZE = Math.floor((SCREEN_WIDTH - (GRID_HORIZONTAL_PADDING * 2) - GRID_GAP) / 2);
const PROFILE_TABS = ['submissions', 'challenges', 'stats'] as const;
type ProfileTab = typeof PROFILE_TABS[number];

const UserProfileSkeleton = ({ topPadding }: { topPadding: number }) => {
  const shimmer = useSkeletonShimmer();
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ alignItems: 'center', paddingTop: topPadding, paddingHorizontal: 20, gap: 12 }}>
        <SkeletonBlock translateX={shimmer} width={120} height={120} borderRadius={60} />
        <SkeletonBlock translateX={shimmer} width={140} height={16} borderRadius={8} />
        <SkeletonBlock translateX={shimmer} width={200} height={12} borderRadius={6} />
        <SkeletonBlock translateX={shimmer} width={160} height={12} borderRadius={6} />
        <View style={{ width: '100%', marginTop: 4 }}>
          <SkeletonBlock translateX={shimmer} width="100%" height={44} borderRadius={12} />
        </View>
        <View style={{ flexDirection: 'row', gap: 24 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ alignItems: 'center', gap: 6 }}>
              <SkeletonBlock translateX={shimmer} width={36} height={18} borderRadius={6} />
              <SkeletonBlock translateX={shimmer} width={52} height={10} borderRadius={5} />
            </View>
          ))}
        </View>
        <View style={{ width: '100%', height: 1, backgroundColor: '#FFFFFF', marginTop: 4 }} />
        <SkeletonBlock translateX={shimmer} width="100%" height={44} borderRadius={14} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 12, paddingHorizontal: 12 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonBlock key={i} translateX={shimmer} width="48.5%" height={205} borderRadius={8} />
        ))}
      </View>
    </View>
  );
};

export default function UserProfileScreen() {
  const router = useRouter();
  const { top: topInset } = useSafeAreaInsets();
  const { currentUserId } = useAuthContext();
  const CURRENT_USER_ID = currentUserId;
  const params = useLocalSearchParams();

  const targetUserId = parseInt(params.id as string) || 0;
  const targetUsername = params.username as string;

  // If viewing own profile, redirect to the profile tab
  useEffect(() => {
    if (targetUserId > 0 && targetUserId === CURRENT_USER_ID) {
      router.replace('/(tabs)/profile');
    }
  }, [targetUserId, CURRENT_USER_ID, router]);

  const { data: userData, isLoading: loadingUser, error: userError, refetch: refetchUser } = useUser(targetUserId, CURRENT_USER_ID);
  const { data: relationshipData, refetch: refetchRelationship } = useFollowRelationship(targetUserId, CURRENT_USER_ID);
  const { data: myFollowingData, refetch: refetchMyFollowing } = useUserFollowing(CURRENT_USER_ID, 1, 100);
  const { data: myFollowersData, refetch: refetchMyFollowers } = useUserFollowers(CURRENT_USER_ID, 1, 100);
  const [relationshipOverride, setRelationshipOverride] = useState<{ isFollowing?: boolean; isFollowedBy?: boolean } | null>(null);
  const [followersCountDelta, setFollowersCountDelta] = useState(0);

  useEffect(() => {
    setRelationshipOverride(null);
    setFollowersCountDelta(0);
  }, [targetUserId]);

  useEffect(() => {
    setFollowersCountDelta(0);
  }, [userData?.followers]);

  const listIsFollowing = (myFollowingData?.users || []).some(u => u.id === targetUserId);
  const listIsFollowedBy = (myFollowersData?.users || []).some(u => u.id === targetUserId);
  const isFollowing = relationshipOverride?.isFollowing ?? relationshipData?.isFollowing ?? listIsFollowing;
  const isFollowedBy = relationshipOverride?.isFollowedBy ?? relationshipData?.isFollowedBy ?? listIsFollowedBy;
  const canViewProfileDetails = isFollowing && isFollowedBy;

  const {
    data: submissionsPages,
    refetch: refetchSubmissions,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteUserSubmissions(targetUserId, CURRENT_USER_ID, 20, targetUserId > 0 && canViewProfileDetails);

  const {
    data: userChallengesData,
    refetch: refetchUserChallenges,
    isLoading: isLoadingUserChallenges,
    isError: isUserChallengesError,
  } = useMyActiveChallenges(targetUserId, undefined, CURRENT_USER_ID, canViewProfileDetails);
  const {
    data: createdChallengesPages,
    refetch: refetchCreatedChallenges,
    fetchNextPage: fetchNextCreatedChallengesPage,
    hasNextPage: hasNextCreatedChallengesPage,
    isFetchingNextPage: isFetchingNextCreatedChallengesPage,
    isLoading: isLoadingCreatedChallenges,
  } = useInfiniteChallengesByCreator(targetUserId, CURRENT_USER_ID, 20, canViewProfileDetails);
  const topInterests = createdChallengesPages?.pages?.[0]?.topInterests || [];

  const followUserMutation = useFollowUser();
  const unfollowUserMutation = useUnfollowUser();
  const blockUserMutation = useBlockUser();
  const reportUserMutation = useReportUser();

  const [refreshing, setRefreshing] = useState(false);
  const [showFollowAction, setShowFollowAction] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('submissions');
  const tabAnim = useRef(new Animated.Value(0)).current;
  const segmentWidth = useRef(0);
  const submissionsPageRequestRef = useRef(false);
  const {
    data: statsSubmissions,
    isLoading: isLoadingStatsSubmissions,
    isError: isStatsSubmissionsError,
    refetch: refetchStatsSubmissions,
  } = useAllUserSubmissions(
    targetUserId,
    CURRENT_USER_ID,
    activeTab === 'stats' && canViewProfileDetails,
  );

  const switchTab = useCallback((tab: ProfileTab) => {
    setActiveTab(tab);
    Animated.spring(tabAnim, {
      toValue: PROFILE_TABS.indexOf(tab),
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  }, [tabAnim]);

  const requestNextSubmissionsPage = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || submissionsPageRequestRef.current) {
      return;
    }

    submissionsPageRequestRef.current = true;
    void fetchNextPage().then(
      () => {
        submissionsPageRequestRef.current = false;
      },
      () => {
        submissionsPageRequestRef.current = false;
      },
    );
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleProfileScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (activeTab !== 'submissions') return;

    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom < 320) {
      requestNextSubmissionsPage();
    }
  }, [activeTab, requestNextSubmissionsPage]);

  const combinedChallenges = useMemo(() => {
    const joined = (userChallengesData?.challenges || [])
      .map((challenge) => mapMyChallenge(challenge, targetUserId))
      .filter((challenge) => !challenge.isCreator);
    const created = (createdChallengesPages?.pages?.flatMap((page) => page.challenges) || [])
      .map((challenge) => mapChallenge(challenge, targetUserId));
    const joinedIds = new Set(joined.map((challenge) => challenge.id));
    return [...joined, ...created.filter((challenge) => !joinedIds.has(challenge.id))];
  }, [userChallengesData, createdChallengesPages, targetUserId]);
  const statsChallenges = useMemo(
    () => (userChallengesData?.challenges || []).map((challenge) =>
      mapMyChallenge(challenge, targetUserId)
    ),
    [userChallengesData, targetUserId],
  );
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchUser(),
        refetchRelationship(),
        refetchMyFollowing(),
        refetchMyFollowers(),
        ...(canViewProfileDetails
          ? [
            refetchSubmissions(),
            refetchUserChallenges(),
            refetchCreatedChallenges(),
            ...(activeTab === 'stats' ? [refetchStatsSubmissions()] : []),
          ]
          : []),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchUser, refetchRelationship, refetchMyFollowing, refetchMyFollowers, refetchSubmissions, refetchUserChallenges, refetchCreatedChallenges, refetchStatsSubmissions, activeTab, canViewProfileDetails]);
  const fetchedChallengesCount = canViewProfileDetails
    ? (userChallengesData?.challenges || []).filter((challenge) => challenge.creatorId !== targetUserId).length
      + (
        createdChallengesPages?.pages?.[0]?.totalCount
        ?? createdChallengesPages?.pages?.flatMap((page) => page.challenges).length
        ?? 0
      )
    : undefined;

  const user = {
    id: targetUserId.toString(),
    username: userData?.username || targetUsername || '',
    bio: canViewProfileDetails ? (userData?.bio || (params.bio as string) || '') : '',
    profileImage: userData?.profilePicUrl || (params.profileImage as string) || '',
    followersCount: Math.max(0, (userData?.followers ?? (parseInt(params.followersCount as string) || 0)) + followersCountDelta),
    followingCount: userData?.following ?? (parseInt(params.followingCount as string) || 0),
    challengesCount: fetchedChallengesCount
      ?? userData?.challengesAccepted
      ?? (parseInt(params.challengesCount as string) || 0),
    postsCount:
      (canViewProfileDetails ? submissionsPages?.pages?.[0]?.totalCount : undefined)
      ?? userData?.submissionsCount
      ?? (parseInt(params.postsCount as string) || 0),
    genuinessScore: userData?.genuinityScore ?? userData?.genuinenessScore ?? (parseInt(params.genuinessScore as string) || 0),
    isFollowing,
    isFollowedBy,
    premiumUser: userData?.premiumUser ?? Number(params.premiumUser ?? 0),
  };
  const isOfficialProfile = isOfficialGlobalCreator(user.username);
  const visibleUsername = getGlobalCreatorDisplayUsername(user.username);
  const profileDisplayName = isOfficialProfile
    ? 'ChallengeSphere'
    : getProfileDisplayName({
        username: user.username,
        displayName: userData?.displayName || (params.displayName as string),
        realName: userData?.realName || (params.realName as string),
        fullName: userData?.fullName || (params.fullName as string),
        firstName: userData?.firstName || (params.firstName as string),
        lastName: userData?.lastName || (params.lastName as string),
        name: userData?.name || (params.name as string),
      });
  const isFollowMutationPending = followUserMutation.isPending || unfollowUserMutation.isPending;

  const openChallengeDetails = (challenge: MappedChallenge) => {
    const coverUrls = challenge.coverPhotoUrls || [];
    const coverImage = coverUrls[0];
    router.push({
      pathname: '/challenge-details',
      params: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description || '',
        category: challenge.category,
        duration: challenge.duration,
        numberOfDays: challenge.numberOfDays.toString(),
        challengeMode: challenge.challengeMode || 'DAILY',
        status: challenge.status,
        isCreator: challenge.isCreator.toString(),
        progress: (challenge.completionPercentage ?? challenge.progress ?? 0).toString(),
        startDate: challenge.startDate,
        createdAt: challenge.createdAt,
        endDate: challenge.endDate || '',
        isPrivate: challenge.isPrivate ? 'true' : 'false',
        image: coverImage || '',
        coverPhotoUrls: JSON.stringify(coverUrls),
        previewUserId: String(targetUserId),
        previewUsername: userData?.username || targetUsername || '',
      },
    });
  };

  const sortedSubmissions = useMemo(() => {
    const all = submissionsPages?.pages?.flatMap(p => p.submissions) || [];
    return [...all].sort((a, b) =>
      new Date(b.submissionTime).getTime() - new Date(a.submissionTime).getTime()
    );
  }, [submissionsPages]);
  const totalSubmissionCount = submissionsPages?.pages?.[0]?.totalCount ?? sortedSubmissions.length;
  const submissionChallengeIds = useMemo(
    () => sortedSubmissions.map((submission) => submission.challengeId),
    [sortedSubmissions]
  );
  const { data: submissionChallenges = [] } = useChallengesByIds(submissionChallengeIds);
  const submissionChallengeTitles = useMemo(
    () => new Map([
      ...statsChallenges.map((challenge) => [Number(challenge.id), challenge.title] as const),
      ...submissionChallenges.map((challenge) => [challenge.id, challenge.title] as const),
    ]),
    [statsChallenges, submissionChallenges]
  );

  const handleFollowToggle = () => {
    if (isFollowMutationPending) {
      return;
    }
    if (user.isFollowing) {
      setShowFollowAction(true);
      return;
    }
    performFollowToggle(false);
  };

  const performFollowToggle = (wasFollowing: boolean) => {
    const mutation = wasFollowing ? unfollowUserMutation : followUserMutation;
    mutation.mutate(
      { followerId: CURRENT_USER_ID, followingId: targetUserId },
      {
        onSuccess: (response) => {
          const nextIsFollowing = response?.isFollowing ?? !wasFollowing;
          setShowFollowAction(false);
          setRelationshipOverride({
            isFollowing: nextIsFollowing,
            isFollowedBy,
          });
          if (wasFollowing !== nextIsFollowing) {
            setFollowersCountDelta((current) => current + (nextIsFollowing ? 1 : -1));
          }
          void Promise.allSettled([
            refetchUser(),
            refetchRelationship(),
            refetchMyFollowing(),
            refetchMyFollowers(),
          ]);
          if (wasFollowing) {
            showAppMessage({
              type: 'success',
              title: 'Unfollowed',
              message: `@${visibleUsername}`,
            });
          }
        },
        onError: () => {
          setShowFollowAction(false);
          showAppMessage({
            type: 'error',
            title: 'Could not update follow',
            message: 'Please try again.',
          });
        },
      },
    );
  };

  const submitReport = (reason: string) => {
    reportUserMutation.mutate(
      { reporterId: CURRENT_USER_ID, reportedId: targetUserId, reason },
      {
        onSuccess: () => {
          showAppMessage({
            type: 'success',
            title: 'Report received',
            message: 'Thanks for helping keep ChallengeSphere safe.',
          });
        },
        onError: () => {
          showAppMessage({
            type: 'error',
            title: 'Could not send report',
            message: 'Please try again.',
          });
        },
      },
    );
  };

  const showReportReasons = () => {
    Alert.alert('Why are you reporting this account?', 'Choose the reason that best fits.', [
      { text: 'Harassment or bullying', onPress: () => submitReport('HARASSMENT_OR_BULLYING') },
      { text: 'Spam or scam', onPress: () => submitReport('SPAM_OR_SCAM') },
      { text: 'Unsafe or inappropriate', onPress: () => submitReport('UNSAFE_OR_INAPPROPRIATE') },
      { text: 'Other', onPress: () => submitReport('OTHER') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmBlock = () => {
    Alert.alert(
      `Block @${visibleUsername}?`,
      'You will stop following each other and this account will no longer be able to find or interact with you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            blockUserMutation.mutate(
              { blockerId: CURRENT_USER_ID, blockedId: targetUserId },
              {
                onSuccess: () => {
                  showAppMessage({
                    type: 'success',
                    title: 'Account blocked',
                    message: `@${visibleUsername} can no longer interact with you.`,
                  });
                  router.back();
                },
                onError: () => {
                  showAppMessage({
                    type: 'error',
                    title: 'Could not block account',
                    message: 'Please try again.',
                  });
                },
              },
            );
          },
        },
      ]
    );
  };

  const showSafetyActions = () => {
    if (isOfficialProfile || blockUserMutation.isPending || reportUserMutation.isPending) return;

    Alert.alert(`@${visibleUsername}`, 'Choose a safety action.', [
      { text: 'Report account', onPress: showReportReasons },
      { text: 'Block account', style: 'destructive', onPress: confirmBlock },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleStatsPress = (type: string) => {
    if (!canViewProfileDetails) {
      return;
    }
    if (type === 'followers' || type === 'following') {
      router.push({
        pathname: '/user-followers',
        params: { userId: user.id, username: user.username, type },
      });
    } else if (type === 'challenges') {
      switchTab('challenges');
    } else if (type === 'posts') {
      switchTab('submissions');
    }
  };

  const getRelationshipText = () => {
    if (user.isFollowing && user.isFollowedBy) return 'You follow each other';
    if (user.isFollowing) return 'Following';
    if (user.isFollowedBy) return 'Follows you';
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FloatingScreenControls
        onBackPress={() => router.back()}
        actions={isOfficialProfile ? [] : [{
          icon: 'ellipsis-horizontal',
          onPress: showSafetyActions,
          accessibilityLabel: `Safety actions for @${visibleUsername}`,
          disabled: blockUserMutation.isPending || reportUserMutation.isPending,
          loading: blockUserMutation.isPending || reportUserMutation.isPending,
        }]}
      />

      {userError && !refreshing ? (
        <View style={[styles.centered, { paddingTop: topInset + 64 }]}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : loadingUser && !userData && !refreshing ? (
        <UserProfileSkeleton topPadding={topInset + 20} />
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={handleProfileScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4700ecff" colors={['#4700ecff']} />
          }
        >
          {/* Profile Section — same layout as screens/Profile.tsx */}
          <View style={[styles.profileSection, { paddingTop: topInset + 20 }]}>
            <View style={styles.photoContainer}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push({
                  pathname: '/avatar-viewer',
                  params: { photoUrl: user.profileImage || '', username: user.username },
                })}
              >
                {isOfficialProfile ? (
                  <Image source={OFFICIAL_ACCOUNT_AVATAR_SOURCE} style={styles.officialProfileLogo} resizeMode="contain" />
                ) : (
                  <AvatarImage
                    uri={user.profileImage}
                    size={120}
                    style={{ borderWidth: 3, borderColor: '#333' }}
                  />
                )}
              </TouchableOpacity>
            </View>

            <View
              style={styles.profileIdentity}
              accessible
              accessibilityRole="header"
              accessibilityLabel={profileDisplayName
                ? `${profileDisplayName}, @${visibleUsername}`
                : `@${visibleUsername}`}
            >
              {profileDisplayName ? (
                <Text style={styles.displayName} numberOfLines={1}>
                  {profileDisplayName}
                </Text>
              ) : null}
              <View style={styles.profileHandleRow}>
                <Text
                  style={[
                    styles.username,
                    styles.usernameInRow,
                    profileDisplayName ? styles.usernameSecondary : null,
                  ]}
                  numberOfLines={1}
                >
                  @{visibleUsername}
                </Text>
                {isOfficialProfile && <OfficialAccountBadge />}
                {!isOfficialProfile && user.premiumUser > 0 && <PremiumBadge size="profile" />}
              </View>
            </View>
            {canViewProfileDetails && user.bio ? <Text style={styles.bio} selectable>{user.bio}</Text> : null}
            {canViewProfileDetails ? <ProfileTopInterests interests={topInterests} /> : null}

            {getRelationshipText() && (
              <View style={styles.relationshipBadge}>
                <Ionicons name="people" size={13} color="#4700ecff" />
                <Text style={styles.relationshipText}>{getRelationshipText()}</Text>
              </View>
            )}

            {/* Follow button */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  user.isFollowing && styles.followingButton,
                  isFollowMutationPending && styles.disabledButton,
                ]}
                onPress={handleFollowToggle}
                disabled={isFollowMutationPending}
              >
                <Ionicons
                  name={user.isFollowing ? 'person-remove' : 'person-add'}
                  size={16}
                  color={user.isFollowing ? '#4700ecff' : '#ffffff'}
                />
                <Text style={[styles.followButtonText, user.isFollowing && styles.followingButtonText]}>
                  {user.isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>

            </View>

            <ProfileStats
              postsCount={user.postsCount}
              followersCount={user.followersCount}
              followingCount={user.followingCount}
              challengesCount={user.challengesCount}
              onPostsPress={canViewProfileDetails ? () => handleStatsPress('posts') : undefined}
              onFollowersPress={canViewProfileDetails ? () => handleStatsPress('followers') : undefined}
              onFollowingPress={canViewProfileDetails ? () => handleStatsPress('following') : undefined}
              onChallengesPress={canViewProfileDetails ? () => handleStatsPress('challenges') : undefined}
            />

            <Separator marginTop={10} marginBottom={10} />
          </View>

          {/* Content is visible only for mutual followers. */}
          {canViewProfileDetails ? (
            <>
              {/* Tab Bar */}
              <View style={styles.tabBar}>
                <View
                  style={styles.tabSegment}
                  onLayout={(e) => { segmentWidth.current = e.nativeEvent.layout.width; }}
                >
                  {/* Animated sliding pill */}
                  <Animated.View
                    style={[
                      styles.tabSlidingPill,
                      {
                        transform: [{
                          translateX: tabAnim.interpolate({
                            inputRange: [0, 1, 2],
                            outputRange: [
                              4,
                              (segmentWidth.current / 3) + 4,
                              ((segmentWidth.current * 2) / 3) + 4,
                            ],
                          }),
                        }],
                        width: segmentWidth.current > 0 ? segmentWidth.current / 3 - 8 : '31%',
                      },
                    ]}
                  />
                  <TouchableOpacity
                    style={styles.tab}
                    onPress={() => switchTab('submissions')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={activeTab === 'submissions' ? 'grid' : 'grid-outline'}
                      size={16}
                      color={activeTab === 'submissions' ? '#fff' : '#888'}
                    />
                    <Text style={[styles.tabText, activeTab === 'submissions' && styles.activeTabText]}>
                      Submissions
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.tab}
                    onPress={() => switchTab('challenges')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={activeTab === 'challenges' ? 'trophy' : 'trophy-outline'}
                      size={16}
                      color={activeTab === 'challenges' ? '#fff' : '#888'}
                    />
                    <Text style={[styles.tabText, activeTab === 'challenges' && styles.activeTabText]}>
                      Challenges
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.tab}
                    onPress={() => switchTab('stats')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={activeTab === 'stats' ? 'stats-chart' : 'stats-chart-outline'}
                      size={16}
                      color={activeTab === 'stats' ? '#fff' : '#888'}
                    />
                    <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
                      Stats
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tab Content */}
              {activeTab === 'submissions' ? (
                <View style={styles.tabContent}>
                  {sortedSubmissions.length > 0 ? (
                    <>
                      <View style={styles.galleryToolbar}>
                        <View>
                          <Text style={styles.galleryCount}>
                            {totalSubmissionCount} {totalSubmissionCount === 1 ? 'submission' : 'submissions'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.gridContainer}>
                        {sortedSubmissions.map((sub, index) => {
                          const mediaUrls = parseSubmissionMediaUrls(sub.mediaUrls);
                          return (
                            <TouchableOpacity
                              key={`${sub.id}-${index}`}
                              style={styles.gridItem}
                              onPress={() => router.push({
                                pathname: '/photo-details',
                                params: buildSubmissionDetailRouteParams({
                                  submission: sub,
                                  userName: user.username,
                                  userPhoto: user.profileImage,
                                  challengeTitle: submissionChallengeTitles.get(sub.challengeId),
                                }),
                              })}
                            activeOpacity={0.8}
                          >
                              <View style={styles.submissionImageFrame}>
                                {mediaUrls.length > 0 ? (
                                  <SubmissionMediaCarousel
                                    mediaUrls={mediaUrls}
                                    width={GRID_ITEM_SIZE}
                                    height={GRID_ITEM_SIZE}
                                    autoPlay
                                    borderRadius={0}
                                    contentFit="cover"
                                    onMediaPress={() => router.push({
                                      pathname: '/photo-details',
                                      params: buildSubmissionDetailRouteParams({
                                        submission: sub,
                                        userName: user.username,
                                        userPhoto: user.profileImage,
                                        challengeTitle: submissionChallengeTitles.get(sub.challengeId),
                                      }),
                                    })}
                                  />
                                ) : (
                                  <View style={[styles.gridImage, styles.noImagePlaceholder]}>
                                    <Ionicons name="document-text-outline" size={28} color="#555" />
                                  </View>
                                )}
                                {sub.isPrivate ? (
                                  <View style={styles.privateSubmissionBadge}>
                                    <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
                                    <Text style={styles.privateSubmissionBadgeText}>Private</Text>
                                  </View>
                                ) : null}
                                <View style={styles.submissionChallengeLabel}>
                                  <Ionicons name="trophy-outline" size={15} color="#4700EC" />
                                  <Text style={styles.submissionChallengeLabelText} numberOfLines={1}>
                                    {submissionChallengeTitles.get(sub.challengeId) || 'Challenge'}
                                  </Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {isFetchingNextPage ? (
                        <View style={styles.loadMoreBtn} accessibilityLabel="Loading more submissions">
                          <ActivityIndicator size="small" color="#4700ec" />
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons name="images-outline" size={48} color="#333" />
                      <Text style={styles.emptyStateTitle}>No submissions yet</Text>
                      <Text style={styles.emptyStateSubtitle}>This user has not posted anything yet.</Text>
                    </View>
                  )}
                </View>
              ) : activeTab === 'challenges' ? (
                <View style={styles.tabContent}>
                  {isLoadingUserChallenges || isLoadingCreatedChallenges ? (
                    <View style={styles.emptyState}>
                      <ActivityIndicator size="large" color="#4700ec" />
                      <Text style={styles.emptyStateTitle}>Loading challenges...</Text>
                    </View>
                  ) : combinedChallenges.length > 0 ? (
                    <>
                      <View style={styles.challengeGalleryGrid}>
                        {combinedChallenges.map((mappedChallenge) => (
                          <View
                            key={mappedChallenge.id}
                            style={styles.challengeGalleryCell}
                          >
                            <MyChallengeGalleryCard
                              challenge={mappedChallenge}
                              onPress={() => openChallengeDetails(mappedChallenge)}
                            />
                          </View>
                        ))}
                      </View>
                      {hasNextCreatedChallengesPage && (
                        <TouchableOpacity
                          style={styles.loadMoreBtn}
                          onPress={() => fetchNextCreatedChallengesPage()}
                          disabled={isFetchingNextCreatedChallengesPage}
                          activeOpacity={0.7}
                        >
                          {isFetchingNextCreatedChallengesPage ? (
                            <ActivityIndicator size="small" color="#4700ec" />
                          ) : (
                            <Text style={styles.loadMoreText}>Load More</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons name="trophy-outline" size={48} color="#333" />
                      <Text style={styles.emptyStateTitle}>No challenges yet</Text>
                      <Text style={styles.emptyStateSubtitle}>This user has not joined any challenges.</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.tabContent}>
                  <ProfileStatsTab
                    submissions={statsSubmissions ?? sortedSubmissions}
                    challenges={statsChallenges}
                    submissionChallengeTitles={submissionChallengeTitles}
                    isLoading={isLoadingStatsSubmissions || isLoadingUserChallenges}
                    isPartial={isStatsSubmissionsError || isUserChallengesError}
                  />
                </View>
              )}
            </>
          ) : (
            <View style={styles.privateAccountContainer}>
              <Ionicons name="lock-closed" size={56} color="#4700ecff" />
              <Text style={styles.privateAccountTitle}>This Account is Private</Text>
              <Text style={styles.privateAccountSubtitle}>
                {user.isFollowing
                  ? `@${visibleUsername} needs to follow you back before you can see their profile.`
                  : user.isFollowedBy
                    ? `@${visibleUsername} follows you. Follow them back to see their profile.`
                    : `You both need to follow each other before this profile is visible.`}
              </Text>
              <TouchableOpacity
                style={styles.privateFollowBtn}
                onPress={handleFollowToggle}
              >
                <Ionicons name={user.isFollowing ? 'person-remove' : 'person-add'} size={16} color="#fff" />
                <Text style={styles.privateFollowText}>{user.isFollowing ? 'Following' : 'Follow'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <FollowActionSheet
        visible={showFollowAction}
        username={user.username}
        profilePicUrl={user.profileImage}
        isFollowing={user.isFollowing}
        pending={isFollowMutationPending}
        onCancel={() => setShowFollowAction(false)}
        onConfirm={() => performFollowToggle(true)}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  content: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#4700ecff',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingText: {
    color: '#000000',
    marginTop: 12,
    fontSize: 13,
  },
  // Profile section — mirrors Profile.tsx profileSection
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  photoContainer: {
    marginBottom: 16,
  },
  username: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  displayName: {
    maxWidth: '100%',
    color: '#000000',
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '700',
    marginBottom: 3,
    textAlign: 'center',
  },
  usernameSecondary: {
    color: '#000000',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0,
  },
  profileHandleRow: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 6,
  },
  profileIdentity: {
    width: '100%',
    alignItems: 'center',
  },
  usernameInRow: {
    marginBottom: 0,
    flexShrink: 1,
  },
  officialProfileLogo: {
    width: 120,
    height: 120,
    borderRadius: 27,
  },
  bio: {
    fontSize: 13,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  relationshipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#4700ecff20',
    borderRadius: 16,
  },
  relationshipText: {
    fontSize: 11,
    color: '#4700ecff',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4700ecff',
    paddingVertical: 11,
    borderRadius: 16,
    gap: 7,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4700ecff',
  },
  disabledButton: {
    opacity: 0.65,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  followingButtonText: {
    color: '#4700ecff',
  },
  // Tab bar
  tabBar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    alignItems: 'center',
  },
  tabSegment: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 4,
    width: '100%',
    position: 'relative',
  },
  tabSlidingPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: '#4700ec',
    borderRadius: 14,
    shadowColor: '#4700ec',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    zIndex: 1,
  },
  activeTab: {},
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
    minHeight: 200,
  },
  galleryToolbar: {
    minHeight: 54,
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    paddingTop: 5,
    paddingBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryTitle: {
    color: '#000000',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  galleryCount: {
    color: '#000000',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    paddingBottom: 12,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 5,
  },
  submissionImageFrame: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  privateSubmissionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
  },
  privateSubmissionBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  submissionChallengeLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E7E3EF',
  },
  submissionChallengeLabelText: {
    flex: 1,
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
  },
  gridImage: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
  },
  noImagePlaceholder: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadMoreText: {
    color: '#4700ec',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyStateTitle: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    color: '#000000',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  // Challenge cards — same as Profile.tsx
  challengeGalleryGrid: {
    padding: 12,
    gap: 12,
  },
  challengeFilterBar: {
    paddingHorizontal: 12,
    paddingBottom: 2,
    alignItems: 'flex-end',
    zIndex: 10,
    elevation: 10,
  },
  challengeGalleryCell: {
    width: '100%',
  },
  privateAccountContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  privateAccountTitle: {
    color: '#000000',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  privateAccountSubtitle: {
    color: '#000000',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 19,
  },
  privateFollowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4700ecff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 18,
    gap: 8,
    marginTop: 24,
  },
  privateFollowText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
