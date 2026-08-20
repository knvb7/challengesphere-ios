# ChallengeSphere iOS production configuration handoff

Status: values are intentionally absent. Store secrets in Apple, EAS, AWS/SSM, and RevenueCat—not in either repository.

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
| Monthly product | `com.ironside.challengesphere.premium.monthly` |
| Annual product | `com.ironside.challengesphere.premium.annual` |
| Backend RevenueCat user prefix | `cs_user_` |

## Apple Developer and App Store Connect

- Enable Sign in with Apple on the bundle ID and make it the primary App ID.
- Create a Sign in with Apple key, record its Key ID, and keep the downloaded `.p8` outside source control.
- Regenerate development and App Store provisioning profiles after enabling the capability.
- Configure the deployed server-notification endpoint:
  `https://<production-api-host>/api/v1/auth/apple/notifications`.
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

Keep the existing production JWT, database, Redis, AWS media/moderation, mail, and push settings. Deploy migrations `V48` through `V53` before allowing the iOS candidate to sign in. `V53` permanently removes legacy raw identity fields from deletion audit rows and replaces them with automatically expiring pseudonymous fingerprints.

## EAS production environment

Configure these in the EAS production environment rather than committing them to `eas.json`:

| Environment variable | Required value |
| --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Production API URL ending in `/api/v1` |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | RevenueCat public iOS SDK key |

The production config intentionally fails the build when the RevenueCat iOS public key is missing.

Use the selected first-release profile:

- `production-ios-no-ads` **is required for version 1**. It excludes Google Mobile Ads, Google UMP, and Expo Tracking Transparency from iOS native autolinking. It ships no iOS ad placements and no ATT prompt.
- `production-ios-ads` is retained for a possible future release only. Do not use it for the current App Store submission.

The checked-in native project is the no-ads default. EAS runs `scripts/configure-ios-release-build.mjs` before dependency and pod installation to make the selected profile's autolinking and `Info.plist` deterministic. Do not rename or bypass that hook.

## RevenueCat dashboard

- Connect the iOS App Store app and credentials.
- Import both product IDs.
- Attach both to entitlement `premium` and offering `default`.
- Configure the paywall with Apple-localized prices, billing periods, renewal disclosure, Terms, Privacy, and Restore.
- Register the production webhook using the same authorization/signing values as the backend.
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
