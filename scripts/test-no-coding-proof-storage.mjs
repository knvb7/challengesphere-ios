#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const assertNotContains = (source, pattern, message) => {
  if (pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern)) {
    throw new Error(message);
  }
};

const assertContains = (source, pattern, message) => {
  if (pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern)) return;
  throw new Error(message);
};

const challengesScreen = readText('app/(tabs)/challenges.tsx');
assertNotContains(
  challengesScreen,
  /proofPayload/,
  'Challenge upload flow must not build or submit coding proof payloads.',
);
assertNotContains(
  challengesScreen,
  /buildSubmissionProofPayload|buildLeetCodeProofPayloadForDate|buildCodeforcesProofPayloadForDate/,
  'Challenge upload flow must not build coding proof snapshots from provider submissions.',
);

const localIntegrationsService = readText('services/localIntegrationsService.ts');
assertNotContains(
  localIntegrationsService,
  /saveCodeforcesSnapshot|saveLeetCodeSnapshot/,
  'Local coding integrations must save only connection metadata, not solved-problem snapshots.',
);
assertContains(
  localIntegrationsService,
  /stripStoredSnapshot/,
  'Local coding integrations should remove old persisted provider problem snapshots on read.',
);

const codeforcesHook = readText('hooks/useCodeforcesIntegration.ts');
const leetCodeHook = readText('hooks/useLeetCodeIntegration.ts');
assertContains(
  codeforcesHook,
  /latestSnapshot/,
  'Codeforces hook should expose the latest live API snapshot in memory only.',
);
assertContains(
  leetCodeHook,
  /latestSnapshot/,
  'LeetCode hook should expose the latest live API snapshot in memory only.',
);
assertNotContains(
  `${codeforcesHook}\n${leetCodeHook}`,
  /saveCodeforcesSnapshot|saveLeetCodeSnapshot/,
  'Sync hooks must not persist provider problem snapshots after API fetches.',
);

const apiTypes = readText('types/api.ts');
assertNotContains(
  apiTypes,
  /proofPayload/,
  'API types must not expose proofPayload on submissions, feed items, or create submission requests.',
);

const photoDetails = readText('app/photo-details.tsx');
assertNotContains(
  photoDetails,
  /CodingProofPostCard|normalizeCodingProofPayload|proofPayload/,
  'Photo detail screen must not render stored coding proof payloads.',
);

console.log('Coding proof storage regression checks passed.');
