import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();
const require = createRequire(import.meta.url);

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function loadTsModule(relativePath) {
  const filePath = path.join(root, relativePath);
  const output = ts.transpileModule(readText(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, require }, { filename: filePath });
  return module.exports;
}

const filters = loadTsModule('utils/globalChallenges.ts');
const official = { creatorUsername: '@ChallengeSphere', isFollowing: true };
const followed = { creatorUsername: '@friend', isFollowing: true };
const other = { creatorUsername: '@new_creator', isFollowing: false };

assert.equal(filters.isOfficialGlobalCreator('@ChallengeSphere'), true);
assert.equal(filters.matchesGlobalChallengeFilter(official, 'global'), true);
assert.equal(filters.matchesGlobalChallengeFilter(followed, 'following'), true);
assert.equal(filters.matchesGlobalChallengeFilter(other, 'others'), true);
assert.equal(filters.matchesGlobalChallengeFilter(official, 'following'), false);
assert.equal(filters.matchesGlobalChallengeFilter(followed, 'others'), false);

const globalScreen = readText('app/(tabs)/global.tsx');
const globalGalleryCard = readText('components/challenges/GlobalChallengeGalleryCard.tsx');
assert.match(
  globalScreen,
  /renderFilterButton\('all', 'All'\)[\s\S]*renderFilterButton\('global', 'Global'\)[\s\S]*renderFilterButton\('following', 'Following'\)[\s\S]*renderFilterButton\('others', 'Others'\)/,
  'discovery tabs should render in the approved order',
);
assert.match(
  globalScreen,
  /filtersContainer:\s*{[\s\S]*?flexWrap:\s*'wrap'/,
  'discovery filter buttons should wrap instead of overflowing on narrow screens',
);
assert.match(
  globalScreen,
  /filterButton:\s*{[\s\S]*?width:\s*'48%'/,
  'discovery filter buttons should use a stable two-column width',
);
assert.match(
  globalScreen,
  /filterText:\s*{[\s\S]*?textAlign:\s*'center'/,
  'discovery filter labels should be centered inside stable buttons',
);
assert.match(
  globalGalleryCard,
  /getChallengeFallbackPhotoSource\(challenge\)/,
  'global challenge cards should choose a bundled fallback photo from challenge tags when no cover exists',
);
assert.match(
  globalGalleryCard,
  /challenge\.image && !imageFailed[\s\S]*\? \{ uri: challenge\.image \}[\s\S]*: getChallengeFallbackPhotoSource\(challenge\)/,
  'global challenge cards should render either an uploaded photo or a tag-matched fallback photo',
);
assert.doesNotMatch(
  globalScreen,
  /proofChip|proofProviderLabel/,
  'global challenge cards should stay focused on challenge details without extra proof-provider copy',
);
