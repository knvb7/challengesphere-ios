import {
  BulkChallengeUpdateRequest,
  Challenge,
  ChallengeCreateRequest,
  ChallengeCreateResponse,
  ChallengeFavoriteResponse,
  ChallengeInfo,
  ChallengeParticipationPolicyResponse,
  ChallengeParticipantsResponse,
  ChallengeProgressResponse,
  ChallengesByHashtagResponse,
  ChallengeUpdateRequest,
  ChallengeSubmissionPreview,
  CreateSubmissionRequest,
  JoinChallengeRequest,
  JoinChallengeResponse,
  LeaveChallengeRequest,
  LeaveChallengeResponse,
  MyChallengesResponse,
  PopularChallengeItem,
  PopularChallengesResponse,
  RecentChallengesResponse,
  SearchFilters,
  DeleteSubmissionResponse,
  GlobalSubmissionSort,
  Submission,
  SubmissionResponse,
  SubmissionPreviewsRequest,
  SubmissionsResponse,
  UserChallengesResponse
} from '../types/api';
import { getDeviceTimeZone } from '../utils/deviceTime';
import { buildTopProfileInterests } from '../utils/profileInterests';
import { apiClient } from './apiClient';

const SUBMISSION_PREVIEW_BATCH_SIZE = 50;
const PROFILE_STATS_SUBMISSION_PAGE_SIZE = 100;
const PAGE_FETCH_CONCURRENCY = 4;

const fetchRemainingPages = async <T>(
  totalPages: number,
  fetchPage: (page: number) => Promise<T>,
): Promise<T[]> => {
  const responses: T[] = [];
  for (let firstPageInBatch = 2; firstPageInBatch <= totalPages; firstPageInBatch += PAGE_FETCH_CONCURRENCY) {
    const lastPageInBatch = Math.min(totalPages, firstPageInBatch + PAGE_FETCH_CONCURRENCY - 1);
    const batch = await Promise.all(
      Array.from(
        { length: lastPageInBatch - firstPageInBatch + 1 },
        (_, index) => fetchPage(firstPageInBatch + index),
      ),
    );
    responses.push(...batch);
  }
  return responses;
};

const isValidChallenge = (challenge: Challenge | null | undefined): challenge is Challenge => {
  return !!challenge &&
    typeof challenge.id === 'number' &&
    typeof challenge.title === 'string' &&
    typeof challenge.description === 'string';
};

type RawPopularChallenge = Challenge & {
  participantCount?: number;
  activeParticipantCount?: number;
};

type RawPopularChallengesResponse = Omit<PopularChallengesResponse, 'challenges'> & {
  challenges: (PopularChallengeItem | RawPopularChallenge)[];
};

type RawChallengesByHashtagResponse = Omit<ChallengesByHashtagResponse, 'challenges'> & {
  challenges: (PopularChallengeItem | RawPopularChallenge)[];
};

const isNestedPopularChallengeItem = (item: PopularChallengeItem | RawPopularChallenge | null | undefined): item is PopularChallengeItem => {
  return !!item &&
    typeof item === 'object' &&
    'challenge' in item &&
    isValidChallenge(item.challenge);
};

const normalizePopularChallengeItem = (item: PopularChallengeItem | RawPopularChallenge | null | undefined): PopularChallengeItem | null => {
  if (isNestedPopularChallengeItem(item)) {
    return {
      challenge: item.challenge,
      participantCount: typeof item.participantCount === 'number' ? item.participantCount : 0,
    };
  }

  if (!isValidChallenge(item)) {
    return null;
  }

  return {
    challenge: item,
    participantCount: typeof item.participantCount === 'number'
      ? item.participantCount
      : typeof item.activeParticipantCount === 'number'
        ? item.activeParticipantCount
        : 0,
  };
};

const canViewerSeeChallenge = (
  challenge: Pick<Challenge, 'creatorId' | 'isPrivate'> | ChallengeInfo | null | undefined,
  currentUserId?: number
): boolean => {
  if (!challenge?.isPrivate) {
    return true;
  }

  return !!currentUserId && challenge.creatorId === currentUserId;
};

const filterChallengesForViewer = <T extends Pick<Challenge, 'creatorId' | 'isPrivate'>>(
  challenges: T[],
  currentUserId?: number
): T[] => {
  return challenges.filter((challenge) => canViewerSeeChallenge(challenge, currentUserId));
};

const buildPageFromChallenges = (
  userId: number,
  challenges: Challenge[],
  page: number,
  pageSize: number
): UserChallengesResponse => {
  const totalCount = challenges.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pageChallenges = challenges.slice(startIndex, startIndex + pageSize);

  return {
    userId,
    challenges: pageChallenges,
    currentPage: page,
    pageSize,
    totalCount,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
};

type ApiSubmission = Omit<Submission, 'id' | 'mediaUrls'> & {
  id?: number | string;
  submissionId?: number | string;
  mediaUrls?: string | string[];
};

const toNumber = (value: number | string | undefined): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeSubmission = (submission: ApiSubmission): Submission => {
  const id = toNumber(submission.id) || toNumber(submission.submissionId);
  return {
    ...submission,
    id,
    submissionId: toNumber(submission.submissionId) || id,
    mediaUrls: submission.mediaUrls as Submission['mediaUrls'],
  };
};

const normalizeSubmissionsArray = (response?: Partial<SubmissionsResponse> | null): Submission[] => {
  if (!Array.isArray(response?.submissions)) {
    return [];
  }

  return (response.submissions as unknown as ApiSubmission[]).map(normalizeSubmission);
};

const normalizeSubmissionsResponse = (response: SubmissionsResponse): SubmissionsResponse => ({
  ...response,
  submissions: normalizeSubmissionsArray(response),
});

const compareChallengesByCreatedAtDesc = <T extends { id?: number; createdAt?: string }>(left: T, right: T): number => {
  const parsedLeftTime = left.createdAt ? new Date(left.createdAt).getTime() : Number.NEGATIVE_INFINITY;
  const parsedRightTime = right.createdAt ? new Date(right.createdAt).getTime() : Number.NEGATIVE_INFINITY;
  const leftTime = Number.isFinite(parsedLeftTime) ? parsedLeftTime : Number.NEGATIVE_INFINITY;
  const rightTime = Number.isFinite(parsedRightTime) ? parsedRightTime : Number.NEGATIVE_INFINITY;
  return rightTime - leftTime || (right.id || 0) - (left.id || 0);
};

const sortChallengesByCreatedAtDesc = <T extends { id?: number; createdAt?: string }>(challenges: T[]): T[] =>
  [...challenges].sort(compareChallengesByCreatedAtDesc);

class ChallengeService {
  // ===================
  // Challenge CRUD Operations
  // ===================

  // Get challenge by ID — uses POST /api/v1/challenges/batch with single ID
  async getChallengeById(challengeId: number, currentUserId?: number): Promise<Challenge> {
    try {
      const response = await apiClient.post<Challenge[]>('/challenges/batch', [challengeId]);
      if (response.data && response.data.length > 0) {
        // The authenticated batch endpoint already applies the backend's full
        // visibility policy, including active members of private challenges.
        // Re-applying the discovery-only creator check here hid private
        // challenge details from joined participants and forced screens to use
        // incomplete route params (most visibly resetting the day to Day 1).
        return response.data[0];
      }
      throw new Error('Challenge not found');
    } catch (error) {
      
      throw error;
    }
  }

  // Create new challenge
  async createChallenge(challengeData: ChallengeCreateRequest): Promise<ChallengeCreateResponse> {
    try {
      const response = await apiClient.post<ChallengeCreateResponse>('/challenges', challengeData);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Update challenge — PUT /api/v1/challenges/{id}
  async updateChallenge(challengeId: number, challengeData: ChallengeUpdateRequest): Promise<Challenge> {
    try {
      const response = await apiClient.put<Challenge>(`/challenges/${challengeId}`, challengeData);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Delete challenges — DELETE /api/v1/challenges (bulk)
  async deleteChallenges(request: BulkChallengeUpdateRequest): Promise<void> {
    try {
      await apiClient.delete('/challenges', { data: request });
    } catch (error) {
      
      throw error;
    }
  }

  // Delete single challenge (convenience wrapper)
  async deleteChallenge(challengeId: number): Promise<void> {
    try {
      await apiClient.delete(`/challenges/${challengeId}`);
    } catch (error) {
      throw error;
    }
  }

  async setChallengeFavorite(
    challengeId: number,
    favorite: boolean,
  ): Promise<ChallengeFavoriteResponse> {
    const response = favorite
      ? await apiClient.put<ChallengeFavoriteResponse>(`/challenges/${challengeId}/favorite`)
      : await apiClient.delete<ChallengeFavoriteResponse>(`/challenges/${challengeId}/favorite`);
    return response.data;
  }

  // ===================
  // Challenge Discovery
  // ===================

  // Get user's challenges — GET /api/v1/challenges/user/{userId}
  async getUserChallenges(userId: number, currentUserId: number, page = 1, pageSize = 10, active?: boolean): Promise<UserChallengesResponse> {
    try {
      const params = new URLSearchParams();
      params.append('currentUserId', currentUserId.toString());
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (active !== undefined) {
        params.append('active', active.toString());
      }

      const response = await apiClient.get<UserChallengesResponse>(
        `/challenges/user/${userId}?${params.toString()}`
      );
      const visibleChallenges = filterChallengesForViewer(response.data.challenges || [], currentUserId);
      return {
        ...response.data,
        challenges: sortChallengesByCreatedAtDesc(visibleChallenges),
        totalCount: currentUserId === userId ? response.data.totalCount : visibleChallenges.length,
        totalPages: response.data.totalPages,
        hasNext: response.data.hasNext,
      };
    } catch (error) {
      
      throw error;
    }
  }

  private async getAllUserChallenges(userId: number, currentUserId: number, active?: boolean): Promise<Challenge[]> {
    const pageSize = 100;
    const firstPage = await this.getUserChallenges(userId, currentUserId, 1, pageSize, active);
    const challenges = [...(firstPage.challenges || [])];
    const totalPages = firstPage.totalPages || 1;

    for (let page = 2; page <= totalPages; page += 1) {
      const response = await this.getUserChallenges(userId, currentUserId, page, pageSize, active);
      challenges.push(...(response.challenges || []));
    }

    return challenges;
  }

  // Get user's active challenges with progress — GET /api/v1/challenges/my?userId={userId}&status={status}
  async getMyActiveChallenges(
    userId: number,
    status?: string,
    currentUserId = userId,
    timezone = getDeviceTimeZone(),
  ): Promise<MyChallengesResponse> {
    try {
      const getPage = async (page: number) => {
        const params = new URLSearchParams();
        params.append('userId', userId.toString());
        params.append('page', page.toString());
        params.append('pageSize', '100');
        params.append('timezone', timezone || 'UTC');
        if (status) params.append('status', status);
        const response = await apiClient.get<MyChallengesResponse>(
          `/challenges/my?${params.toString()}`
        );
        return response.data;
      };
      const firstPage = await getPage(1);
      const reportedCount = firstPage.totalChallenges ?? firstPage.totalCount ?? firstPage.challenges.length;
      const totalPages = Math.max(
        1,
        firstPage.totalPages || Math.ceil(reportedCount / 100),
      );
      const remainingPages = await fetchRemainingPages(totalPages, getPage);
      const uniqueChallenges = new Map<number, (typeof firstPage.challenges)[number]>();
      [firstPage, ...remainingPages].forEach((page) => {
        (page.challenges || []).forEach((challenge) => {
          if (!uniqueChallenges.has(challenge.id)) uniqueChallenges.set(challenge.id, challenge);
        });
      });
      // This authenticated endpoint already applies viewer-aware membership
      // rules. Re-filtering private rows as creator-only would hide shared
      // private challenges from legitimate participants and skew their stats.
      const visibleChallenges = Array.from(uniqueChallenges.values());
      const activeCount = visibleChallenges.filter((challenge) => !challenge.completed).length;
      const completedCount = visibleChallenges.filter((challenge) => challenge.completed).length;
      return {
        ...firstPage,
        challenges: sortChallengesByCreatedAtDesc(visibleChallenges),
        totalActive: currentUserId === userId ? firstPage.totalActive ?? activeCount : activeCount,
        totalCompleted: currentUserId === userId ? firstPage.totalCompleted ?? completedCount : completedCount,
        totalChallenges: currentUserId === userId
          ? firstPage.totalChallenges ?? firstPage.totalCount ?? visibleChallenges.length
          : visibleChallenges.length,
        totalCount: visibleChallenges.length,
        currentPage: 1,
        pageSize: visibleChallenges.length,
        totalPages: 1,
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Get the authenticated user's authoritative day-by-day progress.
  async getMyChallengeProgress(
    challengeId: number,
    timezone = getDeviceTimeZone(),
  ): Promise<ChallengeProgressResponse> {
    const params = new URLSearchParams();
    params.append('timezone', timezone || 'UTC');
    const response = await apiClient.get<ChallengeProgressResponse>(
      `/challenges/${challengeId}/my-progress?${params.toString()}`
    );
    return response.data;
  }

  // Get challenges created by a user — No dedicated endpoint in API spec.
  // Uses GET /api/v1/challenges/user/{userId} and filters by creatorId on the client.
  async getChallengesByCreator(creatorId: number, currentUserId: number, page = 1, pageSize = 10): Promise<UserChallengesResponse> {
    try {
      const allChallenges = await this.getAllUserChallenges(creatorId, currentUserId);
      const createdChallenges = filterChallengesForViewer(
        allChallenges.filter(c => c.creatorId === creatorId),
        currentUserId
      );
      return {
        ...buildPageFromChallenges(
          creatorId,
          sortChallengesByCreatedAtDesc(createdChallenges),
          page,
          pageSize
        ),
        topInterests: buildTopProfileInterests(createdChallenges),
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Get active public challenges created by a user without profile follow access.
  async getPublicChallengesByCreator(creatorId: number, page = 1, pageSize = 10): Promise<UserChallengesResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      const response = await apiClient.get<UserChallengesResponse>(
        `/challenges/creator/${creatorId}/public?${params.toString()}`
      );
      return {
        ...response.data,
        challenges: sortChallengesByCreatedAtDesc(
          filterChallengesForViewer(response.data.challenges || [])
        ),
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Get popular challenges — GET /api/v1/challenges/popular
  async getPopularChallenges(
    page = 1,
    pageSize = 10,
    active?: boolean,
    startDate?: string,
    endDate?: string,
    currentUserId?: number
  ): Promise<PopularChallengesResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (currentUserId && currentUserId > 0) params.append('currentUserId', currentUserId.toString());
      if (active !== undefined) params.append('active', active.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await apiClient.get<RawPopularChallengesResponse>(`/challenges/popular?${params.toString()}`);
      return {
        ...response.data,
        challenges: (response.data.challenges || [])
          .map(normalizePopularChallengeItem)
          .filter((item): item is PopularChallengeItem => item !== null)
          .filter((item) => canViewerSeeChallenge(item.challenge, currentUserId))
          .sort((left, right) => compareChallengesByCreatedAtDesc(left.challenge, right.challenge)),
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Get recent challenges — GET /api/v1/challenges/recent
  async getRecentChallenges(page = 1, pageSize = 10, currentUserId?: number): Promise<RecentChallengesResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (currentUserId && currentUserId > 0) params.append('currentUserId', currentUserId.toString());

      const response = await apiClient.get<RecentChallengesResponse>(`/challenges/recent?${params.toString()}`);
      const visibleChallenges = filterChallengesForViewer(response.data.challenges || [], currentUserId);
      return {
        ...response.data,
        challenges: sortChallengesByCreatedAtDesc(visibleChallenges),
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Get trending challenge IDs — GET /api/v1/challenges/trending/ids
  async getTrendingChallengeIds(limit = 10): Promise<number[]> {
    try {
      const response = await apiClient.get<number[]>(`/challenges/trending/ids?limit=${limit}`);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Get challenges by category — No dedicated endpoint in API spec.
  // Uses GET /api/v1/challenges/by-hashtags as the closest match.
  async getChallengesByCategory(category: string, page = 1, pageSize = 10, currentUserId?: number): Promise<UserChallengesResponse> {
    try {
      const hashtagResponse = await this.getChallengesByHashtag([category.toLowerCase()], page, pageSize, currentUserId);
      const categoryChallenges = hashtagResponse.challenges.reduce<Challenge[]>((acc, item) => {
        if (item?.challenge && isValidChallenge(item.challenge)) {
          acc.push({ ...item.challenge, participantCount: item.participantCount } as Challenge);
        }
        return acc;
      }, []);

      return {
        userId: 0,
        challenges: categoryChallenges,
        currentPage: hashtagResponse.currentPage,
        pageSize: hashtagResponse.pageSize,
        totalCount: hashtagResponse.totalCount,
        totalPages: hashtagResponse.totalPages,
        hasNext: hashtagResponse.currentPage < hashtagResponse.totalPages,
        hasPrevious: hashtagResponse.currentPage > 1,
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Get challenges by hashtag — GET /api/v1/challenges/by-hashtags
  async getChallengesByHashtag(hashtags: string[], page = 1, pageSize = 10, currentUserId?: number): Promise<ChallengesByHashtagResponse> {
    try {
      const params = new URLSearchParams();
      hashtags.forEach(tag => params.append('hashtags', tag));
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (currentUserId && currentUserId > 0) params.append('currentUserId', currentUserId.toString());

      const response = await apiClient.get<RawChallengesByHashtagResponse>(`/challenges/by-hashtags?${params.toString()}`);
      return {
        ...response.data,
        challenges: (response.data.challenges || [])
          .map(normalizePopularChallengeItem)
          .filter((item): item is PopularChallengeItem => item !== null)
          .filter((item) => canViewerSeeChallenge(item.challenge, currentUserId))
          .sort((left, right) => compareChallengesByCreatedAtDesc(left.challenge, right.challenge)),
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Get challenges by duration
  // Get challenges by duration — No dedicated endpoint in API spec.
  // Uses popular challenges and filters by numberOfDays on the client.
  async getChallengesByDuration(minDays: number, maxDays: number, page = 1, pageSize = 10, currentUserId?: number): Promise<UserChallengesResponse> {
    try {
      const popularResponse = await this.getPopularChallenges(page, pageSize, undefined, undefined, undefined, currentUserId);
      const filtered = popularResponse.challenges
        .map(item => item?.challenge)
        .filter(isValidChallenge)
        .filter(challenge => challenge.numberOfDays >= minDays && challenge.numberOfDays <= maxDays);

      return {
        userId: 0,
        challenges: filtered,
        currentPage: popularResponse.currentPage,
        pageSize: popularResponse.pageSize,
        totalCount: filtered.length,
        totalPages: popularResponse.totalPages,
        hasNext: popularResponse.currentPage < popularResponse.totalPages,
        hasPrevious: popularResponse.currentPage > 1,
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Search challenges — No dedicated search endpoint in API spec.
  // Uses popular challenges and filters on the client by title/description/hashtags.
  async searchChallenges(query: string, _filters?: SearchFilters, page = 1, pageSize = 10, currentUserId?: number): Promise<UserChallengesResponse> {
    try {
      const popularResponse = await this.getPopularChallenges(page, pageSize, undefined, undefined, undefined, currentUserId);
      const lowerQuery = query.toLowerCase();
      const filtered = popularResponse.challenges
        .map(item => item?.challenge)
        .filter(isValidChallenge)
        .filter(c => {
          return c.title.toLowerCase().includes(lowerQuery) ||
            c.description.toLowerCase().includes(lowerQuery) ||
            (c.hashtags || '').toLowerCase().includes(lowerQuery) ||
            (c.categories || '').toLowerCase().includes(lowerQuery);
        });

      return {
        userId: 0,
        challenges: filtered,
        currentPage: page,
        pageSize,
        totalCount: filtered.length,
        totalPages: popularResponse.totalPages,
        hasNext: popularResponse.currentPage < popularResponse.totalPages,
        hasPrevious: false,
      };
    } catch (error) {
      
      throw error;
    }
  }

  // ===================
  // Challenge Participation
  // ===================

  async getParticipationPolicy(): Promise<ChallengeParticipationPolicyResponse> {
    const response = await apiClient.get<ChallengeParticipationPolicyResponse>(
      '/challenges/participation-policy'
    );
    return response.data;
  }

  // Join challenge (add users to challenge)
  async joinChallenge(request: JoinChallengeRequest): Promise<JoinChallengeResponse> {
    try {
      const response = await apiClient.post<JoinChallengeResponse>('/challenges/join', request);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Leave challenge (remove users from challenge)
  async leaveChallenge(request: LeaveChallengeRequest): Promise<LeaveChallengeResponse> {
    try {
      const response = await apiClient.post<LeaveChallengeResponse>('/challenges/leave', request);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Creator-only participant removal — POST /api/v1/challenges/{challengeId}/participants/{participantUserId}/remove
  async removeParticipant(challengeId: number, participantUserId: number, reason: string): Promise<LeaveChallengeResponse> {
    try {
      const response = await apiClient.post<LeaveChallengeResponse>(
        `/challenges/${challengeId}/participants/${participantUserId}/remove`,
        { reason }
      );
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Get challenge participants — GET /api/v1/challenges/{challengeId}/participants
  async getChallengeParticipants(challengeId: number): Promise<ChallengeParticipantsResponse> {
    try {
      const response = await apiClient.get<ChallengeParticipantsResponse>(`/challenges/${challengeId}/participants`);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Get challenges by IDs — POST /api/v1/challenges/batch
  async getChallengesByIds(challengeIds: number[]): Promise<Challenge[]> {
    try {
      const response = await apiClient.post<Challenge[]>('/challenges/batch', challengeIds);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Disable challenges for users — PATCH /api/v1/challenges/bulk-disable-by-users
  async disableChallengesForUsers(userIds: number[]): Promise<string> {
    try {
      const response = await apiClient.patch<string>('/challenges/bulk-disable-by-users', { userIds });
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // ===================
  // Submissions
  // ===================

  // Create submission
  async createSubmission(submissionData: CreateSubmissionRequest): Promise<SubmissionResponse> {
    try {
      const response = await apiClient.post<SubmissionResponse>('/submissions', {
        ...submissionData,
        timezone: getDeviceTimeZone(),
      });
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  async getSubmissionPreviews(
    challengeIds: number[],
    userId?: number,
  ): Promise<ChallengeSubmissionPreview[]> {
    const normalizedIds = [...new Set(challengeIds)]
      .filter((id) => Number.isInteger(id) && id > 0)
      .sort((a, b) => a - b);
    if (normalizedIds.length === 0) {
      return [];
    }

    const batches: number[][] = [];
    for (let index = 0; index < normalizedIds.length; index += SUBMISSION_PREVIEW_BATCH_SIZE) {
      batches.push(normalizedIds.slice(index, index + SUBMISSION_PREVIEW_BATCH_SIZE));
    }

    const responses = await Promise.all(batches.map(async (batchIds) => {
      const request: SubmissionPreviewsRequest = {
        challengeIds: batchIds,
        ...(userId && userId > 0 ? { userId } : {}),
      };
      const response = await apiClient.post<ChallengeSubmissionPreview[]>(
        '/submissions/previews',
        request,
      );
      return Array.isArray(response.data) ? response.data : [];
    }));

    return responses.flat().map((preview) => ({
      challengeId: toNumber(preview.challengeId),
      totalCount: Math.max(0, toNumber(preview.totalCount)),
      submissions: Array.isArray(preview.submissions)
        ? preview.submissions
          .map((submission) => ({
            submissionId: toNumber(submission.submissionId),
            userId: toNumber(submission.userId),
            mediaUrl: typeof submission.mediaUrl === 'string' ? submission.mediaUrl.trim() : '',
            submissionTime: submission.submissionTime,
          }))
          .filter((submission) => submission.submissionId > 0 && !!submission.mediaUrl)
        : [],
    })).filter((preview) => preview.challengeId > 0);
  }

  // Reupload submission — PUT /api/v1/submissions/{submissionId}
  async reuploadSubmission(submissionId: number, submissionData: CreateSubmissionRequest): Promise<SubmissionResponse> {
    try {
      const response = await apiClient.put<SubmissionResponse>(`/submissions/${submissionId}`, {
        ...submissionData,
        timezone: getDeviceTimeZone(),
      });
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  // Delete submission — DELETE /api/v1/submissions/{submissionId}
  async deleteSubmission(submissionId: number): Promise<DeleteSubmissionResponse> {
    try {
      const response = await apiClient.delete<DeleteSubmissionResponse>(`/submissions/${submissionId}`);
      return response.data || {
        success: true,
        message: 'Submission deleted successfully',
        submissionId,
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Get submissions for a challenge — GET /api/v1/submissions/challenge/{challengeId}
  async getChallengeSubmissions(
    challengeId: number,
    callerId: number,
    page = 1,
    pageSize = 10,
    sortBy: GlobalSubmissionSort = 'newest',
    participantQuery = ''
  ): Promise<SubmissionsResponse> {
    try {
      const params = new URLSearchParams();
      params.append('callerId', callerId.toString());
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      params.append('sortBy', sortBy);
      const normalizedParticipantQuery = participantQuery.trim();
      if (normalizedParticipantQuery.length >= 3) {
        params.append('participantQuery', normalizedParticipantQuery);
      }

      const response = await apiClient.get<SubmissionsResponse>(
        `/submissions/challenge/${challengeId}?${params.toString()}`
      );
      return normalizeSubmissionsResponse(response.data);
    } catch (error) {
      
      throw error;
    }
  }

  // Get random global submissions for a challenge day — GET /api/v1/submissions/challenge/{challengeId}/global
  async getGlobalChallengeSubmissionsByDay(
    challengeId: number,
    dayNumber: number,
    callerId: number,
    page = 1,
    pageSize = 20,
    sortBy: GlobalSubmissionSort = 'newest',
    participantQuery = ''
  ): Promise<SubmissionsResponse> {
    try {
      const params = new URLSearchParams();
      params.append('callerId', callerId.toString());
      params.append('dayNumber', dayNumber.toString());
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      params.append('sortBy', sortBy);
      const normalizedParticipantQuery = participantQuery.trim();
      if (normalizedParticipantQuery.length >= 3) {
        params.append('participantQuery', normalizedParticipantQuery);
      }

      const response = await apiClient.get<SubmissionsResponse>(
        `/submissions/challenge/${challengeId}/global?${params.toString()}`
      );
      return normalizeSubmissionsResponse(response.data);
    } catch (error) {
      
      throw error;
    }
  }

  // Get user's submissions — GET /api/v1/submissions/user/{userId}
  async getUserSubmissions(userId: number, callerId: number, page = 1, pageSize = 10): Promise<SubmissionsResponse> {
    try {
      const params = new URLSearchParams();
      params.append('callerId', callerId.toString());
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const response = await apiClient.get<SubmissionsResponse>(
        `/submissions/user/${userId}?${params.toString()}`
      );
      return normalizeSubmissionsResponse(response.data);
    } catch (error) {
      
      throw error;
    }
  }

  async getAllUserSubmissions(userId: number, callerId: number): Promise<Submission[]> {
    const firstPage = await this.getUserSubmissions(
      userId,
      callerId,
      1,
      PROFILE_STATS_SUBMISSION_PAGE_SIZE,
    );
    const reportedTotalPages = Math.max(1, firstPage.totalPages || 1);
    const countDerivedTotalPages = Math.max(
      1,
      Math.ceil((firstPage.totalCount || firstPage.submissions.length) / PROFILE_STATS_SUBMISSION_PAGE_SIZE),
    );
    const totalPages = Math.max(reportedTotalPages, countDerivedTotalPages);
    const remainingPages = await fetchRemainingPages(
      totalPages,
      (page) => this.getUserSubmissions(
        userId,
        callerId,
        page,
        PROFILE_STATS_SUBMISSION_PAGE_SIZE,
      ),
    );
    const submissions = [firstPage, ...remainingPages]
      .flatMap((page) => page.submissions || []);
    const unique = new Map<number | string, Submission>();

    submissions.forEach((submission, index) => {
      const id = submission.id || submission.submissionId;
      const key = id && id > 0
        ? id
        : `${submission.challengeId}:${submission.dayNumber}:${submission.submissionTime}:${index}`;
      if (!unique.has(key)) unique.set(key, submission);
    });

    return Array.from(unique.values());
  }

  // Get user's submissions for a specific challenge — GET /api/v1/submissions/user/{userId}/challenge/{challengeId}
  async getUserChallengeSubmissions(userId: number, challengeId: number, callerId: number, page = 1, pageSize = 10): Promise<SubmissionsResponse> {
    try {
      const params = new URLSearchParams();
      params.append('callerId', callerId.toString());
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const response = await apiClient.get<SubmissionsResponse>(
        `/submissions/user/${userId}/challenge/${challengeId}?${params.toString()}`
      );
      return normalizeSubmissionsResponse(response.data);
    } catch (error) {
      
      throw error;
    }
  }

  async getAllUserChallengeSubmissions(
    userId: number,
    challengeId: number,
    callerId: number,
  ): Promise<Submission[]> {
    const pageSize = 100;
    const firstPage = await this.getUserChallengeSubmissions(
      userId,
      challengeId,
      callerId,
      1,
      pageSize,
    );
    const reportedTotalPages = Math.max(1, firstPage.totalPages || 1);
    const countDerivedTotalPages = Math.max(
      1,
      Math.ceil((firstPage.totalCount || firstPage.submissions.length) / pageSize),
    );
    const totalPages = Math.max(reportedTotalPages, countDerivedTotalPages);
    const remainingPages = await fetchRemainingPages(
      totalPages,
      (page) => this.getUserChallengeSubmissions(
        userId,
        challengeId,
        callerId,
        page,
        pageSize,
      ),
    );
    const unique = new Map<number | string, Submission>();

    [firstPage, ...remainingPages]
      .flatMap((page) => page.submissions || [])
      .forEach((submission, index) => {
        const id = submission.id || submission.submissionId;
        const key = id && id > 0
          ? id
          : `${submission.challengeId}:${submission.dayNumber}:${submission.submissionTime}:${index}`;
        if (!unique.has(key)) unique.set(key, submission);
      });

    return Array.from(unique.values());
  }

  // Get submission by ID
  async getSubmissionById(submissionId: number): Promise<Submission> {
    try {
      const response = await apiClient.get<Submission>(`/submissions/${submissionId}`);
      return normalizeSubmission(response.data as unknown as ApiSubmission);
    } catch (error) {
      
      throw error;
    }
  }
}

export const challengeService = new ChallengeService();
export default challengeService;
