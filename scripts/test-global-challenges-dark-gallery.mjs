import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');

const cardPath = 'components/challenges/GlobalChallengeGalleryCard.tsx';
assert.ok(
  existsSync(path.join(root, cardPath)),
  'Global Challenges should use a dedicated lightweight gallery card',
);

const cardSource = read(cardPath);
for (const requiredText of [
  'ImageBackground',
  'LinearGradient',
  'getChallengeFallbackPhotoSource',
  'onError',
  'setImageFailed',
  'numberOfLines={2}',
  'Join Challenge',
  'Joined',
  'Private',
  'Creator',
  'visibleParticipantsCount.toLocaleString()',
  'resizeMode="cover"',
  'backgroundColor: "#0F1110"',
]) {
  assert.match(
    cardSource,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `global gallery card should include "${requiredText}"`,
  );
}

assert.doesNotMatch(
  cardSource,
  /ChallengeSubmissionPreview|ChallengeSubmissionFlipGrid|ChallengeTileSubmissionBack|ChallengeTileFlipButton|Animated\.spring|swap-horizontal|globalMetaGrid|challengeDescription|tagsContainer/,
  'global gallery cards should avoid flip controls and the heavy list-card content',
);

const screenSource = read('app/(tabs)/global.tsx');
for (const requiredText of [
  'GlobalChallengeGalleryCard',
  'numColumns={1}',
  'styles.galleryCell',
  'key={`${galleryListKey}-feed`}',
  'Explore challenges',
]) {
  assert.match(
    screenSource,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Global Challenges screen should include "${requiredText}"`,
  );
}

assert.doesNotMatch(
  screenSource,
  /<ChallengeSubmissionPreview|buildSubmissionPreviewDetailRouteParams|styles\.globalMetaGrid|styles\.globalCardFooter/,
  'Global Challenges list should not render the old dense preview/meta/footer grid',
);
assert.doesNotMatch(
  screenSource,
  /useSubmissionPreviews/,
  'Global Challenges should not fetch submission previews for removed flip-side content',
);

console.log('global challenges dark gallery checks passed');
