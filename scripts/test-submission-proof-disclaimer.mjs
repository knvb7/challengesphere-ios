import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const disclaimerPath = new URL('../utils/submissionProofDisclaimer.ts', import.meta.url);
assert.equal(existsSync(disclaimerPath), false, 'the image-upload disclaimer helper should stay removed');

const composerSource = readFileSync(new URL('../components/common/SubmissionComposer.tsx', import.meta.url), 'utf8');
const pickerSources = [
  ['challenges tab upload picker', '../app/(tabs)/challenges.tsx'],
  ['challenge details quick upload picker', '../app/challenge-details.tsx'],
  ['challenge submissions upload picker', '../app/challenge-submissions.tsx'],
].map(([label, path]) => [label, readFileSync(new URL(path, import.meta.url), 'utf8')]);

assert.doesNotMatch(
  composerSource,
  /onBeforeChoose/,
  'the shared photo chooser should open directly without a pre-picker gate',
);

for (const [label, source] of pickerSources) {
  assert.doesNotMatch(
    source,
    /submissionProofDisclaimer|showSubmissionProofDisclaimerOnce|onBeforeChoose/,
    `${label} should open without an upload disclaimer`,
  );
}

console.log('image upload opens without disclaimer checks passed');
