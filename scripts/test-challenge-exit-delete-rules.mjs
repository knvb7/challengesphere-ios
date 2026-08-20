import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('../app/challenge-details.tsx', import.meta.url), 'utf8');
const policy = fs.readFileSync(new URL('../utils/challengeDeletion.ts', import.meta.url), 'utf8');
const backend = fs.readFileSync(
  new URL('../../challengesphere/src/main/java/com/ironside/challengesphere/service/impl/ChallengeServiceImpl.java', import.meta.url),
  'utf8',
);

assert.match(policy, /MAX_CHALLENGE_DELETE_MEMBERS = 3/, 'delete limit should be 3 members');
assert.match(policy, /MAX_CHALLENGE_DELETE_AGE_DAYS = 3/, 'delete limit should be 3 days');
assert.match(
  screen,
  /memberCount: participantsData\?\.totalParticipants,[\s\S]*?createdAt: challengeData\?\.createdAt/,
  'delete visibility should use fresh server data',
);
assert.match(
  screen,
  /\{canDeleteThisChallenge && \([\s\S]*?Delete challenge/,
  'delete should only render when the policy allows it',
);
assert.match(
  screen,
  /const canExitChallenge = isParticipant && !challengeDetails\.isCreator && !challengeIsDeleted/,
  'members should be able to exit from a challenge page even after it ends',
);
assert.match(screen, /New: You can exit this challenge here\./, 'the exit change should be explained simply');
assert.match(screen, /This is a new option\./, 'the delete change should be explained simply');
assert.match(
  backend,
  /!isChallengeDeletable\(challenge, allParticipantLinks, System\.currentTimeMillis\(\)\)/,
  'the backend should enforce the same delete policy',
);

console.log('Challenge exit and delete rule checks passed.');
