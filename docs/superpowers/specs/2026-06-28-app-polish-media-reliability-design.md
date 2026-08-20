# ChallengeSphere App Polish and Media Reliability Design

## Summary

This change delivers the approved shared-component approach across eleven related
frontend and backend issues. It improves the public-challenge success animation,
avatar reliability, profile onboarding, submission media browsing, submission
identity, challenge lists, the feed, profile editing, challenge editing, upload
consistency, and logout navigation. Existing navigation destinations and social
actions remain available.

## Product Decisions

- Date of birth is optional. It is chosen with the native calendar picker.
- Age is derived from date of birth, displayed read-only, and cleared when DOB is
  cleared. Users cannot type or override age.
- Multi-photo submissions autoplay while idle and remain manually swipeable.
  Autoplay pauses during interaction and resumes from the selected image.
- Gallery/Camera choice is shared by challenge submissions, profile photo
  setup/editing, and challenge cover creation/editing.
- No browser mockups are required. Visual work follows the current app style.
- The existing black base and purple/green brand accents remain, with restrained
  category accents and neutral surfaces.

## Architecture

### Shared Media UI

Create one media-source chooser that presents Gallery and Camera actions and
returns normalized image-picker assets. Profile and challenge-cover flows use the
chooser directly. Submission entry points also use one shared submission composer
for source selection, multi-image preview, caption, validation, upload progress,
retry, and reset behavior.

Use one submission carousel everywhere. It supports paging, indicators, manual
swiping, idle autoplay, interaction pause/resume, cached remote images, and optional
zoom. Profile grids may autoplay, but tapping into a detail view always permits
manual paging.

### Profile Media Backend

Profile photo uploads use a dedicated authenticated presign path and are not routed
through the submission-only validator. The backend accepts profile image content
types, produces a profile-scoped S3 object key, stores the stable key on the user,
invalidates profile caches, and returns a readable signed URL.

All API responses containing a ChallengeSphere-hosted avatar resolve the stable
stored key through the same media URL service. This includes profile, search,
suggestions, followers/following, challenge participants, leaderboards, comments,
glories, notifications, invitations, and feed responses. External avatar URLs,
such as Google profile images, pass through unchanged.

The frontend uses the same disk-cached image component, stable cache key, load
failure fallback, and generic avatar across all avatar surfaces.

### Authentication Boundary

Logout is owned by `AuthProvider`. It clears server/local tokens, authenticated
user state, user-scoped query data, and protected navigation history exactly once.
Authenticated screens are guarded at the router boundary; when authentication
becomes false, their history entries are removed and Login becomes the only
reachable root. API refresh failures share the same single-flight logout path so
concurrent 401 responses cannot issue repeated redirects.

## Experience Changes

### Public Challenge Success

Replace the public audience-dot scene with five local avatar characters entering
from different directions, gathering around a central challenge mark, briefly
celebrating, and settling into a community formation. Reanimated/native-driven
transforms and opacity keep the scene lightweight. The private curtain animation
remains unchanged.

### Onboarding

Make the profile setup scroll keyboard-aware on Android and iOS. Focusing a lower
field scrolls it above the keyboard. DOB opens the existing native date picker,
disallows future dates, and uses a reasonable earliest date. The derived age is a
read-only value with a lock/read-only treatment, not a second input.

### Submission Identity and Feed

Replace trophy-name pills with a shared challenge identity strip containing a
category-colored icon tile, small `Challenge` label, challenge title, day badge,
and chevron when navigable. Use it in the feed, profile previews, other-user
profiles, and submission details.

Refresh the feed with a stronger user header, consistent spacing, edge-to-edge
post media, improved carousel indicators, the shared challenge strip, readable
caption hierarchy, and a calmer action row. Keep suggestions, glory, comments,
user navigation, challenge navigation, pagination, refresh, and empty/error states.

### Challenge Lists and Editing

All challenge lists resolve display copy through one parser. It chooses the first
real description field, rejects dot-only placeholders, and renders only the main
description before embedded Rules or Benefits sections.

Replace the inline edit-challenge duration dropdown with a bounded modal selector.
It scrolls independently, marks the selected value, closes on selection/backdrop,
and cannot overflow the parent screen.

## Error Handling

- Permission denial explains whether Gallery or Camera access is required.
- Cancelling a picker keeps the existing draft and does not open an empty composer.
- Failed media upload preserves selected media and caption for retry.
- Profile update errors show the backend validation message without losing edits.
- Avatar load failures switch to the local fallback without retry loops.
- Logout succeeds locally even if the server logout request fails.

## Interfaces

- Add an authenticated profile-photo presign endpoint or a media endpoint whose
  request explicitly distinguishes `PROFILE_PHOTO` from submission media.
- Preserve existing user update JSON fields. The stored `profilePicUrl` becomes a
  stable S3 key for new ChallengeSphere uploads; response fields remain readable
  URLs for client compatibility.
- No challenge, feed, submission, or navigation URL contract changes.

## Verification

- Frontend source regression tests cover the public-avatar animation, optional DOB
  picker/read-only age, keyboard-safe setup, swipe plus autoplay carousel, shared
  challenge strip, description-only lists, bounded duration selector, shared media
  chooser/composer, and single logout path.
- Backend tests cover profile presign authorization/type validation, stable key
  storage, readable avatar URLs for every response family, cache invalidation, and
  preservation of external avatar URLs.
- Manual Android QA covers all upload entry points, profile updates, all avatar
  surfaces, carousel gestures/autoplay, feed layout, challenge list copy, DOB with
  keyboard open, duration selection, and logout followed by repeated Back presses.
- Run the full frontend regression suite, TypeScript, Expo lint, backend Maven tests,
  and release build.
- Build a signed release APK, verify its signature, and provide its workspace path.

## Acceptance Criteria

1. Public challenge success shows recognizable animated people, not dot rows.
2. Available profile pictures render across every listed user surface.
3. Optional DOB uses a calendar; age is automatic/read-only; keyboard does not hide
   the controls.
4. Every multi-photo submission supports both autoplay and manual swiping.
5. Submission challenge identity is consistently polished without the trophy pill.
6. Challenge lists show description only, never Rules/Benefits or dot placeholders.
7. Feed presentation is visibly refined without removing behavior.
8. Text-only and photo profile edits complete without a 400 response.
9. Duration selection stays within a bounded modal.
10. Submission, profile, and challenge media flows all begin with Gallery/Camera.
11. After logout, Back cannot reopen authenticated screens or trigger login refresh
    loops.
12. The updated signed release APK builds successfully.
