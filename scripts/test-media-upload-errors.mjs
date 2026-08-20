import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const source = readFileSync(new URL('../services/mediaUploadErrors.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});

const module = { exports: {} };
new Function('exports', 'module', outputText)(module.exports, module);

const { shouldRetryDirectUploadError, shouldUseFetchFallbackForUploadError } = module.exports;

assert.equal(
  shouldUseFetchFallbackForUploadError(
    new Error('Unable to upload the file: Error Domain=NSURLErrorDomain Code=-1009 "The Internet connection appears to be offline."')
  ),
  true,
  'offline iOS URLSession upload failures should fall back to fetch'
);

assert.equal(
  shouldUseFetchFallbackForUploadError(
    new Error('Unable to upload the file: Error Domain=NSURLErrorDomain Code=-1005 "The network connection was lost."')
  ),
  true,
  'lost iOS URLSession upload connections should fall back to fetch'
);

assert.equal(
  shouldUseFetchFallbackForUploadError(new Error('NSPOSIXErrorDomain Code=40 "Message too long"')),
  true,
  'signed URL message-too-long failures should fall back to fetch'
);

assert.equal(
  shouldUseFetchFallbackForUploadError(new Error('S3 upload failed (403): SignatureDoesNotMatch')),
  false,
  'HTTP authorization failures should not be retried with a different transport'
);

assert.equal(
  shouldRetryDirectUploadError(
    new Error('Unable to upload the file: Error Domain=NSURLErrorDomain Code=-1005 "The network connection was lost."')
  ),
  true,
  'lost iOS URLSession upload connections should retry the direct S3 upload'
);

assert.equal(
  shouldRetryDirectUploadError(new TypeError('Network request failed')),
  true,
  'React Native fetch network failures should retry the direct S3 upload'
);

assert.equal(
  shouldRetryDirectUploadError(new Error('S3 upload failed (500): upstream error')),
  true,
  'S3 5xx responses should retry the direct S3 upload'
);

assert.equal(
  shouldRetryDirectUploadError(new Error('S3 upload failed (429): too many requests')),
  true,
  'S3 429 responses should retry the direct S3 upload'
);

assert.equal(
  shouldRetryDirectUploadError(new Error('S3 upload failed (403): SignatureDoesNotMatch')),
  false,
  'signature failures should not retry as transient network failures'
);

assert.equal(
  shouldRetryDirectUploadError(new Error('S3 upload failed (400): invalid request')),
  false,
  'S3 400 responses should not retry as transient network failures'
);

console.log('media upload retry classifier tests passed');
