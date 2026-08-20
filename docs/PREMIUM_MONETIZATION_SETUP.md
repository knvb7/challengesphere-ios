# Premium monetization setup

The iOS app code is ready for App Store subscriptions through RevenueCat. Premium is always granted by the backend after it verifies the RevenueCat entitlement; the mobile client never writes premium status directly.

## Product model

- Entitlement: `premium`
- App Store subscription group: `ChallengeSphere Premium`
- Monthly product: `com.ironside.challengesphere.premium.monthly`
- Annual product: `com.ironside.challengesphere.premium.annual`
- RevenueCat offering: `default`
- Packages: monthly and annual
- Trial: none
- India: ₹149 monthly / ₹999 annual
- United States: $2.99 monthly / $19.99 annual
- Other App Store regions: use localized prices and review Apple’s generated conversions before activation

Premium includes 20 active public and 20 active private challenges, counting challenges a user created or joined, no ads, and a profile badge. Free includes 5 public and 5 private. Users already above a downgraded limit retain their content but cannot create or join in that visibility until they are below the limit.

## App Store Connect

1. Accept the Paid Apps Agreement and complete banking and tax information.
2. Create the `ChallengeSphere Premium` subscription group for `com.ironside.challengesphere`.
3. Create the monthly and annual auto-renewing products using the identifiers above.
4. Add localized display names, descriptions, prices, review screenshots, and subscription review notes. Do not add a trial unless the product decision changes.
5. Create an App Store Connect In-App Purchase key and connect the app to RevenueCat.
6. Submit both subscriptions with the iOS app version that first exposes Premium.

## RevenueCat

1. Add the iOS app with bundle ID `com.ironside.challengesphere` and connect App Store Connect.
2. Import the monthly and annual subscription products.
3. Create entitlement `premium` and attach both plans.
4. Create the `default` offering with monthly and annual packages, then build and publish its paywall.
5. Copy the iOS public SDK key into the frontend build environment:

```text
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
```

6. Configure a webhook for:

```text
POST https://<api-host>/api/v1/subscriptions/webhooks/revenuecat
```

Set an authorization header in RevenueCat and put the exact full header value in `REVENUECAT_WEBHOOK_AUTHORIZATION`. Use separate values for non-production and production.

## Backend environment

```text
REVENUECAT_ENABLED=true
REVENUECAT_SECRET_API_KEY=sk_...
REVENUECAT_ENTITLEMENT_ID=premium
REVENUECAT_APP_USER_ID_PREFIX=cs_user_
REVENUECAT_WEBHOOK_AUTHORIZATION=Bearer <random-long-value>
```

`REVENUECAT_SECRET_API_KEY` and the webhook authorization value are server secrets. Store them in the deployment secret manager, never in the app or source control. The optional `REVENUECAT_WEBHOOK_SIGNING_SECRET` enables the additional `t=...,v1=...` HMAC check only when the webhook sender is configured to produce that header.

Apply backend migration `V46__add_premium_subscriptions.sql` before enabling RevenueCat in production. The idempotent production migration bundle also contains the same tables.

## Release checks

- Use a native development, internal, or production build; purchases cannot be validated through Expo Go.
- Confirm purchase and restore with an App Store sandbox tester.
- Confirm monthly and annual paywalls show the correct localized price and renewal disclosure.
- Confirm purchase grants 20/20 limits, removes ads, and shows the badge.
- Confirm cancellation keeps Premium through the paid period and expiry returns the user to 5/5 without deleting challenges.
- Confirm reinstall and a second device restore the same account.
- Set RevenueCat restore behavior to **Transfer to new App User ID** for production and sandbox. The app confirms the destination account before restore, never configures an anonymous purchasing customer, and does not call background `syncPurchases`.
- Confirm Restore Purchases remains available when new enrollment is paused.
- Confirm Manage Subscription opens RevenueCat Customer Center/App Store management.
- Confirm account deletion warns that App Store billing is separate.
- Confirm RevenueCat webhook deliveries return HTTP 200 and duplicate deliveries do not change state twice.
