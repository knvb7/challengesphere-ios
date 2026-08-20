import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screenSource = readFileSync(new URL('../app/challenge-submissions.tsx', import.meta.url), 'utf8');
const challengeDetailsSource = readFileSync(new URL('../app/challenge-details.tsx', import.meta.url), 'utf8');
const challengesTabSource = readFileSync(new URL('../app/(tabs)/challenges.tsx', import.meta.url), 'utf8');
const hooksSource = readFileSync(new URL('../hooks/useChallenges.ts', import.meta.url), 'utf8');
const mediaServiceSource = readFileSync(new URL('../services/mediaService.ts', import.meta.url), 'utf8');
const composerSource = readFileSync(new URL('../components/common/SubmissionComposer.tsx', import.meta.url), 'utf8');
const uploadHeaderSource = readFileSync(new URL('../components/common/SubmissionUploadHeader.tsx', import.meta.url), 'utf8');
const chooserSource = readFileSync(new URL('../components/common/MediaSourceChooser.tsx', import.meta.url), 'utf8');
const appPressableSource = readFileSync(new URL('../components/common/AppPressable.tsx', import.meta.url), 'utf8');

assert.match(screenSource, /SubmissionComposer/, 'challenge submissions should use the shared media composer');
for (const [label, source] of [
  ['challenge submissions', screenSource],
  ['challenge details', challengeDetailsSource],
  ['challenges tab', challengesTabSource],
]) {
  assert.match(source, /SubmissionUploadHeader/, `${label} should use the shared upload header`);
}
assert.match(uploadHeaderSource, /Upload to: \{challengeName\}/, 'shared upload header should use one title format');
assert.match(uploadHeaderSource, /\{dayLabel\} • \{dateLabel\}/, 'shared upload header should use one day and date format');
assert.match(
  composerSource,
  /allowsMultipleSelection/,
  'submission image picker should allow selecting multiple photos at once'
);
assert.match(
  composerSource,
  /selectionLimit=\{MAX_SUBMISSION_PHOTOS - assets\.length\}/,
  'submission image picker should cap additional selections at the remaining photo slots'
);
assert.match(
  composerSource,
  /const canChoosePhotos = assets\.length < MAX_SUBMISSION_PHOTOS && !isSubmitting;/,
  'submission photo chooser should stay available until all photo slots are filled'
);
assert.match(
  composerSource,
  /onAssetsChange\(\[\s*\.\.\.assets,\s*\.\.\.toUploadAssets\(selected\),\s*\]\.slice\(0, MAX_SUBMISSION_PHOTOS\)\);/,
  'newly selected submission photos should be appended without replacing existing photos'
);
assert.match(
  composerSource,
  /if \(!canChoosePhotos\) return;[\s\S]*setShowChooser\(true\);/,
  'submission photo chooser should guard against stale taps while photos are selected or uploading'
);
assert.match(
  composerSource,
  /visible=\{showChooser && canChoosePhotos\}/,
  'submission photo source sheet should close when photo choosing is no longer allowed'
);
assert.match(chooserSource, /launchImageLibraryAsync/, 'shared chooser should support Gallery');
assert.match(chooserSource, /launchCameraAsync/, 'shared chooser should support Camera');
assert.match(
  appPressableSource,
  /typeof style === 'function'[\s\S]*resolveDynamicStyle[\s\S]*:\s*\[/,
  'shared pressables should pass static layout styles directly instead of wrapping them in an Android style callback'
);
assert.doesNotMatch(
  composerSource,
  /onBeforeChoose|ensureUgcPolicyAccepted/,
  'submission photo selection should not be blocked by a policy-acceptance gate'
);

assert.match(
  composerSource,
  /const canSubmit = assets\.length > 0[\s\S]*caption\.trim\(\)\.length > 0/,
  'upload submit state should require selected photos, non-empty caption, and no active upload'
);
assert.match(
  screenSource,
  /const mediaUrls =[\s\S]*?await uploadSubmissionMedia\(\s*currentUserId,\s*uploadMediaAssets,/,
  'submission screen should upload all selected photos before creating one submission'
);
assert.match(
  screenSource,
  /mediaUrls,/,
  'created submission should receive the array of uploaded media URLs'
);
assert.match(
  composerSource,
  /style=\{\[styles\.submit, !canSubmit && styles\.submitDisabled\]\}/,
  'upload submit button should use a disabled style until it can submit'
);
assert.match(
  composerSource,
  /disabled=\{!canSubmit\}/,
  'upload submit button should be disabled until caption is present'
);
assert.match(
  composerSource,
  /'Post update'/,
  'final submission action should be clearly labeled'
);
assert.match(
  composerSource,
  /\{errorMessage \? \([\s\S]*accessibilityRole="alert"[\s\S]*styles\.errorMessage/,
  'upload failures should render inside the submission composer as an accessible error banner'
);
assert.match(
  composerSource,
  /if \(!errorMessage\) return;[\s\S]*scrollRef\.current\?\.scrollToEnd\(\{ animated: true \}\)/,
  'the composer should bring an inline upload error into view automatically'
);
assert.match(
  composerSource,
  /<MediaSourceChooser[\s\S]*onError=\{\(message\)[\s\S]*onErrorChange\?\.\(message\)/,
  'photo picker failures should be forwarded to the inline composer error'
);
assert.match(
  chooserSource,
  /catch \{[\s\S]*reportError\('Photo selection failed'/,
  'photo library failures should be reported through the active upload surface'
);
assert.match(
  screenSource,
  /await createSubmissionMutation\.mutateAsync\(submissionData\);[\s\S]*?await refetch\(\);/,
  'submission screen should refetch submissions after a successful upload'
);
assert.match(
  screenSource,
  /confirmed=\{authenticityConfirmed\}[\s\S]*onConfirmedChange=\{setAuthenticityConfirmed\}[\s\S]*requireConfirmation/,
  'green-button submission flow should enable the shared composer authenticity checkbox'
);
assert.match(
  screenSource,
  /if \(!authenticityConfirmed\) \{[\s\S]*setUploadError\("Please confirm this reflects today's real effort before uploading\."\);/,
  'green-button submission flow should reject unconfirmed uploads in its submit handler'
);
assert.match(
  screenSource,
  /setUploadCaption\(""\);\s*setAuthenticityConfirmed\(false\);/,
  'green-button submission flow should reset confirmation whenever its upload draft resets'
);

for (const [label, source, startMarker, endMarker] of [
  ['challenge submissions', screenSource, 'const handleSubmitUpload = async () => {', 'const [refreshing'],
  ['challenge details', challengeDetailsSource, 'const handleSubmitUpload = async () => {', 'const handleEditChallenge'],
  ['challenges tab', challengesTabSource, 'const submitUpload = async () => {', 'const goToGlobal'],
]) {
  assert.match(source, /errorMessage=\{uploadError\}/, `${label} should show its upload error in the composer`);
  assert.match(source, /onErrorChange=\{setUploadError\}/, `${label} should let the composer clear its upload error`);

  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${label} upload handler should be discoverable`);
  const uploadHandler = source.slice(start, end);
  assert.match(uploadHandler, /catch[\s\S]*setUploadError\(/, `${label} should keep request failures on the upload screen`);
  assert.doesNotMatch(
    uploadHandler,
    /catch[\s\S]{0,180}Alert\.alert\(/,
    `${label} should not send request failures to the message host behind the modal`,
  );
}

const createSubmissionMatch = hooksSource.match(/export const useCreateSubmission[\s\S]*?onSuccess: \(response, request\) => \{([\s\S]*?)\n    \},/);
assert.ok(createSubmissionMatch, 'useCreateSubmission should define an onSuccess handler');
assert.match(
  createSubmissionMatch[1],
  /queryClient\.invalidateQueries\(\{ queryKey: \['userChallengeSubmissions'\] \}\);/,
  'create submission should invalidate day-wise user challenge submissions'
);
assert.match(
  mediaServiceSource,
  /apiClient\.post<\{\s*fileKey:\s*string\s*\}>\(\s*'\/submissions\/upload-fallback'/,
  'submission uploads should provide a backend fallback route when direct S3 connectivity fails'
);
assert.match(
  mediaServiceSource,
  /shouldRetryDirectUploadError\(error\)[\s\S]*uploadFileUriViaBackend/,
  'transient direct S3 upload failures should switch to the backend upload fallback'
);

console.log('submission upload flow regression checks passed');
