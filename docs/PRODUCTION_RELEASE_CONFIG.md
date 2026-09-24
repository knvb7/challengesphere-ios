# ChallengeSphere iOS production configuration handoff

Status: Apple, RevenueCat, EAS, and backend production configuration completed on 20 August 2026. Secret values remain intentionally absent from source control.

## Fixed identifiers

| Item | Value |
| --- | --- |
| Apple Team ID | `9CZSSGNN55` |
| App Store Connect Apple ID | `6799342925` |
| iOS bundle ID / Apple client ID | `com.ironside.challengesphere` |
| Candidate version | `1.0.12` |
| Candidate build | `6` — increment after any consumed upload |
| Associated domain | `applinks:challengesphere.com` |
| RevenueCat entitlement | `premium` |
| RevenueCat offering | `default` |
| RevenueCat iOS app | `app0025709526` |
| RevenueCat default offering ID | `ofrngc13a1c97f4` |
| App Store subscription group | `22322809` |
| App Store monthly subscription | `6803539749` |
| App Store annual subscription | `6803540499` |
| Monthly product | `com.ironside.challengesphere.premium.monthly` |
| Annual product | `com.ironside.challengesphere.premium.annual` |
| Backend RevenueCat user prefix | `cs_user_` |
| Sign in with Apple Key ID | `J83R3GYC58` |
| App Store In-App Purchase Key ID | `27XQLY5C7T` |
| Active App Store profile | `8J29JC62FQ` |

## Apple Developer and App Store Connect

- Sign in with Apple is enabled and is the primary App ID.
- Sign in with Apple key `J83R3GYC58` is stored outside source control and encrypted in production SSM.
- Active App Store profile `8J29JC62FQ` includes Sign in with Apple, Associated Domains, IAP, and Push.
- Server notifications use:
  `https://pqea9mim4b.execute-api.ap-south-1.amazonaws.com/api/v1/auth/apple/notifications`.
- Complete Paid Apps, banking, tax, subscription group, product localizations, prices, and review screenshots.
- Register the outbound mail domain with Apple Private Email Relay if ChallengeSphere will email relay addresses.

## Backend production environment

Required for Apple authentication:

| Environment variable | Required value |
| --- | --- |
| `APPLE_SIGNIN_ENABLED` | `true` |
| `APPLE_SIGNIN_CLIENT_IDS` | `com.ironside.challengesphere` |
| `APPLE_TEAM_ID` | `9CZSSGNN55` |
| `APPLE_KEY_ID` | Key ID for the Sign in with Apple `.p8` |
| `APPLE_PRIVATE_KEY_BASE64` | Base64 of the complete `.p8` contents |
| `APPLE_TOKEN_ENCRYPTION_KEY_BASE64` | Stable Base64-encoded 32-byte random key |
| `ACCOUNT_DELETION_IDENTITY_HASH_KEY` | Stable, high-entropy key of at least 32 characters, separate from JWT signing |

Do not rotate `APPLE_TOKEN_ENCRYPTION_KEY_BASE64` casually: existing encrypted Apple refresh credentials depend on it. Keep `ACCOUNT_DELETION_IDENTITY_HASH_KEY` stable for at least the 90-day fingerprint-retention window. The detailed Apple procedure is in the backend `docs/APPLE_SIGN_IN_SETUP.md`.

Required for RevenueCat:

| Environment variable | Required value |
| --- | --- |
| `REVENUECAT_ENABLED` | `true` |
| `REVENUECAT_SECRET_API_KEY` | RevenueCat secret server API key |
| `REVENUECAT_ENTITLEMENT_ID` | `premium` |
| `REVENUECAT_APP_USER_ID_PREFIX` | `cs_user_` |
| `REVENUECAT_WEBHOOK_AUTHORIZATION` | Dedicated high-entropy webhook authorization value |
| `REVENUECAT_WEBHOOK_SIGNING_SECRET` | Dedicated webhook signature secret when enabled in RevenueCat |

Keep the existing production JWT, database, Redis, AWS media/moderation, mail, and push settings. Migrations `V48`–`V51` and `V53` were applied atomically before allowing the iOS candidate to sign in. `V52` is an unrelated official-cover migration and is not part of this release gate. `V53` permanently removes legacy raw identity fields from deletion audit rows and replaces them with automatically expiring pseudonymous fingerprints.

## EAS production environment

Configure these in the EAS production environment rather than committing them to `eas.json`:

| Environment variable | Required value |
| --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Production API URL ending in `/api/v1` |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | RevenueCat public iOS SDK key |

The production config intentionally fails the build when the RevenueCat iOS public key is missing.

The EAS production environment now contains the RevenueCat iOS public SDK key. Secret RevenueCat and Apple values exist only in encrypted backend configuration.

Use the selected first-release profile:

- `production-ios-no-ads` **is required for version 1**. It excludes Google Mobile Ads, Google UMP, and Expo Tracking Transparency from iOS native autolinking. It ships no iOS ad placements and no ATT prompt.
- `production-ios-ads` is retained for a possible future release only. Do not use it for the current App Store submission.

The checked-in native project is the no-ads default. EAS runs `scripts/configure-ios-release-build.mjs` before dependency and pod installation to make the selected profile's autolinking and `Info.plist` deterministic. Do not rename or bypass that hook.

## RevenueCat dashboard

- The App Store app and In-App Purchase credentials are connected and valid.
- Both App Store products are attached to entitlement `premium` and the monthly/annual packages in offering `default`.
- Configure the paywall with Apple-localized prices, billing periods, renewal disclosure, Terms, Privacy, and Restore.
- The all-app webhook sends sandbox and production events with authorization and HMAC signing. A dashboard test delivery returned HTTP 200 from production.
- In **Project settings → General**, set production and sandbox restore behavior to **Transfer to new App User ID**. ChallengeSphere never purchases anonymously and asks for confirmation before `restorePurchases`, so a recreated account can reclaim its Apple subscription without silently sharing it between accounts.
- Do not enable legacy **Share between App User IDs**. Do not add background `syncPurchases`; restore remains a user-initiated action.
- Keep `TRANSFER` enabled for the webhook integration. The backend reconciles every ChallengeSphere ID in both `transferred_from` and `transferred_to`, removing stale Premium access from the source while granting the destination from RevenueCat's authoritative entitlement state.
- Account deletion removes the local `user_subscriptions` row but does not delete the pseudonymous RevenueCat customer or App Store transaction history. Those records remain necessary for renewal/refund events and an explicit restore after recreation; do not attach email or name subscriber attributes in RevenueCat.

## Production verification gate

- Apple new/returning, Share My Email, Hide My Email, credential revocation, and account deletion.
- Monthly/annual sandbox purchase, restore after reinstall, second-device restore, manage, cancellation, billing issue, refund, and expiry.
- Fresh reviewer account sees the rotating official cohorts with controlled cover art.
- Urgent moderation report reaches the named production escalation destination.
- Canonical Terms, Privacy, Support, Account Deletion, Child Safety, AASA, and invite routes return the intended public responses.
- Signed archive contains Sign in with Apple and Associated Domains entitlements, the expected privacy manifests, and no Google Sign-In SDK.
- For `production-ios-no-ads`, confirm the archive contains no Google Mobile Ads/UMP or Tracking Transparency framework and no AdMob/ATT `Info.plist` keys.
- For `production-ios-ads`, confirm the archive contains the Google SDK manifests and `NSUserTrackingUsageDescription`, then reconcile App Store Connect with the ads rows in `APP_PRIVACY_WORKSHEET.md`.
