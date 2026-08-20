import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');

const types = read('types/api.ts');
assert.match(types, /interface SubmissionPreviewItem/);
assert.match(types, /interface ChallengeSubmissionPreview/);
assert.match(types, /interface SubmissionPreviewsRequest/);

const service = read('services/challengeService.ts');
assert.match(service, /getSubmissionPreviews/);
assert.match(service, /['"]\/submissions\/previews['"]/);
assert.match(service, /SUBMISSION_PREVIEW_BATCH_SIZE\s*=\s*50/);
assert.match(service, /Promise\.all/);

const hooks = read('hooks/useChallenges.ts');
assert.match(hooks, /submissionPreviewsRoot:/);
assert.match(hooks, /submissionPreviews:/);
assert.match(hooks, /useSubmissionPreviews/);
assert.match(
  hooks,
  /invalidateQueries\(\{\s*queryKey:\s*challengeKeys\.submissionPreviewsRoot\(\)\s*\}\)/,
);

const previewPath = 'components/common/ChallengeSubmissionPreview.tsx';
assert.ok(existsSync(path.join(root, previewPath)), `${previewPath} should exist`);
const preview = read(previewPath);
assert.match(preview, /No submissions yet\./);
assert.match(preview, /Be the first one to submit!/);
assert.match(preview, /User submissions/);
assert.match(preview, /hiddenCount/);
assert.match(preview, /createCachedRemoteImageSource/);
assert.match(preview, /onSubmissionPress/);
assert.match(preview, /onViewAll/);
assert.match(preview, /onError/);
assert.match(preview, /missingSlotCount\s*=\s*compact\s*\?\s*Math\.max\(0,\s*4 - visibleSubmissions\.length\)\s*:\s*0/);
assert.match(preview, /expandedSingleSubmission/);
assert.match(preview, /thumbnailButtonExpandedSingle/);
assert.match(preview, /thumbnailSpacer/);
assert.match(preview, /Array\.from\(\{\s*length:\s*missingSlotCount\s*\}/);

const challengeCard = read('components/common/ChallengeCard.tsx');
assert.match(challengeCard, /ChallengeSubmissionPreview/);
assert.match(challengeCard, /previewLoading/);
assert.match(challengeCard, /onPreviewSubmissionPress/);

const thumbStrip = read('components/challenges/ChallengePreviewThumbStrip.tsx');
assert.match(thumbStrip, /hiddenCount/);
assert.match(thumbStrip, /createCachedRemoteImageSource/);
assert.match(thumbStrip, /No submissions yet\. Be the first one to post!/);
assert.match(thumbStrip, /maxSlots = 7/);

for (const file of [
  'app/(tabs)/challenges.tsx',
  'app/(tabs)/global.tsx',
  'screens/Profile.tsx',
  'app/user-profile.tsx',
]) {
  assert.match(read(file), /useSubmissionPreviews/);
  assert.doesNotMatch(read(file), /<ChallengeSubmissionPreview/, `${file} should not render the large preview block inline`);
}

assert.match(
  read('app/(tabs)/challenges.tsx'),
  /useSubmissionPreviews\(filteredChallengeIds,\s*undefined,\s*filteredChallengeIds\.length > 0\)/,
  'My Challenges should show challenge-wide recent submissions, not only the current user submissions',
);
assert.match(read('app/user-profile.tsx'), /previewUserId/);
assert.match(
  read('screens/Profile.tsx'),
  /useSubmissionPreviews\(profileChallengeIds,\s*targetUserId,\s*profileChallengeIds\.length > 0\)/,
);

const overview = read('components/common/ChallengeDetailsOverview.tsx');
assert.match(overview, /ChallengeSubmissionPreview/);
assert.match(overview, /submissionPreview/);

for (const detail of ['app/challenge-details.tsx', 'app/global-challenge-details.tsx']) {
  const source = read(detail);
  assert.match(source, /useSubmissionPreviews/, `${detail} should load submission previews`);
  assert.match(source, /submissionPreview=/);
  assert.match(source, /refetchPreviews/);
}
assert.match(read('app/challenge-details.tsx'), /previewUserId/);

console.log('challenge submission preview checks passed');
