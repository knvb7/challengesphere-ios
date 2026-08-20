export function parseChallengeCategories(value?: string | null): string[] {
  const categories = (value || '')
    .split(',')
    .map((category) => category.trim().replace(/^#/, ''))
    .filter(Boolean);

  const uniqueCategories = Array.from(new Set(categories));
  return uniqueCategories.length > 0 ? uniqueCategories : ['General'];
}
