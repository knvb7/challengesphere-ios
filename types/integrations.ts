export type IntegrationProvider = 'CODEFORCES' | 'STRAVA' | 'LEETCODE' | 'HEVY' | 'HEALTH_CONNECT';

export interface CodeforcesSubmissionProblem {
  contestId?: number;
  index?: string;
  name?: string;
  rating?: number;
  tags?: string[];
}

export interface CodeforcesRawSubmission {
  id: number;
  contestId?: number;
  creationTimeSeconds: number;
  programmingLanguage?: string;
  verdict?: string;
  problem?: CodeforcesSubmissionProblem;
}

export interface CodeforcesSubmission {
  id: number;
  contestId?: number;
  problemIndex?: string;
  problemName: string;
  problemRating?: number;
  tags: string[];
  verdict: string;
  accepted: boolean;
  programmingLanguage: string;
  submittedAt: string;
  problemUrl?: string;
}

export interface CodeforcesProfile {
  handle: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  titlePhoto?: string;
  rank?: string;
  rating?: number;
  maxRank?: string;
  maxRating?: number;
  contribution?: number;
  friendOfCount?: number;
  organization?: string;
  lastOnlineTimeSeconds?: number;
  registrationTimeSeconds?: number;
}

export interface CodeforcesProfileSnapshot {
  handle: string;
  profile: CodeforcesProfile;
  submissions: CodeforcesSubmission[];
  acceptedCount: number;
  syncedAt: string;
}

export interface CodeforcesConnection {
  provider: 'CODEFORCES';
  handle: string;
  connectedAt: string;
  updatedAt: string;
  handleLockedAt?: string;
  lastSyncedAt?: string;
}

export interface LeetCodeRawAcceptedSubmission {
  id: string;
  title: string;
  titleSlug: string;
  timestamp: string;
}

export interface LeetCodeSubmission {
  id: string;
  title: string;
  titleSlug: string;
  accepted: boolean;
  submittedAt: string;
  problemUrl: string;
}

export interface LeetCodeSubmitStat {
  difficulty: 'All' | 'Easy' | 'Medium' | 'Hard' | string;
  count: number;
  submissions: number;
}

export interface LeetCodeProfile {
  username: string;
  realName?: string;
  avatar?: string;
  ranking?: number;
  reputation?: number;
}

export interface LeetCodeProfileSnapshot {
  username: string;
  profile: LeetCodeProfile;
  submissions: LeetCodeSubmission[];
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  acceptedCount: number;
  syncedAt: string;
}

export interface LeetCodeConnection {
  provider: 'LEETCODE';
  username: string;
  connectedAt: string;
  updatedAt: string;
  usernameLockedAt?: string;
  lastSyncedAt?: string;
}

export interface StravaActivity {
  id: string;
  name: string;
  sportType: string;
  distanceKm: number;
  movingSeconds: number;
  startedAt: string;
  externalId?: string;
}

export interface StravaActivitySummary {
  activityCount: number;
  totalDistanceKm: number;
  totalMovingSeconds: number;
  syncedAt: string;
  activities: StravaActivity[];
}

export interface StravaConnection {
  provider: 'STRAVA';
  athleteId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  scopes?: string;
  connectedAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  snapshot?: StravaActivitySummary;
}

export interface HevyWorkout {
  id: string;
  title: string;
  startedAt?: string;
  durationSeconds: number;
  exerciseCount: number;
  setCount: number;
  volumeKg: number;
  exercisePreview?: string;
}

export interface HevyWorkoutSummary {
  workoutCount: number;
  exerciseCount: number;
  setCount: number;
  totalVolumeKg: number;
  totalDurationSeconds: number;
  syncedAt: string;
  workouts: HevyWorkout[];
}

export interface HevyConnection {
  provider: 'HEVY';
  userId?: string;
  username?: string;
  displayName?: string;
  connectedAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  snapshot?: HevyWorkoutSummary;
}
