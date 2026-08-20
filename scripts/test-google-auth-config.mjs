import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const webClientId = '745252519059-ednontpssnid8aqer2f9s3v6aat8bl6d.apps.googleusercontent.com';
const iosClientId = '745252519059-pm0s0sqb557b38iafdrg787uilc21sle.apps.googleusercontent.com';
const androidDebugClientId = '745252519059-vd2h1mf7tv74litocl6d5esid16ng6kt.apps.googleusercontent.com';
const androidReleaseClientId = '745252519059-v583n1i3vg5ele9qito38ds6galebtfq.apps.googleusercontent.com';
const googleAuthService = readFileSync(new URL('../services/googleAuthService.ts', import.meta.url), 'utf8');
const easConfig = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
const androidBuild = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');
const appConfig = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
const gitignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
const backendRoot = process.env.CHALLENGESPHERE_BACKEND_DIR?.replace(/\/$/, '');
const backendProdConfig = readFileSync(
  backendRoot
    ? `${backendRoot}/src/main/resources/application-prod.properties`
    : new URL('../../challengesphere/src/main/resources/application-prod.properties', import.meta.url),
  'utf8'
);

assert.match(
  googleAuthService,
  new RegExp(`DEFAULT_WEB_CLIENT_ID\\s*=\\s*'${webClientId.replaceAll('.', '\\.')}'`),
  'Google auth fallback web client must match the backend/EAS audience'
);
assert.match(
  googleAuthService,
  new RegExp(`DEFAULT_IOS_CLIENT_ID\\s*=\\s*'${iosClientId.replaceAll('.', '\\.')}'`),
  'Google auth fallback iOS client must match the configured iOS client'
);
assert.doesNotMatch(
  googleAuthService,
  /15194031444-/,
  'deleted Google OAuth project IDs must not remain in frontend auth configuration'
);

for (const profile of ['preview', 'production']) {
  assert.equal(easConfig.build[profile].env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, webClientId);
  assert.equal(easConfig.build[profile].env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, iosClientId);
}

assert.deepEqual(
  appConfig.expo.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === '@react-native-google-signin/google-signin')?.[1],
  { iosUrlScheme: `com.googleusercontent.apps.${iosClientId.split('.')[0]}` },
  'native iOS URL scheme must be reversed from the active iOS OAuth client'
);
for (const clientId of [webClientId, iosClientId, androidDebugClientId, androidReleaseClientId]) {
  assert.match(
    backendProdConfig,
    new RegExp(clientId.replaceAll('.', '\\.')),
    `backend must trust active Google client ${clientId}`
  );
}

const releaseBlock = androidBuild.match(/release\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
assert.ok(releaseBlock, 'Android release build configuration must exist');
assert.doesNotMatch(
  releaseBlock,
  /signingConfig\s+signingConfigs\.debug/,
  'Android release APKs must not be signed with the debug key'
);
assert.match(
  androidBuild,
  /credentials\.json/,
  'Android local release signing must use the configured release keystore reference'
);
assert.match(gitignore, /^credentials\.json$/m, 'Local release credential metadata must not be committed');
assert.match(
  googleAuthService,
  /GoogleSignin\.getTokens\(\)/,
  'Google auth should use the supported token recovery API when the sign-in payload omits an ID token'
);
assert.match(
  googleAuthService,
  /developer configuration mismatch/i,
  'Google auth should report Android package or SHA configuration mismatches clearly'
);

console.log('Google Sign-In APK configuration is aligned.');
