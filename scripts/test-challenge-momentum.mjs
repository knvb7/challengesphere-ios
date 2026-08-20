import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');

const helperSource = read('utils/challengeMomentum.ts');
const compiled = ts.transpileModule(helperSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const helperModule = { exports: {} };
new Function('exports', 'module', compiled)(helperModule.exports, helperModule);
const { getChallengeMotivation } = helperModule.exports;

const snapshot = (overrides = {}) => ({
  state: 'NONE',
  totalDays: 30,
  completedDays: 4,
  remainingRequiredCheckIns: 26,
  remainingAvailableCheckIns: 26,
  submittedToday: false,
  ...overrides,
});

const publicInput = (overrides = {}) => ({
  challengeMode: 'DAILY',
  status: 'active',
  isPrivate: false,
  momentum: snapshot(),
  ...overrides,
});

assert.equal(
  getChallengeMotivation(publicInput()),
  null,
  'public challenges outside their final window should not render motivation',
);
assert.equal(
  getChallengeMotivation(publicInput({
    momentum: snapshot({ state: 'FINAL_STRETCH', remainingRequiredCheckIns: 3 }),
  }))?.compactLabel,
  'Final stretch · 3 check-ins to go',
);
assert.equal(
  getChallengeMotivation(publicInput({
    momentum: snapshot({
      state: 'FINISH_STRONG',
      remainingRequiredCheckIns: 20,
      remainingAvailableCheckIns: 2,
    }),
  }))?.compactLabel,
  'Finish strong · 2 check-ins left',
  'finish-strong copy must describe remaining opportunities, not an unreachable target',
);
assert.equal(
  getChallengeMotivation(publicInput({ challengeMode: 'ONE_OFF' })),
  null,
);
assert.equal(
  getChallengeMotivation(publicInput({ status: 'completed' })),
  null,
);
assert.equal(
  getChallengeMotivation(publicInput({ status: 'upcoming' })),
  null,
  'upcoming challenges should not render momentum',
);
assert.equal(
  getChallengeMotivation(publicInput({
    momentum: snapshot({ completedDays: 30, remainingRequiredCheckIns: 0 }),
  })),
  null,
);

const privateInput = (overrides = {}) => ({
  challengeMode: 'DAILY',
  status: 'active',
  isPrivate: true,
  privateCrewState: 'ACTIVE',
  momentum: snapshot(),
  privateRank: { rank: 4, totalParticipants: 6 },
  ...overrides,
});

assert.equal(
  getChallengeMotivation(privateInput())?.compactLabel,
  '#4 in your crew · Upload today and keep climbing',
);
assert.equal(
  getChallengeMotivation(privateInput({ privateRank: { rank: 1, totalParticipants: 6 } }))?.compactLabel,
  'You’re #1 · Upload today to hold the lead',
);
assert.equal(
  getChallengeMotivation(privateInput({ momentum: snapshot({ submittedToday: true }) }))?.message,
  'You’re #4 of 6. Today’s check-in is done—keep the momentum going',
);
assert.equal(
  getChallengeMotivation(privateInput({ privateCrewState: 'LOBBY' })),
  null,
  'private crews in the lobby must not render momentum',
);
assert.equal(
  getChallengeMotivation(privateInput({
    momentum: snapshot({ completedDays: 0 }),
    privateRank: { rank: 1, totalParticipants: 6 },
  }))?.compactLabel,
  'Upload your first check-in to join the leaderboard',
  'zero-check-in users must not be motivated with a synthetic rank',
);
assert.equal(
  getChallengeMotivation(privateInput({
    privateRank: { rank: 1, totalParticipants: 1 },
  })),
  null,
  'solo crews must not receive comparative rank copy outside a goal window',
);

const typeSource = read('types/api.ts');
const serviceSource = read('services/challengeService.ts');
const hookSource = read('hooks/useChallenges.ts');
const cardSource = read('components/challenges/MyChallengeGalleryCard.tsx');
const detailSource = read('components/common/ChallengeDetailsOverview.tsx');
const detailScreenSource = read('app/challenge-details.tsx');
const leaderboardSource = read('app/leaderboard.tsx');
const settingsSource = read('app/settings.tsx');
const inboxSource = read('app/notifications.tsx');
const pushSource = read('services/pushNotificationService.ts');
const preloaderSource = read('components/AppDataPreloader.tsx');

for (const field of [
  'remainingRequiredCheckIns',
  'remainingAvailableCheckIns',
  'submittedToday',
  'privateRank',
  'notifyOnMotivation',
]) {
  assert.match(typeSource, new RegExp(field), `API types should include ${field}`);
}
assert.match(serviceSource, /params\.append\('timezone', timezone \|\| 'UTC'\)/);
assert.match(serviceSource, /\/challenges\/\$\{challengeId\}\/my-progress\?\$\{params\.toString\(\)\}/);
assert.match(hookSource, /useMyChallengeProgress/);
assert.match(
  hookSource,
  /queryKey: \['myActiveChallenges', userId, status, currentUserId, timezone\][\s\S]*getMyActiveChallenges\(userId, status, currentUserId, timezone\)/,
  'My Challenges requests and cache keys should use the device timezone',
);
assert.match(
  hookSource,
  /queryKey: challengeKeys\.progress\(challengeId, timezone\)[\s\S]*getMyChallengeProgress\(challengeId, timezone\)/,
  'personal progress requests and cache keys should use the device timezone',
);
assert.match(
  preloaderSource,
  /queryKey: \['myActiveChallenges', userId, undefined, userId, timezone\][\s\S]*getMyActiveChallenges\(userId, undefined, userId, timezone\)/,
  'the preload cache key should match the timezone-aware My Challenges hook',
);
assert.match(hookSource, /challengeKeys\.detail\(request\.challengeId\)/);
assert.match(hookSource, /challengeKeys\.progress\(request\.challengeId\)/);
assert.match(hookSource, /userKeys\.challengeLeaderboard\(request\.challengeId, LeaderboardType\.OVERALL\)/);
assert.doesNotMatch(
  cardSource,
  /getChallengeMotivation|Finish strong|momentumRow|momentumBadge|momentumText/,
  'challenge preview cards should not render finish-strong or momentum decoration',
);
assert.doesNotMatch(
  detailSource,
  /momentumPanel|Group momentum|getChallengeMotivation/,
  'challenge details should not duplicate ranking motivation in a standalone panel',
);
assert.match(
  detailScreenSource,
  /visiblePersonalProgress = viewerIsParticipant \? personalProgress : undefined[\s\S]*momentum=\{visiblePersonalProgress\?\.momentum\}/,
  'cached participant progress must be hidden immediately after the viewer leaves',
);
assert.match(
  detailScreenSource,
  /privateRankSummary = challengeDetails\.isPrivate && isParticipant && leaderboardData\?\.currentUserRank\?\.rank/,
  'cached private rank must be hidden immediately after the viewer leaves',
);
assert.match(leaderboardSource, /rankMotivation\.compactLabel/);
assert.match(settingsSource, /title="Progress & ranking alerts"/);
assert.match(settingsSource, /preferences: \{ notifyOnMotivation: value \}/);
assert.match(inboxSource, /type === 'momentum_milestone'[\s\S]*pathname: '\/\(tabs\)\/challenges'[\s\S]*openChallengeId[\s\S]*notificationRouteNonce/);
assert.match(pushSource, /type === 'MOMENTUM_MILESTONE'[\s\S]*pathname: '\/\(tabs\)\/challenges'[\s\S]*openChallengeId[\s\S]*notificationRouteNonce/);
assert.match(
  read('app/(tabs)/challenges.tsx'),
  /routeActionKey = `\$\{uploadChallengeId\}:\$\{openChallengeId\}:\$\{focusChallengeId\}:\$\{notificationRouteNonce\}`[\s\S]*handleChallengePress\(targetChallenge\)/,
  'momentum routes should resolve the authenticated My Challenges row before opening details',
);
assert.doesNotMatch(
  helperSource,
  /medal|ribbon|gold|silver|bronze/i,
  'momentum presentation should reserve medal visuals for the later medal system',
);

console.log('challenge momentum checks passed');
