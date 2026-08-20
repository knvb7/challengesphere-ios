import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const mediaServiceSource = read('services/mediaService.ts');
const challengeTabSource = read('app/(tabs)/challenges.tsx');
const challengeDetailsSource = read('app/challenge-details.tsx');
const challengeSubmissionsSource = read('app/challenge-submissions.tsx');
const submissionComposerSource = read('components/common/SubmissionComposer.tsx');

assert.match(
  mediaServiceSource,
  /const preparedImages = await Promise\.all\([\s\S]*prepareSubmissionPhotoForUpload/,
  'submission photos should be compressed concurrently before upload'
);
assert.match(
  mediaServiceSource,
  /const presignedResponse = await this\.generatePresignedUrls\(\{\s*userId,\s*mediaFiles,\s*\}\)/,
  'all submission upload URLs should be requested in one backend round trip'
);
assert.match(
  mediaServiceSource,
  /return Promise\.all\(\s*preparedImages\.map/,
  'independent submission photos should upload concurrently'
);

for (const [label, source] of [
  ['my challenges upload', challengeTabSource],
  ['challenge details upload', challengeDetailsSource],
  ['challenge submissions upload', challengeSubmissionsSource],
]) {
  assert.match(source, /SubmissionComposer/, `${label} should use the shared submission composer`);
  assert.match(source, /<KeyboardAvoidingView/, `${label} should lift its composer with the keyboard`);
}
assert.match(submissionComposerSource, /maxLength=\{500\}/, 'shared caption should enforce the 500 character limit');
assert.match(submissionComposerSource, /caption\.length\}\/500/, 'shared caption should show length feedback');

console.log('media upload performance and caption checks passed');
