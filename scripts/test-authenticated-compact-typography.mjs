import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const compactExpectations = [
  ['screens/Feed.tsx', /username:[\s\S]*fontSize: 13,/],
  ['screens/Feed.tsx', /description:[\s\S]*fontSize: 13,[\s\S]*lineHeight: 18,/],
  ['app/photo-details.tsx', /username:[\s\S]*fontSize: 14,/],
  ['app/(tabs)/challenges.tsx', /fontSize: 21,/],
  ['app/challenge-details.tsx', /fontSize: 23,/],
  ['app/settings.tsx', /fontSize: 19,/],
  ['components/common/ChallengeCard.tsx', /fontSize: 13,/],
  ['components/common/ChallengeCard.tsx', /challengeDescription:[\s\S]*fontSize: 13,[\s\S]*lineHeight: 19,/],
  ['components/common/CommentAndCount.tsx', /fontSize: 15,/],
  ['components/common/ProfileStats.tsx', /fontSize: 17,/],
];

for (const [file, pattern] of compactExpectations) {
  assert.match(read(file), pattern, `${file} should use balanced compact signed-in text sizing`);
}

assert.match(read('screens/Feed.tsx'), /dayBadgeText:[\s\S]*fontSize: 10,/);
assert.match(read('components/common/ChallengeCard.tsx'), /fontSize: 11,/);
assert.match(read('app/login.tsx'), /fontSize:/);
assert.match(read('app/onboarding.tsx'), /fontSize: 36,/);

console.log('authenticated compact typography regression checks passed');
