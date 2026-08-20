import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const helperPath = path.join(root, 'utils/myChallengesPresentation.ts');

assert.ok(
  existsSync(helperPath),
  'My Challenges presentation helpers should exist',
);

const source = readFileSync(helperPath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const helperModule = { exports: {} };
new Function('exports', 'module', compiled)(helperModule.exports, helperModule);

const {
  buildPendingSummary,
  dedupeChallenges,
  filterMyChallenges,
  partitionChallenges,
} = helperModule.exports;

const challenge = (id, overrides = {}) => ({
  id,
  title: `Challenge ${id}`,
  description: '',
  category: 'Fitness',
  duration: '30 days',
  numberOfDays: 30,
  status: 'active',
  isCreator: false,
  startDate: '2026-07-01',
  createdAt: '2026-07-01',
  ...overrides,
});

const activeA = challenge('a', { title: 'Morning Run' });
const activeB = challenge('b');
const activeC = challenge('c');
const activeD = challenge('d');
const activeE = challenge('e');
const upcomingC = challenge('upcoming', { status: 'upcoming' });
const completedB = challenge('completed', { status: 'completed' });
const deletedD = challenge('deleted', { status: 'deleted' });

assert.deepEqual(
  dedupeChallenges([activeA, activeA, completedB]).map((item) => item.id),
  ['a', 'completed'],
  'dedupeChallenges should preserve first-seen challenge order',
);

assert.deepEqual(
  partitionChallenges([activeA, upcomingC, completedB, deletedD]),
  {
    active: [activeA, upcomingC],
    past: [completedB, deletedD],
  },
  'partitionChallenges should separate active/upcoming from completed/deleted',
);

assert.deepEqual(
  filterMyChallenges(
    [activeA, challenge('created', { isCreator: true, category: 'Coding' })],
    'created',
    'cod',
  ).map((item) => item.id),
  ['created'],
  'filterMyChallenges should combine relationship and text filters',
);

assert.equal(
  buildPendingSummary([activeA], () => true)?.moreCount,
  0,
  'one pending challenge should have no remainder',
);
assert.equal(
  buildPendingSummary(
    [activeA, activeB, activeC, activeD, activeE],
    () => true,
  )?.moreLabel,
  '+4 more',
  'five pending challenges should render +4 more',
);
assert.equal(
  buildPendingSummary([activeA], () => false),
  null,
  'zero pending challenges should omit the pending stack',
);

const componentFiles = {
  card: 'components/challenges/MyChallengeGalleryCard.tsx',
  stack: 'components/challenges/PendingChallengeStack.tsx',
  past: 'components/challenges/PastChallengesRow.tsx',
};

for (const [name, relativePath] of Object.entries(componentFiles)) {
  assert.ok(
    existsSync(path.join(root, relativePath)),
    `${name} gallery component should exist`,
  );
}

const cardSource = readFileSync(path.join(root, componentFiles.card), 'utf8');
const stackSource = readFileSync(path.join(root, componentFiles.stack), 'utf8');
const pastSource = readFileSync(path.join(root, componentFiles.past), 'utf8');

for (const requiredText of [
  'ImageBackground',
  'LinearGradient',
  'parseChallengeCategories',
  'people-outline',
  'participantCount',
  'joined',
  'numberOfLines={2}',
  'getChallengeFallbackPhotoSource',
  'onError',
  'setImageFailed',
  'resizeMode="cover"',
  'backgroundColor: "#0F1110"',
]) {
  assert.match(
    cardSource,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `gallery card should include "${requiredText}"`,
  );
}
assert.doesNotMatch(
  cardSource,
  /ChallengeSubmissionPreview|ChallengeSubmissionFlipGrid|ChallengeTileSubmissionBack|ChallengeTileFlipButton|Animated\.spring|swap-horizontal|challengeMetaGrid|Upload submission/,
  'gallery cards should not include flip controls, submission backs, dashboard content, or upload actions',
);
assert.match(
  cardSource,
  /const badgeLabel = getBadgeLabel\(challenge, resolvedCrewState\);/,
  'gallery card should render its computed status badge',
);
for (const requiredText of ['moreLabel', 'remaining', 'Upload submission']) {
  assert.match(
    stackSource,
    new RegExp(requiredText),
    `pending stack should include "${requiredText}"`,
  );
}
assert.match(
  stackSource,
  /onOpenChallenge[\s\S]*accessibilityLabel=\{`Open \$\{challenge\.title\}`\}/,
  'pending stack challenge rows should open the respective challenge',
);

assert.match(pastSource, /Past challenges/);
assert.match(pastSource, /Completed and left/);

const screenSource = readFileSync(
  path.join(root, 'app/(tabs)/challenges.tsx'),
  'utf8',
);
for (const requiredText of [
  'PendingChallengeStack',
  'MyChallengeGalleryCard',
  'partitionChallenges',
  'numColumns={1}',
  'styles.galleryCell',
  'placeholder={',
  'Search active challenges',
  'Search created challenges',
  'notifications-outline',
  'SubmissionComposer',
  'onOpenChallenge={handleChallengePress}',
]) {
  assert.match(
    screenSource,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `My Challenges screen should include "${requiredText}"`,
  );
}

assert.doesNotMatch(
  screenSource,
  /searchExpanded|setSearchExpanded|Close challenge search/,
  'My Challenges search should stay visible without a header toggle',
);
assert.match(
  screenSource,
  /tabChallenges[\s\S]*filterMyChallenges\(visibleChallenges, activeTab, ""\)[\s\S]*visibilityFilteredChallenges[\s\S]*filterMyChallenges\(categoryFiltered, "all", searchQuery\)/,
  'challenge search should run after the selected Active, Created, or Past tab scope',
);

assert.doesNotMatch(
  screenSource,
  /<ChallengeCard/,
  'My Challenges should not render the overloaded shared card',
);
assert.doesNotMatch(
  screenSource,
  /useSubmissionPreviews/,
  'My Challenges should not fetch submission previews for removed flip-side content',
);
assert.match(
  screenSource,
  /Hey \{greetingName\}/,
  'My Challenges should greet the signed-in user by name',
);
assert.match(
  screenSource,
  /currentUser\?\.firstName\?\.trim\(\)[\s\S]*authUser\?\.firstName\?\.trim\(\)[\s\S]*currentUser\?\.username\?\.trim\(\)[\s\S]*authUser\?\.username\?\.trim\(\)/,
  'the personalized greeting should prefer first name before username',
);
assert.doesNotMatch(
  screenSource,
  />Your Sphere</,
  'the generic challenge home title should be removed',
);

console.log('my challenges dark gallery checks passed');
