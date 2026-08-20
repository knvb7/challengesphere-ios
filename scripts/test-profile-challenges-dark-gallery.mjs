import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');

const cardPath = 'components/challenges/MyChallengeGalleryCard.tsx';
assert.ok(
  existsSync(path.join(root, cardPath)),
  'Profile challenge sections should reuse the My Challenges gallery card',
);

const cardSource = read(cardPath);
for (const requiredText of [
  'ImageBackground',
  'LinearGradient',
  'getChallengeFallbackPhotoSource',
  'onError',
  'setImageFailed',
  'numberOfLines={2}',
  'Created',
  'Joined',
  'Private',
  'Completed',
  'progressFill',
  'resizeMode="cover"',
  'backgroundColor: "#0F1110"',
]) {
  assert.match(
    cardSource,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `profile gallery card should include "${requiredText}"`,
  );
}

assert.doesNotMatch(
  cardSource,
  /ChallengeSubmissionPreview|ChallengeSubmissionFlipGrid|ChallengeTileSubmissionBack|ChallengeTileFlipButton|Animated\.spring|swap-horizontal|Upload pending|Upload submission|challengeMetaGrid/,
  'profile gallery cards should avoid flip controls and dashboard/proof/submission-preview clutter',
);
assert.match(
  cardSource,
  /<TouchableOpacity[\s\S]*onPress=\{onPress\}/,
  'profile gallery cards should open challenge details when pressed',
);

for (const screenPath of ['screens/Profile.tsx', 'app/user-profile.tsx']) {
  const source = read(screenPath);
  for (const requiredText of [
    'MyChallengeGalleryCard',
    'styles.challengeGalleryGrid',
    'styles.challengeGalleryCell',
  ]) {
    assert.match(
      source,
      new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `${screenPath} should include "${requiredText}"`,
    );
  }
  assert.doesNotMatch(
    source,
    /<ChallengeCard|<ProfileChallengeGalleryCard|profilePreviewsByChallengeId|profilePreviewsLoading|buildSubmissionPreviewDetailRouteParams/,
    `${screenPath} should not render the dense shared challenge card or old preview strip`,
  );
  assert.doesNotMatch(
    source,
    /useSubmissionPreviews/,
    `${screenPath} should not fetch submission previews for removed flip-side content`,
  );
}

const ownProfileSource = read('screens/Profile.tsx');
const profileTabSource = read('app/(tabs)/profile.tsx');
assert.match(
  ownProfileSource,
  /onPostsPress=\{onPostsPress \?\? \(\(\) => switchTab\('submissions'\)\)\}/,
  'own profile Posts stat should switch to the local Submissions tab by default',
);
assert.match(
  ownProfileSource,
  /onChallengesPress=\{onChallengesPress \?\? \(\(\) => switchTab\('challenges'\)\)\}/,
  'own profile Challenges stat should switch to the local Challenges tab by default',
);
assert.match(
  ownProfileSource,
  /pathname: '\/challenge-details'[\s\S]*id: challenge\.id/,
  'own profile challenge cards should open the challenge details route',
);
assert.doesNotMatch(
  profileTabSource,
  /user-challenges|onChallengesPress=/,
  'profile tab should not override Challenges stat to open the separate user-challenges screen',
);

const statsTabPath = 'components/common/ProfileStatsTab.tsx';
assert.ok(
  existsSync(path.join(root, statsTabPath)),
  'profile screens should share a dedicated stats tab component',
);

const statsTabSource = read(statsTabPath);
for (const requiredText of [
  'Daily consistency',
  'Challenge completion',
  '28-day pace',
  'Challenge mix',
  'Submission rhythm',
  'All-time highlights',
  'parseChallengeCategories',
  'calculateProfileStats',
]) {
  assert.match(
    statsTabSource,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `profile stats tab should include "${requiredText}"`,
  );
}
assert.doesNotMatch(
  statsTabSource,
  /fontWeight: '8|fontWeight: '9|textTransform: 'uppercase'/,
  'profile stats tab typography should use the app-wide moderate system text style',
);

for (const screenPath of ['screens/Profile.tsx', 'app/user-profile.tsx']) {
  const source = read(screenPath);
  for (const requiredText of [
    'ProfileStatsTab',
    "const PROFILE_TABS = ['submissions', 'challenges', 'stats'] as const",
    'inputRange: [0, 1, 2]',
    'segmentWidth.current / 3',
    "switchTab('stats')",
    "'stats-chart'",
    "'stats-chart-outline'",
    "activeTab === 'challenges' ?",
    'statsSubmissions ?? sortedSubmissions',
    'challenges={statsChallenges}',
  ]) {
    assert.match(
      source,
      new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `${screenPath} should include stats tab wiring "${requiredText}"`,
    );
  }

  const expectedDefaultTab = screenPath === 'screens/Profile.tsx'
    ? "useState<ProfileTab>(initialTab ?? 'submissions')"
    : "useState<ProfileTab>('submissions')";
  assert.match(
    source,
    new RegExp(expectedDefaultTab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `${screenPath} should initialize the profile tab state correctly`,
  );
}

console.log('profile challenges dark gallery checks passed');
