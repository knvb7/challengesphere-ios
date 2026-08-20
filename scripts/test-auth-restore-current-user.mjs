import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

const authServiceSource = readText('services/authService.ts');
const secureStorageSource = readText('services/secureAuthStorage.ts');

assert.match(
  authServiceSource,
  /apiClient\.get<UserProfileResponse>\('\/auth\/me'\)/,
  'current user hydration should use the authenticated /auth/me endpoint'
);
assert.doesNotMatch(
  authServiceSource,
  /\/users\?userId=\$\{storedUser\.id\}/,
  'current user hydration should not trust a locally stored userId for /users lookup'
);
assert.match(
  authServiceSource,
  /return await this\.getCurrentUser\(\);/,
  'session restore should fetch the canonical current user when the API is reachable'
);
assert.doesNotMatch(
  authServiceSource,
  /const storedUser = await this\.getStoredUser\(\);\s*if \(!storedUser\?\.id\)/,
  'session restore should not fail solely because local user_data is missing or stale'
);
assert.match(
  authServiceSource,
  /restoreStoredUserAfterRequestFailure\(error, storedUser\)/,
  'session restore should recover the stored user after an offline request failure'
);
assert.match(
  authServiceSource,
  /authData\.user \?\? this\.createLegacyAuthUser\(authData\)/,
  'legacy auth responses should also seed the offline user snapshot'
);
assert.match(
  authServiceSource,
  /status === 401 \|\| status === 403/,
  'confirmed authentication rejection must not restore a cached identity'
);
assert.match(
  authServiceSource,
  /remainingAccessToken[\s\S]*!remainingAccessToken \|\| !storedUser/,
  'offline recovery must still require locally stored credentials'
);
assert.match(
  secureStorageSource,
  /SecureStore\.setItemAsync\(USER_SNAPSHOT_KEY, serializedUser, SECURE_STORE_OPTIONS\)/,
  'the offline auth identity should persist in device-only secure storage'
);
assert.match(
  secureStorageSource,
  /MAX_USER_SNAPSHOT_BYTES = 1900/,
  'the offline identity must stay below SecureStore platform size limits'
);
assert.match(
  secureStorageSource,
  /const serializedUser = serializeUserSnapshot\(user\)/,
  'SecureStore should receive a bounded auth snapshot instead of the full profile response'
);
assert.match(
  secureStorageSource,
  /SecureStore\.deleteItemAsync\(USER_SNAPSHOT_KEY, SECURE_STORE_OPTIONS\)/,
  'logout should remove the persisted auth identity'
);

console.log('auth restore current user checks passed');
