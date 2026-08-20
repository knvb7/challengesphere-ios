import { getApiErrorCode, getApiErrorMessage } from './apiError';
import { AppAlert as Alert } from './appAlert';
import type { SubscriptionStatus } from '../services/subscriptionService';

const FREE_LIMIT_PREFIX = 'free users can be part of up to';
const FREE_PLAN_LIMIT_PREFIX = 'free allows up to';
const PREMIUM_REQUIRED_CODE = 'PREMIUM_REQUIRED_FOR_CHALLENGE_LIMIT';
const PREMIUM_ACTIVE_CHALLENGE_LIMIT = 20;
const VISIBILITY_PATTERN = /\b(public|private)\b/i;
const NUMBER_LIMIT_PATTERN = /\b(?:up\s+to|limit(?:\s+of)?|maximum(?:\s+of)?|max(?:\s+of)?)\s+(\d+)\b/i;

export type ChallengeLimitAction = 'join' | 'create';
export type ChallengeVisibility = 'public' | 'private';

type ChallengeLimitContext = {
  action?: ChallengeLimitAction;
  visibility?: ChallengeVisibility;
  limit?: number;
  activeCount?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asMessage = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed || null;
};

const getNested = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] : undefined;

const getRawErrorText = (error: unknown): string => {
  if (!isRecord(error)) return asMessage(error) ?? '';

  const response = getNested(error, 'response');
  const data = getNested(response, 'data');
  const nestedError = getNested(data, 'error');
  const candidates = [
    typeof data === 'string' ? data : null,
    getNested(data, 'userMessage'),
    getNested(data, 'responseMessage'),
    getNested(data, 'errorMessage'),
    getNested(data, 'message'),
    getNested(data, 'detail'),
    typeof nestedError === 'string' ? nestedError : null,
    getNested(nestedError, 'userMessage'),
    getNested(nestedError, 'responseMessage'),
    getNested(nestedError, 'errorMessage'),
    getNested(nestedError, 'message'),
    getNested(error, 'userMessage'),
    getNested(error, 'responseMessage'),
    getNested(error, 'errorMessage'),
    getNested(error, 'message'),
  ];

  return candidates
    .map(asMessage)
    .filter((message): message is string => message !== null)
    .join(' ');
};

const getNestedErrorCode = (error: unknown): string => {
  if (!isRecord(error)) return '';
  const data = getNested(getNested(error, 'response'), 'data');
  const nestedError = getNested(data, 'error');
  const candidates = [
    getApiErrorCode(error),
    getNested(data, 'code'),
    getNested(nestedError, 'code'),
    getNested(error, 'apiCode'),
  ];

  return candidates
    .map(asMessage)
    .filter((code): code is string => code !== null)
    .join(' ')
    .toUpperCase();
};

const isChallengeLimitError = (error: unknown, message: string): boolean => {
  const normalizedMessage = message.trim().toLowerCase();
  const rawErrorText = getRawErrorText(error);
  const errorCode = getNestedErrorCode(error);
  const hasChallengeLimitCode = errorCode === PREMIUM_REQUIRED_CODE
    || (errorCode.includes('CHALLENGE') && errorCode.includes('LIMIT'));
  const hasChallengeLimitText = /\bchallenges?\b/i.test(rawErrorText)
    && /\b(?:limit|maximum|max|up\s+to|too\s+many)\b/i.test(rawErrorText)
    && /\b(?:free|active|public|private)\b/i.test(rawErrorText);

  return hasChallengeLimitCode
    || normalizedMessage.startsWith(FREE_LIMIT_PREFIX)
    || normalizedMessage.startsWith(FREE_PLAN_LIMIT_PREFIX)
    || hasChallengeLimitText;
};

const buildLimitUpgradeCopy = (
  action: ChallengeLimitAction,
  visibility?: ChallengeVisibility,
  limit?: number,
  activeCount?: number,
): { title: string; message: string } => {
  const actionCopy = action === 'create' ? 'create another challenge' : 'join this challenge';

  if (visibility && limit) {
    const usageCopy = activeCount && activeCount > 0
      ? `You currently have ${activeCount} active ${visibility} challenges. The Free plan allows up to ${limit}.`
      : `The Free plan allows up to ${limit} active ${visibility} challenges, and you've reached that limit.`;
    return {
      title: `${visibility === 'private' ? 'Private' : 'Public'} challenge limit reached`,
      message: `${usageCopy} To ${actionCopy}, complete or leave one first, or upgrade to Premium for up to ${PREMIUM_ACTIVE_CHALLENGE_LIMIT} active ${visibility} challenges.`,
    };
  }

  return {
    title: 'Free challenge limit reached',
    message: `You've reached the Free plan limit for active challenges. To ${actionCopy}, complete or leave an active challenge first, or upgrade to Premium for higher limits.`,
  };
};

const presentLimitUpgrade = (
  action: ChallengeLimitAction,
  visibility: ChallengeVisibility | undefined,
  limit: number | undefined,
  activeCount: number | undefined,
  onUpgrade: () => void,
) => {
  const copy = buildLimitUpgradeCopy(action, visibility, limit, activeCount);
  Alert.alert(
    copy.title,
    copy.message,
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'View Premium', onPress: onUpgrade },
    ],
  );
};

export function showChallengeLimitUpgradeForStatus(
  status: SubscriptionStatus | null | undefined,
  visibility: ChallengeVisibility,
  action: ChallengeLimitAction,
  onUpgrade: () => void,
): boolean {
  if (!status || status.premium) return false;

  const activeCount = visibility === 'private'
    ? status.activePrivateChallenges
    : status.activePublicChallenges;
  const limit = visibility === 'private'
    ? status.privateChallengeLimit
    : status.publicChallengeLimit;

  if (!Number.isFinite(limit) || limit <= 0 || activeCount < limit) return false;

  presentLimitUpgrade(action, visibility, limit, activeCount, onUpgrade);
  return true;
}

export function showChallengeLimitUpgrade(
  error: unknown,
  fallbackMessage: string,
  onUpgrade: () => void,
  context: ChallengeLimitContext = {},
): boolean {
  const message = getApiErrorMessage(error, fallbackMessage);
  const rawErrorText = getRawErrorText(error);
  if (!isChallengeLimitError(error, message)) return false;

  const parsedVisibility = rawErrorText.match(VISIBILITY_PATTERN)?.[1]?.toLowerCase();
  const parsedLimit = Number(rawErrorText.match(NUMBER_LIMIT_PATTERN)?.[1]);
  presentLimitUpgrade(
    context.action ?? 'join',
    context.visibility
      ?? (parsedVisibility === 'public' || parsedVisibility === 'private' ? parsedVisibility : undefined),
    context.limit ?? (Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined),
    context.activeCount,
    onUpgrade,
  );
  return true;
}
