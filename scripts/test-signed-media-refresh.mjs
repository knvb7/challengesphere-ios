import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const refreshUtilitySource = readFileSync(new URL('../utils/signedMediaRefresh.ts', import.meta.url), 'utf8');
const queryProviderSource = readFileSync(new URL('../providers/QueryProvider.tsx', import.meta.url), 'utf8');
const recoveryHookSource = readFileSync(new URL('../hooks/useSignedMediaRecovery.ts', import.meta.url), 'utf8');

const { outputText } = ts.transpileModule(refreshUtilitySource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});
const refreshModule = { exports: {} };
new Function('exports', 'module', outputText)(refreshModule.exports, refreshModule);

const {
  isPresignedS3MediaUrl,
  isSignedMediaQueryKey,
  SIGNED_MEDIA_QUERY_ROOTS,
} = refreshModule.exports;

assert.equal(
  isPresignedS3MediaUrl(
    'https://challengesphere-submissions-prod-ap-south-1.s3.ap-south-1.amazonaws.com/submissions/user_3/photo.jpg?X-Amz-Date=20260718T100000Z&X-Amz-Expires=21600&X-Amz-Signature=abc'
  ),
  true,
  'virtual-hosted S3 GET URLs should be eligible for recovery'
);
assert.equal(
  isPresignedS3MediaUrl(
    'https://s3.ap-south-1.amazonaws.com/challengesphere-submissions-prod-ap-south-1/photo.jpg?X-Amz-Signature=abc'
  ),
  true,
  'path-style S3 GET URLs should be eligible for recovery'
);
assert.equal(isPresignedS3MediaUrl('submissions/user_3/photo.jpg'), false, 'bare object keys are not readable URLs');
assert.equal(isPresignedS3MediaUrl('https://example.com/photo.jpg?X-Amz-Signature=abc'), false);
assert.equal(isPresignedS3MediaUrl('https://sqs.ap-south-1.amazonaws.com/queue?X-Amz-Signature=abc'), false);

for (const [root] of SIGNED_MEDIA_QUERY_ROOTS) {
  assert.equal(isSignedMediaQueryKey([root, 'anything']), true, `${root} should refresh with signed media`);
}
assert.equal(isSignedMediaQueryKey(['notifications']), false);

assert.match(queryProviderSource, /focusManager\.setFocused\(state === 'active'\)/);
assert.match(queryProviderSource, /AppState\.addEventListener\('change', updateFocus\)/);
assert.match(queryProviderSource, /refetchOnWindowFocus:\s*'always'/);
assert.doesNotMatch(
  queryProviderSource,
  /refetchInterval:/,
  'signed URL refresh must not assume a fixed backend expiration period'
);

assert.match(recoveryHookSource, /isPresignedS3MediaUrl/);
assert.match(recoveryHookSource, /isSignedMediaQueryKey/);
assert.match(recoveryHookSource, /attemptedUrlsRef/);
assert.match(recoveryHookSource, /activeRecoveryRefresh/);
assert.match(recoveryHookSource, /invalidateQueries\(\{/);
assert.match(recoveryHookSource, /refetchType: 'active'/);

const sharedImageFiles = [
  '../components/common/PinchZoomImage.tsx',
  '../components/common/SubmissionMediaCarousel.tsx',
  '../components/common/ChallengePhotoCarousel.tsx',
  '../components/common/ChallengeDetailsOverview.tsx',
  '../components/common/AvatarImage.tsx',
  '../components/common/ChallengeSubmissionPreview.tsx',
  '../components/challenges/ChallengeTileSubmissionBack.tsx',
  '../components/challenges/ChallengePreviewThumbStrip.tsx',
];

for (const relativePath of sharedImageFiles) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  assert.match(source, /useSignedMediaRecovery/, `${relativePath} should opt into signed media recovery`);
  assert.match(source, /onError=/, `${relativePath} should recover after an image request fails`);
}

console.log('signed media refresh regression checks passed');
