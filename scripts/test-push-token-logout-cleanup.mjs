import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pushSource = fs.readFileSync(path.join(root, 'services/pushNotificationService.ts'), 'utf8');
const authSource = fs.readFileSync(path.join(root, 'providers/AuthProvider.tsx'), 'utf8');
const settingsSource = fs.readFileSync(path.join(root, 'app/settings.tsx'), 'utf8');

for (const requiredText of [
  "import * as SecureStore from 'expo-secure-store'",
  "PUSH_TOKEN_STORAGE_KEY = 'expo_push_token_registration'",
  'SecureStore.getItemAsync(',
  'SecureStore.setItemAsync(',
  'SecureStore.deleteItemAsync(',
  'pushRegistrationGeneration += 1',
  'const activeRegistration = registrationInFlight?.promise ?? null',
  'await activeRegistration.catch(() => null)',
  'registrationGeneration !== pushRegistrationGeneration',
  'const failedRegistrations: RegisteredPushToken[] = []',
  'await persistPushToken(registrationToRetry)',
  'notificationService.disablePushToken(registration.expoPushToken)',
]) {
  assert.match(
    pushSource,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `pushNotificationService should include logout cleanup support "${requiredText}"`,
  );
}

assert.match(
  authSource,
  /import \{[\s\S]*disableRegisteredPushToken[\s\S]*registerForPushNotifications[\s\S]*setupPushNotificationResponseListener[\s\S]*\} from '..\/services\/pushNotificationService'/,
  'AuthProvider should import push token cleanup with push registration helpers',
);

assert.match(
  authSource,
  /const logoutUserId = currentUserIdRef\.current;[\s\S]*await disableRegisteredPushToken\(logoutUserId\);[\s\S]*setUser\(null\);[\s\S]*await authService\.logout\(\);/,
  'AuthProvider should disable the push token before local auth is cleared',
);
assert.match(
  pushSource,
  /disabledTokens\.has\(persistedRegistration\.expoPushToken\)[\s\S]*await clearPersistedPushToken\(\)/,
  'persisted token data should only be removed after backend disable succeeds',
);
assert.match(
  pushSource,
  /registrationGeneration !== pushRegistrationGeneration[\s\S]*return registration;[\s\S]*await persistPushToken\(registration\)/,
  'a registration completing after logout should not persist through the normal success path',
);
assert.match(
  pushSource,
  /await notificationService\.registerPushToken\([\s\S]*registeredPushToken = registration;[\s\S]*await persistPushToken\(registration\)/,
  'a backend-active token should be kept in memory even if Secure Store persistence fails',
);
assert.match(
  pushSource,
  /catch \(error\) \{[\s\S]*failedRegistrations\.push\(registration\)[\s\S]*await persistPushToken\(registrationToRetry\)[\s\S]*throw firstError/,
  'a token whose backend disable fails should be persisted for a later cleanup retry',
);
assert.match(
  settingsSource,
  /saveNotificationPreferences\(false, emailNotifications\)[\s\S]*disableRegisteredPushToken\(userId\)/,
  'settings opt-out should also unregister the persisted device token',
);

console.log('push token logout cleanup checks passed');
