import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../app/challenge-submissions.tsx', import.meta.url), 'utf8');
const utilitySource = readFileSync(new URL('../utils/memoirCollage.ts', import.meta.url), 'utf8');
const require = createRequire(import.meta.url);

function loadMemoirUtility() {
  const output = ts.transpileModule(utilitySource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, require });
  return module.exports;
}

assert(
  !source.includes('/collage'),
  'memoir generation should not call the backend collage endpoint'
);

assert(
  !source.includes('downloadAsync(endpoint'),
  'memoir generation should not download a backend-rendered image'
);

assert(
  source.includes('captureRef('),
  'memoir generation should capture a frontend-rendered view'
);

assert.match(utilitySource, /MEMOIR_MAX_PHOTOS\s*=\s*12/, 'memoir should render up to twelve photos');
assert.match(utilitySource, /remainingPhotoCount/, 'memoir data should report additional eligible photos');
assert.match(source, /logo-mark-clean\.png/, 'memoir should display the ChallengeSphere logo mark');
assert.match(source, />challengesphere<\/Text>/, 'memoir should display the lowercase ChallengeSphere wordmark');
assert.match(source, /MEMOIR_TILE_LAYOUTS/, 'memoir should compose photos using adaptive editorial layouts');
assert.match(source, /memoirMetaRow/, 'memoir should give the challenge title and journey context clear hierarchy');
assert.match(source, /memoirCreatedDate/, 'memoir should finish with personal creation metadata');
assert.match(source, /remainingPhotoCount > 0/, 'memoir should render an overflow state when photos are omitted');
assert.match(source, /\+\{data\.remainingPhotoCount\}/, 'memoir overflow tile should state the additional photo count');
assert.match(
  source,
  /CHALLENGESPHERE APP · GET IT ON GOOGLE PLAY/,
  'memoir should identify ChallengeSphere as an app and tell viewers where to get it',
);
assert.match(
  source,
  /const hasCollageSubmissions\s*=\s*isOwnTimeline\s*&&\s*collageSubmissionCount > 0/,
  'memoir should stay available whenever the owner has a submission',
);

const { createMemoirCaptureData, selectMemoirPhotos } = loadMemoirUtility();
const photos = Array.from({ length: 14 }, (_, index) => `https://photos.test/${index + 1}.jpg`);
const captureData = createMemoirCaptureData({
  submissions: [
    {
      id: 1,
      dayNumber: 1,
      mediaUrls: [...photos, 'https://photos.test/clip.mp4'],
      description: 'Day one',
      submissionTime: '2026-05-01T00:00:00Z',
    },
  ],
  challengeTitle: 'Hello',
  challengeDateRange: '1 - 25 May',
  summaryDaysValue: '12/90',
  generatedAt: new Date('2026-05-25T00:00:00Z'),
});

assert.equal(captureData.photos.length, 12);
assert.equal(captureData.remainingPhotoCount, 2);
assert.ok(captureData.photos.every((photo) => !photo.uri.endsWith('.mp4')));
assert.equal(captureData.photos[0].uri, photos[0]);
assert.equal(captureData.photos.at(-1).uri, photos.at(-1));
assert.equal(selectMemoirPhotos(captureData.photos, 1)[0].uri, photos.at(-1));

console.log('client memoir generation regression checks passed');
