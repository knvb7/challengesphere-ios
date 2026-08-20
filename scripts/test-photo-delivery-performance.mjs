import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const mediaServiceSource = readFileSync(new URL('../services/mediaService.ts', import.meta.url), 'utf8');
const remoteImageSource = readFileSync(new URL('../utils/remoteImageCache.ts', import.meta.url), 'utf8');
const feedSource = readFileSync(new URL('../screens/Feed.tsx', import.meta.url), 'utf8');
const challengeSubmissionsSource = readFileSync(new URL('../app/challenge-submissions.tsx', import.meta.url), 'utf8');
const globalSubmissionsSource = readFileSync(new URL('../app/global-submissions.tsx', import.meta.url), 'utf8');
const pinchZoomSource = readFileSync(new URL('../components/common/PinchZoomImage.tsx', import.meta.url), 'utf8');
const submissionCarouselSource = readFileSync(new URL('../components/common/SubmissionMediaCarousel.tsx', import.meta.url), 'utf8');

assert.match(
  mediaServiceSource,
  /prepareSubmissionPhotoForUpload/,
  'submission uploads should prepare photos before sending originals to S3'
);
assert.match(
  mediaServiceSource,
  /MAX_SUBMISSION_PHOTO_LONG_EDGE\s*=\s*1600/,
  'submission photo preparation should bound the longest displayed edge'
);
assert.match(
  mediaServiceSource,
  /ImageManipulator\.ImageManipulator\.manipulate/,
  'submission photo preparation should use the supported contextual Expo manipulation API'
);

const { outputText } = ts.transpileModule(remoteImageSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});
const cacheModule = { exports: {} };
new Function('exports', 'module', outputText)(cacheModule.exports, cacheModule);
const { createCachedRemoteImageSource } = cacheModule.exports;

assert.equal(
  createCachedRemoteImageSource(
    'https://challengesphere-submissions-prod-ap-south-1.s3.ap-south-1.amazonaws.com/submissions/user_3/photo.jpg?X-Amz-Signature=abc&X-Amz-Date=20260523T064204Z'
  ).cacheKey,
  'https://challengesphere-submissions-prod-ap-south-1.s3.ap-south-1.amazonaws.com/submissions/user_3/photo.jpg',
  'S3 read URL cache keys should remain stable when a signature refreshes'
);
assert.equal(
  createCachedRemoteImageSource('https://img.example.com/photo.jpg?width=300').cacheKey,
  'https://img.example.com/photo.jpg?width=300',
  'non-S3 URL query parameters must remain part of image cache identity'
);

for (const source of [challengeSubmissionsSource, globalSubmissionsSource]) {
  assert.match(source, /createCachedRemoteImageSource/, 'submission photo lists should use stable remote image cache keys');
  assert.match(source, /cachePolicy="memory-disk"/, 'submission photo lists should reuse loaded images from memory and disk');
}
assert.match(feedSource, /SubmissionMediaCarousel/, 'feed should use the shared submission media carousel');
assert.match(submissionCarouselSource, /createCachedRemoteImageSource/, 'shared carousel should use stable remote image cache keys');
assert.match(submissionCarouselSource, /cachePolicy="memory-disk"/, 'shared carousel should use memory and disk caching');
assert.match(
  pinchZoomSource,
  /createCachedRemoteImageSource/,
  'full-screen submission photo viewing should share the stable image cache identity'
);
assert.match(
  pinchZoomSource,
  /<ExpoImage[\s\S]*cachePolicy="memory-disk"/,
  'full-screen submission photo viewing should render through the cached Expo image component'
);

console.log('photo delivery performance regression checks passed');
