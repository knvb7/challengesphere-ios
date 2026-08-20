import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readSource = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const createSource = readSource('app/(tabs)/create.tsx');
const challengesSource = readSource('app/(tabs)/challenges.tsx');
const challengeServiceSource = readSource('services/challengeService.ts');
const deviceTimeSource = readSource('utils/deviceTime.ts');

assert.match(
  createSource,
  /updateForm\('startDate', toLocalCalendarDate\(date\)\)/,
  'Challenge creation must serialize the calendar date with local date fields',
);
assert.doesNotMatch(
  createSource,
  /updateForm\('startDate',[\s\S]{0,100}toISOString\(/,
  'Challenge creation must not convert a date-only selection to UTC',
);
assert.match(
  createSource,
  /minimumDate=\{startOfLocalDay\(\)\}/,
  'The date-only picker minimum must not include the current clock time',
);
assert.equal(
  (createSource.match(/timeZoneName=\{deviceTimeZone\}/g) || []).length,
  2,
  'Both native challenge date pickers must use the device timezone',
);

assert.match(
  challengeServiceSource,
  /post<SubmissionResponse>\('\/submissions',[\s\S]{0,180}timezone: getDeviceTimeZone\(\)/,
  'New submissions must send the device timezone',
);
assert.match(
  challengeServiceSource,
  /put<SubmissionResponse>\(`\/submissions\/\$\{submissionId\}`,[\s\S]{0,180}timezone: getDeviceTimeZone\(\)/,
  'Submission reuploads must send the device timezone',
);
assert.match(
  deviceTimeSource,
  /date\.getFullYear\(\)[\s\S]*date\.getMonth\(\)[\s\S]*date\.getDate\(\)/,
  'Calendar serialization must use local date components',
);
assert.match(
  challengesSource,
  /const startDate = parseCalendarDate\(challenge\.startDate\)/,
  'Upload eligibility must parse date-only challenge starts in local time',
);

console.log('Calendar and submission timezone regression checks passed.');
