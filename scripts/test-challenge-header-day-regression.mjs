import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [challengeService, challengeDetails, challengeSubmissions, challengesTab] = await Promise.all([
  readFile(new URL('../services/challengeService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/challenge-details.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/challenge-submissions.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/(tabs)/challenges.tsx', import.meta.url), 'utf8'),
]);

assert.match(
  challengeService,
  /return response\.data\[0\];/,
  'private challenge details returned by the authorized backend must be accepted for participants',
);
assert.doesNotMatch(
  challengeService,
  /const challenge = response\.data\[0\];[\s\S]{0,180}!canViewerSeeChallenge\(challenge, currentUserId\)/,
  'getChallengeById must not reapply the creator-only discovery filter',
);

const detailsStartDate = challengeDetails.indexOf('const startDateValue =');
assert.ok(detailsStartDate >= 0, 'challenge details must resolve a start date');
const detailsStartDateBlock = challengeDetails.slice(detailsStartDate, detailsStartDate + 420);
assert.ok(
  detailsStartDateBlock.indexOf('(params.startDate as string)') < detailsStartDateBlock.indexOf('challengeData?.createdAt'),
  'the routed challenge start date must win over createdAt when an older detail payload omits startDate',
);
assert.match(
  detailsStartDateBlock,
  /crewStatus\?\.startedAt/,
  'private challenge crew activation must be available as a start-date fallback',
);

const submissionsStartDate = challengeSubmissions.indexOf('const startDateStr =');
assert.ok(submissionsStartDate >= 0, 'challenge submissions must resolve a start date');
const submissionsStartDateBlock = challengeSubmissions.slice(submissionsStartDate, submissionsStartDate + 260);
assert.ok(
  submissionsStartDateBlock.indexOf('(params.startDate as string)') < submissionsStartDateBlock.indexOf('challengeData?.createdAt'),
  'submission uploads must not replace the routed start date with createdAt',
);

assert.match(challengesTab, /headerSubtitle} numberOfLines=\{1\}/);
assert.match(challengesTab, /titleRow:\s*\{\s*flex: 1,\s*minWidth: 0,/);
assert.match(challengesTab, /titleCopy:\s*\{\s*flex: 1,\s*minWidth: 0,/);
assert.match(challengesTab, /headerActions:\s*\{[\s\S]{0,160}flexShrink: 0,/);

console.log('Challenge header and current-day regressions passed.');
