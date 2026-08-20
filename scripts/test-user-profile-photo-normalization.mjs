import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const userServiceSource = readFileSync(new URL('../services/userService.ts', import.meta.url), 'utf8');
const apiTypesSource = readFileSync(new URL('../types/api.ts', import.meta.url), 'utf8');

assert.match(
  apiTypesSource,
  /profilePictureUrl\?: string \| null/,
  'User type should accept profilePictureUrl from backend aliases'
);
assert.match(
  userServiceSource,
  /profilePicUrl: user\.profilePicUrl \|\| user\.profilePictureUrl \|\| user\.userProfilePicUrl \|\| null/,
  'userService should normalize backend profile photo aliases into profilePicUrl'
);
assert.match(
  userServiceSource,
  /normalizeFollowersFollowingResponse\(response\.data\)/,
  'followers/following responses should normalize profile photo aliases'
);
assert.match(
  userServiceSource,
  /normalizeUserSearchResponse\(response\.data\)/,
  'search and suggested user responses should normalize profile photo aliases'
);

console.log('user profile photo normalization checks passed');
