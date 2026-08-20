import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const packageJson = JSON.parse(read('package.json'));
const app = JSON.parse(read('app.json'));
const authService = read('services/authService.ts');
const apiClient = read('services/apiClient.ts');
const secureStorage = read('services/secureAuthStorage.ts');
const androidManifest = read('android/app/src/main/AndroidManifest.xml');

assert.equal(
  packageJson.dependencies['expo-secure-store'],
  '~15.0.8',
  'Expo SDK 54 must use its bundled SecureStore version',
);
assert.match(secureStorage, /from 'expo-secure-store'/);
assert.match(
  secureStorage,
  /SecureStore\.WHEN_UNLOCKED_THIS_DEVICE_ONLY/,
  'iOS credentials must not migrate through device backups',
);
assert.match(
  secureStorage,
  /AsyncStorage\.removeItem\(key\)/,
  'legacy plaintext tokens must be removed after migration',
);
assert.doesNotMatch(
  authService,
  /AsyncStorage\.(?:getItem|setItem)\(STORAGE_KEYS\.(?:ACCESS_TOKEN|REFRESH_TOKEN)/,
  'AuthService must never read or write tokens in AsyncStorage',
);
assert.doesNotMatch(
  apiClient,
  /AsyncStorage\.(?:getItem|setItem)\(STORAGE_KEYS\.(?:ACCESS_TOKEN|REFRESH_TOKEN)/,
  'ApiClient must never read or write tokens in AsyncStorage',
);
assert.match(
  authService,
  /completeRemoteLogout\(accessToken, refreshToken\)/,
  'logout must retain both tokens long enough to revoke both server-side',
);
assert.match(
  authService,
  /Authorization:\s*`Bearer \$\{accessToken\}`/,
  'remote logout must explicitly send the captured access token after local secure storage is cleared',
);
assert.equal(app.expo.android.allowBackup, false, 'Expo config must disable Android app backups');
assert.match(androidManifest, /android:allowBackup="false"/);

const secureStorePlugin = app.expo.plugins.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-secure-store',
);
assert.deepEqual(
  secureStorePlugin,
  ['expo-secure-store', { configureAndroidBackup: false }],
  'SecureStore must not create backup rules when app backup is globally disabled',
);

console.log('secure auth storage regression checks passed');
