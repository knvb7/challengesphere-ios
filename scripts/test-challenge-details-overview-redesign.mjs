import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

assert.equal(
  existsSync(path.join(root, 'components/common/ChallengeDetailsOverview.tsx')),
  true,
  'shared ChallengeDetailsOverview component should exist'
);

const overviewSource = readText('components/common/ChallengeDetailsOverview.tsx');
const detailsSource = readText('app/challenge-details.tsx');
const globalDetailsSource = readText('app/global-challenge-details.tsx');

assert.match(
  overviewSource,
  /<\/View>\s*<View style=\{styles\.heroCopyCard\}>[\s\S]*?<Text style=\{styles\.title\}/,
  'challenge title and description should render in a dedicated card below the hero image instead of covering it'
);

for (const requiredText of [
  'ChallengeDetailsOverview',
  'coverPhotoUrls',
  'heroImageSource',
  'styles.heroImage',
  'styles.heroOverlay',
  'styles.heroTopContent',
  'styles.heroCopy',
  'styles.floatingStatusCard',
  'styles.progressRing',
  'styles.progressRingActive',
  'LinearGradient',
  'getChallengeFallbackPhotoSource',
  'cachePolicy="memory-disk"',
  'currentDay',
  'daysLeft',
  'Top Leaderboard',
  'leaderboardRows.slice(0, 5)',
  'Category',
  'Duration',
  'Current day',
  'Timeline',
  'Visibility',
  'Show more',
  'Show less',
  'Global Submissions',
]) {
  assert.match(
    overviewSource,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `overview should include "${requiredText}"`
  );
}

for (const [label, source] of [
  ['regular challenge details', detailsSource],
  ['global challenge details', globalDetailsSource],
]) {
  assert.match(
    source,
    /import ChallengeDetailsOverview/,
    `${label} should import the shared overview`
  );
  assert.match(
    source,
    /<ChallengeDetailsOverview[\s\S]*coverPhotoUrls=\{coverPhotoUrls\}[\s\S]*\/>/,
    `${label} should render the shared overview with challenge photos`
  );
  assert.doesNotMatch(
    source,
    /Rules & Guidelines|parsedDescription\.rules|styles\.infoSection/,
    `${label} should not render the old rules/info block in the challenge header`
  );
}

console.log('challenge details overview redesign checks passed');
