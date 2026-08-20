import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

const challengeCardSource = readText('components/common/ChallengeCard.tsx');
const globalSource = readText('app/(tabs)/global.tsx');
const globalGalleryCardSource = readText('components/challenges/GlobalChallengeGalleryCard.tsx');
const ownProfileSource = readText('screens/Profile.tsx');
const userProfileSource = readText('app/user-profile.tsx');

for (const requiredText of [
  'styles.challengeMetaGrid',
  'styles.challengeMetaTile',
  'styles.cardFooter',
  'styles.footerAction',
  'styles.footerActionGhost',
  'source={challenge.image ? { uri: challenge.image } : fallbackPhotoSource}',
  'Private',
  'lock-closed',
  'Upload pending',
  'Uploaded today',
]) {
  assert.match(
    challengeCardSource,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `ChallengeCard should include "${requiredText}"`
  );
}

assert.doesNotMatch(
  challengeCardSource,
  /proofProviderLabel|proofChip|proofChipText/,
  'ChallengeCard should not render proof/manual provider chips in the list'
);

assert.doesNotMatch(
  challengeCardSource,
  /<Text style=\{styles\.challengeDescription\} numberOfLines=/,
  'ChallengeCard descriptions should expand naturally without showing ellipsis'
);

for (const requiredText of [
  'GlobalChallengeGalleryCard',
  'numColumns={2}',
  'styles.galleryCell',
  'styles.galleryRow',
]) {
  assert.match(
    globalSource,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Global challenges should include "${requiredText}"`
  );
}

for (const requiredText of [
  'Private',
  'Join Challenge',
  'getChallengeFallbackPhotoSource',
  'ChallengePreviewThumbStrip',
]) {
  assert.match(
    globalGalleryCardSource,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Global gallery card should include "${requiredText}"`
  );
}

assert.doesNotMatch(
  globalSource,
  /proofProviderLabel|styles\.proofChip|styles\.proofChipText/,
  'Global challenges should not render proof/manual provider chips'
);

assert.doesNotMatch(
  globalSource,
  /<ChallengeSubmissionPreview|styles\.globalMetaGrid|styles\.globalCardFooter|styles\.challengeDescription/,
  'Global challenges should use the lighter dark gallery instead of the dense legacy card'
);

assert.match(
  ownProfileSource,
  /<ProfileChallengeGalleryCard\b/,
  'Own profile challenge list should use the lightweight profile gallery card'
);

assert.match(
  userProfileSource,
  /<ProfileChallengeGalleryCard\b/,
  'User profile challenge list should use the lightweight profile gallery card'
);

for (const [label, source] of [
  ['own profile', ownProfileSource],
  ['user profile', userProfileSource],
]) {
  assert.match(source, /styles\.challengeGalleryGrid/, `${label} should render challenges in a gallery grid`);
  assert.doesNotMatch(source, /<ChallengeCard\b/, `${label} should not use the dense shared ChallengeCard`);
}

assert.match(
  readText('components/challenges/ProfileChallengeGalleryCard.tsx'),
  /getChallengeFallbackPhotoSource/,
  'Profile gallery card should preserve bundled fallback photos'
);

assert.doesNotMatch(
  userProfileSource,
  /challengeCardPhotoHeader|challengeCardPrivateBadge|challengeProgressBar/,
  'User profile should not keep the old custom challenge card implementation'
);

console.log('challenge list redesign checks passed');
