import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const profileSource = read('screens/Profile.tsx');
const editProfileSource = read('screens/EditProfile.tsx');
const preloaderSource = read('components/AppDataPreloader.tsx');
const profileTabSource = read('app/(tabs)/profile.tsx');

assert.doesNotMatch(
  profileSource,
  /useUserByUsername/,
  'the own-profile screen must consume the preloaded ID-based profile query without issuing a duplicate username lookup'
);
assert.match(
  profileSource,
  /const \{ data: user,[\s\S]*\} = useUser\(userId\)/,
  'the own-profile screen should read the same user detail key warmed at startup'
);
assert.doesNotMatch(
  editProfileSource,
  /useUserByUsername/,
  'edit profile must use the authenticated user ID so a stale locally stored username cannot cause a 404'
);
assert.match(
  editProfileSource,
  /const \{ data: user,[\s\S]*\} = useUser\(userId\)/,
  'edit profile should load from the canonical user ID query'
);
assert.match(
  preloaderSource,
  /queryKey:\s*userKeys\.detail\(userId\)/,
  'startup should preload the canonical own-profile key'
);
assert.match(
  profileTabSource,
  /<Profile[\s\S]*userId=\{currentUserId\}/,
  'profile tab should pass the canonical authenticated user ID explicitly'
);

console.log('profile data flow regression checks passed');
