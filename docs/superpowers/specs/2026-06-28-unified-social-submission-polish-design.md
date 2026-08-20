# Unified Social and Submission Polish Design

## Summary

ChallengeSphere will use shared presentation and interaction surfaces for
submission details, profile images, and follow actions. The disabled feed will
receive a richer in-app holding experience, and only public challenges will
show an animated community celebration after creation.

The work stays within the existing Expo/React Native and Spring Boot
architecture. It does not add remote visual assets, a new animation dependency,
or a new navigation contract.

## Goals

1. Make profile images reliably readable and consistently rendered.
2. Make submissions opened from the current profile, another user's profile,
   and challenge submission lists use the same detail UI.
3. Replace the plain disabled-feed placeholder with a polished app-native
   experience.
4. Show a community animation only after a public challenge is created.
5. Replace native follow/unfollow confirmation alerts with a consistent
   in-app interaction.

## Profile Image Reliability

### Backend

Authentication responses currently serialize the stored `User` directly.
When `profilePicUrl` contains an S3 object key, login and refresh responses can
therefore expose an unreadable key while ordinary user endpoints expose a
signed URL.

`AuthServiceImpl` will return a detached user copy whose profile image has been
processed through `MediaUrlService.toReadableMediaUrl`. External provider image
URLs remain unchanged. The stored database value remains stable and is never
replaced by a temporary signed URL.

### Frontend

`AvatarImage` remains the single remote-avatar renderer. It provides:

- stable S3 cache keys when signatures rotate;
- memory and disk caching through `expo-image`;
- a local fallback after an image request fails;
- consistent circular sizing.

Remaining direct `Image`, `ExpoImage`, and `CircularPhoto` profile-avatar
surfaces will migrate to `AvatarImage`, including profile headers, profile
submission details, challenge overview creator/participant rows, invitation
pickers, and edit-challenge user rows.

## Unified Submission Details

The authoritative submission detail UI is `app/photo-details.tsx`, currently
used when a submission is opened from challenge submission lists.

The current-profile and user-profile grids will stop opening their private
inline modals. They will navigate to `/photo-details` with the same route
payload used by `challenge-submissions.tsx`:

- submission and challenge IDs;
- complete media URL list;
- author ID, username, and profile image;
- challenge title and day number;
- description, glory count, and comment count.

The destination continues to refetch the authoritative submission, owner, and
challenge by ID. Route values are only immediate display fallbacks. This gives
all three entry points identical layout, carousel behavior, comments, glory
actions, challenge navigation, and swipe-down dismissal.

The obsolete profile-specific submission overlays and their duplicate styles
will be removed.

## Disabled Feed Experience

The feed remains disabled. Its holding state will be rebuilt as an unframed,
dark social-progress scene consistent with the authenticated app:

- a compact orbit/activity motif driven by Reanimated;
- a strong `Feed is warming up` heading;
- concise supporting copy;
- a live challenger count;
- a small preview stack representing challenge updates, progress, and friends.

The scene uses Ionicons, existing local avatars, and native/Reanimated motion.
It does not use remote images, decorative gradient blobs, nested cards, or
marketing-style explanatory copy. Dimensions remain bounded on small Android
screens.

## Public Challenge Creation Animation

`challenge-created.tsx` remains the only route that renders the celebration.

- Public challenge: show `CommunityGatheringAnimation` with staggered local
  avatars, a subtle stage glow, and native-driven entrance motion.
- Private challenge: show a static secured state with lock/shield treatment.
  No curtain, audience, or looping animation is rendered.

Navigation is never delayed by animation.

## Follow and Unfollow Interaction

A reusable `FollowActionSheet` will replace native follow/unfollow confirmation
alerts. It displays the user's cached avatar, username, a concise consequence,
and explicit Cancel/Follow or Cancel/Unfollow actions.

Behavior:

- Follow may be confirmed through the same sheet for consistency.
- Unfollow uses destructive visual treatment.
- The action button shows a stable pending state and cannot be pressed twice.
- Successful actions use `showAppMessage` rather than a native popup.
- Failures use the same message host and preserve the current relationship
  state.
- Existing query invalidation/refetch logic remains authoritative.

The shared sheet will be used by user profiles, follower/following lists,
global challenge creator actions, and challenge participant/creator actions.
Compact suggestion buttons may continue acting immediately, but their result
feedback must use the app message host.

## Error Handling

- Missing or failed profile photos fall back locally without blocking content.
- Submission detail navigation tolerates incomplete route data and resolves the
  full record by submission ID.
- Follow actions remain disabled while pending.
- Profile URL signing failures preserve the original external URL and log a
  backend warning.
- Feed challenger-count errors show an unavailable state without shifting the
  composition.

## Testing

### Source and Unit Regressions

- Auth responses sign stored profile image keys without mutating the entity.
- Profile and user-profile submission presses route to `/photo-details`.
- Duplicate inline submission overlays are absent.
- Remaining primary avatar surfaces use `AvatarImage`.
- Feed holding state contains the new animated composition and no remote media.
- `CommunityGatheringAnimation` is rendered only on the public branch.
- Private challenge creation has no animated curtain or audience.
- Follow surfaces use `FollowActionSheet` and do not invoke native confirmation
  alerts for relationship changes.

### Verification

- Run every frontend `scripts/test-*.mjs`.
- Run `npx tsc --noEmit` and `npx expo lint`.
- Run the full backend Maven test suite.
- Build the signed release APK and verify its certificate.
- Cold-launch the APK on the configured Android emulator and inspect fatal
  Android/React Native logs.

## Non-Goals

- Enabling the real feed.
- Changing follow privacy semantics.
- Changing submission, comment, or glory APIs.
- Adding Lottie or remote animation assets.
- Redesigning challenge creation or unrelated profile sections.
