import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = readFileSync(path.join(root, 'providers/AuthProvider.tsx'), 'utf8');
const pushSource = readFileSync(path.join(root, 'services/pushNotificationService.ts'), 'utf8');
const settingsSource = readFileSync(path.join(root, 'app/settings.tsx'), 'utf8');

for (const requiredText of [
  "import { AppState } from 'react-native'",
  'PUSH_REGISTRATION_MAX_ATTEMPTS = 3',
  'PUSH_REGISTRATION_RETRY_DELAY_MS = 10_000',
  'const attemptRegistration = (attempt = 1)',
  'userService.getUserById(user.id, user.id)',
  'userService.getUserPreferences(user.id)',
  'isPushNotificationsOptedIn(',
  'registerForPushNotifications(user.id)',
  'retryTimer = setTimeout',
  'attemptRegistration(attempt + 1)',
  "AppState.addEventListener('change'",
  "state === 'active'",
  'appStateSubscription.remove()',
  'setupPushNotificationResponseListener()',
  'setPushNotificationRoutingReady(true, currentUserId)',
  'clearPendingPushNotificationResponses()',
  'void restoreSession()',
  'void logout()',
]) {
  assert.match(
    source,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `AuthProvider should include push registration retry support "${requiredText}"`,
  );
}

assert.doesNotMatch(
  source,
  /registerForPushNotifications\([^)]*\)\.catch\(\(error\)/,
  'push registration should not be a single swallowed fire-and-forget attempt',
);
assert.doesNotMatch(
  source,
  /state === 'active' && !registered/,
  'foregrounding should refresh registration and timezone even after an earlier success',
);
assert.doesNotMatch(
  source,
  /tab-test/,
  'AuthProvider should restore the real session instead of injecting a test user',
);

assert.match(
  source,
  /!isPushNotificationsOptedIn\([\s\S]*preferences\.pushNotificationsEnabled[\s\S]*disableRegisteredPushToken\(user\.id\)/,
  'automatic registration should consult backend opt-in state and clean up opted-out tokens',
);

assert.match(
  pushSource,
  /addNotificationReceivedListener/,
  'foreground push receipt should be observed so in-app notification state updates immediately',
);
assert.match(
  pushSource,
  /queryClient\.invalidateQueries\(\{\s*queryKey:\s*notificationKeys\.all\s*\}\)/,
  'foreground push receipt should invalidate cached notification list and unread-count queries',
);

const channelCreationIndex = pushSource.indexOf(
  'Notifications.setNotificationChannelAsync(DEFAULT_ANDROID_CHANNEL_ID',
);
const permissionReadIndex = pushSource.indexOf('Notifications.getPermissionsAsync()');
const tokenReadIndex = pushSource.indexOf('Notifications.getExpoPushTokenAsync({ projectId })');
assert.ok(channelCreationIndex >= 0, 'Android notification channel creation should be configured');
assert.ok(permissionReadIndex > channelCreationIndex, 'Android channel creation should precede permission prompts');
assert.ok(tokenReadIndex > permissionReadIndex, 'push token lookup should occur after permission checks');

assert.match(
  settingsSource,
  /if \(value\) \{[\s\S]*registerForPushNotifications\(userId\)[\s\S]*saveNotificationPreferences\(true, emailNotifications\)/,
  'enabling push in settings should request permission/register before saving the opt-in',
);
assert.match(
  settingsSource,
  /saveNotificationPreferences\(false, emailNotifications\)[\s\S]*disableRegisteredPushToken\(userId\)/,
  'disabling push in settings should save the opt-out and unregister the device token',
);

console.log('push registration retry checks passed');
