import { useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { userService } from '../services/userService';
import {
    GeneratePresignedUrlsRequest,
    LeaderboardType,
    UpdateUserPreferencesRequest,
    UpdateUserRequest,
    UserProfileResponse
} from '../types/api';

const LEADERBOARD_CACHE_STALE_TIME_MS = 10 * 1000;
const LEADERBOARD_RANK_CACHE_STALE_TIME_MS = 10 * 1000;
const connectionsFeedKey = (userId: number) => ['feed', 'list', 'connections', userId] as const;

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  detail: (userId: number, currentUserId?: number) => [
    ...userKeys.all,
    'detail',
    userId,
    ...(currentUserId ? [currentUserId] : []),
  ] as const,
  byUsername: (username: string) => [...userKeys.all, 'username', username] as const,
  byEmail: (email: string) => [...userKeys.all, 'email', email] as const,
  byPhone: (phone: string) => [...userKeys.all, 'phone', phone] as const,
  preferences: (userId: number) => [...userKeys.all, 'preferences', userId] as const,
  followers: (userId: number) => [...userKeys.all, 'followers', userId] as const,
  following: (userId: number) => [...userKeys.all, 'following', userId] as const,
  isFollowing: (followerId: number, followingId: number) => [...userKeys.all, 'isFollowing', followerId, followingId] as const,
  relationship: (viewerUserId: number, targetUserId: number) => [...userKeys.all, 'relationship', viewerUserId, targetUserId] as const,
  challengeLeaderboard: (challengeId: number, type: LeaderboardType) => [...userKeys.all, 'challengeLeaderboard', challengeId, type] as const,
  rank: (challengeId: number, userId: number) => [...userKeys.all, 'rank', challengeId, userId] as const,
  blocked: (userId: number) => [...userKeys.all, 'blocked', userId] as const,
  search: (query: string) => [...userKeys.all, 'search', query] as const,
  suggestions: () => [...userKeys.all, 'suggestions'] as const,
  totalCount: () => [...userKeys.all, 'totalCount'] as const,
};

// ===================
// User Profile Queries
// ===================

// Get user by ID
export const useUser = (userId: number, currentUserId?: number) => {
  return useQuery({
    queryKey: userKeys.detail(userId, currentUserId),
    queryFn: () => userService.getUserById(userId, currentUserId),
    enabled: !!userId && userId > 0,
  });
};

// Get multiple users by ID and index them for easy lookups in list UIs
export const useUsersByIds = (userIds: number[], currentUserId?: number) => {
  const normalizedIds = useMemo(
    () => [...new Set(userIds.filter((userId) => userId > 0))].sort((a, b) => a - b),
    [userIds]
  );

  const results = useQueries({
    queries: normalizedIds.map((userId) => ({
      queryKey: userKeys.detail(userId, currentUserId),
      queryFn: () => userService.getUserById(userId, currentUserId),
      enabled: userId > 0,
      retry: false,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const usersById = useMemo(() => {
    return normalizedIds.reduce<Record<number, UserProfileResponse>>((acc, userId, index) => {
      const user = results[index]?.data;
      if (user) {
        acc[userId] = user;
      }
      return acc;
    }, {});
  }, [normalizedIds, results]);

  return {
    usersById,
    isLoading: results.some((result) => result.isLoading),
  };
};

// Get user by username
export const useUserByUsername = (username: string, currentUserId?: number) => {
  return useQuery({
    queryKey: [...userKeys.byUsername(username), currentUserId],
    queryFn: () => userService.getUserByUsername(username, currentUserId),
    enabled: !!username && username.length > 0,
    retry: false,
  });
};

// Get user by email
export const useUserByEmail = (email: string) => {
  return useQuery({
    queryKey: userKeys.byEmail(email),
    queryFn: () => userService.getUserByEmail(email),
    enabled: !!email && email.length > 0,
  });
};

// Get user by phone
export const useUserByPhone = (phone: string) => {
  return useQuery({
    queryKey: userKeys.byPhone(phone),
    queryFn: () => userService.getUserByPhone(phone),
    enabled: !!phone && phone.length > 0,
  });
};

export const useUserPreferences = (userId: number) => {
  return useQuery({
    queryKey: userKeys.preferences(userId),
    queryFn: () => userService.getUserPreferences(userId),
    enabled: !!userId && userId > 0,
  });
};

export const useTotalUserCount = () => {
  return useQuery({
    queryKey: userKeys.totalCount(),
    queryFn: () => userService.getTotalUserCount(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};

// Search users
export const useSearchUsers = (query: string, page = 1, pageSize = 10) => {
  const normalizedQuery = query.trim().replace(/^@/, '');

  return useQuery({
    queryKey: [...userKeys.search(normalizedQuery), page, pageSize],
    queryFn: () => userService.searchUsers(normalizedQuery, page, pageSize),
    enabled: normalizedQuery.length > 0,
    placeholderData: (previousData) => previousData,
    retry: false,
    staleTime: 30 * 1000,
  });
};

export const useSuggestedUsers = (page = 1, pageSize = 10, enabled = true) => {
  return useQuery({
    queryKey: [...userKeys.suggestions(), page, pageSize],
    queryFn: () => userService.getSuggestedUsers(page, pageSize),
    enabled,
    retry: false,
    staleTime: 60 * 1000,
  });
};

// ===================
// Follow Queries
// ===================

export const useFollowRelationship = (targetUserId: number, currentUserId?: number, enabled = true) => {
  const viewerUserId = currentUserId || 0;

  return useQuery({
    queryKey: userKeys.relationship(viewerUserId, targetUserId),
    queryFn: () => userService.getFollowRelationship(targetUserId),
    enabled: enabled && viewerUserId > 0 && targetUserId > 0 && viewerUserId !== targetUserId,
    retry: false,
  });
};

// Get user followers
export const useUserFollowers = (userId: number, page = 1, pageSize = 10, currentUserId?: number, enabled = true) => {
  return useQuery({
    queryKey: [...userKeys.followers(userId), page, pageSize, currentUserId],
    queryFn: () => userService.getUserFollowers(userId, page, pageSize, currentUserId),
    enabled: enabled && !!userId && userId > 0,
    placeholderData: (previousData) => previousData,
  });
};

// Get user following
export const useUserFollowing = (userId: number, page = 1, pageSize = 10, currentUserId?: number, enabled = true) => {
  return useQuery({
    queryKey: [...userKeys.following(userId), page, pageSize, currentUserId],
    queryFn: () => userService.getUserFollowing(userId, page, pageSize, currentUserId),
    enabled: enabled && !!userId && userId > 0,
    placeholderData: (previousData) => previousData,
  });
};

// Infinite scroll for followers
export const useInfiniteUserFollowers = (
  userId: number,
  pageSize = 10,
  currentUserId?: number,
  enabled = true,
) => {
  return useInfiniteQuery({
    queryKey: [...userKeys.followers(userId), 'infinite', pageSize, currentUserId],
    queryFn: ({ pageParam = 1 }) => userService.getUserFollowers(
      userId,
      pageParam as number,
      pageSize,
      currentUserId,
    ),
    getNextPageParam: (lastPage) => {
      return lastPage.hasNext ? lastPage.currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: enabled && !!userId && userId > 0,
  });
};

// Infinite scroll for following
export const useInfiniteUserFollowing = (
  userId: number,
  pageSize = 10,
  currentUserId?: number,
  enabled = true,
) => {
  return useInfiniteQuery({
    queryKey: [...userKeys.following(userId), 'infinite', pageSize, currentUserId],
    queryFn: ({ pageParam = 1 }) => userService.getUserFollowing(
      userId,
      pageParam as number,
      pageSize,
      currentUserId,
    ),
    getNextPageParam: (lastPage) => {
      return lastPage.hasNext ? lastPage.currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: enabled && !!userId && userId > 0,
  });
};

// ===================
// Leaderboard Queries
// ===================

// Get challenge leaderboard
export const useChallengeLeaderboard = (
  challengeId: number,
  type: LeaderboardType = LeaderboardType.OVERALL,
  limit = 10,
  userId?: number,
  enabled = true
) => {
  return useQuery({
    queryKey: [...userKeys.challengeLeaderboard(challengeId, type), limit, userId],
    queryFn: () => userService.getChallengeLeaderboard(challengeId, type, limit, userId),
    enabled: enabled && !!challengeId && challengeId > 0,
    staleTime: LEADERBOARD_CACHE_STALE_TIME_MS,
  });
};

// Get user rank in a challenge
export const useUserRank = (challengeId: number, userId: number) => {
  return useQuery({
    queryKey: userKeys.rank(challengeId, userId),
    queryFn: () => userService.getUserRank(challengeId, userId),
    enabled: !!userId && userId > 0 && !!challengeId && challengeId > 0,
    staleTime: LEADERBOARD_RANK_CACHE_STALE_TIME_MS,
  });
};

// ===================
// Blocked Users Query
// ===================

// Get blocked users
export const useBlockedUsers = (userId: number, page = 1, pageSize = 10) => {
  return useQuery({
    queryKey: [...userKeys.blocked(userId), page, pageSize],
    queryFn: () => userService.getBlockedUsers(userId, page, pageSize),
    enabled: !!userId && userId > 0,
    placeholderData: (previousData) => previousData,
  });
};

// ===================
// User Mutations
// ===================

// Update user
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userData }: { userId: number; userData: UpdateUserRequest }) =>
      userService.updateUser(userData),
    onSuccess: (updatedUser) => {
      // Update user detail cache
      queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);
      queryClient.invalidateQueries({ queryKey: userKeys.detail(updatedUser.id) });

      // Invalidate all user-derived views so profile pictures and renamed users refresh everywhere.
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
  });
};

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      preferences,
    }: {
      userId: number;
      preferences: UpdateUserPreferencesRequest;
    }) => userService.updateUserPreferences(userId, preferences),
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(userKeys.preferences(updatedPreferences.userId), updatedPreferences);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// Toggle user activation
export const useToggleUserActivation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => userService.toggleUserActivation(userId),
    onSuccess: (response) => {
      // Invalidate user detail
      queryClient.invalidateQueries({ queryKey: userKeys.detail(response.userId) });
    },
  });
};

// ===================
// Follow Mutations
// ===================

// Follow user
export const useFollowUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ followerId, followingId }: { followerId: number; followingId: number }) =>
      userService.followUser(followerId, followingId),
    onSuccess: (_, { followerId, followingId }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(followerId) });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(followingId) });
      queryClient.invalidateQueries({ queryKey: userKeys.followers(followingId) });
      queryClient.invalidateQueries({ queryKey: userKeys.following(followerId) });
      queryClient.invalidateQueries({ queryKey: userKeys.relationship(followerId, followingId) });
      queryClient.invalidateQueries({ queryKey: userKeys.relationship(followingId, followerId) });
      queryClient.invalidateQueries({ queryKey: userKeys.suggestions() });
      queryClient.invalidateQueries({ queryKey: connectionsFeedKey(followerId) });
      queryClient.invalidateQueries({ queryKey: connectionsFeedKey(followingId) });
    },
  });
};

// Unfollow user
export const useUnfollowUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ followerId, followingId }: { followerId: number; followingId: number }) =>
      userService.unfollowUser(followerId, followingId),
    onSuccess: (_, { followerId, followingId }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(followerId) });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(followingId) });
      queryClient.invalidateQueries({ queryKey: userKeys.followers(followingId) });
      queryClient.invalidateQueries({ queryKey: userKeys.following(followerId) });
      queryClient.invalidateQueries({ queryKey: userKeys.relationship(followerId, followingId) });
      queryClient.invalidateQueries({ queryKey: userKeys.relationship(followingId, followerId) });
      queryClient.invalidateQueries({ queryKey: userKeys.suggestions() });
      queryClient.invalidateQueries({ queryKey: connectionsFeedKey(followerId) });
      queryClient.invalidateQueries({ queryKey: connectionsFeedKey(followingId) });
    },
  });
};

// ===================
// Media Upload Mutations
// ===================

// Generate presigned URLs
export const useGeneratePresignedUrls = () => {
  return useMutation({
    mutationFn: (request: GeneratePresignedUrlsRequest) => userService.generatePresignedUrls(request),
  });
};

// Upload profile picture
export const useUploadProfilePicture = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      imageFile,
      onProgress,
    }: {
      userId: number;
      imageFile: any;
      onProgress?: (progress: number) => void;
    }) => userService.uploadProfilePicture(userId, imageFile, onProgress),
    onSuccess: (response, { userId }) => {
      // Invalidate user detail to show new profile picture
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      
      // Invalidate lists that might show profile pictures
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      
      // Update auth user if it's the current user
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
  });
};

// ===================
// Block/Report Mutations
// ===================

// Block user
export const useBlockUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ blockedId }: { blockerId: number; blockedId: number }) =>
      userService.blockUser(blockedId),
    onSuccess: (_, { blockerId, blockedId }) => {
      // Invalidate blocked users list
      queryClient.invalidateQueries({ queryKey: userKeys.blocked(blockerId) });
      
      // Invalidate user detail
      queryClient.invalidateQueries({ queryKey: userKeys.detail(blockedId) });
      
      // Invalidate user lists
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: connectionsFeedKey(blockerId) });
      queryClient.invalidateQueries({ queryKey: connectionsFeedKey(blockedId) });
    },
  });
};

// Unblock user
export const useUnblockUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ blockedId }: { blockerId: number; blockedId: number }) =>
      userService.unblockUser(blockedId),
    onSuccess: (_, { blockerId, blockedId }) => {
      // Invalidate blocked users list
      queryClient.invalidateQueries({ queryKey: userKeys.blocked(blockerId) });
      
      // Invalidate user detail
      queryClient.invalidateQueries({ queryKey: userKeys.detail(blockedId) });
      queryClient.invalidateQueries({ queryKey: connectionsFeedKey(blockerId) });
      queryClient.invalidateQueries({ queryKey: connectionsFeedKey(blockedId) });
    },
  });
};

// Report user
export const useReportUser = () => {
  return useMutation({
    mutationFn: ({ reportedId, reason }: { reporterId: number; reportedId: number; reason: string }) =>
      userService.reportUser(reportedId, reason),
  });
};
