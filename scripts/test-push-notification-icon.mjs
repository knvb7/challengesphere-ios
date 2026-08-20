import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const notificationPlugin = appConfig.expo.plugins.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-notifications',
);

assert.ok(notificationPlugin, 'expo-notifications should use explicit plugin configuration');
assert.equal(
  notificationPlugin[1]?.icon,
  './assets/images/notification-icon.png',
  'system push notifications should use the dedicated ChallengeSphere icon',
);
assert.equal(
  notificationPlugin[1]?.color,
  '#4700EC',
  'Android should tint the ChallengeSphere notification icon violet',
);
assert.equal(
  notificationPlugin[1]?.defaultChannel,
  'default',
  'notification plugin and runtime registration should use the same Android channel',
);

const iconPath = path.join(root, 'assets/images/notification-icon.png');
assert.ok(fs.existsSync(iconPath), 'the configured notification icon should exist');

const png = fs.readFileSync(iconPath);
assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG', 'notification icon should be a PNG');
assert.equal(png.readUInt32BE(16), 96, 'notification icon should be 96 px wide');
assert.equal(png.readUInt32BE(20), 96, 'notification icon should be 96 px tall');
assert.equal(png[25], 6, 'notification icon should use RGBA color for transparency');

const manifest = fs.readFileSync(
  path.join(root, 'android/app/src/main/AndroidManifest.xml'),
  'utf8',
);
assert.match(
  manifest,
  /com\.google\.firebase\.messaging\.default_notification_icon[^>]+@drawable\/notification_icon/,
  'FCM notifications should use the ChallengeSphere native drawable',
);
assert.match(
  manifest,
  /expo\.modules\.notifications\.default_notification_icon[^>]+@drawable\/notification_icon/,
  'Expo local notifications should use the ChallengeSphere native drawable',
);
assert.match(
  manifest,
  /com\.google\.firebase\.messaging\.default_notification_channel_id[^>]+android:value="default"/,
  'FCM should deliver notifications through the configured default channel',
);

const androidColors = fs.readFileSync(
  path.join(root, 'android/app/src/main/res/values/colors.xml'),
  'utf8',
);
assert.match(
  androidColors,
  /<color name="notification_icon_color">#4700EC<\/color>/,
  'the native notification icon tint should match the Expo configuration',
);

for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
  assert.ok(
    fs.existsSync(path.join(root, `android/app/src/main/res/drawable-${density}/notification_icon.png`)),
    `Android ${density} notification icon should be generated`,
  );
}

const iosEntitlements = fs.readFileSync(
  path.join(root, 'ios/challengesphere/challengesphere.entitlements'),
  'utf8',
);
assert.match(
  iosEntitlements,
  /<key>aps-environment<\/key>\s*<string>development<\/string>/,
  'local iOS development builds should include the APS entitlement',
);

console.log('push notification icon checks passed');
