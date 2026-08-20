import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const sourcePath = new URL('../utils/profileStatsMetrics.ts', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});

const sandbox = {
  exports: {},
  module: { exports: {} },
};
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(transpiled.outputText, sandbox, { filename: sourcePath.pathname });

const { calculateProfileStats } = sandbox.module.exports;
const now = new Date(2026, 6, 23, 12);

const challengeCardSource = fs.readFileSync(
  new URL('../components/common/ChallengeCard.tsx', import.meta.url),
  'utf8',
);
const challengeHooksSource = fs.readFileSync(
  new URL('../hooks/useChallenges.ts', import.meta.url),
  'utf8',
);
const challengeServiceSource = fs.readFileSync(
  new URL('../services/challengeService.ts', import.meta.url),
  'utf8',
);

assert.match(
  challengeCardSource,
  /daysCompleted: cappedCompletedDays[\s\S]*progressBasis: 'participation'/,
  'mapped participant challenges should retain authoritative completion inputs',
);
assert.doesNotMatch(
  challengeCardSource,
  /const percent =[\s\S]{0,180}status === 'completed'\s*\?\s*100/,
  'an expired challenge must not be forced to 100 percent',
);
assert.match(
  challengeHooksSource,
  /profileStatsSubmissionsRoot[\s\S]*'profile-stats'/,
  'the complete-history cache should not overlap paginated optimistic caches',
);
assert.match(
  challengeServiceSource,
  /getAllUserSubmissions[\s\S]*fetchRemainingPages/,
  'profile stats should fetch every submissions page',
);
assert.match(
  challengeServiceSource,
  /getMyActiveChallenges[\s\S]*firstPage\.totalPages[\s\S]*fetchRemainingPages/,
  'profile stats should fetch every participation page',
);

const metrics = calculateProfileStats({
  now,
  submissions: [
    { id: 1, challengeId: 1, dayNumber: 1, submissionTime: '2026-07-22T10:00:00+05:30', gloriesCount: 2, commentsCount: 1 },
    { id: 2, challengeId: 1, dayNumber: 2, submissionTime: '2026-07-23T10:00:00+05:30', gloriesCount: 3, commentsCount: 2 },
    { id: 2, challengeId: 1, dayNumber: 2, submissionTime: '2026-07-23T10:00:00+05:30', gloriesCount: 3, commentsCount: 2 },
    { id: 3, challengeId: 2, dayNumber: 1, submissionTime: '2026-07-21T10:00:00+05:30', gloriesCount: 1, commentsCount: 0 },
  ],
  challenges: [
    { id: 1, numberOfDays: 2, status: 'completed', startDate: '2026-07-22', joinedAt: '2026-07-22', daysCompleted: 2, progressBasis: 'participation' },
    { id: 2, numberOfDays: 30, status: 'active', startDate: '2026-07-21', joinedAt: '2026-07-21', daysCompleted: 3, progressBasis: 'participation' },
    { id: 3, numberOfDays: 10, status: 'completed', startDate: '2026-07-14', joinedAt: '2026-07-14', daysCompleted: 5, progressBasis: 'participation' },
    { id: 4, numberOfDays: 10, status: 'upcoming', startDate: '2026-08-01', daysCompleted: 0, progressBasis: 'participation' },
    { id: 5, numberOfDays: 10, status: 'deleted', startDate: '2026-07-01', daysCompleted: 0, progressBasis: 'participation' },
  ],
});

assert.equal(metrics.totalSubmissions, 3, 'duplicate submission IDs should be counted once');
assert.equal(metrics.consistencyPercentage, 67, 'consistency should weight 10 fulfilled days across 15 due days');
assert.equal(metrics.completedDueDays, 10);
assert.equal(metrics.totalDueDays, 15);
assert.equal(metrics.challengeCompletionPercentage, 50, 'only fully fulfilled ended challenges should count as completed');
assert.equal(metrics.currentStreak, 3, 'scheduled challenge days ending today should form the current streak');
assert.equal(metrics.longestStreak, 3);
assert.equal(metrics.activeDaysPerWeek, 0.8, '28-day pace should use unique active days instead of post volume');
assert.equal(metrics.totalGlories, 6, 'engagement totals should ignore duplicate rows');
assert.equal(metrics.mostActiveChallengeId, 1);
assert.equal(metrics.mostActiveChallengeCount, 2, 'most-active challenge should count distinct fulfilled days');

const lateJoin = calculateProfileStats({
  now,
  submissions: [
    { id: 10, challengeId: 10, dayNumber: 8, submissionTime: '2026-07-10T10:00:00+05:30' },
    { id: 11, challengeId: 10, dayNumber: 9, submissionTime: '2026-07-10T11:00:00+05:30' },
    { id: 12, challengeId: 10, dayNumber: 10, submissionTime: '2026-07-10T12:00:00+05:30' },
  ],
  challenges: [
    { id: 10, numberOfDays: 10, status: 'completed', startDate: '2026-07-01', joinedAt: '2026-07-08', daysCompleted: 3, progressBasis: 'participation' },
  ],
});

assert.equal(lateJoin.totalDueDays, 3, 'a late joiner should stop accruing due days at the original challenge end');
assert.equal(lateJoin.completedDueDays, 3);
assert.equal(lateJoin.challengeCompletionPercentage, 100, 'fulfilling every post-join commitment should complete the challenge');

const preJoinBackfill = calculateProfileStats({
  now,
  submissions: [
    { id: 13, challengeId: 11, dayNumber: 7, submissionTime: '2026-07-08T09:00:00+05:30' },
    { id: 14, challengeId: 11, dayNumber: 8, submissionTime: '2026-07-08T10:00:00+05:30' },
    { id: 15, challengeId: 11, dayNumber: 9, submissionTime: '2026-07-09T10:00:00+05:30' },
  ],
  challenges: [
    { id: 11, numberOfDays: 10, status: 'completed', startDate: '2026-07-01', joinedAt: '2026-07-08' },
  ],
});

assert.equal(preJoinBackfill.totalDueDays, 3);
assert.equal(preJoinBackfill.completedDueDays, 2, 'a pre-join challenge day should not satisfy a post-join obligation');
assert.equal(preJoinBackfill.challengeCompletionPercentage, 0);

const postVolume = calculateProfileStats({
  now,
  submissions: [
    { id: 16, challengeId: 12, dayNumber: 1, submissionTime: '2026-07-23T09:00:00+05:30' },
    { id: 17, challengeId: 12, dayNumber: 1, submissionTime: '2026-07-23T10:00:00+05:30' },
  ],
  challenges: [
    { id: 12, numberOfDays: 1, challengeMode: 'ONE_OFF', status: 'completed', startDate: '2026-07-23' },
  ],
});

assert.equal(postVolume.totalSubmissions, 2, 'separate posts should remain visible in the lifetime total');
assert.equal(postVolume.activeDaysPerWeek, 0.3, 'multiple posts on one day should count as one active day');
assert.equal(postVolume.mostActiveChallengeCount, 1, 'multiple posts for one challenge day should not inflate activity');

const staleStreak = calculateProfileStats({
  now,
  submissions: [
    { id: 20, challengeId: 20, dayNumber: 1, submissionTime: '2026-06-01T10:00:00+05:30' },
    { id: 21, challengeId: 20, dayNumber: 2, submissionTime: '2026-06-02T10:00:00+05:30' },
    { id: 22, challengeId: 20, dayNumber: 3, submissionTime: '2026-06-03T10:00:00+05:30' },
  ],
  challenges: [
    { id: 20, numberOfDays: 3, status: 'completed', startDate: '2026-06-01', daysCompleted: 3, progressBasis: 'participation' },
  ],
});

assert.equal(staleStreak.currentStreak, 0, 'a historical run must not be presented as a current streak');
assert.equal(staleStreak.longestStreak, 3);

const noDenominators = calculateProfileStats({
  now,
  submissions: [],
  challenges: [
    { id: 30, numberOfDays: 5, status: 'upcoming', startDate: '2026-08-01' },
  ],
});

assert.equal(noDenominators.consistencyPercentage, null, 'no due days should be unavailable rather than a failing zero');
assert.equal(noDenominators.challengeCompletionPercentage, null, 'no ended challenges should be unavailable rather than a failing zero');

console.log('profile stats strategy checks passed');
