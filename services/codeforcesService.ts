import {
  CodeforcesProfile,
  CodeforcesProfileSnapshot,
  CodeforcesRawSubmission,
  CodeforcesSubmission,
} from '../types/integrations';
import { getApiErrorMessage, getApiErrorPresentation } from '../utils/apiError';

const CODEFORCES_API_BASE_URL = 'https://codeforces.com/api';
const CODEFORCES_SITE_BASE_URL = 'https://codeforces.com';
const RECENT_SUBMISSIONS_LIMIT = 20;

interface CodeforcesApiResponse<T> {
  status: 'OK' | 'FAILED';
  result?: T;
  comment?: string;
}

export function normalizeCodeforcesHandle(handle: string): string {
  return handle.trim().replace(/^@+/, '');
}

export function buildCodeforcesProfileUrl(handle: string): string {
  return `${CODEFORCES_SITE_BASE_URL}/profile/${encodeURIComponent(normalizeCodeforcesHandle(handle))}`;
}

export function isAcceptedCodeforcesVerdict(verdict?: string): boolean {
  return verdict === 'OK';
}

export function resolveCodeforcesAssetUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${CODEFORCES_SITE_BASE_URL}${url}`;
  return url;
}

export function buildCodeforcesProblemUrl(submission: CodeforcesRawSubmission): string | undefined {
  const contestId = submission.problem?.contestId ?? submission.contestId;
  const index = submission.problem?.index;
  if (!contestId || !index) return undefined;
  return `${CODEFORCES_SITE_BASE_URL}/contest/${contestId}/problem/${index}`;
}

export function mapCodeforcesSubmission(submission: CodeforcesRawSubmission): CodeforcesSubmission {
  const problemIndex = submission.problem?.index;
  const problemTitle = submission.problem?.name || 'Unknown problem';
  const problemName = problemIndex ? `${problemIndex}. ${problemTitle}` : problemTitle;
  const verdict = submission.verdict || 'TESTING';

  return {
    id: submission.id,
    contestId: submission.problem?.contestId ?? submission.contestId,
    problemIndex,
    problemName,
    problemRating: submission.problem?.rating,
    tags: submission.problem?.tags || [],
    verdict,
    accepted: isAcceptedCodeforcesVerdict(verdict),
    programmingLanguage: submission.programmingLanguage || 'Unknown language',
    submittedAt: new Date(submission.creationTimeSeconds * 1000).toISOString(),
    problemUrl: buildCodeforcesProblemUrl(submission),
  };
}

async function requestCodeforces<T>(method: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params).toString();
  let response: Response;

  try {
    response = await fetch(`${CODEFORCES_API_BASE_URL}/${method}?${query}`);
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Could not reach Codeforces. Check your connection and try again.'),
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(getApiErrorPresentation({
        response: { status: response.status, headers: response.headers },
      }).message);
    }
    if (response.status >= 500) {
      throw new Error('Codeforces is temporarily unavailable. Please try again in a few minutes.');
    }
    throw new Error('Codeforces could not complete the request. Check the handle and try again.');
  }

  let payload: CodeforcesApiResponse<T>;
  try {
    payload = await response.json() as CodeforcesApiResponse<T>;
  } catch {
    throw new Error('Codeforces sent an unexpected response. Please try again shortly.');
  }

  if (payload.status !== 'OK' || payload.result === undefined) {
    const comment = payload.comment || '';
    if (/not found/i.test(comment)) {
      throw new Error('No Codeforces profile was found for that handle.');
    }
    if (/limit exceeded|too many requests|rate limit|throttl/i.test(comment)) {
      throw new Error(getApiErrorPresentation({
        response: { status: 429, data: { message: comment } },
      }).message);
    }
    throw new Error('Codeforces could not verify that handle. Please try again.');
  }

  return payload.result;
}

export async function syncCodeforcesProfile(handle: string): Promise<CodeforcesProfileSnapshot> {
  const normalizedHandle = normalizeCodeforcesHandle(handle);
  if (!normalizedHandle) {
    throw new Error('Enter a Codeforces handle before syncing.');
  }

  const [profiles, rawSubmissions] = await Promise.all([
    requestCodeforces<CodeforcesProfile[]>('user.info', { handles: normalizedHandle }),
    requestCodeforces<CodeforcesRawSubmission[]>('user.status', {
      handle: normalizedHandle,
      from: '1',
      count: String(RECENT_SUBMISSIONS_LIMIT),
    }),
  ]);

  const profile = profiles[0];
  if (!profile?.handle) {
    throw new Error('No Codeforces profile was found for that handle.');
  }

  const normalizedProfile: CodeforcesProfile = {
    ...profile,
    avatar: resolveCodeforcesAssetUrl(profile.avatar),
    titlePhoto: resolveCodeforcesAssetUrl(profile.titlePhoto),
  };
  const submissions = rawSubmissions.map(mapCodeforcesSubmission);

  return {
    handle: normalizedProfile.handle,
    profile: normalizedProfile,
    submissions,
    acceptedCount: submissions.filter((submission) => submission.accepted).length,
    syncedAt: new Date().toISOString(),
  };
}
