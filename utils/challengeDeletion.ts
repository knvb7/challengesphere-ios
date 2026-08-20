export const MAX_CHALLENGE_DELETE_MEMBERS = 3;
export const MAX_CHALLENGE_DELETE_AGE_DAYS = 3;

const MAX_CHALLENGE_DELETE_AGE_MS =
  MAX_CHALLENGE_DELETE_AGE_DAYS * 24 * 60 * 60 * 1000;

type ChallengeDeletionInput = {
  isCreator: boolean;
  memberCount?: number | null;
  createdAt?: string | null;
  now?: number;
};

export const canDeleteChallenge = ({
  isCreator,
  memberCount,
  createdAt,
  now = Date.now(),
}: ChallengeDeletionInput): boolean => {
  if (!isCreator || !Number.isFinite(memberCount) || !createdAt) return false;

  const createdAtMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdAtMs)) return false;

  return Number(memberCount) <= MAX_CHALLENGE_DELETE_MEMBERS
    && now - createdAtMs <= MAX_CHALLENGE_DELETE_AGE_MS;
};
