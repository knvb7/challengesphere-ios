import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../services/authService.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

const cachedUser = {
  id: 42,
  username: 'offline-user',
  createdAt: '2026-01-01T00:00:00Z',
  active: true,
  challengesCreated: 0,
  challengesAccepted: 0,
  followers: 0,
  following: 0,
  profilePicUrl: null,
  premiumUser: 0,
  bio: null,
};

function createHarness({
  accessToken = 'still-present-access-token',
  userSnapshot = cachedUser,
  getCurrentUser = async () => {
    throw Object.assign(new Error('Network request failed'), { code: 'ERR_NETWORK' });
  },
  refreshAuthToken = async () => 'refreshed-access-token',
} = {}) {
  const storage = { accessToken, refreshToken: 'refresh-token', userSnapshot };
  let logoutCount = 0;

  const apiClient = {
    get: getCurrentUser,
    post: async () => ({ data: {} }),
    setAuthSession: async (nextAccessToken, nextRefreshToken) => {
      storage.accessToken = nextAccessToken;
      if (nextRefreshToken) storage.refreshToken = nextRefreshToken;
    },
    refreshAuthToken,
    logout: async () => {
      logoutCount += 1;
      storage.accessToken = null;
      storage.refreshToken = null;
      storage.userSnapshot = null;
    },
  };

  const secureAuthStorage = {
    getAccessToken: async () => storage.accessToken,
    getRefreshToken: async () => storage.refreshToken,
    getUserSnapshot: async () => storage.userSnapshot,
    setUserSnapshot: async (user) => {
      storage.userSnapshot = user;
    },
  };

  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier === './apiClient') return { apiClient };
    if (specifier === './googleAuthService') {
      return { clearGoogleSignInSession: async () => undefined };
    }
    if (specifier === './secureAuthStorage') return secureAuthStorage;
    throw new Error(`Unexpected test import: ${specifier}`);
  };

  const context = vm.createContext({
    atob: globalThis.atob,
    console,
    globalThis: null,
    module,
    exports: module.exports,
    require: localRequire,
  });
  context.globalThis = context;
  vm.runInContext(`(function (require, module, exports) { ${compiled}\n})(require, module, exports);`, context);

  return {
    authService: module.exports.authService,
    storage,
    get logoutCount() {
      return logoutCount;
    },
  };
}

{
  const harness = createHarness();
  assert.deepEqual(
    await harness.authService.restoreSession(),
    cachedUser,
    'an offline /auth/me request should restore the cached identity',
  );
  assert.equal(harness.logoutCount, 0, 'offline startup must not clear auth storage');
}

{
  const expiredPayload = Buffer.from(JSON.stringify({ exp: 1 })).toString('base64url');
  const harness = createHarness({
    accessToken: `header.${expiredPayload}.signature`,
    refreshAuthToken: async () => {
      throw Object.assign(new Error('Network request failed'), { code: 'ERR_NETWORK' });
    },
  });
  assert.deepEqual(
    await harness.authService.restoreSession(),
    cachedUser,
    'an expired access token should still permit cached offline startup when refresh cannot connect',
  );
}

{
  const harness = createHarness({
    getCurrentUser: async () => {
      throw Object.assign(new Error('Forbidden'), { status: 403 });
    },
  });
  assert.equal(
    await harness.authService.restoreSession(),
    null,
    'a confirmed authentication rejection must not restore cached identity',
  );
  assert.equal(harness.logoutCount, 1, 'confirmed rejection should clear auth storage');
}

{
  const harness = createHarness({ accessToken: null });
  assert.equal(await harness.authService.restoreSession(), null);
  assert.equal(harness.logoutCount, 1, 'a snapshot without credentials must not establish a session');
}

{
  const freshUser = { ...cachedUser, username: 'fresh-online-user' };
  const harness = createHarness({
    getCurrentUser: async () => ({ data: freshUser }),
  });
  assert.deepEqual(await harness.authService.restoreSession(), freshUser);
  assert.deepEqual(harness.storage.userSnapshot, freshUser, 'online hydration should refresh the snapshot');
}

console.log('offline auth restoration behavior checks passed');
