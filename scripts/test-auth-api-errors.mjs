import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const {
  getApiErrorMessage,
  getApiErrorPresentation,
  getSafeErrorMessage,
  getSafeErrorTitle,
  normalizeApiError,
} = await import('../utils/apiError.ts');
const { createSingleFlight } = await import('../utils/singleFlight.ts');

assert.equal(
  getApiErrorMessage(
    { response: { data: { errorMessage: 'Email already exists' } } },
    'Registration failed.'
  ),
  'Email already exists'
);

assert.equal(
  getApiErrorMessage(
    { response: { data: { message: 'Reset service unavailable' } } },
    'Could not send reset link.'
  ),
  'ChallengeSphere is temporarily unavailable. Please try again in a few minutes.'
);

assert.equal(
  getApiErrorMessage(
    {
      response: {
        status: 503,
        data: { errorMessage: 'Please reconnect Strava before syncing again.' },
      },
    },
    'Could not sync Strava.'
  ),
  'Please reconnect Strava before syncing again.'
);

assert.equal(
  getApiErrorMessage(
    { message: 'Request failed with status code 409' },
    'Registration failed.'
  ),
  'Registration failed.'
);

assert.equal(
  getApiErrorMessage(
    { message: 'Google Play services need an update' },
    'Google Sign-In failed.'
  ),
  'Google Play services need an update'
);

assert.equal(
  getApiErrorMessage(null, 'Please try again.'),
  'Please try again.'
);

assert.equal(
  getApiErrorMessage(
    { response: { status: 500, data: { errorMessage: 'Internal server error' } } },
    'Could not save your changes.'
  ),
  'Something went wrong on our side. Please try again in a moment.'
);

assert.equal(
  getApiErrorMessage(
    { response: { status: 500, data: { error: 'Internal Server Error' } } },
    'Could not load your profile.'
  ),
  'Something went wrong on our side. Please try again in a moment.'
);

const rateLimitPresentation = getApiErrorPresentation(
  {
    response: {
      status: 429,
      headers: { 'retry-after': '45' },
      data: { errorMessage: 'Too many requests', errorCode: 429 },
    },
  },
  'Could not complete that action.'
);
assert.equal(rateLimitPresentation.kind, 'rate-limit');
assert.equal(rateLimitPresentation.retryAfterSeconds, 45);
assert.equal(
  rateLimitPresentation.message,
  'Please wait 45 seconds before trying again.'
);

assert.equal(
  getApiErrorMessage(
    {
      response: {
        status: 429,
        data: { errorMessage: 'Daily upload allowance reached. Please try again tomorrow.' },
      },
    },
    'Could not upload your photo.'
  ),
  'Daily upload allowance reached. Please try again tomorrow.'
);

assert.equal(
  getApiErrorMessage(
    {
      response: {
        status: 403,
        data: { errorMessage: 'You do not have permission to upload this submission' },
      },
    },
    'Could not upload your submission.'
  ),
  'You do not have permission to upload this submission'
);

assert.equal(
  getApiErrorMessage(
    {
      response: {
        status: 409,
        data: {
          responseMessage: 'Request failed',
          error: { errorMessage: 'You are already a participant of this challenge' },
        },
      },
    },
    'Could not join the challenge.'
  ),
  'You are already a participant of this challenge'
);

assert.equal(
  getApiErrorMessage(
    { code: 'ERR_NETWORK', message: 'Network Error' },
    'Could not refresh.'
  ),
  'Check your internet connection and try again.'
);

assert.equal(
  getSafeErrorMessage(
    'S3 upload failed (403): <Error><Code>AccessDenied</Code></Error>',
    'Could not upload your photo. Please try again.'
  ),
  'Could not upload your photo. Please try again.'
);

const axiosLikeError = {
  message: 'Request failed with status code 429',
  response: {
    status: 429,
    headers: { 'retry-after': '2' },
    data: { errorMessage: 'Too many requests' },
  },
};
const normalizedError = normalizeApiError(axiosLikeError);
assert.equal(normalizedError, axiosLikeError, 'normalization should preserve the original error object');
assert.equal(axiosLikeError.response.status, 429, 'normalization should preserve HTTP metadata');
assert.equal(axiosLikeError.message, 'Please wait 2 seconds before trying again.');
assert.equal(axiosLikeError.errorKind, 'rate-limit');
assert.equal(axiosLikeError.retryAfterSeconds, 2);

const normalizedPrimitive = normalizeApiError(null, 'Could not complete the request.');
assert.equal(normalizedPrimitive.message, 'Could not complete the request.');
assert.equal(normalizedPrimitive.errorKind, 'unknown');
assert.equal(normalizedPrimitive.retryable, true);

const authenticationPresentation = getApiErrorPresentation({ response: { status: 401 } });
assert.equal(authenticationPresentation.kind, 'authentication');
assert.equal(authenticationPresentation.retryable, false);
assert.match(authenticationPresentation.message, /sign in again/i);

const timeoutPresentation = getApiErrorPresentation({
  code: 'ECONNABORTED',
  message: 'timeout of 30000ms exceeded',
});
assert.equal(timeoutPresentation.kind, 'timeout');
assert.equal(timeoutPresentation.retryable, true);
assert.match(timeoutPresentation.message, /took too long/i);

assert.equal(
  getApiErrorMessage(
    {
      response: {
        status: 502,
        data: {
          errorMessage: 'Hevy did not accept this API key. Hevy API access requires an active Hevy Pro subscription.',
        },
      },
    },
    'Could not connect Hevy.'
  ),
  'Hevy did not accept this API key. Hevy API access requires an active Hevy Pro subscription.'
);

assert.equal(
  getApiErrorMessage(
    {
      response: {
        status: 503,
        data: { errorMessage: 'Strava is not configured. Add the client ID and secret.' },
      },
    },
    'Could not connect Strava.'
  ),
  'ChallengeSphere is temporarily unavailable. Please try again in a few minutes.'
);

assert.equal(
  getApiErrorMessage(
    {
      response: {
        status: 429,
        headers: { 'retry-after': '90' },
        data: { errorMessage: 'Your upload allowance has been reached' },
      },
    },
    'Could not upload your photo.'
  ),
  'Your upload allowance has been reached. Try again in 2 minutes.'
);

assert.equal(
  getApiErrorMessage(
    { response: { status: 413, data: { errorMessage: 'Payload Too Large' } } },
    'Could not upload your photo.'
  ),
  'Choose a smaller file and try again.'
);

assert.equal(
  getApiErrorMessage(
    { response: { status: 415, data: { errorMessage: 'Unsupported Media Type' } } },
    'Could not upload your photo.'
  ),
  'Choose a supported photo and try again.'
);

assert.equal(
  getApiErrorMessage(
    { response: { status: 400, data: { errorMessage: 'Validation failed' } } },
    'Check the highlighted fields and try again.'
  ),
  'Check the highlighted fields and try again.'
);

assert.equal(
  getApiErrorMessage(
    { response: { status: 409, data: { errorMessage: 'Invalid operation state' } } },
    'This challenge can no longer be joined.'
  ),
  'This challenge can no longer be joined.'
);

const bodyRateLimit = getApiErrorPresentation({
  response: {
    status: 429,
    data: { errorMessage: 'Rate limit exceeded. Please try again in 30 seconds.' },
  },
});
assert.equal(bodyRateLimit.retryAfterSeconds, 30);
assert.equal(
  bodyRateLimit.message,
  'Please wait 30 seconds before trying again.'
);

assert.equal(
  getApiErrorPresentation({
    response: {
      status: 429,
      headers: { 'Retry-After': '7' },
      data: { errorMessage: 'Too many requests' },
    },
  }).message,
  'Please wait 7 seconds before trying again.'
);

assert.equal(
  getApiErrorPresentation({
    response: {
      data: { errorCode: 429, errorMessage: 'Too many requests', retryAfterSeconds: 12 },
    },
  }).message,
  'Please wait 12 seconds before trying again.'
);

for (const technicalMessage of [
  'Failed to execute SQL query users.findAll',
  '[{"error":"boom"}]',
  'Whitelabel Error Page',
  'An unexpected error occurred',
]) {
  assert.equal(
    getSafeErrorMessage(technicalMessage, 'Could not complete the request.'),
    'Could not complete the request.'
  );
}

assert.equal(getSafeErrorTitle('Internal Server Error'), "We're having trouble");
assert.equal(getSafeErrorTitle('Rate limiting'), 'Please slow down');
assert.equal(getSafeErrorTitle('Upload Failed'), 'Upload Failed');

assert.equal(
  getApiErrorPresentation(
    { response: { status: 405, data: { error: 'Method Not Allowed' } } },
    'That action is not available.'
  ).retryable,
  false
);

assert.equal(
  getSafeErrorMessage(
    '{"timestamp":"2026-07-23T10:00:00Z","status":500,"path":"/api/v1/users"}',
    'Could not load your profile.'
  ),
  'Could not load your profile.'
);

assert.equal(
  getSafeErrorMessage(
    'authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secret.signature',
    'Could not complete the request.'
  ),
  'Could not complete the request.'
);

const [apiClientSource, authServiceSource, queryProviderSource] = await Promise.all([
  readFile(new URL('../services/apiClient.ts', import.meta.url), 'utf8'),
  readFile(new URL('../services/authService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../providers/QueryProvider.tsx', import.meta.url), 'utf8'),
]);
assert.match(apiClientSource, /if \(statusCode === 401 && originalRequest/);
assert.doesNotMatch(apiClientSource, /statusCode === 401 \|\| statusCode === 403/);
assert.match(apiClientSource, /refreshStatus === 401 \|\| refreshStatus === 403/);
assert.match(apiClientSource, /createSingleFlight/);
assert.doesNotMatch(apiClientSource, /Promise\.reject\(error\)/);
assert.match(apiClientSource, /refreshGeneration !== this\.authGeneration/);
assert.match(apiClientSource, /enqueueAuthStorageMutation/);
assert.match(apiClientSource, /token && !config\.headers\.Authorization/);
assert.match(authServiceSource, /apiClient\.refreshAuthToken\(\)/);
assert.match(authServiceSource, /apiClient\.setAuthSession/);
assert.doesNotMatch(authServiceSource, /clearAuthStorage|writeAccessToken|writeRefreshToken/);
assert.match(queryProviderSource, /error\?\.retryable === false/);
assert.match(queryProviderSource, /status >= 400 && error\?\.response\?\.status < 500/);

let operationCount = 0;
let releaseFirstOperation;
const runSingleFlight = createSingleFlight(() => {
  operationCount += 1;
  if (operationCount === 1) {
    return new Promise((resolve) => {
      releaseFirstOperation = resolve;
    });
  }
  return Promise.resolve('next result');
});

const parallelRuns = [runSingleFlight(), runSingleFlight(), runSingleFlight()];
assert.equal(operationCount, 1, 'parallel callers must share one refresh operation');
releaseFirstOperation('shared result');
assert.deepEqual(
  await Promise.all(parallelRuns),
  ['shared result', 'shared result', 'shared result']
);
assert.equal(await runSingleFlight(), 'next result');
assert.equal(operationCount, 2, 'a later request may start a new refresh operation');

console.log('API errors are normalized into user-friendly messages');
