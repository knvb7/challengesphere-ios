import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const profileSource = read('screens/Profile.tsx');
const userProfileSource = read('app/user-profile.tsx');
const hooksSource = read('hooks/useChallenges.ts');

assert.match(
  hooksSource,
  /export const useChallengesByIds = /,
  'challenge hooks should expose one cached batch lookup for submission challenge titles'
);

for (const [label, source] of [
  ['own profile', profileSource],
  ['public user profile', userProfileSource],
]) {
  assert.match(
    source,
    /useChallengesByIds/,
    `${label} should resolve submission challenge names in one batch`
  );
  assert.match(
    source,
    /submissionChallengeLabel/,
    `${label} submission tiles should visibly identify their challenge`
  );
  assert.match(
    source,
    /<View style=\{styles\.submissionChallengeLabel\}>/,
    `${label} submission challenge labels should use the shared solid bottom bar`
  );
  assert.match(
    source,
    /gridItem:\s*\{[\s\S]*borderRadius:\s*10,[\s\S]*borderColor:\s*'#E7E3EF'/,
    `${label} submission tiles should use the same rounded border treatment`
  );
  assert.match(
    source,
    /submissionChallengeLabel:\s*\{[\s\S]*height:\s*40,[\s\S]*backgroundColor:\s*'#FFFFFF',[\s\S]*borderTopColor:\s*'#E7E3EF'/,
    `${label} challenge labels should use a compact light bar without covering the image`
  );
  assert.doesNotMatch(
    source,
    /colors=\{\['rgba\(255, 255, 255, 0\)', 'rgba\(255, 255, 255, 0\.96\)'\]\}/,
    `${label} challenge labels should not add a white fade over the image`
  );
  assert.match(
    source,
    /submissionChallengeLabelText:\s*\{[\s\S]*color:\s*'#000000'/,
    `${label} challenge labels should use black text on the light surface`
  );
}

assert.doesNotMatch(
  userProfileSource,
  /challengeTrophyFrame/,
  'public user profile trophies should not use a separate boxed frame'
);

console.log('profile submission challenge label checks passed');
