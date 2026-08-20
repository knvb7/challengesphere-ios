import hapticFeedback from '@/utils/haptics';
import { AppAlert as Alert } from '@/utils/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';

import { SafeAreaView } from 'react-native-safe-area-context';
import InlineNativeAd from '../../components/ads/InlineNativeAd';
import GlobalChallengeGalleryCard from '../../components/challenges/GlobalChallengeGalleryCard';
import AvatarImage from '../../components/common/AvatarImage';
import { getChallengeStatusFromDates } from '../../components/common/ChallengeCard';
import FollowActionSheet from '../../components/common/FollowActionSheet';
import OfficialAccountBadge from '../../components/common/OfficialAccountBadge';
import PremiumBadge from '../../components/common/PremiumBadge';
import {
  SkeletonBlock,
  SkeletonUserRow,
  useSkeletonShimmer,
} from '../../components/common/Skeleton';
import { useInfiniteChallengesByCategory, useInfinitePopularChallenges, useInfinitePublicChallengesByCreator, useInfiniteRecentChallenges, useInfiniteSearchChallenges, useJoinChallenge, useMyActiveChallenges } from '../../hooks/useChallenges';
import { useFollowUser, useSearchUsers, useSuggestedUsers, useUnfollowUser, useUserByUsername, useUserFollowing, useUsersByIds } from '../../hooks/useUsers';
import { useAuthContext } from '../../providers/AuthProvider';
import { Challenge, ChallengeInfo, PopularChallengeItem, User } from '../../types/api';
import { isOneOffChallengeMode } from '../../utils/challengeMode';
import { getDisplayDescription } from '../../utils/challengeDisplayText';
import { parseCoverPhotoUrls } from '../../utils/challengePhotos';
import { getMinimumVisibleChallengerCount } from '../../utils/challengeParticipantCounts';
import {
  getGlobalCreatorDisplayUsername,
  GlobalChallengeFilter,
  isOfficialGlobalCreator,
  matchesGlobalChallengeFilter,
  OFFICIAL_ACCOUNT_AVATAR_SOURCE,
  OFFICIAL_GLOBAL_USERNAME,
} from '../../utils/globalChallenges';
import { getApiErrorMessage } from '../../utils/apiError';
import { showAppMessage } from '../../utils/appMessage';
import { shouldInsertInlineAd } from '../../utils/inlineAdPlacement';
import { showChallengeLimitUpgrade } from '../../utils/challengeLimitUpgrade';

interface GlobalChallenge {
  id: string;
  numericId: number;
  title: string;
  description: string;
  category: string;
  duration: string;
  participantsCount: number;
  creatorName: string;
  creatorUsername: string;
  creatorAvatar: string;
  creatorId: number;
  isFollowing: boolean;
  image?: string;
  coverPhotoUrls?: string[];
  integrationProvider?: string | null;
  verificationProvider?: string | null;
  appIntegrationProvider?: string | null;
  isPrivate?: boolean;
  challengeMode?: string;
  proofMode?: string;
  officialTemplateKey?: string | null;
  cohortKey?: string | null;
  trending: boolean;
  tags: string[];
  location?: string;
  createdAt?: string;
  startDate?: string;
  numberOfDays: number;
  active?: boolean;
}

type ExploreListItem =
  | { kind: 'challenge'; challenge: GlobalChallenge }
  | { kind: 'person'; user: User }
  | { kind: 'ad'; id: string };

// Helper to convert numberOfDays to a human-readable duration
const getDurationLabel = (days: number): string => {
  if (days <= 1) return '1 Day';
  if (days <= 3) return `${days} Days`;
  if (days === 7) return '1 Week';
  if (days === 14) return '2 Weeks';
  if (days <= 30) return '1 Month';
  if (days <= 90) return '3 Months';
  return `${days} Days`;
};

const isExpiredGlobalChallenge = (challenge: GlobalChallenge): boolean => {
  if (isOneOffChallengeMode(challenge.challengeMode)) {
    return false;
  }
  const startDate = challenge.startDate || challenge.createdAt || '';
  return getChallengeStatusFromDates(startDate, challenge.numberOfDays, challenge.active) === 'completed';
};

const normalizeSearchText = (value: string): string => {
  return value.trim().replace(/^#/, '').toLowerCase();
};

const CHALLENGE_PAGE_SIZE = 20;
const EXPLORE_AD_INTERVAL = 3;

const ExplorePeopleSkeleton = () => {
  const shimmer = useSkeletonShimmer();

  return (
    <View style={styles.peopleSkeletonList} accessibilityLabel="Loading people" accessibilityRole="progressbar">
      {[0, 1, 2, 3].map((item) => (
        <SkeletonUserRow
          key={item}
          translateX={shimmer}
          avatarSize={48}
          style={styles.peopleSkeletonRow}
        />
      ))}
    </View>
  );
};

const ExploreChallengeResultsSkeleton = () => {
  const shimmer = useSkeletonShimmer();

  return (
    <View style={styles.challengeSkeletonList} accessibilityLabel="Loading challenges" accessibilityRole="progressbar">
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.challengeSkeletonCard}>
          <SkeletonBlock translateX={shimmer} height={154} borderRadius={14} />
          <View style={styles.challengeSkeletonCopy}>
            <SkeletonBlock translateX={shimmer} width="68%" height={15} borderRadius={8} />
            <SkeletonBlock translateX={shimmer} width="94%" height={11} borderRadius={6} />
            <SkeletonBlock translateX={shimmer} width="58%" height={11} borderRadius={6} />
          </View>
        </View>
      ))}
    </View>
  );
};

const Global = () => {
  const router = useRouter();
  const { currentUserId } = useAuthContext();
  const CURRENT_USER_ID = currentUserId;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'challenges' | 'people'>('challenges');
  const [activeFilter, setActiveFilter] = useState<GlobalChallengeFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const challengeSearchQuery = searchMode === 'challenges' ? searchQuery : '';
  const peopleSearchQuery = searchMode === 'people' ? searchQuery : '';

  const categories = ['All', 'Fun', 'Fitness', 'Health', 'Coding', 'Learning', 'Creativity', 'Lifestyle'];

  // API hooks
  const { data: officialCreator } = useUserByUsername(OFFICIAL_GLOBAL_USERNAME, CURRENT_USER_ID);
  const officialCreatorId = officialCreator?.id ?? 0;
  const {
    data: popularPages,
    isLoading: isLoadingPopular,
    error: popularError,
    refetch: refetchPopular,
    fetchNextPage: fetchNextPopularPage,
    hasNextPage: hasNextPopularPage,
    isFetchingNextPage: isFetchingNextPopularPage,
  } = useInfinitePopularChallenges(CHALLENGE_PAGE_SIZE, CURRENT_USER_ID);
  const {
    data: recentPages,
    isLoading: isLoadingRecent,
    error: recentError,
    refetch: refetchRecent,
    fetchNextPage: fetchNextRecentPage,
    hasNextPage: hasNextRecentPage,
    isFetchingNextPage: isFetchingNextRecentPage,
  } = useInfiniteRecentChallenges(CHALLENGE_PAGE_SIZE, CURRENT_USER_ID);
  const {
    data: searchPages,
    isLoading: isLoadingSearch,
    error: searchError,
    refetch: refetchSearch,
    fetchNextPage: fetchNextSearchPage,
    hasNextPage: hasNextSearchPage,
    isFetchingNextPage: isFetchingNextSearchPage,
  } = useInfiniteSearchChallenges(challengeSearchQuery, undefined, CHALLENGE_PAGE_SIZE, CURRENT_USER_ID);
  const {
    data: peopleSearchData,
    isLoading: isLoadingPeople,
    error: peopleSearchError,
    refetch: refetchPeopleSearch,
  } = useSearchUsers(peopleSearchQuery, 1, 20);
  const {
    data: suggestedPeopleData,
    isLoading: isLoadingSuggestedPeople,
    error: suggestedPeopleError,
    refetch: refetchSuggestedPeople,
  } = useSuggestedUsers(
    1,
    12,
    searchMode === 'people' && peopleSearchQuery.trim().length === 0,
  );
  const {
    data: categoryPages,
    isLoading: isLoadingCategory,
    error: categoryError,
    refetch: refetchCategory,
    fetchNextPage: fetchNextCategoryPage,
    hasNextPage: hasNextCategoryPage,
    isFetchingNextPage: isFetchingNextCategoryPage,
  } = useInfiniteChallengesByCategory(
    selectedCategory !== 'All' ? selectedCategory : '',
    CHALLENGE_PAGE_SIZE,
    CURRENT_USER_ID
  );
  const {
    data: officialPages,
    isLoading: isLoadingOfficial,
    error: officialError,
    refetch: refetchOfficial,
    fetchNextPage: fetchNextOfficialPage,
    hasNextPage: hasNextOfficialPage,
    isFetchingNextPage: isFetchingNextOfficialPage,
  } = useInfinitePublicChallengesByCreator(officialCreatorId, CHALLENGE_PAGE_SIZE, officialCreatorId > 0);
  const { data: followingData, refetch: refetchFollowing } = useUserFollowing(
    CURRENT_USER_ID,
    1,
    100,
    CURRENT_USER_ID
  );
  const { data: myActiveChallengesData } = useMyActiveChallenges(CURRENT_USER_ID ?? 0);
  const joinedChallengeIds = useMemo(
    () => new Set((myActiveChallengesData?.challenges || []).map(c => c.id)),
    [myActiveChallengesData]
  );
  const followUserMutation = useFollowUser();
  const unfollowUserMutation = useUnfollowUser();
  const joinChallengeMutation = useJoinChallenge();

  const [refreshing, setRefreshing] = useState(false);
  const [followedSuggestedUserIds, setFollowedSuggestedUserIds] = useState<Set<number>>(() => new Set());
  const [followTarget, setFollowTarget] = useState<GlobalChallenge | null>(null);

  const loadMoreChallenges = useCallback(() => {
    if (searchMode === 'people') {
      return;
    }

    if (challengeSearchQuery.trim().length > 0) {
      if (hasNextSearchPage && !isFetchingNextSearchPage) {
        fetchNextSearchPage();
      }
      return;
    }

    if (selectedCategory !== 'All') {
      if (hasNextCategoryPage && !isFetchingNextCategoryPage) {
        fetchNextCategoryPage();
      }
      return;
    }

    if (activeFilter === 'global' && hasNextOfficialPage && !isFetchingNextOfficialPage) {
      fetchNextOfficialPage();
      return;
    }

    if (hasNextPopularPage && !isFetchingNextPopularPage) {
      fetchNextPopularPage();
      return;
    }

    if (hasNextRecentPage && !isFetchingNextRecentPage) {
      fetchNextRecentPage();
    }
  }, [
    searchMode,
    challengeSearchQuery,
    selectedCategory,
    hasNextSearchPage,
    isFetchingNextSearchPage,
    fetchNextSearchPage,
    hasNextCategoryPage,
    isFetchingNextCategoryPage,
    fetchNextCategoryPage,
    activeFilter,
    hasNextOfficialPage,
    isFetchingNextOfficialPage,
    fetchNextOfficialPage,
    hasNextPopularPage,
    isFetchingNextPopularPage,
    fetchNextPopularPage,
    hasNextRecentPage,
    isFetchingNextRecentPage,
    fetchNextRecentPage,
  ]);

  // Set of IDs the current user is following
  const followingIds = useMemo(() => {
    const ids = new Set<number>();
    if (followingData?.users) {
      followingData.users.forEach((u) => ids.add(u.id));
    }
    return ids;
  }, [followingData]);

  const creatorIds = useMemo(() => {
    const ids = new Set<number>();

    searchPages?.pages?.forEach((page) => page.challenges?.forEach((challenge) => {
      if (challenge?.creatorId) ids.add(challenge.creatorId);
    }));

    categoryPages?.pages?.forEach((page) => page.challenges?.forEach((challenge) => {
      if (challenge?.creatorId) ids.add(challenge.creatorId);
    }));

    popularPages?.pages?.forEach((page) => page.challenges?.forEach((item) => {
      const creatorId = item?.challenge?.creatorId;
      if (creatorId) ids.add(creatorId);
    }));

    recentPages?.pages?.forEach((page) => page.challenges?.forEach((challenge) => {
      if (challenge?.creatorId) ids.add(challenge.creatorId);
    }));

    officialPages?.pages?.forEach((page) => page.challenges?.forEach((challenge) => {
      if (challenge?.creatorId) ids.add(challenge.creatorId);
    }));

    return [...ids];
  }, [searchPages, categoryPages, popularPages, recentPages, officialPages]);

  const { usersById: creatorProfiles } = useUsersByIds(creatorIds, CURRENT_USER_ID);

  // Map API challenge data to GlobalChallenge display format
  const mapChallengeToGlobal = useCallback((challenge?: Challenge | ChallengeInfo | null, participantCount?: number): GlobalChallenge | null => {
    if (!challenge || typeof challenge.id !== 'number') {
      return null;
    }

    const hashtags = typeof challenge.hashtags === 'string'
      ? challenge.hashtags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
      : [];
    const coverPhotoUrls = parseCoverPhotoUrls('coverPhotoUrls' in challenge ? challenge.coverPhotoUrls : undefined);
    const categoryStr = typeof challenge.categories === 'string' && challenge.categories.trim().length > 0
      ? challenge.categories.split(',')[0].trim()
      : 'General';
    const creatorId = typeof challenge.creatorId === 'number' ? challenge.creatorId : 0;
    const creatorProfile = creatorProfiles[creatorId] ||
      (creatorId === officialCreatorId ? officialCreator : undefined);
    const creatorUsername = 'creatorUsername' in challenge && typeof challenge.creatorUsername === 'string' && challenge.creatorUsername.trim().length > 0
      ? challenge.creatorUsername.trim()
      : creatorProfile?.username || `user${creatorId}`;
    const creatorProfilePicUrl = 'creatorProfilePicUrl' in challenge &&
      typeof challenge.creatorProfilePicUrl === 'string'
      ? challenge.creatorProfilePicUrl
      : '';
    const numberOfDays = typeof challenge.numberOfDays === 'number' && challenge.numberOfDays > 0
      ? challenge.numberOfDays
      : 1;
    const challengeMode = 'challengeMode' in challenge ? challenge.challengeMode : undefined;
    const oneOff = isOneOffChallengeMode(challengeMode);
    const participantTotal = participantCount ?? (typeof (challenge as ChallengeInfo).participantCount === 'number' ? (challenge as ChallengeInfo).participantCount : 0) ?? 0;
    const pc = getMinimumVisibleChallengerCount(participantTotal);

    return {
      id: challenge.id.toString(),
      numericId: challenge.id,
      title: challenge.title || 'Untitled Challenge',
      description: getDisplayDescription(challenge),
      category: categoryStr,
      duration: oneOff ? 'One-off' : getDurationLabel(numberOfDays),
      participantsCount: pc,
      creatorName: creatorUsername || creatorProfile?.username || `User ${creatorId}`,
      creatorUsername: creatorUsername.startsWith('@') ? creatorUsername : `@${creatorUsername}`,
      creatorAvatar: creatorProfilePicUrl || creatorProfile?.profilePicUrl || '',
      creatorId,
      isFollowing: followingIds.has(creatorId),
      image: coverPhotoUrls[0],
      coverPhotoUrls,
      integrationProvider: 'integrationProvider' in challenge ? challenge.integrationProvider : undefined,
      verificationProvider: 'verificationProvider' in challenge ? challenge.verificationProvider : undefined,
      appIntegrationProvider: 'appIntegrationProvider' in challenge ? challenge.appIntegrationProvider : undefined,
      isPrivate: Boolean('isPrivate' in challenge ? challenge.isPrivate : false),
      challengeMode,
      proofMode: 'proofMode' in challenge ? challenge.proofMode : undefined,
      officialTemplateKey: 'officialTemplateKey' in challenge ? challenge.officialTemplateKey : undefined,
      cohortKey: 'cohortKey' in challenge ? challenge.cohortKey : undefined,
      trending: pc > 100,
      tags: hashtags,
      createdAt: 'createdAt' in challenge ? challenge.createdAt : undefined,
      startDate: 'startDate' in challenge ? challenge.startDate : undefined,
      numberOfDays,
      active: 'active' in challenge ? challenge.active : undefined,
    };
  }, [followingIds, creatorProfiles, officialCreatorId, officialCreator]);

  const matchesSearchQuery = useCallback((challenge: GlobalChallenge, query: string): boolean => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      return true;
    }

    const creatorUsername = normalizeSearchText(challenge.creatorUsername);
    const creatorName = normalizeSearchText(challenge.creatorName);
    const challengeName = normalizeSearchText(challenge.title);
    const tags = challenge.tags.map(normalizeSearchText);

    return challengeName.includes(normalizedQuery) ||
      creatorUsername.includes(normalizedQuery) ||
      creatorName.includes(normalizedQuery) ||
      tags.some((tag) => tag.includes(normalizedQuery));
  }, []);

  // Build the challenges list from API data
  const allChallenges: GlobalChallenge[] = useMemo(() => {
    const sortByJoinedCount = (challenges: GlobalChallenge[]): GlobalChallenge[] => {
      return [...challenges].sort((left, right) => {
        const cohortPriority = Number(Boolean(right.cohortKey)) - Number(Boolean(left.cohortKey));
        return cohortPriority || right.participantsCount - left.participantsCount;
      });
    };
    const sortByCreatedAt = (challenges: GlobalChallenge[]): GlobalChallenge[] => {
      return [...challenges].sort((left, right) => {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightTime - leftTime;
      });
    };

    const uniqueChallenges = (challenges: GlobalChallenge[]): GlobalChallenge[] => {
      const seen = new Set<number>();
      return challenges.filter((challenge) => {
        if (seen.has(challenge.numericId)) {
          return false;
        }
        seen.add(challenge.numericId);
        return true;
      });
    };

    const fromSearch = (searchPages?.pages?.flatMap(page => page.challenges) || [])
      .map(c => mapChallengeToGlobal(c))
      .filter((challenge): challenge is GlobalChallenge => challenge !== null);
    const fromCategory = (categoryPages?.pages?.flatMap(page => page.challenges) || [])
      .map(c => mapChallengeToGlobal(c))
      .filter((challenge): challenge is GlobalChallenge => challenge !== null);
    const fromPopular = (popularPages?.pages?.flatMap(page => page.challenges) || [])
      .map((item: PopularChallengeItem) => mapChallengeToGlobal(item?.challenge, item?.participantCount))
      .filter((challenge): challenge is GlobalChallenge => challenge !== null);
    const fromRecent = (recentPages?.pages?.flatMap(page => page.challenges) || [])
      .map((c: ChallengeInfo) => mapChallengeToGlobal(c))
      .filter((challenge): challenge is GlobalChallenge => challenge !== null);
    const fromOfficial = (officialPages?.pages?.flatMap(page => page.challenges) || [])
      .map(c => mapChallengeToGlobal(c))
      .filter((challenge): challenge is GlobalChallenge => challenge !== null);
    const categoryOfficial = selectedCategory === 'All'
      ? fromOfficial
      : fromOfficial.filter(challenge => normalizeSearchText(challenge.category) === normalizeSearchText(selectedCategory));

    if (challengeSearchQuery.trim().length > 0) {
      return sortByJoinedCount(uniqueChallenges([
        ...fromOfficial,
        ...fromSearch,
        ...fromPopular,
        ...fromRecent,
        ...(selectedCategory !== 'All' ? fromCategory : []),
      ]).filter((challenge) => matchesSearchQuery(challenge, challengeSearchQuery)));
    }

    // If a specific category is selected, use category results
    if (selectedCategory !== 'All') {
      return sortByJoinedCount(uniqueChallenges([...categoryOfficial, ...fromCategory]));
    }

    // Default: use popular challenges
    if (fromPopular.length) {
      return sortByJoinedCount(uniqueChallenges([...fromOfficial, ...fromPopular]));
    }

    // Fallback: use recent challenges when popular is empty
    if (fromRecent.length) {
      return sortByCreatedAt(uniqueChallenges([...fromOfficial, ...fromRecent]));
    }

    return fromOfficial;
  }, [popularPages, recentPages, searchPages, categoryPages, officialPages, challengeSearchQuery, selectedCategory, mapChallengeToGlobal, matchesSearchQuery]);

  const shouldSortFilteredByCreatedAt = challengeSearchQuery.trim().length === 0
    && selectedCategory === 'All'
    && !(popularPages?.pages?.flatMap(page => page.challenges) || []).length
    && (recentPages?.pages?.flatMap(page => page.challenges) || []).length > 0;
  const filteredChallenges = allChallenges
    .filter(challenge => !isExpiredGlobalChallenge(challenge))
    .filter(challenge => matchesGlobalChallengeFilter(challenge, activeFilter))
    .sort((left, right) => {
      const cohortPriority = Number(Boolean(right.cohortKey)) - Number(Boolean(left.cohortKey));
      if (cohortPriority) {
        return cohortPriority;
      }
      if (shouldSortFilteredByCreatedAt) {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightTime - leftTime;
      }
      return right.participantsCount - left.participantsCount;
    });
  const galleryListKey = `${searchMode}-${activeFilter}-${selectedCategory}`;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      refetchPopular(),
      refetchRecent(),
      refetchFollowing(),
      refetchSuggestedPeople(),
      ...(challengeSearchQuery.length > 0 ? [refetchSearch()] : []),
      ...(peopleSearchQuery.length > 0 ? [refetchPeopleSearch()] : []),
      ...(selectedCategory !== 'All' ? [refetchCategory()] : []),
      ...(officialCreatorId > 0 ? [refetchOfficial()] : []),
    ]);
    setRefreshing(false);
  }, [refetchPopular, refetchRecent, refetchFollowing, refetchSuggestedPeople, refetchSearch, refetchPeopleSearch, refetchCategory, refetchOfficial, officialCreatorId, challengeSearchQuery, peopleSearchQuery, selectedCategory]);

  const sourceError = useMemo(() => {
    if (searchMode === 'people') {
      return peopleSearchError;
    }

    if (challengeSearchQuery.length > 0) {
      return searchError;
    }

    if (selectedCategory !== 'All') {
      return categoryError;
    }

    if (popularError && recentError) {
      return popularError;
    }

    if (activeFilter === 'global') {
      return officialError;
    }

    return undefined;
  }, [searchMode, peopleSearchError, challengeSearchQuery, searchError, selectedCategory, categoryError, popularError, recentError, activeFilter, officialError]);

  const isLoading = useMemo(() => {
    if (searchMode === 'people') {
      return isLoadingPeople;
    }

    if (challengeSearchQuery.length > 0) {
      return isLoadingSearch;
    }

    if (selectedCategory !== 'All') {
      return isLoadingCategory;
    }

    if (activeFilter === 'global' && officialCreatorId > 0 && !officialPages) {
      return isLoadingOfficial;
    }

    return !popularPages && !recentPages && (isLoadingPopular || isLoadingRecent);
  }, [searchMode, isLoadingPeople, challengeSearchQuery, isLoadingSearch, selectedCategory, isLoadingCategory, activeFilter, officialCreatorId, officialPages, isLoadingOfficial, popularPages, recentPages, isLoadingPopular, isLoadingRecent]);

  const exploreListItems = useMemo<ExploreListItem[]>(() => {
    if (searchMode === 'people') {
      const people = peopleSearchQuery.trim().length > 0
        ? peopleSearchData?.users || []
        : suggestedPeopleData?.users || [];
      return people.map((user) => ({ kind: 'person' as const, user }));
    }

    const challengeRows: ExploreListItem[] = [];
    const isExplicitSearch = challengeSearchQuery.trim().length > 0;

    filteredChallenges.forEach((challenge, index) => {
      challengeRows.push({ kind: 'challenge', challenge });

      if (
        !isExplicitSearch
        && shouldInsertInlineAd(index, filteredChallenges.length, EXPLORE_AD_INTERVAL)
      ) {
        challengeRows.push({
          kind: 'ad',
          id: `explore-ad-after-${challenge.id}`,
        });
      }
    });

    return challengeRows;
  }, [challengeSearchQuery, filteredChallenges, peopleSearchData?.users, peopleSearchQuery, searchMode, suggestedPeopleData?.users]);

  const isFetchingNextPage = isFetchingNextSearchPage ||
    isFetchingNextCategoryPage ||
    isFetchingNextPopularPage ||
    isFetchingNextRecentPage ||
    isFetchingNextOfficialPage;

  const handleChallengePress = (challenge: GlobalChallenge) => {
    hapticFeedback.buttonPress();
    router.push({
      pathname: '/challenge-details',
      params: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        duration: challenge.duration,
        challengeMode: challenge.challengeMode || 'DAILY',
        proofMode: challenge.proofMode || 'PHOTO_REQUIRED',
        participantsCount: challenge.participantsCount.toString(),
        creatorId: challenge.creatorId.toString(),
        creatorName: challenge.creatorName,
        creatorUsername: challenge.creatorUsername,
        creatorAvatar: challenge.creatorAvatar,
        isFollowing: challenge.isFollowing.toString(),
        image: challenge.image || '',
        coverPhotoUrls: JSON.stringify(challenge.coverPhotoUrls || (challenge.image ? [challenge.image] : [])),
        location: challenge.location || '',
        tags: challenge.tags.join(','),
      }
    });
  };

  const handleJoinChallenge = (challenge: GlobalChallenge) => {
    hapticFeedback.buttonPress();
    if (CURRENT_USER_ID <= 0) {
      Alert.alert('Sign In Required', 'Please sign in to join challenges.');
      return;
    }

    if (isExpiredGlobalChallenge(challenge)) {
      Alert.alert('Challenge Ended', 'This challenge has already ended and is no longer accepting new participants.');
      return;
    }

    if (challenge.creatorId === CURRENT_USER_ID) {
      Alert.alert('Your Challenge', 'You cannot join your own challenge from the global list.');
      return;
    }

    const numericChallengeId = challenge.numericId;
    Alert.alert(
      'Join Challenge',
      'Are you sure you want to join this global challenge?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: () => {
            joinChallengeMutation.mutate(
              { challengeId: numericChallengeId, userIds: [CURRENT_USER_ID] },
              {
                onSuccess: () => {
                  hapticFeedback.challengeJoined();
                  Alert.alert('Success', 'You have successfully joined the challenge!');
                },
                onError: (error) => {
                  if (showChallengeLimitUpgrade(
                    error,
                    'Failed to join challenge. Please try again.',
                    () => router.push('/premium' as any),
                  )) return;
                  Alert.alert(
                    'Could Not Join',
                    getApiErrorMessage(error, 'Failed to join challenge. Please try again.'),
                  );
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleFollowCreator = (challenge: GlobalChallenge) => {
    hapticFeedback.buttonPress();
    if (followUserMutation.isPending || unfollowUserMutation.isPending) return;
    if (challenge.isFollowing) {
      setFollowTarget(challenge);
      return;
    }
    performFollowCreator(challenge, false);
  };

  const performFollowCreator = (target: GlobalChallenge, wasFollowing: boolean) => {
    const mutation = wasFollowing ? unfollowUserMutation : followUserMutation;
    mutation.mutate(
      { followerId: CURRENT_USER_ID, followingId: target.creatorId },
      {
        onSuccess: () => {
          hapticFeedback.follow();
          setFollowTarget(null);
          void refetchFollowing();
          if (wasFollowing) {
            showAppMessage({
              type: 'success',
              title: 'Unfollowed',
              message: `@${target.creatorUsername.replace(/^@/, '')}`,
            });
          }
        },
        onError: (error) => {
          setFollowTarget(null);
          showAppMessage({
            type: 'error',
            title: 'Could not update follow',
            message: getApiErrorMessage(error, 'Please try again.'),
          });
        },
      },
    );
  };

  const handleCreatorProfilePress = (challenge: GlobalChallenge) => {
    router.push({
      pathname: '/user-profile',
      params: {
        id: challenge.creatorId.toString(),
        username: challenge.creatorUsername,
        realName: challenge.creatorName,
        profileImage: challenge.creatorAvatar,
        bio: `Challenge creator • ${challenge.category} enthusiast`,
        isFollowing: challenge.isFollowing.toString(),
        isFollowedBy: 'false',
        isMutualFollow: 'false',
        followersCount: '0',
        followingCount: '0',
        challengesCount: '0',
        postsCount: '0',
        genuinessScore: '0',
        location: challenge.location || 'Global',
        joinedDate: '',
      }
    });
  };

  const handleUserProfilePress = (user: User) => {
    hapticFeedback.buttonPress();
    if (user.id === CURRENT_USER_ID) {
      router.push('/(tabs)/profile');
      return;
    }

    router.push({
      pathname: '/user-profile',
      params: {
        id: user.id.toString(),
        username: user.username,
        realName: user.username,
        profileImage: user.profilePicUrl || '',
        bio: user.bio || '',
        followersCount: (user.followers ?? 0).toString(),
        followingCount: (user.following ?? 0).toString(),
        challengesCount: (user.challengesAccepted ?? 0).toString(),
        postsCount: (user.submissionsCount ?? 0).toString(),
        genuinessScore: ((user.genuinityScore ?? user.genuinenessScore) || 0).toString(),
      },
    });
  };

  const renderUserResult = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userCard}
      activeOpacity={0.78}
      onPress={() => handleUserProfilePress(item)}
    >
      <AvatarImage
        uri={item.profilePicUrl}
        fallbackSource={isOfficialGlobalCreator(item.username) ? OFFICIAL_ACCOUNT_AVATAR_SOURCE : undefined}
        size={50}
        style={styles.userAvatar}
      />
      <View style={styles.userResultBody}>
        <View style={styles.userResultHeader}>
          <Text style={styles.userResultName} numberOfLines={1}>@{getGlobalCreatorDisplayUsername(item.username)}</Text>
          {isOfficialGlobalCreator(item.username) ? (
            <OfficialAccountBadge compact />
          ) : item.premiumUser ? (
            <PremiumBadge />
          ) : null}
        </View>
        {item.bio ? (
          <Text style={styles.userResultBio} numberOfLines={1} selectable>{item.bio}</Text>
        ) : (
          <Text style={styles.userResultBioMuted} selectable>{item.bio}</Text>
        )}
        <Text style={styles.userResultMeta}>
          {(item.followers ?? 0).toLocaleString()} followers
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#666666" />
    </TouchableOpacity>
  );

  const renderSuggestedUser = ({ item }: { item: User }) => {
    const isFollowed = followedSuggestedUserIds.has(item.id);

    return (
      <TouchableOpacity
        style={styles.suggestedUserCard}
        activeOpacity={0.78}
        onPress={() => handleUserProfilePress(item)}
      >
        <AvatarImage
          uri={item.profilePicUrl}
          fallbackSource={isOfficialGlobalCreator(item.username) ? OFFICIAL_ACCOUNT_AVATAR_SOURCE : undefined}
          size={48}
          style={styles.suggestedUserAvatar}
        />
        <View style={styles.suggestedUserBody}>
          <View style={styles.userResultHeader}>
            <Text style={styles.suggestedUserName} numberOfLines={1}>@{getGlobalCreatorDisplayUsername(item.username)}</Text>
            {isOfficialGlobalCreator(item.username) ? (
              <OfficialAccountBadge compact />
            ) : item.premiumUser ? (
              <PremiumBadge />
            ) : null}
          </View>
          <Text style={styles.suggestedUserMeta} numberOfLines={1}>
            {(item.followers ?? 0).toLocaleString()} followers
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.suggestedFollowButton, isFollowed && styles.suggestedFollowingButton]}
          onPress={(event) => {
            event.stopPropagation();
            followUserMutation.mutate(
              { followerId: CURRENT_USER_ID, followingId: item.id },
              {
                onSuccess: () => {
                  setFollowedSuggestedUserIds((current) => new Set(current).add(item.id));
                  refetchFollowing();
                  refetchSuggestedPeople();
                },
              }
            );
          }}
          disabled={isFollowed || followUserMutation.isPending}
        >
          <Text style={[styles.suggestedFollowText, isFollowed && styles.suggestedFollowingText]}>
            {isFollowed ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderChallengeCard = ({ item }: { item: GlobalChallenge }) => {
    const joined = joinedChallengeIds.has(item.numericId);

    return (
      <View style={styles.galleryCell}>
        <GlobalChallengeGalleryCard
          challenge={item}
          joined={joined}
          isCurrentUserCreator={item.creatorId === CURRENT_USER_ID}
          joinDisabled={joinChallengeMutation.isPending}
          onPress={() => handleChallengePress(item)}
          onJoin={() => !joined && handleJoinChallenge(item)}
          onCreatorPress={() => handleCreatorProfilePress(item)}
          onFollowCreator={() => handleFollowCreator(item)}
        />
      </View>
    );
  };

  const renderExploreItem = ({ item }: { item: ExploreListItem }) => {
    if (item.kind === 'ad') {
      return <InlineNativeAd placement="explore" />;
    }

    if (item.kind === 'person') {
      return (
        <View style={styles.peopleListCell}>
          {peopleSearchQuery.trim().length > 0
            ? renderUserResult({ item: item.user })
            : renderSuggestedUser({ item: item.user })}
        </View>
      );
    }

    return renderChallengeCard({ item: item.challenge });
  };

  const renderEmptyState = () => {
    if (searchMode === 'people') {
      const searching = peopleSearchQuery.trim().length > 0;
      const error = searching ? peopleSearchError : suggestedPeopleError;
      const loading = searching ? isLoadingPeople : isLoadingSuggestedPeople;

      if (error) {
        return (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#666666" />
            <Text style={styles.emptyTitle}>
              {searching ? 'Failed to search people' : 'Could not load suggestions'}
            </Text>
            <Text style={styles.emptyText}>
              {getApiErrorMessage(error, 'Could not load people. Please try again.')}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => searching ? refetchPeopleSearch() : refetchSuggestedPeople()}
            >
              <Text style={styles.retryText}>Tap to Retry</Text>
            </TouchableOpacity>
          </View>
        );
      }

      if (loading) return <ExplorePeopleSkeleton />;

      return (
        <View style={styles.emptyContainer}>
          <Ionicons name={searching ? 'search' : 'people-outline'} size={64} color="#666666" />
          <Text style={styles.emptyTitle}>{searching ? 'No people found' : 'Search for people'}</Text>
          <Text style={styles.emptyText}>
            {searching
              ? 'Try a different username or keyword.'
              : 'Find users by username or bio from across ChallengeSphere.'}
          </Text>
        </View>
      );
    }

    if (sourceError) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#666666" />
          <Text style={styles.emptyTitle}>Failed to load challenges</Text>
          <Text style={styles.emptyText}>
            {getApiErrorMessage(sourceError, 'Could not load challenges. Please try again.')}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>Tap to Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isLoading) return <ExploreChallengeResultsSkeleton />;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search" size={64} color="#666666" />
        <Text style={styles.emptyTitle}>No challenges found</Text>
        <Text style={styles.emptyText}>
          Try adjusting your search or filters to discover more challenges.
        </Text>
      </View>
    );
  };

  const renderFilterButton = (filter: GlobalChallengeFilter, label: string) => (
    <TouchableOpacity
      style={[styles.filterButton, activeFilter === filter && styles.activeFilterButton]}
      onPress={() => {
        hapticFeedback.selection();
        setActiveFilter(filter);
      }}
    >
      <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderCategoryButton = (category: string) => (
    <TouchableOpacity
      key={category}
      style={[styles.categoryButton, selectedCategory === category && styles.activeCategoryButton]}
      onPress={() => {
        hapticFeedback.selection();
        setSelectedCategory(category);
      }}
    >
      <Text style={[styles.categoryText, selectedCategory === category && styles.activeCategoryText]}>
        {category}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        key={`${galleryListKey}-feed`}
        style={styles.content}
        data={exploreListItems}
        renderItem={renderExploreItem}
        numColumns={1}
        keyExtractor={(item) => {
          if (item.kind === 'challenge') {
            return `challenge-${item.challenge.id}`;
          }
          if (item.kind === 'person') {
            return `person-${item.user.id}`;
          }
          return item.id;
        }}
        showsVerticalScrollIndicator={false}
        onEndReached={searchMode === 'challenges' ? loadMoreChallenges : undefined}
        onEndReachedThreshold={0.45}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={styles.exploreListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4700ecff" colors={['#4700ecff']} />
        }
        ListHeaderComponent={(
          <>
        <View style={styles.joinGloballyIntro}>
          <View style={styles.joinGloballyIcon}>
            <Ionicons name="earth" size={20} color="#4700EC" />
          </View>
          <View style={styles.joinGloballyCopy}>
            <View style={styles.joinGloballyTitleRow}>
              <Text style={styles.joinGloballyTitle}>Join globally</Text>
              <TouchableOpacity
                style={styles.privateIdeasLink}
                onPress={() => {
                  hapticFeedback.buttonPress();
                  router.push('/challenge-templates' as any);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Browse 25 private challenge ideas"
              >
                <Ionicons name="people-outline" size={13} color="#5B3FE5" />
                <Text style={styles.privateIdeasText}>Challenge Ideas</Text>
                <Ionicons name="chevron-forward" size={12} color="#5B3FE5" />
              </TouchableOpacity>
            </View>
            <Text style={styles.joinGloballyText}>Join one of three curated cohorts moving together this week, or explore public challenges.</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color="#777777" />
            <TextInput
              style={styles.searchInput}
              placeholder={searchMode === 'people' ? 'Search people globally...' : 'Search challenges, tags, creators...'}
              placeholderTextColor="#666666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              maxLength={100}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#777777" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.searchModeContainer}>
          {(['challenges', 'people'] as const).map((mode) => {
            const active = searchMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.searchModeButton, active && styles.searchModeButtonActive]}
                onPress={() => {
                  hapticFeedback.selection();
                  setSearchMode(mode);
                }}
                activeOpacity={0.82}
              >
                <Ionicons
                  name={mode === 'people' ? 'people-outline' : 'trophy-outline'}
                  size={14}
                  color={active ? '#ffffff' : '#888888'}
                />
                <Text style={[styles.searchModeText, active && styles.searchModeTextActive]}>
                  {mode === 'people' ? 'People' : 'Challenges'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {searchMode === 'people' ? (
          <View style={styles.listSectionHeader}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>People</Text>
              <Text style={styles.resultsCount}>
                {peopleSearchQuery.trim().length > 0 ? `${peopleSearchData?.totalCount ?? 0} results` : 'Global search'}
              </Text>
            </View>
            {peopleSearchQuery.trim().length === 0 && exploreListItems.length > 0 ? (
              <Text style={styles.suggestedSectionTitle}>Suggested for you</Text>
            ) : null}
          </View>
        ) : (
          <>
        {/* Filter Buttons */}
        <View style={styles.filtersContainer}>
          {renderFilterButton('all', 'All')}
          {renderFilterButton('global', 'Global')}
          {renderFilterButton('following', 'Following')}
          {renderFilterButton('others', 'Others')}
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map(renderCategoryButton)}
        </ScrollView>
        {/* Challenges List */}
        <View style={styles.listSectionHeader}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeFilter === 'all' ? 'Explore challenges' :
               activeFilter === 'global' ? 'Global Challenges' :
               activeFilter === 'following' ? 'From People You Follow' : 'Other Challenges'}
            </Text>
            <Text style={styles.resultsCount}>{filteredChallenges.length} results</Text>
          </View>
        </View>
          </>
        )}
          </>
        )}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={
          searchMode === 'challenges' && isFetchingNextPage
            ? <ActivityIndicator color="#4700ecff" style={styles.loadingMore} />
            : null
        }
      />
      <FollowActionSheet
        visible={Boolean(followTarget)}
        username={followTarget?.creatorUsername || ''}
        profilePicUrl={followTarget?.creatorAvatar}
        isFollowing={followTarget?.isFollowing ?? false}
        pending={followUserMutation.isPending || unfollowUserMutation.isPending}
        onCancel={() => setFollowTarget(null)}
        onConfirm={() => followTarget && performFollowCreator(followTarget, true)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  content: {
    flex: 1,
  },
  exploreListContent: {
    paddingBottom: 24,
  },
  joinGloballyIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  joinGloballyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAE3FF',
    borderWidth: 1,
    borderColor: '#D4C8FF',
  },
  joinGloballyCopy: {
    flex: 1,
  },
  joinGloballyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  joinGloballyTitle: {
    color: '#18142F',
    fontSize: 15,
    fontWeight: '700',
  },
  privateIdeasLink: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#DDD4FF',
  },
  privateIdeasText: {
    color: '#4700EC',
    fontSize: 10,
    fontWeight: '700',
  },
  joinGloballyText: {
    color: '#777389',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 9,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 13,
    color: '#18142F',
  },
  searchModeContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 3,
    borderRadius: 18,
    backgroundColor: '#F8F7FC',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    gap: 4,
  },
  searchModeButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  searchModeButtonActive: {
    backgroundColor: '#4700ecff',
  },
  searchModeText: {
    color: '#777389',
    fontSize: 12,
    fontWeight: '600',
  },
  searchModeTextActive: {
    color: '#FFFFFF',
  },
  userResultsList: {
    gap: 10,
  },
  peopleListCell: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  userCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#4700ec88',
  },
  userResultBody: {
    flex: 1,
    minWidth: 0,
  },
  userResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userResultName: {
    color: '#18142F',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  userResultBio: {
    color: '#777389',
    fontSize: 11,
    marginTop: 4,
  },
  userResultBioMuted: {
    color: '#777389',
    fontSize: 11,
    marginTop: 4,
  },
  userResultMeta: {
    color: '#8f6bff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  suggestedSectionTitle: {
    color: '#18142F',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  suggestedUserCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDD4FF',
  },
  suggestedUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  suggestedUserBody: {
    flex: 1,
    minWidth: 0,
  },
  suggestedUserName: {
    color: '#18142F',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  suggestedUserMeta: {
    color: '#777389',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
  },
  suggestedFollowButton: {
    minWidth: 72,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4700ecff',
  },
  suggestedFollowingButton: {
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#DDD4FF',
  },
  suggestedFollowText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  suggestedFollowingText: {
    color: '#4700EC',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#4700ecff',
    borderRadius: 16,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterButton: {
    flex: 1,
    minHeight: 32,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#4700ecff',
    borderColor: '#6d37ff',
  },
  filterText: {
    color: '#777389',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    flexShrink: 1,
  },
  activeFilterText: {
    color: '#ffffff',
  },
  categoriesContainer: {
    paddingBottom: 12,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 7,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  activeCategoryButton: {
    backgroundColor: '#4700ecff20',
    borderColor: '#4700ecff',
  },
  categoryText: {
    color: '#777389',
    fontSize: 11,
    fontWeight: '500',
  },
  activeCategoryText: {
    color: '#4700ecff',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  listSectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    marginBottom: 0,
    fontWeight: '700',
    color: '#18142F',
  },
  resultsCount: {
    fontSize: 11,
    color: '#777389',
  },
  challengesList: {
    paddingBottom: 2,
  },
  galleryCell: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  loadingMore: {
    marginVertical: 16,
  },
  peopleSkeletonList: {
    gap: 10,
  },
  peopleSkeletonRow: {
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  challengeSkeletonList: {
    gap: 12,
    paddingBottom: 2,
  },
  challengeSkeletonCard: {
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  challengeSkeletonCopy: {
    gap: 8,
    padding: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#18142F',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#777389',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 19,
  },
});

export default Global;
