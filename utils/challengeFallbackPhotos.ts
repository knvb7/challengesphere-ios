import type { ImageSourcePropType } from 'react-native';

export type ChallengeFallbackPhotoKey =
  | 'coding'
  | 'fitness'
  | 'health'
  | 'learning'
  | 'creativity'
  | 'productivity'
  | 'lifestyle';

type ChallengeFallbackInput = {
  id?: string | number;
  challengeId?: string | number;
  title?: string;
  description?: string;
  category?: string;
  hashtags?: string;
  tags?: string[];
};

export const challengeFallbackPhotoAssetPaths: Record<ChallengeFallbackPhotoKey, string[]> = {
  coding: [
    'assets/images/challenge-fallbacks/coding-1.png',
    'assets/images/challenge-fallbacks/coding-2.png',
    'assets/images/challenge-fallbacks/coding-3.png',
    'assets/images/challenge-fallbacks/coding-4.png',
  ],
  fitness: [
    'assets/images/challenge-fallbacks/fitness-1.png',
    'assets/images/challenge-fallbacks/fitness-2.png',
    'assets/images/challenge-fallbacks/fitness-3.png',
    'assets/images/challenge-fallbacks/fitness-4.png',
  ],
  health: [
    'assets/images/challenge-fallbacks/health-1.png',
    'assets/images/challenge-fallbacks/health-2.png',
    'assets/images/challenge-fallbacks/health-3.png',
    'assets/images/challenge-fallbacks/health-4.png',
  ],
  learning: [
    'assets/images/challenge-fallbacks/learning-1.png',
    'assets/images/challenge-fallbacks/learning-2.png',
    'assets/images/challenge-fallbacks/learning-3.png',
    'assets/images/challenge-fallbacks/learning-4.png',
  ],
  creativity: [
    'assets/images/challenge-fallbacks/creativity-1.png',
    'assets/images/challenge-fallbacks/creativity-2.png',
    'assets/images/challenge-fallbacks/creativity-3.png',
    'assets/images/challenge-fallbacks/creativity-4.png',
  ],
  productivity: [
    'assets/images/challenge-fallbacks/productivity-1.png',
    'assets/images/challenge-fallbacks/productivity-2.png',
    'assets/images/challenge-fallbacks/productivity-3.png',
    'assets/images/challenge-fallbacks/productivity-4.png',
  ],
  lifestyle: [
    'assets/images/challenge-fallbacks/lifestyle-1.png',
    'assets/images/challenge-fallbacks/lifestyle-2.png',
    'assets/images/challenge-fallbacks/lifestyle-3.png',
    'assets/images/challenge-fallbacks/lifestyle-4.png',
  ],
};

const fallbackRules: Array<{ key: ChallengeFallbackPhotoKey; pattern: RegExp }> = [
  { key: 'coding', pattern: /\b(code|coding|programming|leetcode|codeforces|dsa|algorithm|software|developer|app)\b/i },
  { key: 'fitness', pattern: /\b(fitness|run|running|walk|walking|workout|movement|steps|gym|sport|training|exercise|yoga)\b/i },
  { key: 'health', pattern: /\b(health|healthy|mindful|mindfulness|sleep|water|wellness|nutrition|diet|meditation|hydrate)\b/i },
  { key: 'learning', pattern: /\b(learn|learning|read|reading|study|book|books|education|course|language|school)\b/i },
  { key: 'creativity', pattern: /\b(creative|creativity|art|paint|painting|draw|drawing|write|writing|music|design|craft)\b/i },
  { key: 'productivity', pattern: /\b(productivity|productive|focus|routine|habit|plan|planning|journal|organize|organise|desk)\b/i },
];

export const getChallengeFallbackPhotoKey = (challenge: ChallengeFallbackInput): ChallengeFallbackPhotoKey => {
  const searchableText = [
    challenge.title,
    challenge.description,
    challenge.category,
    challenge.hashtags,
    ...(challenge.tags ?? []),
  ].filter(Boolean).join(' ');

  return fallbackRules.find((rule) => rule.pattern.test(searchableText))?.key ?? 'lifestyle';
};

const getFallbackSeed = (challenge: ChallengeFallbackInput): string => [
  challenge.id,
  challenge.challengeId,
  challenge.title,
  challenge.category,
  challenge.hashtags,
  ...(challenge.tags ?? []),
].filter(Boolean).join('|');

const getStableVariantIndex = (seed: string, variantCount: number): number => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % variantCount;
};

export const getChallengeFallbackPhotoAssetPath = (challenge: ChallengeFallbackInput): string => {
  const key = getChallengeFallbackPhotoKey(challenge);
  const variants = challengeFallbackPhotoAssetPaths[key];
  const seed = getFallbackSeed(challenge) || key;
  return variants[getStableVariantIndex(seed, variants.length)];
};

export const getChallengeFallbackPhotoSource = (challenge: ChallengeFallbackInput): ImageSourcePropType => {
  switch (getChallengeFallbackPhotoAssetPath(challenge)) {
    case 'assets/images/challenge-fallbacks/coding-1.png':
      return require('../assets/images/challenge-fallbacks/coding-1.png');
    case 'assets/images/challenge-fallbacks/coding-2.png':
      return require('../assets/images/challenge-fallbacks/coding-2.png');
    case 'assets/images/challenge-fallbacks/coding-3.png':
      return require('../assets/images/challenge-fallbacks/coding-3.png');
    case 'assets/images/challenge-fallbacks/coding-4.png':
      return require('../assets/images/challenge-fallbacks/coding-4.png');
    case 'assets/images/challenge-fallbacks/fitness-1.png':
      return require('../assets/images/challenge-fallbacks/fitness-1.png');
    case 'assets/images/challenge-fallbacks/fitness-2.png':
      return require('../assets/images/challenge-fallbacks/fitness-2.png');
    case 'assets/images/challenge-fallbacks/fitness-3.png':
      return require('../assets/images/challenge-fallbacks/fitness-3.png');
    case 'assets/images/challenge-fallbacks/fitness-4.png':
      return require('../assets/images/challenge-fallbacks/fitness-4.png');
    case 'assets/images/challenge-fallbacks/health-1.png':
      return require('../assets/images/challenge-fallbacks/health-1.png');
    case 'assets/images/challenge-fallbacks/health-2.png':
      return require('../assets/images/challenge-fallbacks/health-2.png');
    case 'assets/images/challenge-fallbacks/health-3.png':
      return require('../assets/images/challenge-fallbacks/health-3.png');
    case 'assets/images/challenge-fallbacks/health-4.png':
      return require('../assets/images/challenge-fallbacks/health-4.png');
    case 'assets/images/challenge-fallbacks/learning-1.png':
      return require('../assets/images/challenge-fallbacks/learning-1.png');
    case 'assets/images/challenge-fallbacks/learning-2.png':
      return require('../assets/images/challenge-fallbacks/learning-2.png');
    case 'assets/images/challenge-fallbacks/learning-3.png':
      return require('../assets/images/challenge-fallbacks/learning-3.png');
    case 'assets/images/challenge-fallbacks/learning-4.png':
      return require('../assets/images/challenge-fallbacks/learning-4.png');
    case 'assets/images/challenge-fallbacks/creativity-1.png':
      return require('../assets/images/challenge-fallbacks/creativity-1.png');
    case 'assets/images/challenge-fallbacks/creativity-2.png':
      return require('../assets/images/challenge-fallbacks/creativity-2.png');
    case 'assets/images/challenge-fallbacks/creativity-3.png':
      return require('../assets/images/challenge-fallbacks/creativity-3.png');
    case 'assets/images/challenge-fallbacks/creativity-4.png':
      return require('../assets/images/challenge-fallbacks/creativity-4.png');
    case 'assets/images/challenge-fallbacks/productivity-1.png':
      return require('../assets/images/challenge-fallbacks/productivity-1.png');
    case 'assets/images/challenge-fallbacks/productivity-2.png':
      return require('../assets/images/challenge-fallbacks/productivity-2.png');
    case 'assets/images/challenge-fallbacks/productivity-3.png':
      return require('../assets/images/challenge-fallbacks/productivity-3.png');
    case 'assets/images/challenge-fallbacks/productivity-4.png':
      return require('../assets/images/challenge-fallbacks/productivity-4.png');
    case 'assets/images/challenge-fallbacks/lifestyle-1.png':
      return require('../assets/images/challenge-fallbacks/lifestyle-1.png');
    case 'assets/images/challenge-fallbacks/lifestyle-2.png':
      return require('../assets/images/challenge-fallbacks/lifestyle-2.png');
    case 'assets/images/challenge-fallbacks/lifestyle-4.png':
      return require('../assets/images/challenge-fallbacks/lifestyle-4.png');
    case 'assets/images/challenge-fallbacks/lifestyle-3.png':
    default:
      return require('../assets/images/challenge-fallbacks/lifestyle-3.png');
  }
};
