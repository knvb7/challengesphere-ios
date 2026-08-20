import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const leaderboard = read('app/leaderboard.tsx');
const overview = read('components/common/ChallengeDetailsOverview.tsx');

assert.match(leaderboard, /LeaderboardType\.OVERALL/, 'the leaderboard should request the points ranking');
assert.doesNotMatch(leaderboard, /LEADERBOARD_FILTERS/, 'the points-only leaderboard should not expose filters');
assert.doesNotMatch(leaderboard, /activeLeaderboardType/, 'the points-only leaderboard should not keep filter state');
assert.match(
  leaderboard,
  /useChallengeLeaderboard\(challengeId, LeaderboardType\.OVERALL/,
  'the leaderboard query should always request the overall points ranking',
);
assert.match(
  leaderboard,
  /return \{ value: Math\.round\(entry\.score\), unit: 'points'/,
  'leaderboard scores should always be displayed as points',
);
assert.match(leaderboard, /podiumEntries/, 'top-three entries should be derived for the podium');
assert.match(leaderboard, /standingEntries/, 'remaining entries should be derived for standings');
assert.match(
  leaderboard,
  /const standingEntries = filteredEntries;/,
  'standings should include the complete filtered ranking, including podium entries',
);
assert.match(
  leaderboard,
  /<Text style=\{styles\.standingsTitle\}>Standings<\/Text>/,
  'the complete ranking should be introduced by a visible Standings heading',
);
assert.match(
  leaderboard,
  /<Text style=\{styles\.scoreUnit\} numberOfLines=\{1\}>\{metric\.unit\}<\/Text>/,
  'standings metric units should stay on one line at narrow phone widths',
);
assert.match(
  leaderboard,
  /setTimeout\([\s\S]*setAppliedParticipantSearch/,
  'participant search should apply after a short debounce',
);
assert.match(leaderboard, /LeaderboardPodium/, 'the screen should render a dedicated podium');
assert.doesNotMatch(leaderboard, /styles\.tabScroll/, 'the removed filter scroller should not render');
assert.match(overview, /View full/, 'the challenge preview should link to the full leaderboard');
assert.match(
  overview,
  /<LeaderboardPreviewPodium[\s\S]*rows=\{topRows\}/,
  'challenge details should reuse a compact live podium preview',
);
assert.match(
  overview,
  /styles\.leaderboardListCard[\s\S]*topRows\.map/,
  'challenge details should keep the ranked participant list below the podium',
);
assert.doesNotMatch(
  overview,
  /!isPrivate\s*&&\s*\([\s\S]*?Challenge leaderboard/,
  'private challenges should render the challenge leaderboard',
);
assert.match(overview, /getPreviewRankStyle/, 'preview ranks should use medal-aware styling');

console.log('points-only leaderboard checks passed');
