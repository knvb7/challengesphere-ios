# AdMob production setup

Release decision recorded 20 August 2026: the first iOS App Store release uses `production-ios-no-ads` and contains no AdMob, UMP, or ATT native module. This document applies to Android and to a possible future iOS ads release; do not use `production-ios-ads` for the current App Store submission. See `APP_PRIVACY_WORKSHEET.md`.

The app code uses Google Mobile Ads native units. Development builds use Google's test IDs. Production builds deliberately fail when real App IDs are missing or still set to sample values, and release builds render no ad when a native unit ID is missing.

## 1. Create the AdMob apps and units

In AdMob, add the Android app (`com.challengesphere.app`) and the iOS app (`com.ironside.challengesphere`). Copy each platform's App ID.

Create two native ad units per platform:

- Connections feed
- Explore challenges

Keep the four native unit IDs separate so placement performance can be measured independently.

## 2. Configure build variables

Set these for local native builds or in the matching EAS environment:

```text
EXPO_PUBLIC_IOS_ADS_ENABLED=true|false
ADMOB_ANDROID_APP_ID=ca-app-pub-...~...
ADMOB_IOS_APP_ID=ca-app-pub-...~...
EXPO_PUBLIC_ADMOB_FEED_NATIVE_AD_UNIT_ID_ANDROID=ca-app-pub-.../...
EXPO_PUBLIC_ADMOB_FEED_NATIVE_AD_UNIT_ID_IOS=ca-app-pub-.../...
EXPO_PUBLIC_ADMOB_EXPLORE_NATIVE_AD_UNIT_ID_ANDROID=ca-app-pub-.../...
EXPO_PUBLIC_ADMOB_EXPLORE_NATIVE_AD_UNIT_ID_IOS=ca-app-pub-.../...
```

Store them as EAS plain-text or sensitive variables, not secret variables: App IDs must be available while Expo resolves `app.config.ts`, and ad identifiers are embedded in the shipped app.

`ADMOB_REQUIRE_PRODUCTION_IDS=true` enables the production-ID guard outside an EAS production build. EAS production builds enable the guard automatically.

Use `eas build --platform ios --profile production-ios-ads` only after approving the ATT/privacy path. Use `production-ios-no-ads` to omit the iOS ad and tracking native modules entirely.

## 3. Configure privacy messages

In AdMob, open **Privacy & messaging** and publish the messages required for the app's regions, including the GDPR message for the EEA and UK. Enable the privacy-options entry point. The app requests only non-personalized ads, waits for UMP before initializing Mobile Ads, and exposes required privacy choices under **Privacy & Safety**.

The app does not request or initialize ads for logged-out users, premium users, users under 18, or users whose date of birth is missing or invalid.

Development builds use only Google's demo ad units. To support older internal test accounts, a non-premium test account whose date of birth is missing may preview those demo ads. A known under-18 user is still blocked. Release builds always fail closed when the date of birth is missing or invalid.

## 4. Rebuild native projects

This package contains native code and does not work in Expo Go. The committed iOS project defaults to no ads. To prepare a local iOS native build explicitly, run one of these before CocoaPods/building:

```sh
EAS_BUILD_PLATFORM=ios EXPO_PUBLIC_IOS_ADS_ENABLED=false npm run configure:ios-release
EAS_BUILD_PLATFORM=ios EXPO_PUBLIC_IOS_ADS_ENABLED=true ADMOB_IOS_APP_ID=ca-app-pub-...~... npm run configure:ios-release
cd ios && pod install
```

For EAS, the selected profile runs the same configuration automatically before CocoaPods.

Both native directories are committed and uploaded to EAS. Before the production Android build, load the real App IDs, run `ADMOB_REQUIRE_PRODUCTION_IDS=true npx expo prebuild --platform android --no-install`, verify that `android/app/src/main/AndroidManifest.xml` contains the real Android App ID, and commit that generated manifest change. For iOS, use only the two release profiles above so the pre-install hook keeps the native project aligned with the intended binary.

## 5. Complete AdMob verification

Copy the exact personalized `app-ads.txt` line from AdMob and publish it at `https://challengesphere.com/app-ads.txt`. Keep the ChallengeSphere developer website linked from both store listings, then request verification in AdMob.

Before release, complete Google Play Data safety, the App Store privacy questionnaire, and the AdMob app-readiness review using the data handling described in the public and in-app privacy policies.

If iOS ads remain, add App Tracking Transparency before any tracking-capable ad initialization and disclose every data type from the embedded Google Mobile Ads privacy manifest. UMP privacy choices and non-personalized requests do not replace ATT.
