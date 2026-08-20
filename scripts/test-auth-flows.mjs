import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const frontend = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const backendRoot = process.env.CHALLENGESPHERE_BACKEND_DIR?.replace(/\/$/, '');
const backend = (path) => readFileSync(
  backendRoot ? `${backendRoot}/${path}` : new URL(`../../challengesphere/${path}`, import.meta.url),
  'utf8'
);

for (const route of [
  'app/signup.tsx',
  'app/forgot-password.tsx',
  'app/reset-password.tsx',
  'app/change-password.tsx',
]) {
  assert.equal(existsSync(new URL(`../${route}`, import.meta.url)), false, `${route} should be removed`);
}

const loginScreen = frontend('app/login.tsx');
const authService = frontend('services/authService.ts');
const apiClient = frontend('services/apiClient.ts');
const authHooks = frontend('hooks/useAuth.ts');
const rootLayout = frontend('app/_layout.tsx');
const settings = frontend('app/settings.tsx');
const googleAuth = frontend('services/googleAuthService.ts');
const backendAuthController = backend('src/main/java/com/ironside/challengesphere/controller/AuthController.java');

for (const source of [loginScreen, authService, apiClient, authHooks, rootLayout, settings]) {
  assert.doesNotMatch(
    source,
    /forgot-password|reset-password|change-password|\/auth\/(?:login|register)|authService\.login\(|authService\.register\(/,
  );
}
assert.doesNotMatch(loginScreen, /TextInput|Password|Create account|Email or username/);
assert.match(loginScreen, /Continue with Google/);
assert.match(googleAuth, /GoogleSignin\.getTokens\(\)/, 'Google sign in should recover tokens through the supported getTokens API');
assert.match(googleAuth, /GoogleSignin\.signOut\(\)[\s\S]*GoogleSignin\.signIn\(\)/, 'Google sign in should refresh stale native sessions before requesting credentials');
assert.match(googleAuth, /\.\.\.\(accessToken \? \{ accessToken \} : \{\}\)/, 'Google sign in should retain an access token for secure server fallback');
assert.match(authService, /this\.getErrorStatus\(error\) === 401/, 'Google auth should only use the access-token fallback after an ID-token 401');
assert.match(authService, /completeGoogleLogin\(\{ accessToken: googleData\.accessToken \}\)/, 'Google auth should retry a rejected ID token with the verified Google access token');
assert.match(googleAuth, /developer configuration mismatch/i, 'Google developer errors should explain the signing configuration mismatch');
assert.match(loginScreen, /authService\.loginWithGoogle\(googleCredentials\)/, 'login should send whichever verified Google credentials are available');
assert.match(backendAuthController, /Password authentication is disabled\. Use Google Sign-In\./);
assert.match(backendAuthController, /@PostMapping\("\/google"\)/);

console.log('Google-only authentication regression checks passed');
