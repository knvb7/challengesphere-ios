import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function loadTsModule(relativePath) {
  const filePath = path.join(root, relativePath);
  const source = readText(relativePath);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filePath,
  }).outputText;

  const module = { exports: {} };
  const moduleRequire = createRequire(filePath);
  const localRequire = (specifier) => {
    if (specifier.startsWith('.')) {
      const basePath = path.resolve(path.dirname(filePath), specifier);
      for (const extension of ['.ts', '.tsx']) {
        const candidate = `${basePath}${extension}`;
        if (fs.existsSync(candidate)) {
          return loadTsModule(path.relative(root, candidate));
        }
      }
    }
    return moduleRequire(specifier);
  };

  vm.runInNewContext(output, {
    exports: module.exports,
    module,
    require: localRequire,
  }, { filename: filePath });
  return module.exports;
}

const { shouldInsertInlineAd } = loadTsModule('utils/inlineAdPlacement.ts');

function adPositions(totalItems, interval) {
  return Array.from({ length: totalItems }, (_, index) => index)
    .filter((index) => shouldInsertInlineAd(index, totalItems, interval))
    .map((index) => index + 1);
}

assert.deepEqual(Array.from(adPositions(25, 8)), [8, 16, 24]);
assert.deepEqual(Array.from(adPositions(24, 8)), [8, 16], 'feed must not end with an ad');
assert.deepEqual(Array.from(adPositions(11, 5)), [5, 10]);
assert.deepEqual(Array.from(adPositions(10, 5)), [5], 'challenges must not end with an ad');
assert.equal(shouldInsertInlineAd(-1, 10, 5), false);
assert.equal(shouldInsertInlineAd(4, 10, 0), false);
assert.equal(shouldInsertInlineAd(4.5, 10, 5), false);

const { isAdsEligible } = loadTsModule('utils/adsEligibility.ts');
const policyDate = new Date(Date.UTC(2026, 7, 6));
const eligibleAdult = {
  currentUserId: 42,
  dateOfBirth: '2000-08-06',
  isAuthenticated: true,
  isLoading: false,
  premiumUser: 0,
};

assert.equal(isAdsEligible(eligibleAdult, policyDate), true);
assert.equal(isAdsEligible({ ...eligibleAdult, dateOfBirth: '2008-08-06' }, policyDate), true);
assert.equal(isAdsEligible({ ...eligibleAdult, dateOfBirth: '2008-08-07' }, policyDate), false);
assert.equal(isAdsEligible({ ...eligibleAdult, premiumUser: 1 }, policyDate), false);
assert.equal(isAdsEligible({ ...eligibleAdult, premiumUser: true }, policyDate), false);
assert.equal(isAdsEligible({ ...eligibleAdult, premiumUser: undefined }, policyDate), false);
assert.equal(isAdsEligible({ ...eligibleAdult, premiumUser: '0' }, policyDate), false);
assert.equal(isAdsEligible({ ...eligibleAdult, dateOfBirth: null }, policyDate), false);
assert.equal(isAdsEligible({ ...eligibleAdult, dateOfBirth: 'invalid' }, policyDate), false);
assert.equal(isAdsEligible({ ...eligibleAdult, isAuthenticated: false }, policyDate), false);
assert.equal(isAdsEligible({ ...eligibleAdult, isLoading: true }, policyDate), false);
assert.equal(isAdsEligible({ ...eligibleAdult, currentUserId: 0 }, policyDate), false);

const feed = readText('screens/Feed.tsx');
const explore = readText('app/(tabs)/global.tsx');
const adsContext = readText('providers/AdsContext.tsx');
const adsProvider = readText('providers/AdsProvider.native.tsx');
const nativeAd = readText('components/ads/InlineNativeAd.native.tsx');
const adConstants = readText('constants/ads.ts');
const appConfig = readText('app.config.ts');
const androidManifest = readText('android/app/src/main/AndroidManifest.xml');
const eas = JSON.parse(readText('eas.json'));

assert.match(feed, /const FEED_AD_INTERVAL = 8;/);
assert.match(feed, /shouldInsertInlineAd\(index, allItems\.length, FEED_AD_INTERVAL\)/);
assert.match(explore, /const EXPLORE_AD_INTERVAL = 5;/);
assert.match(explore, /!isExplicitSearch[\s\S]*shouldInsertInlineAd\(index, filteredChallenges\.length, EXPLORE_AD_INTERVAL\)/);
assert.match(adsContext, /isAdsEligible\(\{/);

assert.match(adsProvider, /maxAdContentRating: MaxAdContentRating\.PG/);
assert.match(
  adsProvider,
  /const consentInfo = await gatherConsent\(\);[\s\S]*if \(!consentInfo\.canRequestAds\) return;[\s\S]*await initializeMobileAdsOnce\(\);/,
  'consent must permit requests before Mobile Ads initializes',
);
assert.match(adConstants, /requestNonPersonalizedAdsOnly: true/);
assert.match(adConstants, /if \(__DEV__\) return TestIds\.NATIVE;/);
assert.match(nativeAd, /Boolean\(adUnitId\) && isEligible && !isInitializing && isReady && canRequestAds/);
assert.match(nativeAd, /loadedAd\?\.destroy\(\)/);
assert.match(nativeAd, />Sponsored<\/Text>/);
assert.match(appConfig, /delayAppMeasurementInit: true/);

const expectedProductionIds = {
  ADMOB_ANDROID_APP_ID: 'ca-app-pub-2449482115941448~2805773062',
  ADMOB_IOS_APP_ID: 'ca-app-pub-2449482115941448~3550657330',
  EXPO_PUBLIC_ADMOB_FEED_NATIVE_AD_UNIT_ID_ANDROID: 'ca-app-pub-2449482115941448/7066396363',
  EXPO_PUBLIC_ADMOB_FEED_NATIVE_AD_UNIT_ID_IOS: 'ca-app-pub-2449482115941448/1546476379',
  EXPO_PUBLIC_ADMOB_EXPLORE_NATIVE_AD_UNIT_ID_ANDROID: 'ca-app-pub-2449482115941448/2697961851',
  EXPO_PUBLIC_ADMOB_EXPLORE_NATIVE_AD_UNIT_ID_IOS: 'ca-app-pub-2449482115941448/7330120246',
};

for (const [key, value] of Object.entries(expectedProductionIds)) {
  assert.equal(eas.build.production.env[key], value, `${key} must be available to production builds`);
  assert.equal(eas.build.preview.env[key], undefined, `${key} must not serve live ads in preview builds`);
}

assert.match(androidManifest, /ca-app-pub-2449482115941448~2805773062/);

console.log('AdMob integration regression checks passed');
