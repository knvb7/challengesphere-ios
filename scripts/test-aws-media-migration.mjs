import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const mediaServiceSource = readFileSync(new URL('../services/mediaService.ts', import.meta.url), 'utf8');
const uploadErrorsSource = readFileSync(new URL('../services/mediaUploadErrors.ts', import.meta.url), 'utf8');
const remoteImageCacheSource = readFileSync(new URL('../utils/remoteImageCache.ts', import.meta.url), 'utf8');
const legacyShortName = 'G' + 'CS';
const legacyStorageHost = 'storage' + '.googleapis.com';
const legacyDependency = '@' + 'google-cloud/storage';
const legacyRetryConstant = 'NON_RETRYABLE_' + legacyShortName + '_ERRORS';
const legacySignatureParam = 'X-' + 'Goog';

assert.equal(
  packageJson.dependencies[legacyDependency],
  undefined,
  'React Native frontend should not carry the legacy object storage Node SDK'
);

assert.doesNotMatch(mediaServiceSource, new RegExp(`${legacyShortName}|${legacyStorageHost.replaceAll('.', '\\.')}|DEFAULT_${legacyShortName}|Direct${legacyShortName[0]}cs|Direct ${legacyShortName}`));
assert.match(mediaServiceSource, /S3/);
assert.match(mediaServiceSource, /DIRECT_UPLOAD_MAX_ATTEMPTS/);
assert.match(mediaServiceSource, /shouldRetryDirectUploadError/);
assert.match(mediaServiceSource, /presignedUrl\.split\('\?'\)\[0\]/);

assert.doesNotMatch(uploadErrorsSource, new RegExp(`${legacyShortName}|Direct${legacyShortName[0]}cs|Direct ${legacyShortName}|${legacyRetryConstant}`));
assert.match(uploadErrorsSource, /NON_RETRYABLE_DIRECT_UPLOAD_ERRORS/);
assert.match(uploadErrorsSource, /shouldRetryDirectUploadError/);
assert.match(uploadErrorsSource, /S3 upload failed/);

assert.doesNotMatch(remoteImageCacheSource, new RegExp(`${legacyShortName}|${legacySignatureParam}|${legacyStorageHost.replaceAll('.', '\\.')}`));
assert.match(remoteImageCacheSource, /X-Amz-Signature/);
assert.match(remoteImageCacheSource, /amazonaws\.com/);

console.log('AWS media migration regression checks passed');
