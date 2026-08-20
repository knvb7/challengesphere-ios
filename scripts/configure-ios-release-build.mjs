import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIRECTORY, '..');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');
const IOS_INFO_PLIST_PATH = path.join(PROJECT_ROOT, 'ios', 'challengesphere', 'Info.plist');
const IOS_ONLY_AD_MODULES = [
  'expo-tracking-transparency',
  'react-native-google-mobile-ads',
];
const TRACKING_PERMISSION_MESSAGE = 'ChallengeSphere uses a device identifier to deliver and measure ads. Every app feature remains available if you ask the app not to track.';
const ADMOB_APP_ID_PATTERN = /^ca-app-pub-\d{16}~\d{10}$/;

const buildPlatform = (
  process.env.EAS_BUILD_PLATFORM
  ?? process.env.CHALLENGESPHERE_BUILD_PLATFORM
  ?? ''
).trim().toLowerCase();

if (buildPlatform !== 'ios') {
  console.log('[configure-ios-release-build] Non-iOS build; leaving iOS native configuration unchanged.');
  process.exit(0);
}

const iosAdsSetting = process.env.EXPO_PUBLIC_IOS_ADS_ENABLED?.trim().toLowerCase();
if (iosAdsSetting !== 'true' && iosAdsSetting !== 'false') {
  throw new Error('iOS builds must set EXPO_PUBLIC_IOS_ADS_ENABLED to true or false.');
}

const iosAdsEnabled = iosAdsSetting === 'true';
const packageJson = JSON.parse(await readFile(PACKAGE_JSON_PATH, 'utf8'));
const existingExclusions = packageJson.expo?.autolinking?.ios?.exclude ?? [];
const retainedExclusions = existingExclusions.filter(
  (packageName) => !IOS_ONLY_AD_MODULES.includes(packageName),
);

packageJson.expo ??= {};
packageJson.expo.autolinking ??= {};
packageJson.expo.autolinking.ios ??= {};
packageJson.expo.autolinking.ios.exclude = iosAdsEnabled
  ? retainedExclusions
  : Array.from(new Set([...retainedExclusions, ...IOS_ONLY_AD_MODULES]));

await writeFile(PACKAGE_JSON_PATH, `${JSON.stringify(packageJson, null, 2)}\n`);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escapeXml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const removeScalarPlistKey = (contents, key) => contents.replace(
  new RegExp(
    `\\s*<key>${escapeRegExp(key)}</key>\\s*(?:<string>[\\s\\S]*?<\\/string>|<(?:true|false)\\s*\\/>)`,
    'g',
  ),
  '',
);

const addPlistBlock = (contents, block) => {
  const insertionPoint = '\n\t<key>ITSAppUsesNonExemptEncryption</key>';
  if (contents.includes(insertionPoint)) {
    return contents.replace(insertionPoint, `${block}${insertionPoint}`);
  }
  return contents.replace(/\s*<\/dict>/, `${block}\n  </dict>`);
};

if (existsSync(IOS_INFO_PLIST_PATH)) {
  let infoPlist = await readFile(IOS_INFO_PLIST_PATH, 'utf8');
  for (const key of [
    'GADApplicationIdentifier',
    'GADDelayAppMeasurementInit',
    'NSUserTrackingUsageDescription',
  ]) {
    infoPlist = removeScalarPlistKey(infoPlist, key);
  }

  if (iosAdsEnabled) {
    const admobAppId = process.env.ADMOB_IOS_APP_ID?.trim() ?? '';
    if (!ADMOB_APP_ID_PATTERN.test(admobAppId)) {
      throw new Error('Ads-enabled iOS builds require a valid ADMOB_IOS_APP_ID.');
    }

    infoPlist = addPlistBlock(
      infoPlist,
      `\n\t<key>GADApplicationIdentifier</key>\n\t<string>${escapeXml(admobAppId)}</string>\n\t<key>GADDelayAppMeasurementInit</key>\n\t<true/>\n\t<key>NSUserTrackingUsageDescription</key>\n\t<string>${escapeXml(TRACKING_PERMISSION_MESSAGE)}</string>`,
    );
  }

  await writeFile(IOS_INFO_PLIST_PATH, infoPlist);
} else {
  console.log('[configure-ios-release-build] Native iOS project is absent; Expo Prebuild will apply app.config.ts.');
}
console.log(
  `[configure-ios-release-build] Prepared iOS ${iosAdsEnabled ? 'ads-enabled' : 'no-ads'} native configuration.`,
);
