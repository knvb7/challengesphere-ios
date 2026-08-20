import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [
  types,
  service,
  hooks,
  inviteHooks,
  notificationHooks,
  globalScreen,
  challengeDetails,
  globalChallengeDetails,
] = await Promise.all([
  readFile(new URL('../types/api.ts', import.meta.url), 'utf8'),
  readFile(new URL('../services/challengeService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../hooks/useChallenges.ts', import.meta.url), 'utf8'),
  readFile(new URL('../hooks/useInvites.ts', import.meta.url), 'utf8'),
  readFile(new URL('../hooks/useNotifications.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/(tabs)/global.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/challenge-details.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/global-challenge-details.tsx', import.meta.url), 'utf8'),
]);

assert.match(types, /maxActiveChallenges:\s*number/);
assert.match(service, /participation-policy/);
assert.match(hooks, /DEFAULT_MAX_ACTIVE_CHALLENGES\s*=\s*0/);
assert.doesNotMatch(hooks, /MAX_ACTIVE_CHALLENGES\s*=\s*15/);
assert.doesNotMatch(hooks, /fetchQuery\(\{[\s\S]*participationPolicy/);
assert.doesNotMatch(hooks, /You can participate in at most/);
assert.match(hooks, /getSafeErrorMessage/);
assert.match(inviteHooks, /getApiErrorMessage/);
assert.match(notificationHooks, /getApiErrorMessage/);
assert.doesNotMatch(globalScreen, /useChallengeParticipationPolicy/);
assert.doesNotMatch(globalScreen, /maxActiveChallenges/);
assert.doesNotMatch(globalScreen, /\bMAX_ACTIVE_CHALLENGES\b/);
assert.match(challengeDetails, /onError:\s*\(error\)[\s\S]*?getApiErrorMessage\(error/);
assert.match(globalChallengeDetails, /onError:\s*\(error\)[\s\S]*?getApiErrorMessage\(error/);

console.log('Active challenge participation limit contract checks passed.');
