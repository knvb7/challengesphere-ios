import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

const preloaderPath = 'components/AppDataPreloader.tsx';
assert.equal(
  existsSync(path.join(root, preloaderPath)),
  true,
  'AppDataPreloader should exist as the single startup cache warmer'
);

const preloaderSource = readText(preloaderPath);
const profileTabSource = readText('app/(tabs)/profile.tsx');
const globalTabSource = readText('app/(tabs)/global.tsx');
const createTabSource = readText('app/(tabs)/create.tsx');
const followersSource = readText('app/followers.tsx');
const rootLayoutSource = readText('app/_layout.tsx');

const myChallengesIndex = preloaderSource.indexOf('await prefetchMyChallenges');
const globalChallengesIndex = preloaderSource.indexOf('await prefetchGlobalChallenges');
const homeFeedIndex = preloaderSource.indexOf('await prefetchHomeFeed');
const profileIndex = preloaderSource.indexOf('await prefetchProfile');
const followIndex = preloaderSource.indexOf('await prefetchProfileFollowersAndFollowing');

assert.ok(myChallengesIndex >= 0, 'startup preload should begin with My Challenges');
assert.ok(globalChallengesIndex > myChallengesIndex, 'Global Challenges should preload after My Challenges');
assert.ok(homeFeedIndex > globalChallengesIndex, 'Home/feed should preload after Global Challenges');
assert.ok(profileIndex > homeFeedIndex, 'Profile should preload after Home/feed');
assert.ok(followIndex > profileIndex, 'Profile followers and following should preload after Profile');

assert.match(
  preloaderSource,
  /prefetchQuery\(\{[\s\S]*queryKey:\s*\['myActiveChallenges',\s*userId,\s*undefined,\s*userId\]/,
  'preloader should warm the same myActiveChallenges query key used by the tab'
);
assert.match(
  preloaderSource,
  /prefetchInfiniteQuery\(\{[\s\S]*queryKey:\s*\[\.\.\.challengeKeys\.popular\(\),\s*'infinite',\s*CHALLENGE_PAGE_SIZE,\s*userId\]/,
  'preloader should warm the global popular infinite query used by the global tab'
);
assert.match(
  preloaderSource,
  /prefetchInfiniteQuery\(\{[\s\S]*queryKey:\s*\[\.\.\.challengeKeys\.recent\(\),\s*'infinite',\s*CHALLENGE_PAGE_SIZE,\s*userId\]/,
  'preloader should warm the global recent infinite query used by the global tab'
);
assert.match(
  preloaderSource,
  /prefetchQuery\(\{[\s\S]*queryKey:\s*userKeys\.detail\(userId\)/,
  'preloader should warm the own profile detail query'
);
assert.match(
  preloaderSource,
  /prefetchHomeFeed/,
  'startup preload should warm the home/feed tab'
);
assert.match(
  preloaderSource,
  /feedKeys\.trending\(\)/,
  'startup preload should warm trending feed when the feed is enabled'
);
assert.match(
  preloaderSource,
  /userKeys\.totalCount\(\)/,
  'startup preload should warm the home tab challenger count when feed is disabled'
);
assert.match(
  preloaderSource,
  /useFocusEffect/,
  'profile follow preload should run on profile focus'
);
assert.match(
  preloaderSource,
  /prefetchProfileFollowersAndFollowing/,
  'profile follow preload should share one helper for followers and following'
);
assert.match(
  preloaderSource,
  /queryKey:\s*\[\.\.\.userKeys\.followers\(userId\),\s*1,\s*FOLLOW_PAGE_SIZE,\s*userId\]/,
  'profile focus should prefetch followers page 1 with the same key as useUserFollowers'
);
assert.match(
  preloaderSource,
  /queryKey:\s*\[\.\.\.userKeys\.following\(userId\),\s*1,\s*FOLLOW_PAGE_SIZE,\s*userId\]/,
  'profile focus should prefetch following page 1 with the same key as useUserFollowing'
);
assert.match(
  preloaderSource,
  /preloadedUsers\.has\(userId\)/,
  'startup preloader should guard against repeated work in the same app session'
);
assert.match(
  rootLayoutSource,
  /<AppDataPreloader \/>/,
  'root layout should mount the preloader below AuthProvider'
);
assert.match(
  profileTabSource,
  /useProfileFollowPreload\(currentUserId\)/,
  'profile tab should warm followers and following when opened'
);
assert.match(
  preloaderSource,
  /await prefetchProfileFollowersAndFollowing\(queryClient,\s*userId\)/,
  'startup preload should also warm followers and following right after app open'
);
assert.match(
  globalTabSource,
  /useUserFollowing\(\s*CURRENT_USER_ID,\s*1,\s*100,\s*CURRENT_USER_ID\s*\)/,
  'global tab should consume the preloaded following query instead of issuing a duplicate request'
);
assert.match(
  createTabSource,
  /useUserFollowers\(CURRENT_USER_ID,\s*1,\s*100,\s*CURRENT_USER_ID/,
  'create tab should consume the preloaded followers query'
);
assert.match(
  followersSource,
  /useUserFollowers\(CURRENT_USER_ID,\s*1,\s*100,\s*CURRENT_USER_ID\)/,
  'followers screen should consume the preloaded followers query'
);
assert.match(
  followersSource,
  /useUserFollowing\(CURRENT_USER_ID,\s*1,\s*100,\s*CURRENT_USER_ID\)/,
  'followers screen should consume the preloaded following query'
);

console.log('app data preload checks passed');
