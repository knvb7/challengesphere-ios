import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');
const readBackend = (relativePath) => readFileSync(
  path.join(root, '..', 'challengesphere', relativePath),
  'utf8',
);

for (const component of [
  'components/common/FollowActionSheet.tsx',
  'components/feed/FeedComingSoon.tsx',
]) {
  assert.ok(existsSync(path.join(root, component)), `${component} should exist`);
}

const submissionDetail = read('utils/submissionDetail.ts');
assert.match(submissionDetail, /buildSubmissionDetailRouteParams/);

for (const profileScreen of ['screens/Profile.tsx', 'app/user-profile.tsx']) {
  const source = read(profileScreen);
  assert.match(source, /buildSubmissionDetailRouteParams/);
  assert.match(source, /pathname:\s*['"]\/photo-details['"]/);
  assert.doesNotMatch(source, /selectedSubmission/);
  assert.doesNotMatch(source, /CircularPhoto/);
}

for (const submissionList of ['app/challenge-submissions.tsx', 'app/global-submissions.tsx']) {
  assert.match(read(submissionList), /buildSubmissionDetailRouteParams/);
}

for (const avatarSurface of [
  'app/(tabs)/_layout.tsx',
  'app/edit-challenge.tsx',
  'app/integration-detail.tsx',
  'components/common/ChallengeDetailsOverview.tsx',
]) {
  assert.match(read(avatarSurface), /AvatarImage/);
}

const authService = readBackend(
  'src/main/java/com/ironside/challengesphere/service/impl/AuthServiceImpl.java',
);
assert.match(authService, /MediaUrlService/);
assert.match(authService, /toReadableMediaUrl/);
assert.match(authService, /BeanUtils\.copyProperties/);

const feedTab = read('app/(tabs)/index.tsx');
const feedComingSoon = read('components/feed/FeedComingSoon.tsx');
assert.match(feedTab, /import FeedComingSoon/);
assert.match(feedComingSoon, /useTotalUserCount/);
assert.match(feedComingSoon, /Animated/);
assert.match(feedComingSoon, /Current challengers/);
assert.doesNotMatch(feedComingSoon, /https?:\/\//);

const challengeCreated = read('app/challenge-created.tsx');
assert.match(challengeCreated, /!isPrivate[\s\S]*PublicChallengeBroadcastAnimation/);
assert.match(challengeCreated, /privateSecureState/);
assert.doesNotMatch(challengeCreated, /curtainPanel|curtainLeft|curtainRight|revealProgress/);

const followActionSheet = read('components/common/FollowActionSheet.tsx');
assert.match(followActionSheet, /AvatarImage/);
assert.match(followActionSheet, /isFollowing/);
assert.match(followActionSheet, /pending/);

for (const followSurface of [
  'app/user-profile.tsx',
  'app/followers.tsx',
  'app/user-followers.tsx',
  'app/(tabs)/global.tsx',
  'app/global-challenge-details.tsx',
]) {
  assert.match(read(followSurface), /FollowActionSheet/);
}

console.log('unified social and submission polish checks passed');
