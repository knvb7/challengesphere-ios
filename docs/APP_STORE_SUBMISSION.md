# ChallengeSphere App Store submission packet

Status: metadata and reviewer copy prepared; Apple account identifiers and review contact are recorded. Screenshots, signed build, account configuration, and submission remain open.

## App record

| Field | Value |
| --- | --- |
| Platform | iOS and iPadOS |
| Name | ChallengeSphere |
| Bundle ID | `com.ironside.challengesphere` |
| Version | `1.0.12` |
| Candidate build | `6` — increment if build 6 is uploaded or consumed before the final candidate |
| SKU | `challengesphere-ios` unless an app record already exists with another immutable SKU |
| Primary language | English (U.S.) |
| Primary category | Social Networking |
| Secondary category | Lifestyle |
| Made for Kids | No |
| Release method | Manual |
| Standard EULA | Use Apple's Standard EULA; the public Terms supplement it |
| Copyright | `2026 Ironside` — replace with the exact legal rights-holder name if different |
| Apple ID | `6799342925` |
| App Store URL | `https://apps.apple.com/app/id6799342925` — publish this link after the app is released |

## Product-page metadata

### Subtitle

```text
Build habits with friends
```

### Promotional text

```text
Create meaningful challenges, share real progress, and keep showing up with friends who cheer you on.
```

### Keywords

```text
habits,goals,accountability,friends,fitness,productivity,streaks,motivation,community
```

Do not add `ChallengeSphere` or `Ironside` to keywords; the app name and developer name are indexed separately.

### Description

```text
Turn the goals you care about into challenges you can actually finish.

ChallengeSphere helps friends build habits, share progress, and stay accountable together. Create a public or private challenge, invite your people, post real proof, and celebrate every step forward.

CREATE YOUR CHALLENGE
Choose a goal, schedule, duration, categories, and visibility. Start something new or join a challenge that already fits your interests.

SHOW REAL PROGRESS
Post photo check-ins with a short update, follow your streak, and keep a visual record of the work you have done.

DO IT TOGETHER
Invite friends, follow challengers, comment on progress, and send Glory when somebody shows up.

DISCOVER NEW IDEAS
Explore public and official challenges across fitness, learning, creativity, wellbeing, and everyday life.

STAY IN CONTROL
Report content, block accounts, manage privacy choices, and delete your account directly inside the app.

CHALLENGESPHERE PREMIUM
Premium increases your active public and private challenge limits and adds a profile badge. Monthly and annual plans renew automatically unless cancelled through your App Store subscriptions. Restore and manage purchases from inside the app.

ChallengeSphere is designed for motivation and community, not medical advice. Choose challenges that are appropriate for you and stop any activity that feels unsafe.

Terms: https://challengesphere.com/terms
Privacy: https://challengesphere.com/privacy-policy
Support: https://challengesphere.com/support
```

### URLs

| Field | URL |
| --- | --- |
| Support URL | `https://challengesphere.com/support` |
| Marketing URL | `https://challengesphere.com` |
| Privacy Policy URL | `https://challengesphere.com/privacy-policy` |
| User Privacy Choices URL | `https://challengesphere.com/account-deletion` |
| Terms | `https://challengesphere.com/terms` |

Do not enter these until the canonical website has been deployed and every route returns HTTP 200.

## Screenshot production brief

Use six real screenshots per device class. Do not reuse the current Android marketing screenshots, add a device frame that obscures UI, include sensitive user information, or show unfinished/disabled features.

Target formats:

- iPhone 6.9-inch portrait: `1320 x 2868` PNG, no alpha. Apple also accepts `1260 x 2736` and `1290 x 2796`.
- iPad 13-inch portrait: `2064 x 2752` PNG, no alpha. Apple also accepts `2048 x 2732`.
- App preview: omit for version 1. The existing video uses Android footage.

Recommended sequence for both iPhone and iPad:

1. **Build habits together** — a seeded home/feed view with varied, safe progress posts.
2. **Find your next challenge** — public/official challenge discovery.
3. **Create it your way** — challenge creation with schedule, duration, categories, and privacy options.
4. **Show real progress** — a polished submission detail with photo proof, comments, and Glory.
5. **Keep your people close** — challenge crew or profile/community surface.
6. **See how far you have come** — profile stats, completed work, or challenge recap.

Capture rules:

- Use a dedicated seeded reviewer/marketing environment with no real personal data.
- Keep the same fictional identities and challenge story across all images.
- Use only UI and behavior present in the submitted build.
- Avoid notification banners, debug controls, loading states, empty states, broken images, and ad placeholders.
- Keep system time, carrier, battery, and locale consistent.
- Confirm every export has the exact dimensions, RGB color, and no alpha channel.

## App Review information

Required private contact fields:

- Contact name: `Mihir Dalal`
- Contact email: `ironside-dev@challengesphere.com`
- Contact phone: `+91 9691226685`

### Review notes draft

```text
ChallengeSphere is a social accountability app where users create or join challenges and share progress.

AUTHENTICATION
The iOS app intentionally offers only Sign in with Apple. A reviewer can select Continue with Apple and self-provision a new account; no shared password or production backdoor is required. Apple may be used with Share My Email or Hide My Email. After authorization, complete the short profile onboarding flow.

CORE REVIEW PATH
1. Sign in with Apple and finish onboarding.
2. Open Discover to browse seeded public and official challenges.
3. Open a challenge and join it, or create a private challenge from the Create tab.
4. Add a photo check-in with a short caption to a joined or newly created challenge.
5. On content from another seeded user, open the overflow menu to report the post, comment, or challenge. Open that user's profile to report or block the account.
6. Open Settings > Privacy & Safety to review blocked accounts, privacy controls, and Delete Account.

PREMIUM
Open Settings > ChallengeSphere Premium. Monthly and annual subscriptions are processed through the App Store and RevenueCat. Restore Purchases is available independently of new-purchase availability and asks the reviewer to confirm the currently signed-in destination account before continuing. Manage Subscription opens the Apple/RevenueCat customer-management flow. Apple sandbox review purchasing can be used; no external payment is offered.

ACCOUNT DELETION
Settings > Privacy & Safety > Delete Account performs in-app deletion after confirmation. The app warns active subscribers that deleting an account does not cancel App Store billing and offers Manage Subscription first.

PERMISSIONS
Camera and Photos are requested only when the reviewer chooses to add profile or challenge media. Contacts are optional and are requested only after choosing Browse Contacts in the invite screen; contacts remain on-device and are used to open a user-directed share. Notifications are optional. The release does not request microphone access.

SAFETY
ChallengeSphere supports content-level reports, account reports, blocking, published community rules, text filtering, image moderation, and an operator moderation queue. Support is available in-app and at https://challengesphere.com/support.

ADS/ATT
ChallengeSphere for iPhone and iPad contains no advertising SDK, displays no advertising, and does not request App Tracking Transparency permission. The submitted build uses the `production-ios-no-ads` release profile.

UNIVERSAL LINKS
Challenge invitations use https://challengesphere.com/invite/{code} and support cold, warm, and signed-out routing.

If any issue prevents review, contact Mihir Dalal at ironside-dev@challengesphere.com or +91 9691226685.
```

## Premium subscription metadata

### Monthly

- Product ID: `com.ironside.challengesphere.premium.monthly`
- Reference name: `ChallengeSphere Premium Monthly`
- Display name: `Premium Monthly`
- Description: `Higher challenge limits and a Premium profile badge, billed monthly.`
- Review note: `Open Settings > ChallengeSphere Premium, choose a plan, and select the monthly package in the App Store paywall.`

### Annual

- Product ID: `com.ironside.challengesphere.premium.annual`
- Reference name: `ChallengeSphere Premium Annual`
- Display name: `Premium Annual`
- Description: `Higher challenge limits and a Premium profile badge, billed annually.`
- Review note: `Open Settings > ChallengeSphere Premium, choose a plan, and select the annual package in the App Store paywall.`

Attach a review screenshot showing the real paywall with localized price, billing period, automatic-renewal disclosure, restore action, Privacy Policy, and Terms. Submit both first subscriptions with the app version that first exposes Premium.

## Age-rating questionnaire draft

Answer from the actual production content and moderation operations, not just seeded screenshots:

- User-generated content: Yes.
- Messaging/chat: Yes for public comments and social interaction; there is no private direct messaging.
- Unrestricted web access: No.
- Parental controls: No dedicated parental-control feature.
- Age assurance: Yes; date of birth is collected and accounts must meet the minimum-age policy.
- Content moderation: Yes; filtering, image moderation, reports, blocking, and human moderation queue.
- Advertising: No. The submitted iOS build contains no advertising SDK and displays no ads.
- Contests: answer No unless challenges award prizes or meet Apple's contest definition in production.
- Gambling, loot boxes, simulated gambling, sexual content supplied by the developer, drugs, weapons, and realistic violence: None, assuming production editorial content remains consistent.
- Medical or wellness claims: No diagnosis or treatment claims; challenges include a safety disclaimer.
- Made for Kids: No.

Accept the rating Apple calculates. If ChallengeSphere's Terms require a higher minimum than the calculated rating, use the higher-age override.

## Compliance and availability

- Export compliance: `ITSAppUsesNonExemptEncryption = false` is appropriate only while the app uses standard OS/TLS encryption and contains no proprietary or non-exempt cryptography. Reconfirm on the signed archive.
- Content rights: confirm Ironside owns or licenses every seeded image, icon, font, challenge cover, and external integration mark shown in the app or screenshots.
- DSA trader status: the Account Holder must answer and provide any required EU contact/address information.
- Paid Apps Agreement, tax, and banking must be active before subscription submission.
- Decide country availability deliberately; do not assume worldwide availability where local filings or ratings are required.

## Submission gate

- [ ] Apple Developer capability, Sign in with Apple key, server notification URL, and regenerated distribution profile are active.
- [ ] Backend migrations/configuration and canonical website are deployed.
- [ ] RevenueCat iOS app, products, entitlement, offering, webhook, and production keys are active.
- [x] `production-ios-no-ads` is selected; the app and App Privacy worksheet specify no iOS ads, no ATT request, and no tracking. The signed archive still requires final inspection.
- [ ] Fresh Apple reviewer accounts receive seeded public/official content.
- [ ] Six iPhone and six iPad screenshots are captured from the final build.
- [ ] Contact placeholders and Apple ID are replaced.
- [ ] Signed archive passes validation and its entitlements/privacy report are inspected.
- [ ] Physical iPhone and iPad TestFlight flows are manually verified.
- [ ] Version, first subscriptions, metadata, privacy answers, and review notes are attached to one submission.

## Apple references

- [App information limits and fields](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information)
- [Platform version metadata](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information)
- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
- [Manage App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)
- [Set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating)
