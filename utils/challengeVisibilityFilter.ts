export type ChallengeVisibilityFilter = 'all' | 'public' | 'private';

export const CHALLENGE_VISIBILITY_FILTER_OPTIONS: Array<{
  value: ChallengeVisibilityFilter;
  label: string;
  icon: 'filter' | 'globe-outline' | 'lock-closed-outline';
}> = [
  { value: 'all', label: 'All', icon: 'filter' },
  { value: 'public', label: 'Public', icon: 'globe-outline' },
  { value: 'private', label: 'Private', icon: 'lock-closed-outline' },
];

export const getChallengeVisibilityFilterLabel = (
  value: ChallengeVisibilityFilter,
): string =>
  CHALLENGE_VISIBILITY_FILTER_OPTIONS.find((option) => option.value === value)
    ?.label ?? 'All';

export const filterChallengesByVisibility = <T extends { isPrivate?: boolean }>(
  challenges: T[],
  filter: ChallengeVisibilityFilter,
): T[] => {
  if (filter === 'all') return challenges;

  return challenges.filter((challenge) =>
    filter === 'private' ? Boolean(challenge.isPrivate) : !challenge.isPrivate,
  );
};
