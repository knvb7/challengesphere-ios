import {
  Comment,
  FeedResponse,
  GetFeedRequest,
  GloryCheckResponse,
  GloryUser,
  PageComment,
  PageGloryUser,
} from '../types/api';
import { normalizeSpringPage } from '../utils/apiPage';
import { apiClient } from './apiClient';

class FeedService {
  // ===================
  // Feed Operations
  // ===================

  // Get feed — POST /api/v1/feed (with request body)
  async getFeed(request: GetFeedRequest = {}): Promise<FeedResponse> {
    try {
      const response = await apiClient.post<FeedResponse>('/feed', request);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Get following feed — GET /api/v1/feed/following/{userId}
  async getFollowingFeed(userId: number, page = 1, pageSize = 20): Promise<FeedResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const response = await apiClient.get<FeedResponse>(
        `/feed/following/${userId}?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Get connections feed — GET /api/v1/feed/connections/{userId}
  // Includes public activity from followers and following, plus activity from
  // private challenges that the viewer is also allowed to see.
  async getConnectionsFeed(userId: number, page = 1, pageSize = 20): Promise<FeedResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const response = await apiClient.get<FeedResponse>(
        `/feed/connections/${userId}?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get trending feed — GET /api/v1/feed/trending
  async getTrendingFeed(page = 1, pageSize = 20, userId?: number): Promise<FeedResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (userId) params.append('userId', userId.toString());

      const response = await apiClient.get<FeedResponse>(`/feed/trending?${params.toString()}`);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Get explore feed — GET /api/v1/feed/explore
  async getExploreFeed(page = 1, pageSize = 20, userId?: number): Promise<FeedResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (userId) params.append('userId', userId.toString());

      const response = await apiClient.get<FeedResponse>(`/feed/explore?${params.toString()}`);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Get user's activity feed — GET /api/v1/feed/user/{targetUserId}
  async getUserActivity(targetUserId: number, page = 1, pageSize = 20, currentUserId?: number): Promise<FeedResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (currentUserId) params.append('currentUserId', currentUserId.toString());

      const response = await apiClient.get<FeedResponse>(
        `/feed/user/${targetUserId}?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Get challenge feed — GET /api/v1/feed/challenge/{challengeId}
  async getChallengeFeed(challengeId: number, page = 1, pageSize = 20, userId?: number): Promise<FeedResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (userId) params.append('userId', userId.toString());

      const response = await apiClient.get<FeedResponse>(
        `/feed/challenge/${challengeId}?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // ===================
  // Glory (Like) Operations
  // ===================

  // Toggle glory — POST /api/v1/glories/toggle?submissionId={id}&userId={id}
  async toggleGlory(submissionId: number, userId: number): Promise<boolean> {
    try {
      const response = await apiClient.post<boolean>(
        `/glories/toggle?submissionId=${submissionId}&userId=${userId}`
      );
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Get glories for submission — GET /api/v1/glories/submission/{submissionId}
  async getGloriesForSubmission(submissionId: number, page = 0, size = 50): Promise<PageGloryUser> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('size', size.toString());

      const response = await apiClient.get<PageGloryUser | GloryUser[]>(
        `/glories/submission/${submissionId}?${params.toString()}`
      );
      return normalizeSpringPage<GloryUser>(response.data);
    } catch (error) {
      
      throw error;
    }
  }

  // Get glory count — GET /api/v1/glories/count/{submissionId}
  async getGloryCount(submissionId: number): Promise<number> {
    try {
      const response = await apiClient.get<number>(`/glories/count/${submissionId}`);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Toggle unglory — POST /api/v1/glories/unglory/toggle?submissionId={id}&userId={id}
  async toggleUnglory(submissionId: number, userId: number): Promise<boolean> {
    try {
      const response = await apiClient.post<GloryCheckResponse | boolean>(
        `/glories/unglory/toggle?submissionId=${submissionId}&userId=${userId}`
      );
      return typeof response.data === 'boolean' ? response.data : !!response.data.hasUngloried;
    } catch (error) {
      
      throw error;
    }
  }

  async getGloryStatus(submissionId: number, userId: number): Promise<GloryCheckResponse> {
    try {
      const response = await apiClient.get<GloryCheckResponse | boolean>(
        `/glories/check?submissionId=${submissionId}&userId=${userId}`
      );
      if (typeof response.data === 'boolean') {
        return {
          submissionId,
          userId,
          hasGivenGlory: response.data,
          hasUngloried: false,
        };
      }
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Check if user has given glory — GET /api/v1/glories/check?submissionId={id}&userId={id}
  async hasUserGivenGlory(submissionId: number, userId: number): Promise<boolean> {
    try {
      const response = await this.getGloryStatus(submissionId, userId);
      return response.hasGivenGlory;
    } catch (error) {
      
      throw error;
    }
  }

  // ===================
  // Comment Operations
  // ===================

  // Get comments for a submission — GET /api/v1/comments/submission/{submissionId}
  async getComments(submissionId: number, callerId: number, page = 0, size = 20): Promise<PageComment> {
    try {
      const params = new URLSearchParams();
      params.append('callerId', callerId.toString());
      params.append('page', page.toString());
      params.append('size', size.toString());

      const response = await apiClient.get<PageComment>(
        `/comments/submission/${submissionId}?${params.toString()}`
      );
      return normalizeSpringPage<Comment>(response.data);
    } catch (error) {
      
      throw error;
    }
  }

  // Create comment — POST /api/v1/comments?submissionId={id}&userId={id}&content={content}
  async addComment(submissionId: number, userId: number, content: string): Promise<Comment> {
    try {
      const params = new URLSearchParams();
      params.append('submissionId', submissionId.toString());
      params.append('userId', userId.toString());
      params.append('content', content);

      const response = await apiClient.post<Comment>(`/comments?${params.toString()}`);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Update comment — PUT /api/v1/comments/{commentId}?userId={id}&content={content}
  async updateComment(commentId: number, userId: number, content: string): Promise<Comment> {
    try {
      const params = new URLSearchParams();
      params.append('userId', userId.toString());
      params.append('content', content);

      const response = await apiClient.put<Comment>(`/comments/${commentId}?${params.toString()}`);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Delete comment — DELETE /api/v1/comments/{commentId}?userId={id}
  async deleteComment(commentId: number, userId: number): Promise<void> {
    try {
      await apiClient.delete(`/comments/${commentId}?userId=${userId}`);
    } catch (error) {
      
      throw error;
    }
  }
}

export const feedService = new FeedService();
export default feedService;
