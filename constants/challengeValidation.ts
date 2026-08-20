export const CHALLENGE_VALIDATION = {
  title: { min: 5, max: 80 },
  description: { min: 10, max: 500 },
  rules: { min: 10, max: 1000 },
  rewards: { max: 1000 },
  category: { min: 2, max: 30, maxCount: 5 },
} as const;

export const validateChallengeCategory = (value: string): string | null => {
  const category = value.trim();
  if (category.length < CHALLENGE_VALIDATION.category.min) return 'Category must be at least 2 characters';
  if (category.length > CHALLENGE_VALIDATION.category.max) return 'Category must be at most 30 characters';
  if (category.includes(',')) return 'Category cannot contain commas';
  return null;
};
