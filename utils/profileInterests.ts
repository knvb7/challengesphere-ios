import { parseChallengeCategories } from './challengeCategories';

export type ProfileInterest = {
  label: string;
  count: number;
};

type ChallengeWithCategories = {
  categories?: string | null;
};

export const buildTopProfileInterests = (
  challenges: ChallengeWithCategories[],
  limit = 3,
): ProfileInterest[] => {
  const counts = new Map<string, ProfileInterest>();

  challenges.forEach((challenge) => {
    const categoriesForChallenge = new Set<string>();

    parseChallengeCategories(challenge.categories).forEach((category) => {
      const normalizedCategory = category.toLocaleLowerCase();
      if (categoriesForChallenge.has(normalizedCategory)) return;

      categoriesForChallenge.add(normalizedCategory);
      const current = counts.get(normalizedCategory);
      counts.set(normalizedCategory, {
        label: current?.label || category,
        count: (current?.count || 0) + 1,
      });
    });
  });

  return Array.from(counts.values())
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, Math.max(0, limit));
};
