import { useFocusEffect } from '@react-navigation/native';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { challengeKeys } from '@/hooks/useChallenges';
import { feedKeys } from '@/hooks/useFeed';
import { userKeys } from '@/hooks/useUsers';
import { FEED_ENABLED } from '@/constants/feed';
import { useAuthContext } from '@/providers/AuthProvider';
import { challengeService } from '@/services/challengeService';
import { feedService } from '@/services/feedService';
import { userService } from '@/services/userService';
import { FeedResponse, PopularChallengesResponse, RecentChallengesResponse, SubmissionsResponse, UserChallengesResponse } from '@/types/api';
import { getDeviceTimeZone } from '@/utils/deviceTime';

const CHALLENGE_PAGE_SIZE = 20;
const CREATED_CHALLENGE_PAGE_SIZE = 20;
const FEED_PAGE_SIZE = 20;
const FOLLOW_PAGE_SIZE = 100;
const PRELOAD_STALE_TIME_MS = 5 * 60 * 1000;

const preloadedUsers = new Set<number>();

async function prefetchMyChallenges(queryClient: QueryClient, userId: number) {
  const timezone = getDeviceTimeZone();
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ['myActiveChallenges', userId, undefined, userId, timezone],
      queryFn: () => challengeService.getMyActiveChallenges(userId, undefined, userId, timezone),
      staleTime: PRELOAD_STALE_TIME_MS,
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: [...challengeKeys.creator(userId, userId), 'infinite', CREATED_CHALLENGE_PAGE_SIZE],
      queryFn: ({ pageParam = 1 }) =>
        challengeService.getChallengesByCreator(userId, userId, pageParam as number, CREATED_CHALLENGE_PAGE_SIZE),
      initialPageParam: 1,
      getNextPageParam: (lastPage: UserChallengesResponse) =>
        lastPage.hasNext ? lastPage.currentPage + 1 : undefined,
      staleTime: PRELOAD_STALE_TIME_MS,
    }),
  ]);
}

async function prefetchGlobalChallenges(queryClient: QueryClient, userId: number) {
  await Promise.allSettled([
    queryClient.prefetchInfiniteQuery({
      queryKey: [...challengeKeys.popular(), 'infinite', CHALLENGE_PAGE_SIZE, userId],
      queryFn: ({ pageParam = 1 }) =>
        challengeService.getPopularChallenges(pageParam as number, CHALLENGE_PAGE_SIZE, undefined, undefined, undefined, userId),
      initialPageParam: 1,
      getNextPageParam: (lastPage: PopularChallengesResponse) =>
        lastPage.currentPage < lastPage.totalPages ? lastPage.currentPage + 1 : undefined,
      staleTime: PRELOAD_STALE_TIME_MS,
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: [...challengeKeys.recent(), 'infinite', CHALLENGE_PAGE_SIZE, userId],
      queryFn: ({ pageParam = 1 }) =>
        challengeService.getRecentChallenges(pageParam as number, CHALLENGE_PAGE_SIZE, userId),
      initialPageParam: 1,
      getNextPageParam: (lastPage: RecentChallengesResponse) =>
        lastPage.hasMore ? lastPage.page + 1 : undefined,
      staleTime: PRELOAD_STALE_TIME_MS,
    }),
  ]);
}

async function prefetchHomeFeed(queryClient: QueryClient, userId: number) {
  if (!FEED_ENABLED) {
    await queryClient.prefetchQuery({
      queryKey: userKeys.totalCount(),
      queryFn: () => userService.getTotalUserCount(),
      staleTime: PRELOAD_STALE_TIME_MS,
    });
    return;
  }

  await Promise.allSettled([
    queryClient.prefetchInfiniteQuery({
      queryKey: [...feedKeys.connections(userId), 'infinite', FEED_PAGE_SIZE],
      queryFn: ({ pageParam = 1 }) => feedService.getConnectionsFeed(userId, pageParam as number, FEED_PAGE_SIZE),
      initialPageParam: 1,
      getNextPageParam: (lastPage: FeedResponse) => lastPage.hasMore ? lastPage.page + 1 : undefined,
      staleTime: PRELOAD_STALE_TIME_MS,
    }),
  ]);
}

async function prefetchProfile(queryClient: QueryClient, userId: number) {
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: userKeys.detail(userId),
      queryFn: () => userService.getUserById(userId),
      staleTime: PRELOAD_STALE_TIME_MS,
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: [...challengeKeys.userSubmissions(userId, userId), 'infinite', CHALLENGE_PAGE_SIZE],
      queryFn: ({ pageParam = 1 }) =>
        challengeService.getUserSubmissions(userId, userId, pageParam as number, CHALLENGE_PAGE_SIZE),
      initialPageParam: 1,
      getNextPageParam: (lastPage: SubmissionsResponse) =>
        lastPage.currentPage < lastPage.totalPages ? lastPage.currentPage + 1 : undefined,
      staleTime: PRELOAD_STALE_TIME_MS,
    }),
  ]);
}

export async function prefetchProfileFollowersAndFollowing(queryClient: QueryClient, userId: number) {
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: [...userKeys.followers(userId), 1, FOLLOW_PAGE_SIZE, userId],
      queryFn: () => userService.getUserFollowers(userId, 1, FOLLOW_PAGE_SIZE, userId),
      staleTime: PRELOAD_STALE_TIME_MS,
    }),
    queryClient.prefetchQuery({
      queryKey: [...userKeys.following(userId), 1, FOLLOW_PAGE_SIZE, userId],
      queryFn: () => userService.getUserFollowing(userId, 1, FOLLOW_PAGE_SIZE, userId),
      staleTime: PRELOAD_STALE_TIME_MS,
    }),
  ]);
}

async function prefetchStartupData(queryClient: QueryClient, userId: number) {
  await prefetchMyChallenges(queryClient, userId);
  await prefetchGlobalChallenges(queryClient, userId);
  await prefetchHomeFeed(queryClient, userId);
  await prefetchProfile(queryClient, userId);
  await prefetchProfileFollowersAndFollowing(queryClient, userId);
}

export function useProfileFollowPreload(userId: number) {
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      if (userId <= 0) {
        return undefined;
      }

      void prefetchProfileFollowersAndFollowing(queryClient, userId);
      return undefined;
    }, [queryClient, userId])
  );
}

export default function AppDataPreloader() {
  const queryClient = useQueryClient();
  const { currentUserId, isLoading } = useAuthContext();

  useEffect(() => {
    const userId = currentUserId;
    if (isLoading || userId <= 0 || preloadedUsers.has(userId)) {
      return;
    }

    preloadedUsers.add(userId);

    void prefetchStartupData(queryClient, userId);
  }, [currentUserId, isLoading, queryClient]);

  return null;
}
