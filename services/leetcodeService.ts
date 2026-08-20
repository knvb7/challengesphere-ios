import {
  LeetCodeProfile,
  LeetCodeProfileSnapshot,
  LeetCodeRawAcceptedSubmission,
  LeetCodeSubmission,
  LeetCodeSubmitStat,
} from '../types/integrations';
import { getApiErrorMessage, getApiErrorPresentation } from '../utils/apiError';

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql/';
const LEETCODE_SITE_BASE_URL = 'https://leetcode.com';
const RECENT_ACCEPTED_SUBMISSIONS_LIMIT = 20;

interface LeetCodeGraphQlResponse<T> {
  data?: T;
  errors?: { message?: string }[];
}

interface LeetCodeProfileQueryData {
  matchedUser?: {
    username: string;
    profile?: {
      realName?: string;
      userAvatar?: string;
      ranking?: number;
      reputation?: number;
    };
    submitStats?: {
      acSubmissionNum?: LeetCodeSubmitStat[];
    };
  } | null;
  recentAcSubmissionList?: LeetCodeRawAcceptedSubmission[];
}

const USER_PROFILE_QUERY = `
query challengeSphereLeetCodeProfile($username: String!, $limit: Int!) {
  matchedUser(username: $username) {
    username
    profile {
      realName
      userAvatar
      ranking
      reputation
    }
    submitStats {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
    }
  }
  recentAcSubmissionList(username: $username, limit: $limit) {
    id
    title
    titleSlug
    timestamp
  }
}
`;

export function normalizeLeetCodeUsername(username: string): string {
  return username.trim().replace(/^@+/, '');
}

export function buildLeetCodeProfileUrl(username: string): string {
  return `${LEETCODE_SITE_BASE_URL}/u/${encodeURIComponent(normalizeLeetCodeUsername(username))}/`;
}

export function buildLeetCodeProblemUrl(titleSlug: string): string {
  return `${LEETCODE_SITE_BASE_URL}/problems/${titleSlug}/`;
}

export function mapLeetCodeAcceptedSubmission(submission: LeetCodeRawAcceptedSubmission): LeetCodeSubmission {
  return {
    id: submission.id,
    title: submission.title,
    titleSlug: submission.titleSlug,
    accepted: true,
    submittedAt: new Date(Number(submission.timestamp) * 1000).toISOString(),
    problemUrl: buildLeetCodeProblemUrl(submission.titleSlug),
  };
}

const solvedCountFor = (stats: LeetCodeSubmitStat[] | undefined, difficulty: string) =>
  stats?.find((stat) => stat.difficulty.toLowerCase() === difficulty.toLowerCase())?.count || 0;

export function mapLeetCodeProfileSnapshot(
  username: string,
  data: LeetCodeProfileQueryData,
): LeetCodeProfileSnapshot {
  const matchedUser = data.matchedUser;
  if (!matchedUser?.username) {
    throw new Error('No LeetCode profile was found for that username.');
  }

  const submitStats = matchedUser.submitStats?.acSubmissionNum || [];
  const profile: LeetCodeProfile = {
    username: matchedUser.username,
    realName: matchedUser.profile?.realName,
    avatar: matchedUser.profile?.userAvatar,
    ranking: matchedUser.profile?.ranking,
    reputation: matchedUser.profile?.reputation,
  };
  const submissions = (data.recentAcSubmissionList || []).map(mapLeetCodeAcceptedSubmission);

  return {
    username: profile.username || normalizeLeetCodeUsername(username),
    profile,
    submissions,
    totalSolved: solvedCountFor(submitStats, 'All'),
    easySolved: solvedCountFor(submitStats, 'Easy'),
    mediumSolved: solvedCountFor(submitStats, 'Medium'),
    hardSolved: solvedCountFor(submitStats, 'Hard'),
    acceptedCount: submissions.length,
    syncedAt: new Date().toISOString(),
  };
}

async function requestLeetCode<T>(query: string, variables: Record<string, string | number>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: LEETCODE_SITE_BASE_URL,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Could not reach LeetCode. Check your connection and try again.'),
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(getApiErrorPresentation({
        response: { status: response.status, headers: response.headers },
      }).message);
    }
    if (response.status >= 500) {
      throw new Error('LeetCode is temporarily unavailable. Please try again in a few minutes.');
    }
    throw new Error('LeetCode could not complete the request. Check the username and try again.');
  }

  let payload: LeetCodeGraphQlResponse<T>;
  try {
    payload = await response.json() as LeetCodeGraphQlResponse<T>;
  } catch {
    throw new Error('LeetCode sent an unexpected response. Please try again shortly.');
  }

  if (payload.errors?.length) {
    const errorText = payload.errors
      .map((error) => error?.message || '')
      .filter(Boolean)
      .join(' ');
    if (/limit exceeded|too many requests|rate limit|throttl/i.test(errorText)) {
      throw new Error(getApiErrorPresentation({
        response: {
          status: 429,
          headers: response.headers,
          data: { message: errorText },
        },
      }).message);
    }
    throw new Error('LeetCode could not verify that username. Please try again.');
  }
  if (!payload.data) {
    throw new Error('LeetCode sent an unexpected response. Please try again shortly.');
  }

  return payload.data;
}

export async function syncLeetCodeProfile(username: string): Promise<LeetCodeProfileSnapshot> {
  const normalizedUsername = normalizeLeetCodeUsername(username);
  if (!normalizedUsername) {
    throw new Error('Enter a LeetCode username before syncing.');
  }

  const data = await requestLeetCode<LeetCodeProfileQueryData>(USER_PROFILE_QUERY, {
    username: normalizedUsername,
    limit: RECENT_ACCEPTED_SUBMISSIONS_LIMIT,
  });

  return mapLeetCodeProfileSnapshot(normalizedUsername, data);
}
