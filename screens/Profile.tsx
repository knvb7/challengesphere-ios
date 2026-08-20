import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ChallengeVisibilityDropdown from '../components/challenges/ChallengeVisibilityDropdown';
import MyChallengeGalleryCard from '../components/challenges/MyChallengeGalleryCard';
import AvatarImage from '../components/common/AvatarImage';
import { mapChallenge, mapMyChallenge, type MappedChallenge } from '../components/common/ChallengeCard';
// import IntegrationLogo from '../components/integrations/IntegrationLogo';
import MotivationalTransition from '../components/common/MotivationalTransition';
import OfficialAccountBadge from '../components/common/OfficialAccountBadge';
import ProfileStats from '../components/common/ProfileStats';
import ProfileStatsTab from '../components/common/ProfileStatsTab';
import ProfileTopInterests from '../components/common/ProfileTopInterests';
import PremiumBadge from '../components/common/PremiumBadge';
import Separator from '../components/common/Separator';
import SubmissionMediaCarousel from '../components/common/SubmissionMediaCarousel';
import { TabSceneSkeleton } from '../components/navigation/InstantTabScene';
// import { INTEGRATION_PROVIDERS } from '../constants/integrationProviders';
import { useAllUserSubmissions, useChallengesByIds, useInfiniteChallengesByCreator, useInfiniteUserSubmissions, useMyActiveChallenges } from '../hooks/useChallenges';
import { useUser } from '../hooks/useUsers';
import { useAuthContext } from '../providers/AuthProvider';
import { useSubscription } from '../providers/SubscriptionContext';
import type { ResolvedMotivationalMessage } from '../utils/motivationalMessages';
import { getRandomMotivationalMessage, shouldShowProfileMotivationalTransition } from '../utils/motivationalMessages';
import { buildSubmissionDetailRouteParams } from '../utils/submissionDetail';
import { parseSubmissionMediaUrls } from '../utils/submissionMedia';
import { getProfileDisplayName } from '../utils/userDisplay';
import { getApiErrorMessage } from '../utils/apiError';
import { isOfficialGlobalCreator } from '../utils/globalChallenges';
import {
  filterChallengesByVisibility,
  getChallengeVisibilityFilterLabel,
  type ChallengeVisibilityFilter,
} from '../utils/challengeVisibilityFilter';

const GRID_GAP = 8;
const GRID_HORIZONTAL_PADDING = 12;
const SUBMISSION_CHALLENGE_LABEL_HEIGHT = 40;
const PROFILE_TABS = ['submissions', 'challenges', 'stats'] as const;
type ProfileTab = typeof PROFILE_TABS[number];
const PROFILE_CHALLENGE_BATCH_SIZE = 6;

interface ProfileProps {
  userId?: number;
  onSettingsPress?: () => void;
  onPostsPress?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  onChallengesPress?: () => void;
  initialTab?: ProfileTab;
  onPhotoPress?: (photo: { id: string; photoUrl: any; challengeSummary?: string }) => void;
}

const Profile = ({
  userId: requestedUserId,
  onSettingsPress,
  onPostsPress,
  onFollowersPress,
  onFollowingPress,
  onChallengesPress,
  initialTab,
  onPhotoPress,
}: ProfileProps) => {
  const router = useRouter();
  const { top: topInset } = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const gridItemSize = Math.floor(
    (Math.min(viewportWidth, 720) - (GRID_HORIZONTAL_PADDING * 2) - GRID_GAP) / 2,
  );
  const { currentUserId } = useAuthContext();
  const { status: subscriptionStatus } = useSubscription();
  const userId = requestedUserId || currentUserId;
  const { data: user, isLoading, error, refetch: refetchById } = useUser(userId);
  const refetch = useCallback(async () => {
    await refetchById();
  }, [refetchById]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab ?? 'submissions');
  const shouldLoadProfileChallenges = activeTab === 'challenges' || activeTab === 'stats';

  // Fetch user submissions with infinite pagination
  // Use userId from authContext directly (available synchronously) so the query
  // fires immediately instead of waiting for the user profile fetch to complete.
  const targetUserId = user?.id || userId;
  const isOfficialProfile = isOfficialGlobalCreator(user?.username ?? '');
  const showPremiumBadge = Number(user?.premiumUser ?? 0) > 0
    || (targetUserId === currentUserId && subscriptionStatus?.premium === true);
  const {
    data: submissionsPages,
    refetch: refetchSubmissions,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteUserSubmissions(targetUserId, currentUserId, 20);
  const {
    data: statsSubmissions,
    isLoading: isLoadingStatsSubmissions,
    isError: isStatsSubmissionsError,
    refetch: refetchStatsSubmissions,
  } = useAllUserSubmissions(
    targetUserId,
    currentUserId,
    activeTab === 'stats',
  );
  const {
    data: myChallengesData,
    refetch: refetchMyChallenges,
    isLoading: isLoadingMyChallenges,
    isError: isMyChallengesError,
  } = useMyActiveChallenges(targetUserId, undefined, currentUserId, shouldLoadProfileChallenges);
  const {
    data: createdChallengesPages,
    refetch: refetchCreatedChallenges,
    fetchNextPage: fetchNextCreatedChallengesPage,
    hasNextPage: hasNextCreatedChallengesPage,
    isFetchingNextPage: isFetchingNextCreatedChallengesPage,
    isLoading: isLoadingCreatedChallenges,
  } = useInfiniteChallengesByCreator(targetUserId, currentUserId, 20, true);
  const topInterests = createdChallengesPages?.pages?.[0]?.topInterests || [];

  // Merge joined (non-creator) + created challenges — same logic as my-challenges tab
  const combinedChallenges = useMemo(() => {
    const joined = (myChallengesData?.challenges || [])
      .map((c) => mapMyChallenge(c, targetUserId))
      .filter((c) => !c.isCreator);
    const created = (createdChallengesPages?.pages?.flatMap(page => page.challenges) || []).map((c) =>
      mapChallenge(c, targetUserId)
    );
    const joinedIds = new Set(joined.map((c) => c.id));
    return [...joined, ...created.filter((c) => !joinedIds.has(c.id))];
  }, [myChallengesData, createdChallengesPages, targetUserId]);
  const statsChallenges = useMemo(
    () => (myChallengesData?.challenges || []).map((challenge) =>
      mapMyChallenge(challenge, targetUserId)
    ),
    [myChallengesData, targetUserId],
  );
  const [challengeVisibilityFilter, setChallengeVisibilityFilter] =
    useState<ChallengeVisibilityFilter>('all');
  const filteredProfileChallenges = useMemo(
    () => filterChallengesByVisibility(combinedChallenges, challengeVisibilityFilter),
    [challengeVisibilityFilter, combinedChallenges],
  );
  const [visibleProfileChallengeCount, setVisibleProfileChallengeCount] = useState(PROFILE_CHALLENGE_BATCH_SIZE);
  useEffect(() => {
    if (activeTab === 'challenges') {
      setVisibleProfileChallengeCount(PROFILE_CHALLENGE_BATCH_SIZE);
    }
  }, [activeTab, challengeVisibilityFilter, targetUserId]);
  const visibleProfileChallenges = useMemo(
    () => filteredProfileChallenges.slice(0, visibleProfileChallengeCount),
    [filteredProfileChallenges, visibleProfileChallengeCount],
  );
  const hasMoreVisibleProfileChallenges = visibleProfileChallengeCount < filteredProfileChallenges.length;
  const challengeVisibilityLabel =
    getChallengeVisibilityFilterLabel(challengeVisibilityFilter);
  const challengesCount = useMemo(() => {
    const hasChallengeData = Boolean(myChallengesData || createdChallengesPages?.pages?.length);
    if (!hasChallengeData || isLoadingMyChallenges || isLoadingCreatedChallenges) {
      return user?.challengesAccepted ?? 0;
    }

    const joinedCount = (myChallengesData?.challenges || [])
      .filter((challenge) => challenge.creatorId !== targetUserId)
      .length;
    const createdCount = createdChallengesPages?.pages?.[0]?.totalCount
      ?? createdChallengesPages?.pages?.flatMap(page => page.challenges).length
      ?? 0;

    return joinedCount + createdCount;
  }, [
    myChallengesData,
    createdChallengesPages,
    targetUserId,
    user?.challengesAccepted,
    isLoadingMyChallenges,
    isLoadingCreatedChallenges,
  ]);
  const [showMotivationalScreen, setShowMotivationalScreen] = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState<ResolvedMotivationalMessage | null>(null);
  const motivationalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabAnim = useRef(new Animated.Value(PROFILE_TABS.indexOf(initialTab ?? 'submissions'))).current;
  const segmentWidth = useRef(0);
  const lastInitialTabRef = useRef<ProfileTab | undefined>(initialTab);
  const submissionsPageRequestRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.username || !shouldShowProfileMotivationalTransition()) {
        return undefined;
      }

      setMotivationalMessage(getRandomMotivationalMessage(user.username));
      setShowMotivationalScreen(true);

      if (motivationalTimerRef.current) {
        clearTimeout(motivationalTimerRef.current);
      }
      motivationalTimerRef.current = setTimeout(() => {
        motivationalTimerRef.current = null;
        setShowMotivationalScreen(false);
      }, 1200);

      return () => {
        if (motivationalTimerRef.current) {
          clearTimeout(motivationalTimerRef.current);
          motivationalTimerRef.current = null;
        }
        setShowMotivationalScreen(false);
      };
    }, [user?.username])
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

  useEffect(() => {
    if (!initialTab || lastInitialTabRef.current === initialTab) {
      return;
    }

    lastInitialTabRef.current = initialTab;
    switchTab(initialTab);
  }, [initialTab, switchTab]);

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

  // All submissions sorted by submissionTime desc (flattened from all pages)
  const sortedSubmissions = useMemo(() => {
    const allSubs = submissionsPages?.pages?.flatMap(page => page.submissions) || [];
    return [...allSubs].sort((a, b) =>
      new Date(b.submissionTime).getTime() - new Date(a.submissionTime).getTime()
    );
  }, [submissionsPages]);
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
  const profileDisplayName = useMemo(
    () => (user ? getProfileDisplayName(user) : ''),
    [user]
  );
  const totalSubmissionCount = submissionsPages?.pages?.[0]?.totalCount ?? sortedSubmissions.length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const refreshTasks: Promise<unknown>[] = [refetch()];
      if (activeTab === 'submissions' || activeTab === 'stats') {
        refreshTasks.push(refetchSubmissions());
      }
      if (activeTab === 'stats') {
        refreshTasks.push(refetchStatsSubmissions());
      }
      if (shouldLoadProfileChallenges) {
        refreshTasks.push(refetchMyChallenges(), refetchCreatedChallenges());
      }
      await Promise.all(refreshTasks);
    } finally {
      setRefreshing(false);
    }
  }, [
    activeTab,
    refetch,
    refetchSubmissions,
    refetchStatsSubmissions,
    refetchMyChallenges,
    refetchCreatedChallenges,
    shouldLoadProfileChallenges,
  ]);

  const handleSettingsPress = () => {
    if (onSettingsPress) {
      onSettingsPress();
    } else {
      router.push('/settings');
    }
  };

  const renderProfileActions = (overlay = false) => (
    <View style={[styles.profileActions, overlay && { top: topInset + 5 }]}>
      <TouchableOpacity
        onPress={() => router.push('/premium' as any)}
        style={[
          styles.profileActionButton,
          styles.premiumButton,
          showPremiumBadge && styles.premiumButtonActive,
        ]}
        accessibilityRole="button"
        accessibilityLabel={showPremiumBadge ? 'Manage Premium' : 'View Premium'}
      >
        <Ionicons
          name={showPremiumBadge ? 'diamond' : 'diamond-outline'}
          size={21}
          color={showPremiumBadge ? '#9B6200' : '#5B3FE5'}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleSettingsPress}
        style={[styles.profileActionButton, styles.settingsButton]}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
      >
        <Image
          source={require('../assets/icons/settings.png')}
          style={styles.settingsIcon}
        />
      </TouchableOpacity>
    </View>
  );

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
      },
    });
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <TabSceneSkeleton routeName="profile" />
        {renderProfileActions(true)}
      </View>
    );
  }

  if (error || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderProfileActions(true)}
        <ScrollView
          contentContainerStyle={styles.loadingContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4700ec"
              colors={['#4700ec']}
            />
          }
        >
          <Text style={styles.errorText}>Failed to load profile</Text>
          {error && (
            <Text style={styles.errorDetail}>
              {getApiErrorMessage(error, 'Could not load your profile. Pull down to try again.')}
            </Text>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Tap to Retry</Text>
          </TouchableOpacity>
          <Text style={styles.pullHint}>or pull down to refresh</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={handleProfileScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4700ec"
            colors={['#4700ec']}
          />
        }
      >
        <View style={styles.profileSection}>
          {renderProfileActions()}
          <View style={styles.photoContainer}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push({
                pathname: '/avatar-viewer',
                params: { photoUrl: user.profilePicUrl || '', username: user.username },
              })}
            >
              <AvatarImage
                uri={user.profilePicUrl}
                size={120}
                style={{ borderWidth: 3, borderColor: '#333' }}
              />
            </TouchableOpacity>
          </View>

          {profileDisplayName ? (
            <Text style={styles.displayName} numberOfLines={1}>
              {profileDisplayName}
            </Text>
          ) : null}
          <View style={styles.profileHandleRow}>
            <Text style={[styles.username, profileDisplayName ? styles.usernameSecondary : null]} numberOfLines={1}>
              @{user.username}
            </Text>
            {isOfficialProfile ? (
              <OfficialAccountBadge />
            ) : showPremiumBadge ? (
              <PremiumBadge size="profile" />
            ) : null}
          </View>
          {user.bio ? <Text style={styles.bio} selectable>{user.bio}</Text> : null}
          <ProfileTopInterests interests={topInterests} />

          <ProfileStats
            postsCount={submissionsPages?.pages?.[0]?.totalCount ?? 0}
            followersCount={user.followers}
            followingCount={user.following}
            challengesCount={challengesCount}
            onPostsPress={onPostsPress ?? (() => switchTab('submissions'))}
            onFollowersPress={onFollowersPress}
            onFollowingPress={onFollowingPress}
            onChallengesPress={onChallengesPress ?? (() => switchTab('challenges'))}
          />

          <Separator marginTop={10} marginBottom={10} />
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <View
            style={styles.tabSegment}
            onLayout={(e) => { segmentWidth.current = e.nativeEvent.layout.width; }}
          >
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
                <View style={styles.gridContainer}>
                  {sortedSubmissions.map((sub, index) => {
                    const mediaUrls = parseSubmissionMediaUrls(sub.mediaUrls);
                    return (
                      <TouchableOpacity
                        key={`${sub.id}-${index}`}
                        style={[
                          styles.gridItem,
                          {
                            width: gridItemSize,
                            height: gridItemSize + SUBMISSION_CHALLENGE_LABEL_HEIGHT,
                          },
                        ]}
                        onPress={() => router.push({
                          pathname: '/photo-details',
                          params: buildSubmissionDetailRouteParams({
                            submission: sub,
                            userName: user.username,
                            userPhoto: user.profilePicUrl,
                            challengeTitle: submissionChallengeTitles.get(sub.challengeId),
                          }),
                        })}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.submissionImageFrame, { width: gridItemSize, height: gridItemSize }]}>
                          {mediaUrls.length > 0 ? (
                            <SubmissionMediaCarousel
                              mediaUrls={mediaUrls}
                              width={gridItemSize}
                              height={gridItemSize}
                              autoPlay
                              borderRadius={0}
                              contentFit="cover"
                              onMediaPress={() => router.push({
                                pathname: '/photo-details',
                                params: buildSubmissionDetailRouteParams({
                                  submission: sub,
                                  userName: user.username,
                                  userPhoto: user.profilePicUrl,
                                  challengeTitle: submissionChallengeTitles.get(sub.challengeId),
                                }),
                              })}
                            />
                          ) : (
                            <View style={[styles.gridImage, styles.noImagePlaceholder, { width: gridItemSize, height: gridItemSize }]}>
                              <Ionicons name="document-text-outline" size={28} color="#555" />
                            </View>
                          )}
                        </View>
                        <View style={styles.submissionChallengeLabel}>
                          <Ionicons name="trophy-outline" size={15} color="#4700EC" />
                          <Text style={styles.submissionChallengeLabelText} numberOfLines={1}>
                            {submissionChallengeTitles.get(sub.challengeId) || 'Challenge'}
                          </Text>
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
                <Text style={styles.emptyStateSubtitle}>
                  Join a challenge and start posting!
                </Text>
              </View>
            )}
          </View>
        ) : activeTab === 'challenges' ? (
          <View style={styles.tabContent}>
            {isLoadingMyChallenges || isLoadingCreatedChallenges ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="small" color="#4700ec" />
                <Text style={styles.emptyStateTitle}>Loading challenges...</Text>
              </View>
            ) : combinedChallenges.length > 0 ? (
              <>
                <View style={styles.challengeFilterBar}>
                  <ChallengeVisibilityDropdown
                    value={challengeVisibilityFilter}
                    onChange={setChallengeVisibilityFilter}
                    style={styles.challengeVisibilityDropdown}
                  />
                </View>
                {filteredProfileChallenges.length > 0 ? (
                  <>
                    <View style={styles.challengeGalleryGrid}>
                      {visibleProfileChallenges.map((mapped) => (
                        <View
                          key={`challenge-${mapped.id}`}
                          style={styles.challengeGalleryCell}
                        >
                          <MyChallengeGalleryCard
                            challenge={mapped}
                            onPress={() => openChallengeDetails(mapped)}
                          />
                        </View>
                      ))}
                    </View>
                    {hasMoreVisibleProfileChallenges && (
                      <TouchableOpacity
                        style={styles.loadMoreBtn}
                        onPress={() => setVisibleProfileChallengeCount((count) => count + PROFILE_CHALLENGE_BATCH_SIZE)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.loadMoreText}>Load More</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="trophy-outline" size={48} color="#333" />
                    <Text style={styles.emptyStateTitle}>
                      No {challengeVisibilityLabel.toLowerCase()} challenges
                    </Text>
                    <Text style={styles.emptyStateSubtitle}>
                      Switch the visibility filter back to All.
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={48} color="#333" />
                <Text style={styles.emptyStateTitle}>No challenges yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Accept a challenge to get started!
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.tabContent}>
            <ProfileStatsTab
              submissions={statsSubmissions ?? sortedSubmissions}
              challenges={statsChallenges}
              submissionChallengeTitles={submissionChallengeTitles}
              isLoading={isLoadingStatsSubmissions || isLoadingMyChallenges}
              isPartial={isStatsSubmissionsError || isMyChallengesError}
            />
          </View>
        )}
      </ScrollView>

      <MotivationalTransition
        visible={showMotivationalScreen}
        message={motivationalMessage}
        variant="join"
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#000000',
    marginTop: 12,
    fontSize: 13,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 15,
    fontWeight: '600',
  },
  errorDetail: {
    color: '#000000',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#4700ec',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pullHint: {
    color: '#000000',
    fontSize: 11,
    marginTop: 10,
  },
  scrollContent: {
    flexGrow: 1,
  },
  profileActions: {
    position: 'absolute',
    top: 0,
    right: 16,
    zIndex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  profileActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  premiumButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E3EF',
  },
  premiumButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E6C65B',
  },
  settingsButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E3EF',
  },
  settingsIcon: {
    width: 24,
    height: 24,
    tintColor: '#4700EC',
  },
  profileSection: {
    position: 'relative',
    alignItems: 'center',
    paddingTop: 5,
    paddingHorizontal: 20,
  },
  photoContainer: {
    marginBottom: 20,
  },
  username: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: 0.5,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bio: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 4,
  },
  photoGridContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F8F7FC',
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
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    paddingBottom: 12,
  },
  gridItem: {
    overflow: 'hidden' as const,
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
    overflow: 'hidden',
    backgroundColor: '#161616',
  },
  submissionChallengeLabel: {
    height: SUBMISSION_CHALLENGE_LABEL_HEIGHT,
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
  },
  // — Tab Bar —
  tabBar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    alignItems: 'center' as const,
  },
  tabSegment: {
    flexDirection: 'row' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 4,
    width: '100%',
    position: 'relative' as const,
  },
  tabSlidingPill: {
    position: 'absolute' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 10,
    gap: 6,
    zIndex: 1,
  },
  activeTab: {},
  tabText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#000000',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700' as const,
  },
  tabContent: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
    minHeight: 200,
  },
  // — Day Badge (submissions grid) —
  noImagePlaceholder: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // — Load More —
  loadMoreBtn: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 16,
  },
  loadMoreText: {
    color: '#4700ec',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  // — Empty State —
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyStateTitle: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  emptyStateSubtitle: {
    color: '#000000',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center' as const,
  },
  // — Challenge Cards —
  challengeGalleryGrid: {
    padding: 12,
    gap: 12,
  },
  challengeFilterBar: {
    paddingHorizontal: 12,
    paddingBottom: 2,
    alignItems: 'flex-end' as const,
    zIndex: 10,
    elevation: 10,
  },
  challengeVisibilityDropdown: {
    alignSelf: 'flex-end' as const,
  },
  challengeGalleryCell: {
    width: '100%',
  },
});

export default Profile;
