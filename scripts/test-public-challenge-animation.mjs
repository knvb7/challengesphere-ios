import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');

const animationPath = 'components/common/PublicChallengeBroadcastAnimation.tsx';
assert.ok(
  existsSync(path.join(root, animationPath)),
  'public challenge reveal should use a dedicated broadcast/global animation',
);

const animationSource = read(animationPath);
for (const requiredText of [
  'globe-outline',
  'radio-outline',
  'broadcastRing',
  'Animated.loop',
]) {
  assert.match(
    animationSource,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `public challenge animation should include "${requiredText}"`,
  );
}

assert.doesNotMatch(
  animationSource,
  /user-|genericman|people|person|AvatarImage|Animated\.Image/,
  'public challenge animation should not use people/avatar imagery',
);

const createdSource = read('app/challenge-created.tsx');
assert.match(
  createdSource,
  /PublicChallengeBroadcastAnimation/,
  'created challenge screen should render the public broadcast animation',
);
assert.match(
  createdSource,
  /Public Discovery Enabled/,
  'created challenge screen should describe public visibility without audience/people copy',
);
assert.doesNotMatch(
  createdSource,
  /CommunityGatheringAnimation|Audience Is Gathering/,
  'created challenge screen should not use the old people-gathering public animation',
);

console.log('public challenge animation checks passed');
