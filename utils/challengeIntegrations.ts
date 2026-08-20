import { IntegrationProvider } from '../types/integrations';

interface ChallengeIntegrationCandidate {
  integrationProvider?: string | null;
  verificationProvider?: string | null;
  appIntegrationProvider?: string | null;
  provider?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  categories?: string | null;
  hashtags?: string | null;
}

const normalizeProviderValue = (value?: string | null) =>
  (value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');

const explicitProviderFrom = (value?: string | null): IntegrationProvider | null => {
  const normalized = normalizeProviderValue(value);
  if (normalized === 'CODEFORCES') return 'CODEFORCES';
  if (normalized === 'LEETCODE') return 'LEETCODE';
  return null;
};

export const resolveChallengeIntegrationProvider = (
  challenge: ChallengeIntegrationCandidate,
): IntegrationProvider | null => {
  const explicitProvider = [
    challenge.integrationProvider,
    challenge.verificationProvider,
    challenge.appIntegrationProvider,
    challenge.provider,
  ]
    .map(explicitProviderFrom)
    .find((provider): provider is IntegrationProvider => provider !== null);

  if (explicitProvider) return explicitProvider;

  const searchableText = [
    challenge.title,
    challenge.description,
    challenge.category,
    challenge.categories,
    challenge.hashtags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\bcode\s*forces\b|\bcodeforces\b/.test(searchableText)) {
    return 'CODEFORCES';
  }

  if (/\bleet\s*code\b|\bleetcode\b/.test(searchableText)) {
    return 'LEETCODE';
  }

  return null;
};
