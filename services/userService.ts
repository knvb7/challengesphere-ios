import {
    FollowActionResponse,
    FollowRelationshipResponse,
    FollowersFollowingResponse,
    GeneratePresignedUrlsRequest,
    LeaderboardResponse,
    LeaderboardType,
    MediaFileInfo,
    PresignedUrlsResponse,
    ToggleActivateUserRequest,
    ToggleUserActivationResponse,
    UpdateUserRequest,
    UpdateUserPreferencesRequest,
    AccountDeletionResponse,
    User,
    UserCountResponse,
    UserPreferences,
    UserProfileResponse,
    UserRankInfo,
    UserSearchResponse
} from '../types/api';
import { apiClient } from './apiClient';

type RawUser = User & {
  profilePictureUrl?: string | null;
  userProfilePicUrl?: string | null;
};

const normalizeUser = (user: RawUser): User => ({
  ...user,
  profilePicUrl: user.profilePicUrl || user.profilePictureUrl || user.userProfilePicUrl || null,
});

const normalizeUsers = (users: RawUser[] | undefined): User[] => {
  return (users || []).map(normalizeUser);
};

const normalizeUserSearchResponse = (response: UserSearchResponse): UserSearchResponse => ({
  ...response,
  users: normalizeUsers(response.users as RawUser[]),
});

const normalizeFollowersFollowingResponse = (
  response: FollowersFollowingResponse
): FollowersFollowingResponse => ({
  ...response,
  users: normalizeUsers(response.users as RawUser[]),
});

class UserService {
  // ===================
  // User Profile Operations
  // ===================

  // Get user by ID — GET /api/v1/users?userId={id}
  async getUserById(userId: number, currentUserId?: number): Promise<UserProfileResponse> {
    try {
      const params = new URLSearchParams();
      params.append('userId', userId.toString());
      if (currentUserId && currentUserId > 0) params.append('currentUserId', currentUserId.toString());
      const response = await apiClient.get<UserProfileResponse>(`/users?${params.toString()}`);
      return normalizeUser(response.data as RawUser);
    } catch (error: any) {
      if (error?.response?.status !== 404) {}
      throw error;
    }
  }

  // Get user by username — GET /api/v1/users?username={username}
  async getUserByUsername(username: string, currentUserId?: number): Promise<UserProfileResponse> {
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      if (currentUserId && currentUserId > 0) params.append('currentUserId', currentUserId.toString());
      const response = await apiClient.get<UserProfileResponse>(`/users?${params.toString()}`);
      return normalizeUser(response.data as RawUser);
    } catch (error: any) {
      if (error?.response?.status !== 404) {}
      throw error;
    }
  }

  // Get user by email — GET /api/v1/users?emailId={emailId}
  async getUserByEmail(emailId: string): Promise<UserProfileResponse> {
    try {
      const response = await apiClient.get<UserProfileResponse>(`/users?emailId=${encodeURIComponent(emailId)}`);
      return normalizeUser(response.data as RawUser);
    } catch (error) {
      
      throw error;
    }
  }

  // Get user by phone — GET /api/v1/users?phone={phone}
  async getUserByPhone(phone: string): Promise<UserProfileResponse> {
    try {
      const response = await apiClient.get<UserProfileResponse>(`/users?phone=${phone}`);
      return normalizeUser(response.data as RawUser);
    } catch (error) {
      
      throw error;
    }
  }

  // Update user profile — PUT /api/v1/users
  async updateUser(userData: UpdateUserRequest): Promise<UserProfileResponse> {
    try {
      const response = await apiClient.put<UserProfileResponse>('/users', {
        ...userData,
      });
      return normalizeUser(response.data as RawUser);
    } catch (error) {
      
      throw error;
    }
  }

  async getUserPreferences(userId: number): Promise<UserPreferences> {
    try {
      const response = await apiClient.get<UserPreferences>(`/users/${userId}/preferences`);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  async updateUserPreferences(
    userId: number,
    preferences: UpdateUserPreferencesRequest
  ): Promise<UserPreferences> {
    try {
      const response = await apiClient.patch<UserPreferences>(
        `/users/${userId}/preferences`,
        preferences
      );
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  async deleteOwnAccount(confirmation: string): Promise<AccountDeletionResponse> {
    const response = await apiClient.delete<AccountDeletionResponse>('/users/me/account', {
      data: { confirmation },
      timeout: 30_000,
    });
    return response.data;
  }

  async getTotalUserCount(): Promise<UserCountResponse> {
    try {
      const response = await apiClient.get<UserCountResponse>('/users/count');
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Search users — GET /api/v1/users/search?query={query}
  async searchUsers(query: string, page = 1, pageSize = 10): Promise<UserSearchResponse> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return {
        query: '',
        users: [],
        currentPage: page,
        pageSize,
        totalCount: 0,
        totalPages: 0,
        hasMore: false,
        hasPrevious: false,
      };
    }

    try {
      const params = new URLSearchParams();
      params.append('query', normalizedQuery);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      const response = await apiClient.get<UserSearchResponse>(`/users/search?${params.toString()}`);
      return normalizeUserSearchResponse(response.data);
    } catch (error) {
      
      throw error;
    }
  }

  async getSuggestedUsers(page = 1, pageSize = 10): Promise<UserSearchResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      const response = await apiClient.get<UserSearchResponse>(`/users/suggestions?${params.toString()}`);
      return normalizeUserSearchResponse(response.data);
    } catch (error) {
      
      throw error;
    }
  }

  // Toggle user activation — PATCH /api/v1/users/activation
  async toggleUserActivation(userId: number): Promise<ToggleUserActivationResponse> {
    try {
      const request: ToggleActivateUserRequest = { userId };
      const response = await apiClient.patch<ToggleUserActivationResponse>('/users/activation', request);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // ===================
  // Follow Operations
  // ===================

  // Follow user — POST /api/v1/users/follow?followerId={id}&followingId={id}
  async followUser(followerId: number, followingId: number): Promise<FollowActionResponse> {
    try {
      const response = await apiClient.post<FollowActionResponse>(
        `/users/follow?followerId=${followerId}&followingId=${followingId}`
      );
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Unfollow user — POST /api/v1/users/unfollow?followerId={id}&followingId={id}
  async unfollowUser(followerId: number, followingId: number): Promise<FollowActionResponse> {
    try {
      const response = await apiClient.post<FollowActionResponse>(
        `/users/unfollow?followerId=${followerId}&followingId=${followingId}`
      );
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  async getFollowRelationship(targetUserId: number): Promise<FollowRelationshipResponse> {
    try {
      const response = await apiClient.get<FollowRelationshipResponse>(
        `/users/${targetUserId}/relationship`
      );
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Get user followers — GET /api/v1/users/{userId}/followers
  async getUserFollowers(userId: number, page = 1, pageSize = 10, currentUserId?: number): Promise<FollowersFollowingResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (currentUserId && currentUserId > 0) params.append('currentUserId', currentUserId.toString());

      const response = await apiClient.get<FollowersFollowingResponse>(
        `/users/${userId}/followers?${params.toString()}`
      );
      return normalizeFollowersFollowingResponse(response.data);
    } catch (error) {
      
      throw error;
    }
  }

  // Get user following — GET /api/v1/users/{userId}/following
  async getUserFollowing(userId: number, page = 1, pageSize = 10, currentUserId?: number): Promise<FollowersFollowingResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (currentUserId && currentUserId > 0) params.append('currentUserId', currentUserId.toString());

      const response = await apiClient.get<FollowersFollowingResponse>(
        `/users/${userId}/following?${params.toString()}`
      );
      return normalizeFollowersFollowingResponse(response.data);
    } catch (error) {
      
      throw error;
    }
  }

  // ===================
  // Leaderboard Operations
  // ===================

  // Get challenge leaderboard — GET /api/v1/leaderboard/challenge/{challengeId}
  async getChallengeLeaderboard(
    challengeId: number,
    type: LeaderboardType = LeaderboardType.OVERALL,
    limit = 10,
    userId?: number
  ): Promise<LeaderboardResponse> {
    try {
      const params = new URLSearchParams();
      params.append('type', type);
      params.append('limit', limit.toString());
      if (userId) params.append('userId', userId.toString());

      const response = await apiClient.get<LeaderboardResponse>(
        `/leaderboard/challenge/${challengeId}?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Get user rank in a challenge — GET /api/v1/leaderboard/challenge/{challengeId}/user/{userId}/rank
  async getUserRank(challengeId: number, userId: number): Promise<UserRankInfo> {
    try {
      const response = await apiClient.get<UserRankInfo>(
        `/leaderboard/challenge/${challengeId}/user/${userId}/rank`
      );
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Remove user from leaderboard — DELETE /api/v1/leaderboard/challenge/{challengeId}/user/{userId}
  async removeFromLeaderboard(challengeId: number, userId: number): Promise<Record<string, string>> {
    try {
      const response = await apiClient.delete<Record<string, string>>(
        `/leaderboard/challenge/${challengeId}/user/${userId}`
      );
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // ===================
  // Media Upload Operations
  // ===================

  // Generate presigned URLs — POST /api/v1/submissions/presigned-urls
  async generatePresignedUrls(request: GeneratePresignedUrlsRequest): Promise<PresignedUrlsResponse> {
    try {
      const response = await apiClient.post<PresignedUrlsResponse>('/submissions/presigned-urls', request);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  async generateProfilePhotoPresignedUrl(
    userId: number,
    mediaFile: MediaFileInfo
  ): Promise<PresignedUrlsResponse> {
    try {
      const response = await apiClient.post<PresignedUrlsResponse>(
        `/users/${userId}/profile-picture/presigned-url`,
        mediaFile
      );
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Upload profile picture
  async uploadProfilePicture(
    userId: number,
    imageFile: any,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; profilePicUrl: string }> {
    try {
      const response = await apiClient.uploadFile(
        `/users/${userId}/profile-picture`,
        imageFile,
        onProgress
      );
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // ===================
  // Block/Report Operations
  // ===================

  // Block user
  async blockUser(blockedId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>('/users/block', {
        targetUserId: blockedId,
      });
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Unblock user
  async unblockUser(blockedId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>('/users/unblock', {
        targetUserId: blockedId,
      });
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Report user
  async reportUser(reportedId: number, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>('/users/report', {
        targetUserId: reportedId,
        reason,
      });
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Get blocked users
  async getBlockedUsers(userId: number, page = 1, pageSize = 10): Promise<{ users: User[]; totalCount: number; hasMore: boolean }> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const response = await apiClient.get<{ users: User[]; totalCount: number; hasMore: boolean }>(
        `/users/${userId}/blocked?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }
}

export const userService = new UserService();
export default userService;
