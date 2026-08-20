import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const apiTypes = read('types/api.ts');
const userService = read('services/userService.ts');
const useUsers = read('hooks/useUsers.ts');
const profileSetup = read('app/profile-setup.tsx');
const globalScreen = read('app/(tabs)/global.tsx');
const feedScreen = read('screens/Feed.tsx');

const styleBlock = (source, name) => {
  const match = source.match(new RegExp(`${name}: \\{[\\s\\S]*?\\n  \\},`));
  assert.ok(match, `${name} style should exist`);
  return match[0];
};

assert.match(apiTypes, /interests\?: string\[\];/, 'user API types should expose optional interests');
assert.match(userService, /async getSuggestedUsers\(page = 1, pageSize = 10\): Promise<UserSearchResponse>/);
assert.match(userService, /\/users\/suggestions\?\$\{params\.toString\(\)\}/);
assert.match(useUsers, /suggestions: \(\) => \[\.\.\.userKeys\.all, 'suggestions'\] as const/);
assert.match(useUsers, /export const useSuggestedUsers = \(page = 1, pageSize = 10\)/);
assert.match(
  useUsers,
  /useFollowUser[\s\S]*queryClient\.invalidateQueries\(\{ queryKey: userKeys\.suggestions\(\) \}\);/,
  'following a suggested user should invalidate recommendation queries',
);

assert.match(profileSetup, /PROFILE_INTERESTS/);
assert.match(profileSetup, /selectedInterests/);
assert.match(profileSetup, /toggleInterest/);
assert.match(profileSetup, /interests: selectedInterests/);

assert.match(globalScreen, /useSuggestedUsers\(1, 12\)/);
assert.match(globalScreen, /Suggested for you/);
assert.match(globalScreen, /suggestedPeopleData\?\.users/);
assert.match(
  globalScreen,
  /followedSuggestedUserIds/,
  'global suggested users should keep local followed state for immediate button feedback',
);
assert.match(
  globalScreen,
  /setFollowedSuggestedUserIds\(\(current\) => new Set\(current\)\.add\(item\.id\)\)/,
  'global suggested users should mark a user as followed immediately after a successful follow',
);
assert.match(
  globalScreen,
  /isFollowed \? 'Following' : 'Follow'/,
  'global suggested users should switch the recommendation button label after follow',
);

assert.match(feedScreen, /useSuggestedUsers\(1, 10\)/);
assert.match(feedScreen, /SuggestedPeopleCarousel/);
assert.match(feedScreen, /type: 'suggestions'/);
assert.match(feedScreen, /renderSuggestedPeopleCarousel/);
assert.match(
  feedScreen,
  /followedSuggestedUserIds/,
  'feed suggested users should keep local followed state for immediate button feedback',
);
assert.match(
  feedScreen,
  /setFollowedSuggestedUserIds\(\(current\) => new Set\(current\)\.add\(user\.id\)\)/,
  'feed suggested users should mark a user as followed immediately after a successful follow',
);
assert.match(
  feedScreen,
  /refetchSuggestedPeople\(\)/,
  'feed suggested users should refresh recommendations after follow success',
);
assert.match(
  feedScreen,
  /isFollowed \? 'Following' : 'Follow'/,
  'feed suggested users should switch the recommendation button label after follow',
);

for (const block of [
  styleBlock(globalScreen, 'suggestedSectionTitle'),
  styleBlock(globalScreen, 'suggestedUserName'),
  styleBlock(globalScreen, 'suggestedFollowText'),
  styleBlock(feedScreen, 'suggestionTitle'),
  styleBlock(feedScreen, 'suggestionUsername'),
  styleBlock(feedScreen, 'suggestionFollowText'),
]) {
  assert.doesNotMatch(block, /fontWeight: '(?:800|900)'/);
}

assert.match(styleBlock(globalScreen, 'suggestedUserName'), /fontSize: 14,[\s\S]*fontWeight: '700'/);
assert.match(styleBlock(globalScreen, 'suggestedFollowText'), /fontSize: 12,[\s\S]*fontWeight: '600'/);
assert.match(styleBlock(feedScreen, 'suggestionUsername'), /fontSize: 12,[\s\S]*fontWeight: '700'/);
assert.match(styleBlock(feedScreen, 'suggestionFollowText'), /fontSize: 11,[\s\S]*fontWeight: '600'/);

console.log('interest suggestion regression checks passed');
