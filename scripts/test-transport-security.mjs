import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const eas = JSON.parse(read('eas.json'));
const app = JSON.parse(read('app.json'));
const appConfig = read('app.config.ts');
const env = read('.env');
const androidManifest = read('android/app/src/main/AndroidManifest.xml');
const androidDebugManifest = read('android/app/src/debug/AndroidManifest.xml');
const androidDebugOptimizedManifest = read('android/app/src/debugOptimized/AndroidManifest.xml');
const iosInfoPlist = read('ios/challengesphere/Info.plist');

const secureApiUrl = 'https://pqea9mim4b.execute-api.ap-south-1.amazonaws.com/api/v1';

assert.equal(
  eas.build.preview.env.EXPO_PUBLIC_API_BASE_URL,
  secureApiUrl,
  'preview builds must use the HTTPS API hostname',
);
assert.equal(
  eas.build.production.env.EXPO_PUBLIC_API_BASE_URL,
  secureApiUrl,
  'production builds must use the HTTPS API hostname',
);
assert.match(
  env,
  /^EXPO_PUBLIC_API_BASE_URL=https:\/\/pqea9mim4b\.execute-api\.ap-south-1\.amazonaws\.com\/api\/v1$/m,
  'the checked-in environment must use the HTTPS API hostname',
);
assert.equal(app.expo.android.allowBackup, false, 'Expo Android configuration must disable backups');
assert.doesNotMatch(
  appConfig,
  /NSAllowsArbitraryLoads:\s*true|`http:\/\/\$\{LAN_IP\}/,
  'dynamic Expo config must not restore insecure transport exceptions',
);
assert.match(
  appConfig,
  /NSAllowsArbitraryLoads:\s*false[\s\S]*NSAllowsLocalNetworking:\s*false/,
  'dynamic Expo config must explicitly reject arbitrary and local cleartext networking',
);
assert.match(
  androidManifest,
  /android:usesCleartextTraffic="false"/,
  'the generated Android manifest must reject cleartext traffic',
);
assert.doesNotMatch(
  `${androidDebugManifest}\n${androidDebugOptimizedManifest}`,
  /android:usesCleartextTraffic="true"/,
  'debug variants must not silently permit cleartext credentials',
);
assert.doesNotMatch(
  iosInfoPlist,
  /<key>NSAllowsArbitraryLoads<\/key>\s*<true\/>/,
  'the generated iOS app must not allow arbitrary cleartext loads',
);
assert.match(
  iosInfoPlist,
  /<key>NSAllowsLocalNetworking<\/key>\s*<false\/>/,
  'the generated iOS app must not allow local cleartext networking',
);

console.log('transport security regression checks passed');
