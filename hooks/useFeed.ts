import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { feedService } from '../services/feedService';
import { Comment, GetFeedRequest, PageComment } from '../types/api';
import { showSmallPopup } from '../utils/smallPopup';
import { challengeKeys } from './useChallenges';

const OWN_SUBMISSION_UNGLORY_MESSAGE = "You can't unglory your own submission";
const SOCIAL_CACHE_STALE_TIME_MS = 10 * 60 * 1000;
const SOCIAL_CACHE_GC_TIME_MS = 30 * 60 * 1000;

// Query keys
export const feedKeys = {
  all: ['feed'] as const,
  lists: () => [...feedKeys.all, 'list'] as const,
  following: (userId: number) => [...feedKeys.lists(), 'following', userId] as const,
  connections: (userId: number) => [...feedKeys.lists(), 'connections', userId] as const,
  trending: () => [...feedKeys.lists(), 'trending'] as const,
  explore: () => [...feedKeys.lists(), 'explore'] as const,
  challengeFeed: (challengeId: number) => [...feedKeys.lists(), 'challenge', challengeId] as const,
  userActivity: (userId: number, currentUserId?: number) => [
    ...feedKeys.all,
    'activity',
    userId,
    ...(currentUserId ? [currentUserId] : []),
  ] as const,
  detail: (submissionId: number) => [...feedKeys.all, 'detail', submissionId] as const,
  comments: (submissionId: number, callerId?: number) => [
    ...feedKeys.all,
    'comments',
    submissionId,
    ...(callerId ? [callerId] : []),
  ] as const,
  glories: (submissionId: number) => [...feedKeys.all, 'glories', submissionId] as const,
  gloryCount: (submissionId: number) => [...feedKeys.all, 'gloryCount', submissionId] as const,
  hasGloried: (submissionId: number, userId: number) => [...feedKeys.all, 'hasGloried', submissionId, userId] as const,
  gloryStatus: (submissionId: number, userId: number) => [...feedKeys.all, 'gloryStatus', submissionId, userId] as const,
};

// ===================
// Feed Queries
// ===================

// Get general feed (POST)
export const useFeed = (request: GetFeedRequest = {}) => {
  return useQuery({
    queryKey: [...feedKeys.lists(), request],
    queryFn: () => feedService.getFeed(request),
    placeholderData: (previousData) => previousData,
  });
};

// Get following feed
export const useFollowingFeed = (userId: number, page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: [...feedKeys.following(userId), page, pageSize],
    queryFn: () => feedService.getFollowingFeed(userId, page, pageSize),
    enabled: !!userId && userId > 0,
    placeholderData: (previousData) => previousData,
  });
};

// Get activity from followers, following, and shared private challenges.
export const useConnectionsFeed = (userId: number, page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: [...feedKeys.connections(userId), page, pageSize],
    queryFn: () => feedService.getConnectionsFeed(userId, page, pageSize),
    enabled: !!userId && userId > 0,
    placeholderData: (previousData) => previousData,
  });
};

// Get trending feed
export const useTrendingFeed = (page = 1, pageSize = 20, userId?: number) => {
  return useQuery({
    queryKey: [...feedKeys.trending(), page, pageSize, userId],
    queryFn: () => feedService.getTrendingFeed(page, pageSize, userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get explore feed
export const useExploreFeed = (page = 1, pageSize = 20, userId?: number) => {
  return useQuery({
    queryKey: [...feedKeys.explore(), page, pageSize, userId],
    queryFn: () => feedService.getExploreFeed(page, pageSize, userId),
    placeholderData: (previousData) => previousData,
  });
};

// Get user activity feed
export const useUserActivity = (userId: number, page = 1, pageSize = 20, currentUserId?: number) => {
  return useQuery({
    queryKey: [...feedKeys.userActivity(userId, currentUserId), page, pageSize],
    queryFn: () => feedService.getUserActivity(userId, page, pageSize, currentUserId),
    enabled: !!userId && userId > 0,
    placeholderData: (previousData) => previousData,
  });
};

// Get challenge feed
export const useChallengeFeed = (challengeId: number, page = 1, pageSize = 20, userId?: number) => {
  return useQuery({
    queryKey: [...feedKeys.challengeFeed(challengeId), page, pageSize, userId],
    queryFn: () => feedService.getChallengeFeed(challengeId, page, pageSize, userId),
    enabled: !!challengeId && challengeId > 0,
    placeholderData: (previousData) => previousData,
  });
};

// Get comments for a submission
export const useFeedComments = (submissionId: number, callerId: number, page = 0, size = 20, enabled = true) => {
  return useQuery({
    queryKey: [...feedKeys.comments(submissionId, callerId), page, size],
    queryFn: () => feedService.getComments(submissionId, callerId, page, size),
    enabled: enabled && !!submissionId && submissionId > 0 && !!callerId && callerId > 0,
    placeholderData: (previousData) => previousData,
    staleTime: SOCIAL_CACHE_STALE_TIME_MS,
    gcTime: SOCIAL_CACHE_GC_TIME_MS,
  });
};

// Get glories for a submission
export const useGloriesForSubmission = (submissionId: number) => {
  return useQuery({
    queryKey: feedKeys.glories(submissionId),
    queryFn: () => feedService.getGloriesForSubmission(submissionId),
    enabled: !!submissionId && submissionId > 0,
    staleTime: SOCIAL_CACHE_STALE_TIME_MS,
    gcTime: SOCIAL_CACHE_GC_TIME_MS,
  });
};

export const useInfiniteGloriesForSubmission = (submissionId: number, pageSize = 20) => {
  return useInfiniteQuery({
    queryKey: [...feedKeys.glories(submissionId), 'infinite', pageSize],
    queryFn: ({ pageParam = 0 }) =>
      feedService.getGloriesForSubmission(submissionId, pageParam as number, pageSize),
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1),
    initialPageParam: 0,
    enabled: !!submissionId && submissionId > 0,
    staleTime: SOCIAL_CACHE_STALE_TIME_MS,
    gcTime: SOCIAL_CACHE_GC_TIME_MS,
  });
};

// Get glory count
export const useGloryCount = (submissionId: number) => {
  return useQuery({
    queryKey: feedKeys.gloryCount(submissionId),
    queryFn: () => feedService.getGloryCount(submissionId),
    enabled: !!submissionId && submissionId > 0,
  });
};

// Check if user has given glory
export const useHasUserGivenGlory = (submissionId: number, userId: number) => {
  return useQuery({
    queryKey: feedKeys.hasGloried(submissionId, userId),
    queryFn: () => feedService.hasUserGivenGlory(submissionId, userId),
    enabled: !!submissionId && submissionId > 0 && !!userId && userId > 0,
  });
};

export const useGloryStatus = (submissionId: number, userId: number) => {
  return useQuery({
    queryKey: feedKeys.gloryStatus(submissionId, userId),
    queryFn: () => feedService.getGloryStatus(submissionId, userId),
    enabled: !!submissionId && submissionId > 0 && !!userId && userId > 0,
    staleTime: SOCIAL_CACHE_STALE_TIME_MS,
    gcTime: SOCIAL_CACHE_GC_TIME_MS,
  });
};

export const useOptimisticGloryToggle = ({
  submissionId,
  userId,
  submissionOwnerUserId,
  initialCount,
  initialIsGloried = false,
  initialIsUngloried = false,
}: {
  submissionId: number;
  userId: number;
  submissionOwnerUserId?: number;
  initialCount: number;
  initialIsGloried?: boolean;
  initialIsUngloried?: boolean;
}) => {
  const toggleGlory = useToggleGlory();
  const toggleUnglory = useToggleUnglory();

  const [isGloried, setIsGloried] = useState(initialIsGloried);
  const [isUngloried, setIsUngloried] = useState(initialIsUngloried);
  const [count, setCount] = useState(initialCount);
  // Track whether the user has interacted — once they do, don't let server refetches override local state
  const userInteractedRef = useRef(false);

  useEffect(() => {
    if (!userInteractedRef.current) {
      setIsGloried(initialIsGloried);
      setIsUngloried(initialIsUngloried);
    }
  }, [initialIsGloried, initialIsUngloried]);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount, submissionId]);

  useEffect(() => {
    // Reset interaction flag when submission changes so the server value re-initialises
    userInteractedRef.current = false;
    setIsGloried(initialIsGloried);
    setIsUngloried(initialIsUngloried);
  }, [submissionId, initialIsGloried, initialIsUngloried]);

  const handleGloryPress = () => {
    userInteractedRef.current = true;
    const previous = { isGloried, isUngloried, count };
    const nextIsGloried = !isGloried;

    setIsGloried(nextIsGloried);
    setIsUngloried(false);
    setCount((currentCount) =>
      nextIsGloried ? currentCount + 1 : Math.max(0, currentCount - 1)
    );

    toggleGlory.mutate(
      { submissionId, userId },
      {
        onError: () => {
          setIsGloried(previous.isGloried);
          setIsUngloried(previous.isUngloried);
          setCount(previous.count);
        },
      }
    );
  };

  const handleUngloryPress = () => {
    if (submissionOwnerUserId === userId) {
      showSmallPopup(OWN_SUBMISSION_UNGLORY_MESSAGE);
      return;
    }

    userInteractedRef.current = true;
    const previous = { isGloried, isUngloried, count };
    const nextIsUngloried = !isUngloried;

    setIsUngloried(nextIsUngloried);

    if (nextIsUngloried && isGloried) {
      setIsGloried(false);
      setCount((currentCount) => Math.max(0, currentCount - 1));
    }

    toggleUnglory.mutate(
      { submissionId, userId },
      {
        onError: () => {
          setIsGloried(previous.isGloried);
          setIsUngloried(previous.isUngloried);
          setCount(previous.count);
        },
      }
    );
  };

  return {
    count,
    isGloried,
    isUngloried,
    handleGloryPress,
    handleUngloryPress,
    isPending: toggleGlory.isPending || toggleUnglory.isPending,
  };
};

// ===================
// Infinite Scroll Queries
// ===================

// Infinite scroll for following feed
export const useInfiniteFollowingFeed = (userId: number, pageSize = 20) => {
  return useInfiniteQuery({
    queryKey: [...feedKeys.following(userId), 'infinite', pageSize],
    queryFn: ({ pageParam = 1 }) => feedService.getFollowingFeed(userId, pageParam as number, pageSize),
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!userId && userId > 0,
  });
};

// Infinite scroll for followers, following, and shared private challenge activity.
export const useInfiniteConnectionsFeed = (userId: number, pageSize = 20) => {
  return useInfiniteQuery({
    queryKey: [...feedKeys.connections(userId), 'infinite', pageSize],
    queryFn: ({ pageParam = 1 }) =>
      feedService.getConnectionsFeed(userId, pageParam as number, pageSize),
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!userId && userId > 0,
  });
};

// Infinite scroll for trending feed
export const useInfiniteTrendingFeed = (pageSize = 20, userId?: number) => {
  return useInfiniteQuery({
    queryKey: [...feedKeys.trending(), 'infinite', pageSize, userId],
    queryFn: ({ pageParam = 1 }) => feedService.getTrendingFeed(pageParam as number, pageSize, userId),
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });
};

// Infinite scroll for explore feed
export const useInfiniteExploreFeed = (pageSize = 20, userId?: number) => {
  return useInfiniteQuery({
    queryKey: [...feedKeys.explore(), 'infinite', pageSize, userId],
    queryFn: ({ pageParam = 1 }) => feedService.getExploreFeed(pageParam as number, pageSize, userId),
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });
};

// Infinite scroll for user activity
export const useInfiniteUserActivity = (userId: number, pageSize = 20, currentUserId?: number) => {
  return useInfiniteQuery({
    queryKey: [...feedKeys.userActivity(userId, currentUserId), 'infinite', pageSize],
    queryFn: ({ pageParam = 1 }) => feedService.getUserActivity(userId, pageParam as number, pageSize, currentUserId),
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!userId && userId > 0,
  });
};

// Infinite scroll for challenge feed
export const useInfiniteChallengeFeed = (challengeId: number, pageSize = 20, userId?: number) => {
  return useInfiniteQuery({
    queryKey: [...feedKeys.challengeFeed(challengeId), 'infinite', pageSize, userId],
    queryFn: ({ pageParam = 1 }) => feedService.getChallengeFeed(challengeId, pageParam as number, pageSize, userId),
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!challengeId && challengeId > 0,
  });
};

// ===================
// Glory Mutations
// ===================

// Toggle glory on feed item
export const useToggleGlory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ submissionId, userId }: { submissionId: number; userId: number }) =>
      feedService.toggleGlory(submissionId, userId),
    onSettled: (_, __, { submissionId, userId }) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.gloryCount(submissionId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.hasGloried(submissionId, userId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.gloryStatus(submissionId, userId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.glories(submissionId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.lists() });
      queryClient.invalidateQueries({ queryKey: challengeKeys.profileStatsSubmissionsRoot() });
    },
  });
};

// Toggle unglory on feed item
export const useToggleUnglory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ submissionId, userId }: { submissionId: number; userId: number }) =>
      feedService.toggleUnglory(submissionId, userId),
    onSettled: (_, __, { submissionId, userId }) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.gloryCount(submissionId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.hasGloried(submissionId, userId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.gloryStatus(submissionId, userId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.glories(submissionId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.lists() });
      queryClient.invalidateQueries({ queryKey: challengeKeys.profileStatsSubmissionsRoot() });
    },
  });
};

// ===================
// Comment Mutations
// ===================

// Add comment
export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ submissionId, userId, content }: {
      submissionId: number;
      userId: number;
      content: string;
      username?: string | null;
      profilePicUrl?: string | null;
    }) =>
      feedService.addComment(submissionId, userId, content),
    onSuccess: (createdComment, { submissionId, username, profilePicUrl }) => {
      const commentForCache: Comment = {
        ...createdComment,
        username: createdComment.username ?? username ?? undefined,
        profilePicUrl: createdComment.profilePicUrl ?? profilePicUrl ?? undefined,
      };

      queryClient.setQueriesData<PageComment>(
        { queryKey: feedKeys.comments(submissionId) },
        (previous) => {
          if (!previous) {
            return previous;
          }

          const createdCommentId = commentForCache.id ?? commentForCache.commentId;
          const alreadyExists = previous.content.some((comment) => {
            const commentId = comment.id ?? comment.commentId;
            return createdCommentId != null && commentId === createdCommentId;
          });

          if (alreadyExists) {
            return previous;
          }

          return {
            ...previous,
            content: [commentForCache, ...previous.content],
            totalElements: previous.totalElements + 1,
            numberOfElements: previous.numberOfElements + 1,
            empty: false,
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: challengeKeys.profileStatsSubmissionsRoot() });
    },
  });
};

// Update comment
export const useUpdateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, userId, content }: { commentId: number; userId: number; content: string }) =>
      feedService.updateComment(commentId, userId, content),
    onSuccess: () => {
      // Invalidate all comments queries
      queryClient.invalidateQueries({ queryKey: [...feedKeys.all, 'comments'] });
    },
  });
};

// Delete comment
export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, userId }: { commentId: number; userId: number; submissionId: number }) =>
      feedService.deleteComment(commentId, userId),
    onSuccess: (_, { submissionId, commentId }) => {
      queryClient.setQueriesData<PageComment>(
        { queryKey: feedKeys.comments(submissionId) },
        (previous) => {
          if (!previous) {
            return previous;
          }

          const nextContent = previous.content.filter((comment) => {
            const id = comment.id ?? comment.commentId;
            return id !== commentId;
          });
          const removed = nextContent.length !== previous.content.length;

          if (!removed) {
            return previous;
          }

          return {
            ...previous,
            content: nextContent,
            totalElements: Math.max(0, previous.totalElements - 1),
            numberOfElements: Math.max(0, previous.numberOfElements - 1),
            empty: nextContent.length === 0,
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: feedKeys.comments(submissionId) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.profileStatsSubmissionsRoot() });
    },
  });
};
