import type { MappedChallenge } from '../components/common/ChallengeCard';

export type MyChallengeFilter = 'all' | 'created' | 'favorites' | 'past';

export interface PendingChallengeSummary {
  primary: MappedChallenge;
  remaining: MappedChallenge[];
  moreCount: number;
  moreLabel: string;
}

export interface DailyCompletionCandidate {
  isDueToday: boolean;
  statusReady: boolean;
  submittedToday: boolean;
}

export interface DailyCompletionSummary {
  completedCount: number;
}

export const dedupeChallenges = (
  challenges: MappedChallenge[],
): MappedChallenge[] => {
  const seen = new Set<string>();
  return challenges.filter((challenge) => {
    if (seen.has(challenge.id)) return false;
    seen.add(challenge.id);
    return true;
  });
};

export const excludeDeletedChallenges = (
  challenges: MappedChallenge[],
): MappedChallenge[] =>
  challenges.filter((challenge) => challenge.status !== 'deleted');

export const partitionChallenges = (challenges: MappedChallenge[]) => ({
  active: challenges.filter(
    (challenge) =>
      (challenge.status === 'active' || challenge.status === 'upcoming') &&
      challenge.participationActive === true,
  ),
  past: challenges.filter(
    (challenge) =>
      challenge.status !== 'deleted' &&
      (
        challenge.status === 'completed' ||
        challenge.participationActive === false
      ),
  ),
});

export const filterMyChallenges = (
  challenges: MappedChallenge[],
  filter: MyChallengeFilter,
  query: string,
): MappedChallenge[] => {
  const relationshipMatches = challenges.filter(
    (challenge) =>
      filter === 'all' ||
      filter === 'past' ||
      (filter === 'created' && challenge.isCreator) ||
      (filter === 'favorites' && challenge.isFavorite),
  );
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return relationshipMatches;

  return relationshipMatches.filter(
    (challenge) =>
      challenge.title.toLowerCase().includes(normalizedQuery) ||
      challenge.category.toLowerCase().includes(normalizedQuery),
  );
};

export const buildPendingSummary = (
  challenges: MappedChallenge[],
  canUpload: (challenge: MappedChallenge) => boolean,
): PendingChallengeSummary | null => {
  const pending = challenges.filter(canUpload);
  if (pending.length === 0) return null;

  const moreCount = pending.length - 1;
  return {
    primary: pending[0],
    remaining: pending.slice(1),
    moreCount,
    moreLabel: `+${moreCount} more`,
  };
};

export const summarizeDailyCompletion = (
  candidates: DailyCompletionCandidate[],
): DailyCompletionSummary | null => {
  if (candidates.length === 0 || candidates.some((candidate) => !candidate.statusReady)) {
    return null;
  }

  const dueToday = candidates.filter((candidate) => candidate.isDueToday);
  if (dueToday.length === 0 || dueToday.some((candidate) => !candidate.submittedToday)) {
    return null;
  }

  return { completedCount: dueToday.length };
};
