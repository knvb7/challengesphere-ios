import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const easConfig = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
const photoDeliveryTest = readFileSync(
  new URL('./test-photo-delivery-performance.mjs', import.meta.url),
  'utf8'
);

for (const profile of ['preview', 'production']) {
  const apiBaseUrl = easConfig.build?.[profile]?.env?.EXPO_PUBLIC_API_BASE_URL;
  assert.match(
    apiBaseUrl,
    /^https:\/\/pqea9mim4b\.execute-api\.ap-south-1\.amazonaws\.com\/api\/v1$/,
    `${profile} builds should target the ap-south-1 HTTPS API Gateway`,
  );
}

assert.match(
  photoDeliveryTest,
  /challengesphere-submissions-prod-ap-south-1\.s3\.ap-south-1\.amazonaws\.com/,
  'frontend S3 cache fixtures should use the ap-south-1 media bucket'
);
assert.doesNotMatch(
  photoDeliveryTest,
  /s3\.us-east-1\.amazonaws\.com|challengesphere-submissions-1/,
  'frontend S3 cache fixtures should not reference old us-east media buckets'
);

console.log('frontend production region checks passed');
