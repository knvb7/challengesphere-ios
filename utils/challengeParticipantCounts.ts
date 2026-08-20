const normalizeCount = (count: number | null | undefined): number =>
  typeof count === 'number' && Number.isFinite(count) ? Math.max(0, count) : 0;

// A challenge can legitimately have zero active participants after its creator exits.
export const getMinimumVisibleChallengerCount = (
  count: number | null | undefined,
): number => normalizeCount(count);

export const includeCreatorInChallengerCount = (
  participantCountExcludingCreator: number | null | undefined,
): number => getMinimumVisibleChallengerCount(normalizeCount(participantCountExcludingCreator) + 1);
