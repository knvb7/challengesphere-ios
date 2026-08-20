import type { Submission, SubmissionPreviewItem, UserProfileResponse } from '../types/api';
import { parseSubmissionMediaUrls, type SubmissionMediaValue } from './submissionMedia';

export type SubmissionDetailRouteParams = Record<string, string | string[] | undefined>;

export interface SubmissionDetailData {
  id: string;
  submissionId: number;
  ownerUserId: number;
  challengeId: number;
  dayNumber: number;
  submissionTime: string;
  userName: string;
  userPhoto: string;
  mediaUrls: string[];
  photoUrl: string;
  description: string;
  challengeTitle: string;
  challengeName: string;
  participantCount: number;
  genuineCount: number;
  ingenuineCount: number;
  commentCount: number;
}

interface BuildSubmissionDetailDataOptions {
  submission?: Submission;
  ownerUser?: Pick<UserProfileResponse, 'username' | 'profilePicUrl'> | null;
  challengeTitle?: string;
}

interface BuildSubmissionDetailRouteParamsOptions {
  submission: Submission;
  userName?: string | null;
  userPhoto?: string | null;
  challengeTitle?: string | null;
  participantCount?: number;
}

interface BuildSubmissionPreviewDetailRouteParamsOptions {
  submission: SubmissionPreviewItem;
  challengeId: number;
  challengeTitle?: string | null;
  userName?: string | null;
}

export function getRouteStringParam(params: SubmissionDetailRouteParams, key: string): string {
  const value = params[key];
  const firstValue = Array.isArray(value) ? value[0] : value;
  return typeof firstValue === 'string' ? firstValue.trim() : '';
}

export function getRouteNumberParam(params: SubmissionDetailRouteParams, key: string): number {
  const value = Number(getRouteStringParam(params, key));
  return Number.isFinite(value) ? value : 0;
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function formatUsername(username?: string | null): string {
  const trimmed = username?.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

export function buildSubmissionDetailRouteParams({
  submission,
  userName,
  userPhoto,
  challengeTitle,
  participantCount = 0,
}: BuildSubmissionDetailRouteParamsOptions): Record<string, string> {
  const submissionId = submission.id || submission.submissionId || 0;
  const mediaUrls = parseSubmissionMediaUrls(submission.mediaUrls as SubmissionMediaValue);
  const resolvedChallengeTitle = challengeTitle?.trim() || 'Challenge';

  return {
    id: String(submissionId),
    submissionId: String(submissionId),
    photoUrl: mediaUrls[0] || '',
    mediaUrls: JSON.stringify(mediaUrls),
    description: submission.description || '',
    challengeSummary: submission.description || '',
    challengeId: String(submission.challengeId),
    challengeTitle: resolvedChallengeTitle,
    challengeName: resolvedChallengeTitle,
    dayNumber: String(submission.dayNumber),
    submissionTime: submission.submissionTime || submission.createdAt || '',
    userId: String(submission.userId),
    userName: userName?.trim() || `User ${submission.userId}`,
    userPhoto: userPhoto?.trim() || '',
    participantCount: String(participantCount),
    genuineCount: String(submission.gloriesCount ?? 0),
    commentCount: String(submission.commentsCount ?? 0),
  };
}

export function buildSubmissionPreviewDetailRouteParams({
  submission,
  challengeId,
  challengeTitle,
  userName,
}: BuildSubmissionPreviewDetailRouteParamsOptions): Record<string, string> {
  const resolvedChallengeTitle = challengeTitle?.trim() || 'Challenge';
  return {
    id: String(submission.submissionId),
    submissionId: String(submission.submissionId),
    photoUrl: submission.mediaUrl,
    mediaUrls: JSON.stringify([submission.mediaUrl]),
    challengeId: String(challengeId),
    challengeTitle: resolvedChallengeTitle,
    challengeName: resolvedChallengeTitle,
    submissionTime: submission.submissionTime || '',
    userId: String(submission.userId),
    userName: userName?.trim() || `User ${submission.userId}`,
  };
}

function resolveMediaUrls(params: SubmissionDetailRouteParams, submission?: Submission): string[] {
  const submissionMediaUrls = parseSubmissionMediaUrls(submission?.mediaUrls as SubmissionMediaValue);
  if (submissionMediaUrls.length > 0) {
    return submissionMediaUrls;
  }

  const routeMediaUrls = parseSubmissionMediaUrls(getRouteStringParam(params, 'mediaUrls'));
  if (routeMediaUrls.length > 0) {
    return routeMediaUrls;
  }

  return parseSubmissionMediaUrls(getRouteStringParam(params, 'photoUrl'));
}

export function buildSubmissionDetailData(
  params: SubmissionDetailRouteParams,
  options: BuildSubmissionDetailDataOptions = {},
): SubmissionDetailData {
  const { submission, ownerUser, challengeTitle } = options;
  const routeSubmissionId = getRouteNumberParam(params, 'submissionId') || getRouteNumberParam(params, 'id');
  const submissionId = submission?.id || submission?.submissionId || routeSubmissionId;
  const ownerUserId = submission?.userId || getRouteNumberParam(params, 'userId');
  const challengeId = submission?.challengeId || getRouteNumberParam(params, 'challengeId');
  const mediaUrls = resolveMediaUrls(params, submission);
  const resolvedChallengeTitle = firstNonEmpty(
    challengeTitle,
    getRouteStringParam(params, 'challengeTitle'),
    getRouteStringParam(params, 'challengeName'),
    'Challenge Photo',
  );

  return {
    id: String(submissionId || getRouteStringParam(params, 'id')),
    submissionId,
    ownerUserId,
    challengeId,
    dayNumber: submission?.dayNumber || getRouteNumberParam(params, 'dayNumber'),
    submissionTime: firstNonEmpty(
      submission?.submissionTime,
      submission?.createdAt,
      getRouteStringParam(params, 'submissionTime'),
      getRouteStringParam(params, 'createdAt'),
    ),
    userName: firstNonEmpty(
      formatUsername(ownerUser?.username),
      getRouteStringParam(params, 'userName'),
      ownerUserId > 0 ? `User ${ownerUserId}` : 'User',
    ),
    userPhoto: firstNonEmpty(
      ownerUser?.profilePicUrl,
      getRouteStringParam(params, 'userPhoto'),
      getRouteStringParam(params, 'userProfilePicUrl'),
      getRouteStringParam(params, 'profilePicUrl'),
    ),
    mediaUrls,
    photoUrl: mediaUrls[0] || '',
    description: firstNonEmpty(
      submission?.description,
      getRouteStringParam(params, 'description'),
      getRouteStringParam(params, 'caption'),
      getRouteStringParam(params, 'challengeSummary'),
    ),
    challengeTitle: resolvedChallengeTitle,
    challengeName: firstNonEmpty(
      challengeTitle,
      getRouteStringParam(params, 'challengeName'),
      resolvedChallengeTitle,
      'Challenge',
    ),
    participantCount: getRouteNumberParam(params, 'participantCount'),
    genuineCount: submission?.gloriesCount ?? getRouteNumberParam(params, 'genuineCount'),
    ingenuineCount: getRouteNumberParam(params, 'ingenuineCount'),
    commentCount: submission?.commentsCount ?? getRouteNumberParam(params, 'commentCount'),
  };
}
