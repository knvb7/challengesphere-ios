import { InfiniteData, QueryClient, useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { challengeService } from '../services/challengeService';
import { useSubscription } from '../providers/SubscriptionContext';
import { userKeys } from './useUsers';
import { getSafeErrorMessage } from '../utils/apiError';
import { getDeviceTimeZone } from '../utils/deviceTime';
import {
    ChallengeCreateRequest,
    Challenge,
    ChallengeParticipantsResponse,
    ChallengeUpdateRequest,
    CreateSubmissionRequest,
    JoinChallengeRequest,
    LeaveChallengeRequest,
    LeaderboardType,
    MyChallengesResponse,
    SearchFilters,
    ChallengeSubmissionPreview,
    ChallengeProgressResponse,
    GlobalSubmissionSort,
    Submission,
    SubmissionsResponse,
    UserChallengesResponse,
} from '../types/api';
import type { ChallengeCrewStatus } from '../types/challengeCrew';

// Query keys
export const challengeKeys = {
  all: ['challenges'] as const,
  lists: () => [...challengeKeys.all, 'list'] as const,
  detail: (id: number) => [...challengeKeys.all, 'detail', id] as const,
  batch: (ids: number[]) => [...challengeKeys.all, 'batch', ids] as const,
  trending: () => [...challengeKeys.all, 'trending'] as const,
  popular: () => [...challengeKeys.all, 'popular'] as const,
  recent: () => [...challengeKeys.all, 'recent'] as const,
  category: (category: string) => [...challengeKeys.all, 'category', category] as const,
  hashtag: (hashtag: string) => [...challengeKeys.all, 'hashtag', hashtag] as const,
  duration: (minDays: number, maxDays: number) => [...challengeKeys.all, 'duration', minDays, maxDays] as const,
  user: (userId: number, currentUserId?: number) => [
    ...challengeKeys.all,
    'user',
    userId,
    ...(currentUserId ? [currentUserId] : []),
  ] as const,
  creator: (creatorId: number, currentUserId?: number) => [
    ...challengeKeys.all,
    'creator',
    creatorId,
    ...(currentUserId ? [currentUserId] : []),
  ] as const,
  publicCreator: (creatorId: number) => [...challengeKeys.all, 'public-creator', creatorId] as const,
  participants: (challengeId: number) => [...challengeKeys.all, 'participants', challengeId] as const,
  participationPolicy: () => [...challengeKeys.all, 'participation-policy'] as const,
  submissions: () => [...challengeKeys.all, 'submissions'] as const,
  submission: (id: number) => [...challengeKeys.submissions(), id] as const,
  progress: (id: number, timezone?: string) => [
    ...challengeKeys.all,
    'progress',
    id,
    ...(timezone ? [timezone] : []),
  ] as const,
  submissionPreviewsRoot: () => [...challengeKeys.submissions(), 'previews'] as const,
  submissionPreviews: (challengeIds: number[], userId?: number) => [
    ...challengeKeys.submissionPreviewsRoot(),
    [...new Set(challengeIds)].sort((a, b) => a - b),
    userId || 0,
  ] as const,
  challengeSubmissions: (challengeId: number, callerId?: number) => [
    ...challengeKeys.submissions(),
    'challenge',
    challengeId,
    ...(callerId ? [callerId] : []),
  ] as const,
  globalChallengeSubmissions: (
    challengeId: number,
    dayNumber: number,
    callerId?: number,
    sortBy: GlobalSubmissionSort = 'newest',
    participantQuery = ''
  ) => [
    ...challengeKeys.submissions(),
    'challenge',
    challengeId,
    'global',
    dayNumber,
    sortBy,
    participantQuery.trim().toLowerCase(),
    ...(callerId ? [callerId] : []),
  ] as const,
  userSubmissions: (userId: number, callerId?: number) => [
    ...challengeKeys.submissions(),
    'user',
    userId,
    ...(callerId ? [callerId] : []),
  ] as const,
  profileStatsSubmissionsRoot: () => [
    ...challengeKeys.submissions(),
    'profile-stats',
  ] as const,
  profileStatsSubmissions: (userId: number, callerId: number) => [
    ...challengeKeys.profileStatsSubmissionsRoot(),
    userId,
    callerId,
  ] as const,
  search: (query: string, filters?: SearchFilters) => [...challengeKeys.all, 'search', query, { filters }] as const,
};

const transitionCachedChallengeMembership = (
  queryClient: QueryClient,
  challengeId: number,
  userId: number,
  participationActive: boolean,
) => {
  const countDelta = participationActive ? 1 : -1;
  queryClient.setQueriesData<Challenge>(
    {
      queryKey: challengeKeys.detail(challengeId),
      predicate: (query) => Number(query.queryKey[3]) === userId,
    },
    (current) => current
      ? {
          ...current,
          isJoined: participationActive,
          joined: participationActive,
          participantCount: current.participantCount === undefined
            ? undefined
            : Math.max(0, current.participantCount + countDelta),
          activeParticipantCount: current.activeParticipantCount === undefined
            ? undefined
            : Math.max(0, current.activeParticipantCount + countDelta),
        }
      : current,
  );

  const myChallengesFilter = {
    queryKey: ['myActiveChallenges', userId] as const,
  };
  const cachedEntries = queryClient.getQueriesData<MyChallengesResponse>(myChallengesFilter);
  const sourceChallenge = cachedEntries
    .flatMap(([, data]) => data?.challenges || [])
    .find((challenge) => challenge.id === challengeId);
  const transitionedChallenge = sourceChallenge
    ? {
        ...sourceChallenge,
        participationActive,
        ...(!participationActive && sourceChallenge.isPrivate ? { favorite: false } : {}),
      }
    : undefined;

  cachedEntries.forEach(([queryKey, current]) => {
    if (!current) return;
    const status = queryKey[2];
    const withoutChallenge = current.challenges.filter(
      (challenge) => challenge.id !== challengeId,
    );
    let challenges = current.challenges.map((challenge) =>
      challenge.id === challengeId
        ? {
            ...challenge,
            participationActive,
            ...(!participationActive && challenge.isPrivate ? { favorite: false } : {}),
          }
        : challenge,
    );

    if (status === undefined) {
      challenges = participationActive && transitionedChallenge
        ? [transitionedChallenge, ...withoutChallenge]
        : withoutChallenge;
    } else if (status === 'inactive') {
      challenges = !participationActive && transitionedChallenge
        ? [transitionedChallenge, ...withoutChallenge]
        : withoutChallenge;
    }

    queryClient.setQueryData(queryKey, { ...current, challenges });
  });

  if (transitionedChallenge) {
    const targetStatus = participationActive ? undefined : 'inactive';
    const targetKey = [
      'myActiveChallenges',
      userId,
      targetStatus,
      userId,
      getDeviceTimeZone(),
    ] as const;
    queryClient.setQueryData<MyChallengesResponse>(targetKey, (current) => ({
      ...current,
      challenges: [
        transitionedChallenge,
        ...(current?.challenges || []).filter(
          (challenge) => challenge.id !== challengeId,
        ),
      ],
    }));
  }
};

const transitionCachedCrewMembership = (
  queryClient: QueryClient,
  challengeId: number,
  participantDelta: number,
) => {
  queryClient.setQueryData<ChallengeCrewStatus>(
    ['challenge-crews', challengeId],
    (current) => {
      if (!current) return current;
      const acceptedCount = Math.max(0, current.acceptedCount + participantDelta);
      return {
        ...current,
        acceptedCount,
        canStart: current.state === 'LOBBY'
          && current.canManageCrew
          && acceptedCount >= current.minimumStartCount,
      };
    },
  );
};

export const useChallengeParticipationPolicy = () =>
  useQuery({
    queryKey: challengeKeys.participationPolicy(),
    queryFn: () => challengeService.getParticipationPolicy(),
    staleTime: 5 * 60 * 1000,
  });

// ===================
// Challenge Queries
// ===================

// Get challenge by ID
export const useChallenge = (challengeId: number, currentUserId?: number) => {
  return useQuery({
    queryKey: [...challengeKeys.detail(challengeId), currentUserId],
    queryFn: () => challengeService.getChallengeById(challengeId, currentUserId),
    enabled: !!challengeId && challengeId > 0,
  });
};

export const useChallengesByIds = (challengeIds: number[]) => {
  const ids = [...new Set(challengeIds.filter((id) => id > 0))].sort((left, right) => left - right);

  return useQuery<Challenge[]>({
    queryKey: challengeKeys.batch(ids),
    queryFn: () => challengeService.getChallengesByIds(ids),
    enabled: ids.length > 0,
    staleTime: 10 * 60 * 1000,
  });
};

// Get user's challenges (challenges they've joined)
export const useUserChallenges = (userId: number, currentUserId: number, page = 1, pageSize = 10, active?: boolean) => {
  return useQuery({
    queryKey: [...challengeKeys.user(userId, currentUserId), page, pageSize, active],
    queryFn: () => challengeService.getUserChallenges(userId, currentUserId, page, pageSize, active),
    enabled: !!userId && userId > 0 && !!currentUserId && currentUserId > 0,
    placeholderData: (previousData) => previousData,
  });
};

// Get user's active challenges with progress data (completionPercentage, coverPhotoUrls, etc.)
export const useMyActiveChallenges = (userId: number, status?: string, currentUserId = userId, enabled = true) => {
  const timezone = getDeviceTimeZone();
  return useQuery({
    queryKey: ['myActiveChallenges', userId, status, currentUserId, timezone],
    queryFn: () => challengeService.getMyActiveChallenges(userId, status, currentUserId, timezone),
    enabled: enabled && !!userId && userId > 0,
  });
};

export const useFavoriteChallenges = (userId: number, enabled = true) =>
  useMyActiveChallenges(userId, 'favorite', userId, enabled);

export const useInactiveChallenges = (userId: number, enabled = true) =>
  useMyActiveChallenges(userId, 'inactive', userId, enabled);

export const useMyChallengeProgress = (challengeId: number, enabled = true) => {
  const timezone = getDeviceTimeZone();
  return useQuery<ChallengeProgressResponse>({
    queryKey: challengeKeys.progress(challengeId, timezone),
    queryFn: () => challengeService.getMyChallengeProgress(challengeId, timezone),
    enabled: enabled && challengeId > 0,
    staleTime: 10 * 1000,
  });
};

// Get challenges created by a user
export const useChallengesByCreator = (creatorId: number, currentUserId: number, page = 1, pageSize = 10) => {
  return useQuery({
    queryKey: [...challengeKeys.creator(creatorId, currentUserId), page, pageSize],
    queryFn: () => challengeService.getChallengesByCreator(creatorId, currentUserId, page, pageSize),
    enabled: !!creatorId && creatorId > 0 && !!currentUserId && currentUserId > 0,
    placeholderData: (previousData) => previousData,
  });
};

// Get popular challenges
export const usePopularChallenges = (page = 1, pageSize = 10, currentUserId?: number) => {
  return useQuery({
    queryKey: [...challengeKeys.popular(), page, pageSize, currentUserId],
    queryFn: () => challengeService.getPopularChallenges(page, pageSize, undefined, undefined, undefined, currentUserId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get recent challenges
export const useRecentChallenges = (page = 1, pageSize = 10, currentUserId?: number) => {
  return useQuery({
    queryKey: [...challengeKeys.recent(), page, pageSize, currentUserId],
    queryFn: () => challengeService.getRecentChallenges(page, pageSize, currentUserId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Get trending challenge IDs
export const useTrendingChallengeIds = (limit = 10) => {
  return useQuery({
    queryKey: challengeKeys.trending(),
    queryFn: () => challengeService.getTrendingChallengeIds(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get challenges by category
export const useChallengesByCategory = (category: string, page = 1, pageSize = 10, currentUserId?: number) => {
  return useQuery({
    queryKey: [...challengeKeys.category(category), page, pageSize, currentUserId],
    queryFn: () => challengeService.getChallengesByCategory(category, page, pageSize, currentUserId),
    enabled: !!category,
    placeholderData: (previousData) => previousData,
  });
};

// Get challenges by hashtag
export const useChallengesByHashtag = (hashtags: string[], page = 1, pageSize = 10, currentUserId?: number) => {
  return useQuery({
    queryKey: [...challengeKeys.hashtag(hashtags.join(',')), page, pageSize, currentUserId],
    queryFn: () => challengeService.getChallengesByHashtag(hashtags, page, pageSize, currentUserId),
    enabled: hashtags.length > 0,
    placeholderData: (previousData) => previousData,
  });
};

// Get challenges by duration
export const useChallengesByDuration = (minDays: number, maxDays: number, page = 1, pageSize = 10, currentUserId?: number) => {
  return useQuery({
    queryKey: [...challengeKeys.duration(minDays, maxDays), page, pageSize, currentUserId],
    queryFn: () => challengeService.getChallengesByDuration(minDays, maxDays, page, pageSize, currentUserId),
    enabled: minDays >= 0 && maxDays > 0,
    placeholderData: (previousData) => previousData,
  });
};

// Search challenges
export const useSearchChallenges = (query: string, filters?: SearchFilters, page = 1, pageSize = 10, currentUserId?: number) => {
  return useQuery({
    queryKey: [...challengeKeys.search(query, filters), page, pageSize, currentUserId],
    queryFn: () => challengeService.searchChallenges(query, filters, page, pageSize, currentUserId),
    enabled: query.length > 0,
    placeholderData: (previousData) => previousData,
  });
};

// Get challenge participants
export const useChallengeParticipants = (challengeId: number) => {
  return useQuery({
    queryKey: challengeKeys.participants(challengeId),
    queryFn: () => challengeService.getChallengeParticipants(challengeId),
    enabled: !!challengeId && challengeId > 0,
  });
};

// Infinite scroll for user challenges
export const useInfiniteUserChallenges = (userId: number, currentUserId: number, pageSize = 10, active?: boolean) => {
  return useInfiniteQuery({
    queryKey: [...challengeKeys.user(userId, currentUserId), 'infinite', pageSize, active],
    queryFn: ({ pageParam = 1 }) => challengeService.getUserChallenges(userId, currentUserId, pageParam as number, pageSize, active),
    getNextPageParam: (lastPage) => {
      return lastPage.hasNext ? lastPage.currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!userId && userId > 0 && !!currentUserId && currentUserId > 0,
  });
};

// Infinite scroll for challenges created by a user
export const useInfiniteChallengesByCreator = (creatorId: number, currentUserId: number, pageSize = 10, enabled = true) => {
  return useInfiniteQuery({
    queryKey: [...challengeKeys.creator(creatorId, currentUserId), 'infinite', pageSize],
    queryFn: ({ pageParam = 1 }) => challengeService.getChallengesByCreator(creatorId, currentUserId, pageParam as number, pageSize),
    getNextPageParam: (lastPage) => {
      return lastPage.hasNext ? lastPage.currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: enabled && !!creatorId && creatorId > 0 && !!currentUserId && currentUserId > 0,
  });
};

export const useInfinitePublicChallengesByCreator = (creatorId: number, pageSize = 10, enabled = true) => {
  return useInfiniteQuery({
    queryKey: [...challengeKeys.publicCreator(creatorId), 'infinite', pageSize],
    queryFn: ({ pageParam = 1 }) => challengeService.getPublicChallengesByCreator(creatorId, pageParam as number, pageSize),
    getNextPageParam: (lastPage) => lastPage.hasNext ? lastPage.currentPage + 1 : undefined,
    initialPageParam: 1,
    enabled: enabled && creatorId > 0,
  });
};

// Infinite scroll for popular challenges
export const useInfinitePopularChallenges = (pageSize = 10, currentUserId?: number) => {
  return useInfiniteQuery({
    queryKey: [...challengeKeys.popular(), 'infinite', pageSize, currentUserId],
    queryFn: ({ pageParam = 1 }) => challengeService.getPopularChallenges(pageParam as number, pageSize, undefined, undefined, undefined, currentUserId),
    getNextPageParam: (lastPage) => {
      return lastPage.currentPage < lastPage.totalPages ? lastPage.currentPage + 1 : undefined;
    },
    initialPageParam: 1,
  });
};

// Infinite scroll for recent challenges
export const useInfiniteRecentChallenges = (pageSize = 10, currentUserId?: number) => {
  return useInfiniteQuery({
    queryKey: [...challengeKeys.recent(), 'infinite', pageSize, currentUserId],
    queryFn: ({ pageParam = 1 }) => challengeService.getRecentChallenges(pageParam as number, pageSize, currentUserId),
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });
};

// Infinite scroll for category challenges
export const useInfiniteChallengesByCategory = (category: string, pageSize = 10, currentUserId?: number) => {
  return useInfiniteQuery({
    queryKey: [...challengeKeys.category(category), 'infinite', pageSize, currentUserId],
    queryFn: ({ pageParam = 1 }) => challengeService.getChallengesByCategory(category, pageParam as number, pageSize, currentUserId),
    getNextPageParam: (lastPage) => {
      return lastPage.hasNext ? lastPage.currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!category,
  });
};

// Infinite scroll for challenge search
export const useInfiniteSearchChallenges = (query: string, filters?: SearchFilters, pageSize = 10, currentUserId?: number) => {
  return useInfiniteQuery({
    queryKey: [...challengeKeys.search(query, filters), 'infinite', pageSize, currentUserId],
    queryFn: ({ pageParam = 1 }) => challengeService.searchChallenges(query, filters, pageParam as number, pageSize, currentUserId),
    getNextPageParam: (lastPage) => {
      return lastPage.hasNext ? lastPage.currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: query.length > 0,
  });
};

// ===================
// Submission Queries
// ===================

// Get submissions for a challenge
export const useChallengeSubmissions = (
  challengeId: number,
  callerId: number,
  page = 1,
  pageSize = 10,
  sortBy: GlobalSubmissionSort = 'newest',
  participantQuery = '',
  enabled = true
) => {
  return useQuery({
    queryKey: [...challengeKeys.challengeSubmissions(challengeId, callerId), page, pageSize, sortBy, participantQuery.trim().toLowerCase()],
    queryFn: () => challengeService.getChallengeSubmissions(challengeId, callerId, page, pageSize, sortBy, participantQuery),
    enabled: enabled && !!challengeId && challengeId > 0 && !!callerId && callerId > 0,
    placeholderData: (previousData) => previousData,
  });
};

export const useSubmissionPreviews = (
  challengeIds: number[],
  userId?: number,
  enabled = true,
) => {
  const ids = [...new Set(challengeIds)]
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b);

  return useQuery<ChallengeSubmissionPreview[]>({
    queryKey: challengeKeys.submissionPreviews(ids, userId),
    queryFn: () => challengeService.getSubmissionPreviews(ids, userId),
    enabled: enabled && ids.length > 0,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    placeholderData: (previousData) => previousData,
  });
};

// Get random global submissions for a challenge day
export const useGlobalChallengeSubmissionsByDay = (
  challengeId: number,
  dayNumber: number,
  callerId: number,
  page = 1,
  pageSize = 20,
  sortBy: GlobalSubmissionSort = 'newest',
  participantQuery = ''
) => {
  return useQuery({
    queryKey: [...challengeKeys.globalChallengeSubmissions(challengeId, dayNumber, callerId, sortBy, participantQuery), page, pageSize],
    queryFn: () => challengeService.getGlobalChallengeSubmissionsByDay(challengeId, dayNumber, callerId, page, pageSize, sortBy, participantQuery),
    enabled: !!challengeId && challengeId > 0 && !!dayNumber && dayNumber > 0 && !!callerId && callerId > 0,
    staleTime: 2 * 60 * 1000,
  });
};

// Get user's submissions
export const useUserSubmissions = (userId: number, callerId: number, page = 1, pageSize = 10) => {
  return useQuery({
    queryKey: [...challengeKeys.userSubmissions(userId, callerId), page, pageSize],
    queryFn: () => challengeService.getUserSubmissions(userId, callerId, page, pageSize),
    enabled: !!userId && userId > 0 && !!callerId && callerId > 0,
    placeholderData: (previousData) => previousData,
  });
};

// Infinite scroll for user submissions
export const useInfiniteUserSubmissions = (userId: number, callerId: number, pageSize = 20, enabled = true) => {
  return useInfiniteQuery({
    queryKey: [...challengeKeys.userSubmissions(userId, callerId), 'infinite', pageSize],
    queryFn: ({ pageParam = 1 }) => challengeService.getUserSubmissions(userId, callerId, pageParam as number, pageSize),
    getNextPageParam: (lastPage) => {
      return lastPage.currentPage < lastPage.totalPages ? lastPage.currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: enabled && !!userId && userId > 0 && !!callerId && callerId > 0,
  });
};

// Stats must use the complete visible history; the gallery's infinite pages are
// intentionally partial and would otherwise make totals change while scrolling.
export const useAllUserSubmissions = (
  userId: number,
  callerId: number,
  enabled = true,
) => {
  return useQuery<Submission[]>({
    queryKey: challengeKeys.profileStatsSubmissions(userId, callerId),
    queryFn: () => challengeService.getAllUserSubmissions(userId, callerId),
    enabled: enabled && userId > 0 && callerId > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// Get user's submissions for a specific challenge (day-wise)
export const useUserChallengeSubmissions = (userId: number, challengeId: number, callerId: number, page = 1, pageSize = 100) => {
  return useQuery({
    queryKey: ['userChallengeSubmissions', userId, challengeId, callerId, page, pageSize],
    queryFn: () => challengeService.getUserChallengeSubmissions(userId, challengeId, callerId, page, pageSize),
    enabled: !!userId && userId > 0 && !!challengeId && challengeId > 0 && !!callerId && callerId > 0,
  });
};

export const useAllUserChallengeSubmissions = (
  userId: number,
  challengeId: number,
  callerId: number,
) => useQuery<Submission[]>({
  queryKey: ['userChallengeSubmissionsAll', userId, challengeId, callerId],
  queryFn: () => challengeService.getAllUserChallengeSubmissions(
    userId,
    challengeId,
    callerId,
  ),
  enabled: userId > 0 && challengeId > 0 && callerId > 0,
  staleTime: 60 * 1000,
});

export const useUserChallengeSubmissionStatuses = (
  userId: number,
  challengeIds: number[],
  callerId: number,
  enabled = true,
) => {
  const normalizedIds = [...new Set(challengeIds)]
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b);

  const results = useQueries({
    queries: normalizedIds.map((challengeId) => ({
      queryKey: ['userChallengeSubmissions', userId, challengeId, callerId, 1, 100],
      queryFn: () => challengeService.getUserChallengeSubmissions(userId, challengeId, callerId, 1, 100),
      enabled: enabled && userId > 0 && callerId > 0,
      staleTime: 0,
    })),
  });

  return normalizedIds.map((challengeId, index) => {
    const result = results[index];
    return {
      challengeId,
      data: result?.data as SubmissionsResponse | undefined,
      isLoading: Boolean(result?.isLoading),
      isFetching: Boolean(result?.isFetching),
      error: result?.error,
    };
  });
};

// Get submission by ID
export const useSubmission = (submissionId: number) => {
  return useQuery({
    queryKey: challengeKeys.submission(submissionId),
    queryFn: () => challengeService.getSubmissionById(submissionId),
    enabled: !!submissionId && submissionId > 0,
  });
};

// ===================
// Challenge Mutations
// ===================

// Create challenge mutation
export const useCreateChallenge = () => {
  const queryClient = useQueryClient();
  const { refreshStatus } = useSubscription();

  return useMutation({
    mutationFn: (challengeData: ChallengeCreateRequest) =>
      challengeService.createChallenge(challengeData),
    onSuccess: (newChallenge) => {
      // Invalidate and refetch challenges
      queryClient.invalidateQueries({ queryKey: challengeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: challengeKeys.trending() });
      queryClient.invalidateQueries({ queryKey: challengeKeys.popular() });
      queryClient.invalidateQueries({ queryKey: challengeKeys.recent() });
      
      // Invalidate creator's challenges
      queryClient.invalidateQueries({ queryKey: challengeKeys.creator(newChallenge.creatorId) });
      queryClient.invalidateQueries({ queryKey: ['myActiveChallenges', newChallenge.creatorId] });
      
      // Add to cache
      queryClient.setQueryData(challengeKeys.detail(newChallenge.challengeId), newChallenge);
      void refreshStatus().catch(() => undefined);
    },
  });
};

// Update challenge mutation
export const useUpdateChallenge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ challengeId, data }: { challengeId: number; data: ChallengeUpdateRequest }) =>
      challengeService.updateChallenge(challengeId, data),
    onSuccess: (updatedChallenge, variables) => {
      const id = updatedChallenge?.id ?? variables.challengeId;
      if (updatedChallenge) {
        queryClient.setQueryData(challengeKeys.detail(id), updatedChallenge);
      } else {
        queryClient.invalidateQueries({ queryKey: challengeKeys.detail(id) });
      }
      queryClient.invalidateQueries({ queryKey: challengeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['myActiveChallenges'] });
    },
  });
};

// Delete challenge mutation
export const useDeleteChallenge = () => {
  const queryClient = useQueryClient();
  const { refreshStatus } = useSubscription();

  return useMutation({
    mutationFn: (challengeId: number) => challengeService.deleteChallenge(challengeId),
    onSuccess: (_, challengeId) => {
      queryClient.setQueriesData<MyChallengesResponse>(
        { queryKey: ['myActiveChallenges'] },
        (existing) => {
          if (!existing) return existing;

          const removed = existing.challenges.filter(
            (challenge) => challenge.id === challengeId,
          );
          if (removed.length === 0) return existing;

          const removedCompleted = removed.filter(
            (challenge) => challenge.completed,
          ).length;
          const removedActive = removed.length - removedCompleted;
          const challenges = existing.challenges.filter(
            (challenge) => challenge.id !== challengeId,
          );

          return {
            ...existing,
            challenges,
            totalActive: existing.totalActive === undefined
              ? undefined
              : Math.max(0, existing.totalActive - removedActive),
            totalCompleted: existing.totalCompleted === undefined
              ? undefined
              : Math.max(0, existing.totalCompleted - removedCompleted),
            totalChallenges: existing.totalChallenges === undefined
              ? undefined
              : Math.max(0, existing.totalChallenges - removed.length),
            totalCount: existing.totalCount === undefined
              ? undefined
              : Math.max(0, existing.totalCount - removed.length),
            pageSize: existing.pageSize === undefined
              ? undefined
              : challenges.length,
          };
        },
      );
      queryClient.setQueriesData<InfiniteData<UserChallengesResponse>>(
        {
          queryKey: challengeKeys.all,
          predicate: (query) =>
            query.queryKey[1] === 'creator' && query.queryKey.includes('infinite'),
        },
        (existing) => {
          if (!existing) return existing;
          const containsDeletedChallenge = existing.pages.some((page) =>
            page.challenges.some((challenge) => challenge.id === challengeId),
          );
          if (!containsDeletedChallenge) return existing;

          return {
            ...existing,
            pages: existing.pages.map((page) => ({
              ...page,
              challenges: page.challenges.filter(
                (challenge) => challenge.id !== challengeId,
              ),
              totalCount: Math.max(0, page.totalCount - 1),
            })),
          };
        },
      );
      queryClient.removeQueries({ queryKey: challengeKeys.detail(challengeId) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['myActiveChallenges'] });
      void refreshStatus().catch(() => undefined);
    },
  });
};

export const useSetChallengeFavorite = (userId: number) => {
  const queryClient = useQueryClient();
  const selfViewQueryFilter = {
    queryKey: ['myActiveChallenges', userId] as const,
    predicate: (query: { queryKey: readonly unknown[] }) =>
      query.queryKey[3] === userId,
  };

  return useMutation({
    mutationFn: ({ challengeId, favorite }: { challengeId: number; favorite: boolean }) =>
      challengeService.setChallengeFavorite(challengeId, favorite),
    onMutate: async ({ challengeId, favorite }) => {
      await queryClient.cancelQueries(selfViewQueryFilter);
      const snapshots = queryClient.getQueriesData<MyChallengesResponse>(
        selfViewQueryFilter,
      );

      queryClient.setQueriesData<MyChallengesResponse>(
        selfViewQueryFilter,
        (current) => current
          ? {
              ...current,
              challenges: current.challenges.map((challenge) =>
                challenge.id === challengeId
                  ? { ...challenge, favorite }
                  : challenge,
              ),
            }
          : current,
      );

      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => queryClient.invalidateQueries(selfViewQueryFilter),
  });
};

// Join challenge mutation
export const useJoinChallenge = () => {
  const queryClient = useQueryClient();
  const { refreshStatus } = useSubscription();

  return useMutation({
    mutationFn: async (request: JoinChallengeRequest) => {
      const response = await challengeService.joinChallenge(request);
      if (!response.success || response.failedUserIds?.some(id => request.userIds.includes(id))) {
        throw new Error(
          getSafeErrorMessage(response.message, 'Could not join the challenge. Please try again.'),
        );
      }
      return response;
    },
    onSuccess: (response, request) => {
      const successfulUserIds = [...new Set(response.successfulUserIds)];
      successfulUserIds.forEach((userId) => {
        transitionCachedChallengeMembership(
          queryClient,
          request.challengeId,
          userId,
          true,
        );
      });
      transitionCachedCrewMembership(
        queryClient,
        request.challengeId,
        successfulUserIds.length,
      );

      // Invalidate challenge participants
      queryClient.invalidateQueries({ queryKey: challengeKeys.participants(request.challengeId) });
      queryClient.invalidateQueries({ queryKey: ['challenge-crews', request.challengeId] });

      // Invalidate user challenges and user profile for all joined users
      request.userIds.forEach(userId => {
        queryClient.invalidateQueries({ queryKey: challengeKeys.user(userId) });
        queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
        queryClient.invalidateQueries({ queryKey: ['myActiveChallenges', userId] });
      });
      // NOTE: intentionally NOT invalidating challengeKeys.popular() here — the backend's
      // popular endpoint excludes already-joined challenges, so invalidating it causes the
      // just-joined card to immediately vanish from the global list.
      void refreshStatus().catch(() => undefined);
    },
  });
};

// Leave challenge mutation
export const useLeaveChallenge = () => {
  const queryClient = useQueryClient();
  const { refreshStatus } = useSubscription();

  return useMutation({
    mutationFn: async (request: LeaveChallengeRequest) => {
      const response = await challengeService.leaveChallenge(request);
      // Treat a partial/full failure as a real error so onError fires
      if (!response.success || response.failedUserIds?.some(id => request.userIds.includes(id))) {
        throw new Error(
          getSafeErrorMessage(response.message, 'Could not leave the challenge. Please try again.'),
        );
      }
      return response;
    },
    onSuccess: async (response, request) => {
      const successfulUserIds = [...new Set(response.successfulUserIds)];
      const leavingUserIds = new Set(successfulUserIds);
      queryClient.setQueryData<ChallengeParticipantsResponse>(
        challengeKeys.participants(request.challengeId),
        (current) => {
          if (!current) return current;
          const participants = current.participants.filter(
            (participant) => !leavingUserIds.has(participant.id),
          );
          return {
            ...current,
            participants,
            totalParticipants: participants.length,
          };
        },
      );
      successfulUserIds.forEach((userId) => {
        transitionCachedChallengeMembership(
          queryClient,
          request.challengeId,
          userId,
          false,
        );
      });
      transitionCachedCrewMembership(
        queryClient,
        request.challengeId,
        -successfulUserIds.length,
      );

      const backgroundInvalidations = [
        queryClient.invalidateQueries({ queryKey: challengeKeys.participants(request.challengeId) }),
        queryClient.invalidateQueries({ queryKey: challengeKeys.popular() }),
        queryClient.invalidateQueries({ queryKey: ['challenge-crews', request.challengeId] }),
      ];
      const listInvalidations: Promise<unknown>[] = [];
      request.userIds.forEach(userId => {
        listInvalidations.push(
          queryClient.invalidateQueries({ queryKey: ['myActiveChallenges', userId] }),
        );
        backgroundInvalidations.push(
          queryClient.invalidateQueries({ queryKey: challengeKeys.user(userId) }),
          queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) }),
        );
      });
      void Promise.allSettled(backgroundInvalidations);
      await Promise.allSettled(listInvalidations);
      void refreshStatus().catch(() => undefined);
    },
  });
};

// Creator removes another participant from a challenge
export const useRemoveParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: { challengeId: number; participantUserId: number; reason: string }) => {
      const response = await challengeService.removeParticipant(
        request.challengeId,
        request.participantUserId,
        request.reason.trim(),
      );
      if (!response.success || response.failedUserIds?.includes(request.participantUserId)) {
        throw new Error(
          getSafeErrorMessage(response.message, 'Could not remove this participant. Please try again.'),
        );
      }
      return response;
    },
    onSuccess: (_response, request) => {
      queryClient.setQueryData<ChallengeParticipantsResponse>(
        challengeKeys.participants(request.challengeId),
        (current) => {
          if (!current) return current;
          const participants = current.participants.filter(
            (participant) => participant.id !== request.participantUserId,
          );
          return {
            ...current,
            participants,
            totalParticipants: participants.length,
          };
        },
      );
      transitionCachedCrewMembership(queryClient, request.challengeId, -1);
      queryClient.invalidateQueries({ queryKey: challengeKeys.participants(request.challengeId) });
      queryClient.invalidateQueries({ queryKey: ['challenge-crews', request.challengeId] });
      queryClient.invalidateQueries({ queryKey: challengeKeys.detail(request.challengeId) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.user(request.participantUserId) });
      queryClient.invalidateQueries({ queryKey: ['myActiveChallenges', request.participantUserId] });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(request.participantUserId) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.popular() });
    },
  });
};

// ===================
// Submission Mutations
// ===================

// Create submission mutation
export const useCreateSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (submissionData: CreateSubmissionRequest) => {
      const response = await challengeService.createSubmission(submissionData);
      if (!response.success || !response.submissionId) {
        throw new Error(
          getSafeErrorMessage(response.message, 'Could not post your submission. Please try again.'),
        );
      }
      return response;
    },
    onSuccess: (response, request) => {
      if (response.success && response.submissionId) {
        // Invalidate submissions queries
        queryClient.invalidateQueries({ queryKey: challengeKeys.submissions() });
        queryClient.invalidateQueries({ queryKey: challengeKeys.submissionPreviewsRoot() });
        queryClient.invalidateQueries({ queryKey: challengeKeys.challengeSubmissions(request.challengeId) });
        queryClient.invalidateQueries({ queryKey: challengeKeys.userSubmissions(request.userId) });
        queryClient.invalidateQueries({ queryKey: ['userChallengeSubmissions'] });
        queryClient.invalidateQueries({ queryKey: ['myActiveChallenges', request.userId] });
        queryClient.invalidateQueries({ queryKey: challengeKeys.detail(request.challengeId) });
        queryClient.invalidateQueries({ queryKey: challengeKeys.progress(request.challengeId) });
        queryClient.invalidateQueries({ queryKey: userKeys.challengeLeaderboard(request.challengeId, LeaderboardType.OVERALL) });
        queryClient.invalidateQueries({ queryKey: userKeys.rank(request.challengeId, request.userId) });
        
        // Invalidate feed lists (new submission will appear in feed)
        queryClient.invalidateQueries({ queryKey: ['feed', 'list'] });
      }
    },
  });
};

export const useReuploadSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ submissionId, data }: { submissionId: number; data: CreateSubmissionRequest }) => {
      const response = await challengeService.reuploadSubmission(submissionId, data);
      if (!response.success) {
        throw new Error(
          getSafeErrorMessage(response.message, 'Could not update your submission. Please try again.'),
        );
      }
      return response;
    },
    onMutate: async ({ submissionId, data }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['userChallengeSubmissions'] }),
        queryClient.cancelQueries({ queryKey: challengeKeys.challengeSubmissions(data.challengeId) }),
        queryClient.cancelQueries({ queryKey: challengeKeys.userSubmissions(data.userId) }),
      ]);

      const snapshots: [readonly unknown[], unknown][] = [];

      const updateSubInResponse = (prev: SubmissionsResponse) => ({
        ...prev,
        submissions: prev.submissions.map(s =>
          s.id === submissionId
            ? { ...s, description: data.description, mediaUrls: data.mediaUrls ? JSON.stringify(data.mediaUrls) : s.mediaUrls, version: (s.version || 0) + 1 }
            : s
        ),
      });

      for (const prefix of [['userChallengeSubmissions'] as const, challengeKeys.challengeSubmissions(data.challengeId), challengeKeys.userSubmissions(data.userId)]) {
        const entries = queryClient.getQueriesData<SubmissionsResponse>({ queryKey: prefix });
        for (const [key, prevData] of entries) {
          snapshots.push([key, prevData]);
          if (prevData) {
            queryClient.setQueryData(key, updateSubInResponse(prevData));
          }
        }
      }

      const subKey = challengeKeys.submission(submissionId);
      const prevSubData = queryClient.getQueryData<Submission>(subKey);
      snapshots.push([subKey, prevSubData]);

      return { snapshots };
    },
    onError: (_err, _request, context) => {
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          if (data !== undefined) {
            queryClient.setQueryData(key, data);
          }
        }
      }
    },
    onSuccess: (response, request) => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.submissions() });
      queryClient.invalidateQueries({ queryKey: challengeKeys.submissionPreviewsRoot() });
      queryClient.invalidateQueries({ queryKey: challengeKeys.submission(request.submissionId) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.challengeSubmissions(request.data.challengeId) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.userSubmissions(request.data.userId) });
      queryClient.invalidateQueries({ queryKey: ['userChallengeSubmissions'] });
      queryClient.invalidateQueries({ queryKey: ['myActiveChallenges', request.data.userId] });
      queryClient.invalidateQueries({ queryKey: challengeKeys.detail(request.data.challengeId) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.progress(request.data.challengeId) });
      queryClient.invalidateQueries({ queryKey: userKeys.challengeLeaderboard(request.data.challengeId, LeaderboardType.OVERALL) });
      queryClient.invalidateQueries({ queryKey: userKeys.rank(request.data.challengeId, request.data.userId) });
      queryClient.invalidateQueries({ queryKey: ['feed', 'list'] });
    },
  });
};

export const useDeleteSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ submissionId }: { submissionId: number; userId: number; challengeId: number }) => {
      const response = await challengeService.deleteSubmission(submissionId);
      if (!response.success) {
        throw new Error(
          getSafeErrorMessage(response.message, 'Could not delete the submission. Please try again.'),
        );
      }
      return response;
    },
    onMutate: async ({ submissionId, userId, challengeId }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['userChallengeSubmissions'] }),
        queryClient.cancelQueries({ queryKey: challengeKeys.challengeSubmissions(challengeId) }),
        queryClient.cancelQueries({ queryKey: challengeKeys.userSubmissions(userId) }),
      ]);

      const snapshots: [readonly unknown[], unknown][] = [];

      const removeSubFromResponse = (prev: SubmissionsResponse) => {
        const currentSubmissions = Array.isArray(prev?.submissions) ? prev.submissions : [];
        const submissions = currentSubmissions.filter(s => s.id !== submissionId);
        const removedCount = currentSubmissions.length - submissions.length;

        return {
          ...prev,
          submissions,
          totalCount: Math.max(0, (prev.totalCount ?? currentSubmissions.length) - removedCount),
        };
      };

      for (const prefix of [['userChallengeSubmissions'] as const, challengeKeys.challengeSubmissions(challengeId), challengeKeys.userSubmissions(userId)]) {
        const entries = queryClient.getQueriesData<SubmissionsResponse>({ queryKey: prefix });
        for (const [key, prevData] of entries) {
          snapshots.push([key, prevData]);
          if (prevData) {
            queryClient.setQueryData(key, removeSubFromResponse(prevData));
          }
        }
      }

      const subKey = challengeKeys.submission(submissionId);
      const prevSubData = queryClient.getQueryData(subKey);
      snapshots.push([subKey, prevSubData]);
      queryClient.removeQueries({ queryKey: subKey });

      return { snapshots };
    },
    onError: (_err, _request, context) => {
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          if (data !== undefined) {
            queryClient.setQueryData(key, data);
          }
        }
      }
    },
    onSuccess: (_, request) => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.submissions() });
      queryClient.invalidateQueries({ queryKey: challengeKeys.submissionPreviewsRoot() });
      queryClient.invalidateQueries({ queryKey: challengeKeys.submission(request.submissionId) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.challengeSubmissions(request.challengeId) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.userSubmissions(request.userId) });
      queryClient.invalidateQueries({ queryKey: ['userChallengeSubmissions'] });
      queryClient.invalidateQueries({ queryKey: ['myActiveChallenges', request.userId] });
      queryClient.invalidateQueries({ queryKey: challengeKeys.detail(request.challengeId) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.progress(request.challengeId) });
      queryClient.invalidateQueries({ queryKey: userKeys.challengeLeaderboard(request.challengeId, LeaderboardType.OVERALL) });
      queryClient.invalidateQueries({ queryKey: userKeys.rank(request.challengeId, request.userId) });
      queryClient.invalidateQueries({ queryKey: ['feed', 'list'] });
    },
  });
};
