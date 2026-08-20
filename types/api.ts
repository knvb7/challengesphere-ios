// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===================
// User Types
// ===================

export type UserGender = 'WOMAN' | 'MAN' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';

// Matches exact API response from GET /users/getUser
export interface User {
  id: number;
  // Present only on self-profile and authentication responses.
  emailId?: string;
  phone?: string;
  username: string;
  displayName?: string | null;
  realName?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  createdAt: string;
  // New preferred name (kept intentionally misspelled as "genuinity" for product copy consistency)
  genuinityScore?: number;
  // Backward-compatible name from older backend responses
  genuinenessScore?: number;
  active: boolean;
  challengesCreated: number;
  challengesAccepted: number;
  followers: number;
  following: number;
  profilePicUrl: string | null;
  profilePictureUrl?: string | null;
  userProfilePicUrl?: string | null;
  premiumUser: number;
  // Present only on self-profile responses.
  notifications?: number;
  bio: string | null;
  dateOfBirth?: string | null;
  age?: number | null;
  gender?: UserGender | null;
  country?: string | null;
  interests?: string[];
  profileComplete?: boolean;
  submissionsCount?: number;
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR'
}

// Keep UserProfileResponse as alias for User for backward compatibility
export type UserProfileResponse = User;

export interface UpdateUserRequest {
  username?: string;
  name?: string;
  profilePicUrl?: string;
  notifications?: number;
  bio?: string;
  dateOfBirth?: string;
  gender?: UserGender;
  country?: string;
  interests?: string[];
}

export interface UserPreferences {
  id: number;
  userId: number;
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  notifyOnGlory: boolean;
  notifyOnComment: boolean;
  notifyOnFollow: boolean;
  notifyOnChallengeInvite: boolean;
  notifyOnChallengeUpdate: boolean;
  notifyOnMotivation: boolean;
  privateProfile: boolean;
  privateSubmissions: boolean;
  showOnLeaderboard: boolean;
  allowChallengeInvites: boolean;
  darkMode: boolean;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserPreferencesRequest {
  pushNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  notifyOnGlory?: boolean;
  notifyOnComment?: boolean;
  notifyOnFollow?: boolean;
  notifyOnChallengeInvite?: boolean;
  notifyOnChallengeUpdate?: boolean;
  notifyOnMotivation?: boolean;
  privateProfile?: boolean;
  privateSubmissions?: boolean;
  showOnLeaderboard?: boolean;
  allowChallengeInvites?: boolean;
  darkMode?: boolean;
  language?: string;
}

// ===================
// Authentication Types
// ===================
export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn?: number;
  issuedAt?: string;
  expiresAt?: string;
  username?: string;
  email?: string;
  userId?: string;
  user?: User;
  isNewUser?: boolean;
}

export interface AppleAuthFullName {
  namePrefix?: string | null;
  givenName?: string | null;
  middleName?: string | null;
  familyName?: string | null;
  nameSuffix?: string | null;
  nickname?: string | null;
}

export interface AppleAuthRequest {
  identityToken: string;
  authorizationCode: string;
  rawNonce: string;
  user: string;
  email?: string | null;
  fullName?: AppleAuthFullName | null;
}

export interface AccountDeletionResponse {
  success: boolean;
  message: string;
  mediaCleanupQueued: number;
}

// ===================
// Challenge Types
// ===================
export type ChallengeMode = 'DAILY' | 'ONE_OFF';
export type ChallengeProofMode = 'FLEXIBLE' | 'PHOTO_REQUIRED';

export interface Challenge {
  id: number;
  hashtags?: string;
  categories?: string;
  integrationProvider?: string | null;
  verificationProvider?: string | null;
  appIntegrationProvider?: string | null;
  title: string;
  description: string;
  rules?: string;
  benefits?: string;
  isPrivate?: boolean;
  startDate?: string;
  active?: boolean;
  createdAt: string;
  creatorId: number;
  creatorUsername?: string;
  creatorProfilePicUrl?: string | null;
  currentOwnerId?: number;
  numberOfDays: number;
  challengeMode?: ChallengeMode | string;
  proofMode?: ChallengeProofMode | string;
  officialTemplateKey?: string | null;
  cohortKey?: string | null;
  coverPhotoUrls?: string | string[] | null;
  participantCount?: number;
  activeParticipantCount?: number;
  isJoined?: boolean;
  joined?: boolean;
}

export interface ChallengeCreateRequest {
  title: string;
  description: string;
  rules: string;
  creatorUserId: number;
  hashtags?: string;
  categories?: string;
  categoryValues?: string[];
  benefits?: string;
  isPrivate?: boolean;
  startDate?: string;
  numberOfDays: number;
  challengeMode?: ChallengeMode;
  proofMode?: ChallengeProofMode;
  reminderTime?: string;
  coverPhotoUrls?: string[];
  invitedUserIds?: number[];
}

export interface ChallengeCreateResponse {
  challengeId: number;
  title: string;
  description: string;
  rules?: string;
  hashtags?: string;
  categories?: string;
  benefits?: string;
  isPrivate?: boolean;
  startDate?: string;
  active?: boolean;
  createdAt: string;
  creatorId: number;
  creatorUsername?: string;
  creatorProfilePicUrl?: string | null;
  currentOwnerId?: number;
  numberOfDays: number;
  challengeMode?: ChallengeMode | string;
  proofMode?: ChallengeProofMode | string;
  officialTemplateKey?: string | null;
  cohortKey?: string | null;
  coverPhotoUrls?: string[];
  message: string;
}

export interface ChallengeUpdateRequest {
  title?: string;
  description?: string;
  hashtags?: string;
  categories?: string;
  benefits?: string;
  isPrivate?: boolean;
  endDate?: string;
  numberOfDays?: number;
  challengeMode?: ChallengeMode;
  proofMode?: ChallengeProofMode;
  reminderTime?: string;
  active?: boolean;
  coverPhotoUrls?: string[];
  invitedUserIds?: number[];
}

// Bulk operations
export interface BulkChallengeUpdateRequest {
  challengeIds: number[];
  disable?: boolean;
  softDelete?: boolean;
}

export interface BulkUserChallengeUpdateRequest {
  userIds: number[];
}

export interface JoinChallengeRequest {
  challengeId: number;
  userIds: number[];
}

export interface JoinChallengeResponse {
  challengeId: number;
  challengeTitle?: string;
  successfulUserIds: number[];
  failedUserIds: number[];
  message: string;
  success: boolean;
}

export interface ChallengeParticipationPolicyResponse {
  freeMaxActiveChallengesPerVisibility: number;
  premiumMaxActiveChallengesPerVisibility: number;
}

export interface LeaveChallengeRequest {
  challengeId: number;
  userIds: number[];
}

export interface LeaveChallengeResponse {
  challengeId: number;
  challengeTitle?: string;
  successfulUserIds: number[];
  failedUserIds: number[];
  message: string;
  success: boolean;
}

export interface ChallengeParticipantsResponse {
  challengeId: number;
  participants: User[];
  totalParticipants: number;
}

export interface UserChallengesResponse {
  userId: number;
  challenges: Challenge[];
  topInterests?: {
    label: string;
    count: number;
  }[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface MyChallenge {
  id: number;
  hashtags?: string;
  categories?: string;
  title: string;
  description: string;
  rules?: string;
  benefits?: string;
  isPrivate?: boolean;
  startDate?: string;
  active?: boolean;
  createdAt: string;
  creatorId: number;
  creatorUsername?: string;
  creatorProfilePicUrl?: string | null;
  currentOwnerId?: number;
  numberOfDays: number;
  challengeMode?: ChallengeMode | string;
  proofMode?: ChallengeProofMode | string;
  officialTemplateKey?: string | null;
  cohortKey?: string | null;
  coverPhotoUrls?: string | string[] | null;
  daysCompleted: number;
  currentStreak: number;
  completionPercentage: number;
  joinedAt: string;
  completed: boolean;
  favorite?: boolean;
  participationActive?: boolean;
  participantCount?: number;
  activeParticipantCount?: number;
  momentum?: ChallengeMomentumSnapshot;
  privateRank?: PrivateChallengeRankSummary;
}

export type ChallengeMomentumState = 'NONE' | 'FINAL_STRETCH' | 'FINISH_STRONG';

export interface ChallengeMomentumSnapshot {
  state: ChallengeMomentumState;
  totalDays: number;
  completedDays: number;
  remainingRequiredCheckIns: number;
  remainingAvailableCheckIns: number;
  submittedToday: boolean;
}

export interface PrivateChallengeRankSummary {
  rank: number;
  totalParticipants: number;
}

export interface ChallengeProgressDay {
  dayNumber: number;
  submissionId?: number | null;
  thumbnailUrl?: string | null;
  gloriesCount?: number;
  submittedAt?: string | null;
}

export interface ChallengeProgressResponse {
  challengeId: number;
  challengeTitle: string;
  totalDays: number;
  daysCompleted: number;
  completionPercentage: number;
  currentStreak: number;
  longestStreak: number;
  days: ChallengeProgressDay[];
  momentum?: ChallengeMomentumSnapshot;
}

export interface MyChallengesResponse {
  challenges: MyChallenge[];
  totalActive?: number;
  totalCompleted?: number;
  totalChallenges?: number;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  totalPages?: number;
}

export interface ChallengeFavoriteResponse {
  challengeId: number;
  favorite: boolean;
}

export interface PopularChallengeItem {
  challenge: Challenge;
  participantCount: number;
}

export interface PopularChallengesResponse {
  challenges: PopularChallengeItem[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// ChallengeInfo — returned by recent challenges endpoint
export interface ChallengeInfo {
  id: number;
  title: string;
  description: string;
  rules?: string;
  hashtags?: string;
  categories?: string;
  benefits?: string;
  numberOfDays: number;
  challengeMode?: ChallengeMode | string;
  proofMode?: ChallengeProofMode | string;
  officialTemplateKey?: string | null;
  cohortKey?: string | null;
  startDate?: string;
  creatorId: number;
  creatorUsername?: string;
  creatorProfilePicUrl?: string | null;
  isPrivate?: boolean;
  active?: boolean;
  createdAt?: string;
  coverPhotoUrls?: string | string[] | null;
  viewCount?: number;
  engagementScore?: number;
  participantCount?: number;
}

export interface RecentChallengesResponse {
  challenges: ChallengeInfo[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ChallengesByHashtagResponse {
  hashtags: string[];
  challenges: PopularChallengeItem[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface Submission {
  id: number;
  submissionId?: number;
  userId: number;
  challengeId: number;
  dayNumber: number;
  description: string;
  mediaUrls?: string;
  isPrivate?: boolean;
  submissionTime: string;
  createdAt?: string;
  updatedAt?: string;
  active?: boolean;
  gloriesCount: number;
  commentsCount: number;
  version?: number;
}

export interface SubmissionPreviewItem {
  submissionId: number;
  userId: number;
  mediaUrl: string;
  submissionTime: string;
}

export interface ChallengeSubmissionPreview {
  challengeId: number;
  submissions: SubmissionPreviewItem[];
  totalCount: number;
}

export interface SubmissionPreviewsRequest {
  challengeIds: number[];
  userId?: number;
}

export interface CreateSubmissionRequest {
  userId: number;
  challengeId: number;
  dayNumber: number;
  description: string;
  mediaUrls: string[];
  isPrivate?: boolean;
  timezone?: string;
}

export interface SubmissionResponse {
  success: boolean;
  message: string;
  submissionId?: number;
  userId?: number;
  challengeId?: number;
  dayNumber?: number;
  description?: string;
  mediaUrls?: string[];
  isPrivate?: boolean;
  submissionTime?: string;
  gloriesCount?: number;
  commentsCount?: number;
  version?: number;
}

export interface DeleteSubmissionResponse {
  success: boolean;
  message: string;
  submissionId: number;
}

export interface SubmissionsResponse {
  submissions: Submission[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export type GlobalSubmissionSort = 'newest' | 'oldest' | 'glories';

// ===================
// Feed Types
// ===================
export interface FeedItem {
  submissionId: number;
  userId: number;
  username: string;
  userProfilePicUrl?: string;
  premiumUser?: number;
  challengeId: number;
  challengeTitle: string;
  dayNumber: number;
  description: string;
  mediaUrls?: string[];
  gloriesCount: number;
  commentsCount: number;
  createdAt: string;
  isGloriedByCurrentUser?: boolean;
  isUngloriedByCurrentUser?: boolean;
}

export interface FeedResponse {
  items: FeedItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
  feedType: string;
}

export enum FeedType {
  CONNECTIONS = 'CONNECTIONS',
  FOLLOWING = 'FOLLOWING',
  TRENDING = 'TRENDING',
  EXPLORE = 'EXPLORE'
}

export interface GetFeedRequest {
  userId?: number;
  page?: number;
  pageSize?: number;
  feedType?: FeedType;
}

// Legacy FeedPost for backward compatibility
export interface FeedPost {
  id: string;
  type: FeedPostType;
  user: User;
  challenge?: Challenge;
  submission?: Submission;
  content?: string;
  media?: {
    images: string[];
    videos: string[];
  };
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum FeedPostType {
  CHALLENGE_CREATED = 'challenge_created',
  CHALLENGE_COMPLETED = 'challenge_completed',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  USER_POST = 'user_post'
}

export interface Comment {
  id: number;
  commentId?: number; // API returns commentId; use id ?? commentId
  submissionId: number;
  userId: number;
  username?: string;
  profilePicUrl?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  active?: boolean;
}

export interface SpringPage<T> {
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  size: number;
  content: T[];
  number: number;
  empty: boolean;
}

export type PageComment = SpringPage<Comment>;

export interface CreateCommentRequest {
  submissionId: number;
  userId: number;
  content: string;
}

// ===================
// Follow Types
// ===================
export interface FollowActionRequest {
  followerId: number;
  followingId: number;
  follow: boolean;
}

export interface FollowActionResponse {
  followerId: number;
  followingId: number;
  isFollowing: boolean;
  message: string;
}

export interface FollowRelationshipResponse {
  viewerUserId: number;
  targetUserId: number;
  isFollowing: boolean;
  isFollowedBy: boolean;
}

// ===================
// Activation Types
// ===================
export interface ToggleActivateUserRequest {
  userId: number;
}

export interface ToggleUserActivationResponse {
  userId: number;
  active: boolean;
  message: string;
}

// ===================
// Glory Types
// ===================
export interface Glory {
  id: number;
  submissionId: number;
  userId: number;
  createdAt: string;
  active?: boolean;
  ungloried?: boolean;
}

export interface GloryUser extends Glory {
  username?: string;
  profilePicUrl?: string | null;
  bio?: string | null;
}

export type PageGloryUser = SpringPage<GloryUser>;

export interface GloryCheckResponse {
  submissionId: number;
  userId: number;
  hasGivenGlory: boolean;
  hasUngloried?: boolean;
}

export interface FollowersFollowingResponse {
  userId: number;
  users: User[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  type: 'followers' | 'following';
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface UserSearchResponse {
  query: string;
  users: User[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
}

export interface UserCountResponse {
  totalUsers: number;
}

// ===================
// Leaderboard Types
// ===================
export interface LeaderboardEntry {
  userId: number;
  username: string;
  displayName?: string;
  profilePictureUrl?: string;
  premiumUser?: number;
  rank: number;
  score: number;
  submissionCount?: number;
  gloriesCount?: number;
  currentStreak?: number;
}

export interface UserRankInfo {
  userId: number;
  rank: number;
  score: number;
  totalParticipants: number;
  percentile?: number;
}

export interface LeaderboardResponse {
  challengeId?: number;
  challengeTitle?: string;
  leaderboardType?: string;
  entries: LeaderboardEntry[];
  totalParticipants?: number;
  currentUserRank?: UserRankInfo;
  lastUpdated?: number;
  success?: boolean;
  message?: string;
}

export interface GetLeaderboardRequest {
  challengeId?: number;
  limit?: number;
  userId?: number;
  type?: LeaderboardType;
}

export enum LeaderboardType {
  SUBMISSIONS = 'SUBMISSIONS',
  GLORIES = 'GLORIES',
  STREAK = 'STREAK',
  OVERALL = 'OVERALL'
}

export enum LeaderboardPeriod {
  ALL_TIME = 'all_time',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

// Legacy Leaderboard type for backward compatibility
export interface Leaderboard {
  type: LeaderboardType;
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  userRank?: number;
}

// ===================
// Media/Upload Types
// ===================
export enum MediaType {
  PROFILE_PHOTO = 'PROFILE_PHOTO',
  SUBMISSION_PHOTO = 'SUBMISSION_PHOTO',
  CHALLENGE_PHOTO = 'CHALLENGE_PHOTO',
  SUPPORT_SCREENSHOT = 'SUPPORT_SCREENSHOT',
  SUBMISSION_VIDEO = 'SUBMISSION_VIDEO',
  CHALLENGE_VIDEO = 'CHALLENGE_VIDEO'
}

export enum ContentType {
  IMAGE_JPEG = 'IMAGE_JPEG',
  IMAGE_PNG = 'IMAGE_PNG',
  IMAGE_GIF = 'IMAGE_GIF',
  VIDEO_MP4 = 'VIDEO_MP4'
}

export interface MediaFileInfo {
  fileName: string;
  mediaType: MediaType;
  contentType: ContentType;
  fileSizeBytes: number;
}

export interface GeneratePresignedUrlsRequest {
  userId: number;
  mediaFiles: MediaFileInfo[];
}

export interface PresignedUrlInfo {
  fileName: string;
  fileType: string;
  contentType: string;
  presignedUrl: string;
  fileKey: string;
  expiresIn: number;
}

// ===================
// Support Types
// ===================
export enum SupportIssueType {
  QUESTION = 'QUESTION',
  BUG = 'BUG',
  ACCOUNT = 'ACCOUNT',
  CHALLENGE = 'CHALLENGE',
  MEDIA_UPLOAD = 'MEDIA_UPLOAD',
  OTHER = 'OTHER'
}

export interface CreateSupportTicketRequest {
  issueType: SupportIssueType;
  subject: string;
  message: string;
  appVersion?: string;
  platform?: string;
  deviceInfo?: string;
  screenshotKeys: string[];
}

export interface SupportTicketResponse {
  success: boolean;
  message: string;
}

export enum FeatureRequestCategory {
  CHALLENGES = 'CHALLENGES',
  COMMUNITY = 'COMMUNITY',
  PROGRESS_AND_STATS = 'PROGRESS_AND_STATS',
  APP_EXPERIENCE = 'APP_EXPERIENCE',
  OTHER = 'OTHER'
}

export interface CreateFeatureRequestRequest {
  category: FeatureRequestCategory;
  message: string;
  appVersion?: string;
  platform?: string;
  deviceInfo?: string;
}

export interface FeatureRequestResponse {
  id: number;
  status: 'NEW' | 'REVIEWING' | 'PLANNED' | 'DECLINED' | 'COMPLETED';
  createdAt: string;
  message: string;
}

export interface PresignedUrlsResponse {
  success: boolean;
  message: string;
  userId?: number;
  presignedUrls?: PresignedUrlInfo[];
}

// ===================
// Search Types
// ===================
export interface SearchFilters {
  category?: string;
  hashtag?: string;
  minDays?: number;
  maxDays?: number;
  isPrivate?: boolean;
  active?: boolean;
  sortBy?: 'newest' | 'oldest' | 'popularity' | 'participants';
}

export interface SearchResults {
  challenges: Challenge[];
  users: User[];
}

// ===================
// Invite Types
// ===================
export interface CreateInviteLinkRequest {
  challengeId: number;
  userId: number;
  recipientUserId?: number;
  maxUses?: number;
  expiresInHours?: number;
}

export interface InviteChallengeUsersRequest {
  challengeId: number;
  invitedUserIds: number[];
}

export interface InviteLinkResponse {
  inviteId?: number;
  inviteCode?: string;
  inviteUrl?: string;
  challengeId?: number;
  challengeTitle?: string;
  recipientUserId?: number;
  expiresAt?: string;
  maxUses?: number;
  useCount?: number;
  active?: boolean;
  createdAt?: string;
  inviterName?: string;
  inviterUsername?: string;
  challengeDescription?: string;
  challengeRules?: string;
  challengeBenefits?: string;
  challengeCategories?: string;
  challengeMode?: ChallengeMode | string;
  proofMode?: ChallengeProofMode | string;
  challengeStartDate?: string;
  challengeDurationDays?: number;
  participantCount?: number;
  acceptedCount?: number;
  pendingCount?: number | null;
  remainingUses?: number | null;
  privateChallenge?: boolean;
}

export interface RedeemInviteRequest {
  inviteCode: string;
  userId: number;
}

export interface RedeemInviteResponse {
  challengeId: number;
  challengeTitle?: string;
  userId: number;
  message: string;
  success: boolean;
}

export interface ChallengeInvitesResponse {
  challengeId: number;
  invites: InviteLinkResponse[];
  totalCount: number;
}

// ===================
// Notification Types
// ===================
export interface NotificationItem {
  id: number;
  userId: number;
  type: string;
  message: string;
  actionObject?: string;
  sentAt: string;
  sentAtEpochMs?: number;
  readAt?: string | null;
  read: boolean;
  createdAt?: string;
  data?: Record<string, any>;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
  serverTimeEpochMs?: number;
}

export interface ClearActivityNotificationsResponse {
  deleted: number;
  unreadCount: number;
}

export interface UnreadNotificationsResponse {
  unreadCount: number;
}

export interface MarkNotificationsReadResponse {
  updated: number;
}

export interface ChallengeInviteDetailsResponse {
  notificationId: number;
  challengeId: number;
  challengeTitle: string;
  challengeDescription?: string;
  challengeRules?: string;
  challengeBenefits?: string;
  challengeCategories?: string;
  challengeMode?: ChallengeMode | string;
  proofMode?: ChallengeProofMode | string;
  challengeStartDate?: string;
  challengeDurationDays?: number;
  privateChallenge: boolean;
  inviterUserId?: number;
  inviterName?: string;
  inviterUsername?: string;
  creatorUserId?: number;
  creatorName?: string;
  creatorUsername?: string;
}

export interface RegisterPushTokenRequest {
  expoPushToken: string;
  platform: string;
  timezone: string;
}

export interface NotificationActionObject {
  notificationId?: number;
  actorUserId?: number;
  actorUsername?: string;
  actorProfilePicUrl?: string;
  targetUserId?: number;
  targetUsername?: string;
  targetProfilePicUrl?: string;
  submissionId?: number;
  challengeId?: number;
  challengeTitle?: string;
  removalReason?: string;
  dayNumber?: number;
  mediaUrl?: string;
  commentId?: number;
  rank?: number;
  totalParticipants?: number;
  totalDays?: number;
  completedDays?: number;
  remainingRequiredCheckIns?: number;
  remainingAvailableCheckIns?: number;
  submittedToday?: boolean;
  milestoneKind?: string;
}
