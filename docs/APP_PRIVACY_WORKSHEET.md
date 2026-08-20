# ChallengeSphere iOS App Privacy worksheet

Status: first-party inventory and signed-archive reconciliation are complete for EAS build `70970df8…`; App Store Connect answers still need to be entered and published.

Scope: iOS/iPadOS `1.0.12` build `6`, bundle ID `com.ironside.challengesphere`.

This is the source of truth for the App Store Connect App Privacy form, the app privacy manifest, the public policy, and reviewer notes. App Store Connect answers must cover both ChallengeSphere and every third-party SDK in the submitted binary.

## Recorded release decision

The submitted build must use `production-ios-no-ads`. The checked-in native project and this profile exclude Google Mobile Ads, Google UMP, and Expo Tracking Transparency. The iOS app displays no advertising, requests no ATT permission, and reports tracking as **No**.

The separate `production-ios-ads` profile is retained only for a possible future release. It must not be used for this submission because Google's privacy manifest declares a linked Device ID used for tracking, plus advertising data, product interaction, coarse location, and diagnostics.

Signed build `1.0.12 (6)` confirms that no native advertising or tracking SDK is embedded and that all bundled privacy manifests either declare tracking `false` or omit tracking entirely, with no tracking domains.

## First-party collection

The following entries are now declared in `ios/challengesphere/PrivacyInfo.xcprivacy`. All are used for ChallengeSphere functionality, not cross-company tracking.

| App Store data type | Collected | Linked to user | Tracking | Purposes and evidence |
| --- | --- | --- | --- | --- |
| Name | Yes | Yes | No | Account/profile display and first Sign in with Apple authorization. |
| Email Address | Yes | Yes | No | Authentication, account recovery, support, and safety operations. Apple Hide My Email may supply a relay address. |
| Phone Number | Yes, when supplied | Yes | No | Optional account/profile and existing OTP functionality. |
| Coarse Location | Yes | Yes | No | User-supplied country for profile/account functionality. Google may separately derive coarse location from IP if ads remain. |
| Photos or Videos | Yes, when supplied | Yes | No | Profile photos, challenge covers, submissions, and optional support screenshots. |
| Customer Support | Yes, when supplied | Yes | No | Support messages, issue category, app version, platform, device description, and optional screenshots. |
| Other User Content | Yes | Yes | No | Username, bio, interests, challenges, submission text, comments, reports, feature requests, follows, glories, and invites. |
| User ID | Yes | Yes | No | Internal account ID, username, Apple subject, and provider identity. |
| Device ID | Yes | Yes | No for ChallengeSphere | Expo/APNs push token and platform/time-zone registration. Google separately declares a tracking Device ID if ads remain. |
| Purchase History | Yes | Yes | No | RevenueCat app user ID, product, store, entitlement, renewal, environment, and expiry state. No payment-card data is received. |
| Product Interaction | Yes | Yes | No | Challenge participation, submissions, reactions, follows, notifications, and personalization. |
| Other Diagnostic Data | Yes | Yes | No | User-linked API operational logs and user-submitted support device/app diagnostics. |
| Other Data Types | Yes | Yes | No | Date of birth/age, gender, country, interests, notification preferences, account status, and moderation state. |

App Store Connect purposes should be **App Functionality** for every row. Also select **Product Personalization** for Product Interaction and Other Data Types because interests and activity influence suggestions and in-app presentation.

## Data not collected by ChallengeSphere

| Data type | Answer | Reason |
| --- | --- | --- |
| Payment Info | No | Apple processes payment and ChallengeSphere never receives card or bank details. |
| Credit or other financial info | No | No feature requests or stores it. |
| Precise Location | No | The app does not request Core Location or precise coordinates. |
| Contacts | No | Contacts are read only after permission, retained on-device, and used to open a user-directed share/WhatsApp action; they are not uploaded to ChallengeSphere. Re-audit if that flow changes. |
| Emails or Text Messages | No | ChallengeSphere does not read the user's messages. Comments are Other User Content. |
| Audio Data | No | The release does not record audio and the microphone permission was removed. |
| Browsing History | No | ChallengeSphere does not retain browsing outside the app. |
| Search History | No | Search text is not persisted as a search-history product or analytics event. |
| Health or Fitness | No | Challenge topics can concern habits or fitness, but the app does not access HealthKit, motion/fitness sensors, or medical records. Re-audit before adding a fitness-data integration. |
| Sensitive Info | No | The current profile fields do not include Apple's sensitive-information categories. Re-audit any new demographic or health fields. |
| Environment, Hands, or Head | No | No AR/vision body or surroundings APIs are used. |

## Embedded SDK declarations

| SDK/service | Data declared or processed | Linked | Tracking | Required action |
| --- | --- | --- | --- | --- |
| Sign in with Apple | Apple subject, verified email, first-authorization name, authorization code | Yes | No | Select Name, Email Address, and User ID for App Functionality. |
| RevenueCat | Purchase History in its manifest; ChallengeSphere configures `cs_user_<id>` | Treat as Yes in App Store Connect | No | Select Purchase History and User ID for App Functionality. |
| Expo/APNs notifications | Push token, platform, time zone | Yes | No | Covered by Device ID and App Functionality. |
| AWS/backend services | Account, content, media, logs, moderation, and operational data | Yes where account-linked | No | Covered by the first-party rows; keep retention/deletion policy synchronized. |
| Google Mobile Ads | Device ID, Advertising Data, Product Interaction, Coarse Location, Crash Data, Performance Data, Other Diagnostic Data | Mixed; its manifest marks Device ID, advertising, interaction, and coarse location linked | Device ID: Yes | Include only if iOS ads remain; implement ATT and publish matching answers. |
| Google UMP | Coarse Location, Product Interaction, Performance Data | No in SDK manifest | No | Include if UMP remains in the iOS binary. |
| Server-side image moderation | User-uploaded images and moderation result | Yes | No | Covered by Photos or Videos and App Functionality. |
| Optional coding integrations | User handle and public solved-problem summaries | Yes | No | Covered by User ID, Other User Content, and App Functionality. |

## Public URLs

- Privacy Policy: `https://challengesphere.com/privacy-policy`
- Privacy choices/account deletion: `https://challengesphere.com/account-deletion`
- Support: `https://challengesphere.com/support`
- Terms: `https://challengesphere.com/terms`
- Child Safety: `https://challengesphere.com/child-safety`

These routes exist in the canonical website configuration but must be deployed and checked for HTTP 200 before submission.

## Account-deletion and retention behavior

- The user row is disabled and anonymized; sessions, provider identities, push tokens, preferences, follows, reactions, comments, submissions, and related account records are removed.
- Apple refresh credentials are queued for revocation before the provider identity is removed.
- Profile, submission, and private-challenge media object keys are queued for controlled cleanup outside the live deletion request.
- Private challenges created by the user are taken offline. Public challenges created by the user and their cover media remain available under the anonymized deleted account so existing participants can continue.
- Safety reports preserve the minimum evidence/audit relationship needed for moderation, while free-text details are redacted during deletion.
- Migration `V53` removes the legacy raw email, username, and display-name columns from deletion records. New deletions store only keyed, non-readable email and username fingerprints with a 90-day expiry; a daily scheduler clears them and records the purge time. The iOS and canonical public disclosures match this behavior.
- Deleting the ChallengeSphere account does not cancel App Store billing. The app offers Manage Subscription before deletion. RevenueCat must use **Transfer to new App User ID**; restoring after recreation requires a user confirmation that identifies the currently signed-in destination account.
- The backend deletes its `user_subscriptions` row with the account. RevenueCat retains only the pseudonymous `cs_user_<id>` customer and transaction/entitlement history needed for store reconciliation, renewals, refunds, financial obligations, and explicit restore; ChallengeSphere does not send RevenueCat the user's name or email.

## Final archive reconciliation

- [x] Record `production-ios-no-ads` as the required submitted archive profile.
- [x] Build the signed distribution archive with production dependencies and configuration (`70970df8…`, SHA-256 `99b8934dc07950d17d71477b4952e8d72f06c5c25888f1a7b74cffd2901ca45b`).
- [ ] In Xcode Organizer, generate the archive privacy report.
- [x] Confirm the signed app's first-party manifest contains the entries in this worksheet.
- [x] Inventory every embedded SDK privacy manifest; none declares tracking `true` or a tracking domain, and no Google Ads/UMP/ATT manifest or framework is present.
- [ ] Enter the same data types, linked status, tracking status, and purposes in App Store Connect.
- [ ] Confirm the public Privacy Policy describes the same production behavior.
- [ ] Publish App Privacy answers only after the production archive is final.

## Apple references

- [Manage App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)
- [Privacy manifest files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)
- [Collected data type values](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacycollecteddatatypes/nsprivacycollecteddatatype)
- [Collection-purpose values](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacycollecteddatatypes/nsprivacycollecteddatatypepurposes)
