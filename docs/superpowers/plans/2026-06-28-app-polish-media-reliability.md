# ChallengeSphere App Polish and Media Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved eleven app fixes and produce a signed Android release APK.

**Architecture:** Centralize media source selection, submission composition, avatar rendering, challenge identity, and logout ownership. Keep existing APIs compatible while adding a dedicated profile-photo presign endpoint and consistently resolving stored S3 avatar keys into readable URLs.

**Tech Stack:** Expo SDK 54, React Native 0.81, Expo Router 6, React Query 5, Reanimated 4, Spring Boot, Maven, Aurora PostgreSQL, S3.

---

## File Structure

New focused frontend units:

- `components/common/MediaSourceChooser.tsx`: reusable Gallery/Camera sheet.
- `components/common/SubmissionComposer.tsx`: shared submission draft and upload UI.
- `components/common/AvatarImage.tsx`: cached avatar with stable fallback behavior.
- `components/common/ChallengeIdentityStrip.tsx`: shared submission challenge context.
- `components/common/DurationPickerModal.tsx`: bounded duration selector.
- `utils/dateOfBirth.ts`: strict DOB parsing, formatting, and age derivation.

New backend unit:

- `service/impl/ProfilePhotoService.java`: validates and signs profile-photo uploads.

Existing large screens remain responsible for data fetching and navigation. They
delegate media picking, submission drafting, and repeated visual treatments to the
new focused components.

### Task 1: Lock the Frontend Regression Contract

**Files:**
- Create: `scripts/test-app-polish-media-reliability.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing source regression test**

Create a script that reads the affected sources and asserts these concrete contracts:

```js
assert.match(challengeCreated, /CommunityGatheringAnimation/);
assert.doesNotMatch(challengeCreated, /audienceDot/);
assert.match(profileSetup, /DateTimePicker/);
assert.match(profileSetup, /editable=\{false\}/);
assert.match(profileSetup, /keyboardAwareScrollRef/);
assert.match(carousel, /scrollEnabled/);
assert.match(carousel, /onScrollBeginDrag/);
assert.match(carousel, /resumeAutoplay/);
assert.match(feed, /ChallengeIdentityStrip/);
assert.match(challengeCard, /getMainChallengeDescription/);
assert.match(editChallenge, /DurationPickerModal/);
assert.match(settings, /await logout\(\)/);
assert.doesNotMatch(settings, /useLogout/);
assert.match(rootLayout, /Stack\.Protected/);
assert.match(rootLayout, /guard=\{isAuthenticated\}/);
```

Also scan submission, profile, challenge-create, and challenge-edit sources for
`MediaSourceChooser`, and scan all three submission entry points for
`SubmissionComposer`.

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
node scripts/test-app-polish-media-reliability.mjs
```

Expected: FAIL on the first missing shared component contract.

- [ ] **Step 3: Add the script command**

Add `"test:app-polish": "node ./scripts/test-app-polish-media-reliability.mjs"` to
`package.json`.

- [ ] **Step 4: Commit the red test**

```bash
git add package.json scripts/test-app-polish-media-reliability.mjs
git commit -m "test: lock app polish and media reliability contract"
```

### Task 2: Add Dedicated Profile Photo Presigning

**Files:**
- Backend create: `src/main/java/com/ironside/challengesphere/service/impl/ProfilePhotoService.java`
- Backend modify: `src/main/java/com/ironside/challengesphere/controller/UserController.java`
- Backend modify: `src/main/java/com/ironside/challengesphere/service/impl/MediaUrlService.java`
- Backend test: `src/test/java/com/ironside/challengesphere/service/impl/ProfilePhotoServiceTest.java`

- [ ] **Step 1: Write failing backend tests**

Initialize `ProfilePhotoService` with mocked `UserRepository` and
`MediaUrlService`, then add:

```java
@Test
void createsProfileScopedKeyForAuthenticatedImageUpload() throws Exception {
    when(userRepository.existsById(7L)).thenReturn(true);
    when(mediaUrlService.createUploadUrl(
            anyString(), eq(3600L), eq(GeneratePresignedUrlsRequest.ContentType.IMAGE_JPEG)))
            .thenReturn("https://upload.example/signed");

    GeneratePresignedUrlsRequest.MediaFileInfo file = new GeneratePresignedUrlsRequest.MediaFileInfo();
    file.setFileName("avatar.jpg");
    file.setMediaType(MediaTypes.PROFILE_PHOTO);
    file.setContentType(GeneratePresignedUrlsRequest.ContentType.IMAGE_JPEG);

    PresignedUrlsResponse response = service.generateUpload(7L, file);

    assertTrue(response.isSuccess());
    assertEquals(1, response.getPresignedUrls().size());
    PresignedUrlsResponse.PresignedUrlInfo result = response.getPresignedUrls().get(0);
    assertTrue(result.getFileKey().startsWith("profiles/user_7/"));
    assertTrue(result.getFileKey().endsWith(".jpg"));
    assertEquals("PROFILE_PHOTO", result.getFileType());
    assertEquals("https://upload.example/signed", result.getPresignedUrl());
}

@Test
void rejectsVideoContentForProfilePhoto() {
    GeneratePresignedUrlsRequest.MediaFileInfo file = new GeneratePresignedUrlsRequest.MediaFileInfo();
    file.setFileName("avatar.mp4");
    file.setMediaType(MediaTypes.PROFILE_PHOTO);
    file.setContentType(GeneratePresignedUrlsRequest.ContentType.VIDEO_MP4);

    ChallengeSphereException error = assertThrows(
            ChallengeSphereException.class,
            () -> service.generateUpload(7L, file));

    assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
    verifyNoInteractions(userRepository, mediaUrlService);
}

@Test
void rejectsMissingUserBeforeSigning() {
    when(userRepository.existsById(404L)).thenReturn(false);
    GeneratePresignedUrlsRequest.MediaFileInfo file = new GeneratePresignedUrlsRequest.MediaFileInfo();
    file.setFileName("avatar.png");
    file.setMediaType(MediaTypes.PROFILE_PHOTO);
    file.setContentType(GeneratePresignedUrlsRequest.ContentType.IMAGE_PNG);

    ChallengeSphereException error = assertThrows(
            ChallengeSphereException.class,
            () -> service.generateUpload(404L, file));

    assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
    verifyNoInteractions(mediaUrlService);
}
```

Mock `UserRepository` and `MediaUrlService`. Use a single
`GeneratePresignedUrlsRequest.MediaFileInfo` and assert the response contains
`PROFILE_PHOTO`, the requested MIME type, and a stable `fileKey`.

- [ ] **Step 2: Run the focused test and verify it fails**

```bash
./mvnw -q -Dtest=ProfilePhotoServiceTest test
```

Expected: FAIL because `ProfilePhotoService` does not exist.

- [ ] **Step 3: Add an injectable upload signer to `MediaUrlService`**

```java
public String createUploadUrl(
        String objectName,
        long expiresInSeconds,
        GeneratePresignedUrlsRequest.ContentType contentType) {
    return GetSignedUrlForS3.generatePutObjectSignedUrl(
            bucketName, objectName, expiresInSeconds, contentType);
}
```

- [ ] **Step 4: Implement `ProfilePhotoService`**

Its public method is:

```java
public PresignedUrlsResponse generateUpload(
        Long userId,
        GeneratePresignedUrlsRequest.MediaFileInfo file)
        throws ChallengeSphereException
```

Require `PROFILE_PHOTO`, allow JPEG/PNG/GIF only, verify the user exists, generate
`profiles/user_<id>/<timestamp>_<uuid>.<extension>`, and return one
`PresignedUrlInfo` with a one-hour expiry.

- [ ] **Step 5: Expose the authenticated endpoint**

Add:

```java
@PostMapping("/{userId}/profile-picture/presigned-url")
public ResponseEntity<PresignedUrlsResponse> generateProfilePhotoUpload(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long userId,
        @Valid @RequestBody GeneratePresignedUrlsRequest.MediaFileInfo file)
```

Call `SecurityAccess.requireSelf`, then `profilePhotoService.generateUpload`.

- [ ] **Step 6: Verify backend tests**

```bash
./mvnw -q -Dtest=ProfilePhotoServiceTest,SubmissionUploadAbuseControlsTest test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/com/ironside/challengesphere/controller/UserController.java \
  src/main/java/com/ironside/challengesphere/service/impl/MediaUrlService.java \
  src/main/java/com/ironside/challengesphere/service/impl/ProfilePhotoService.java \
  src/test/java/com/ironside/challengesphere/service/impl/ProfilePhotoServiceTest.java
git commit -m "fix: add dedicated profile photo upload signing"
```

### Task 3: Make Every Avatar Response Readable

**Files:**
- Backend modify: `src/main/java/com/ironside/challengesphere/service/impl/ChallengeServiceImpl.java`
- Backend modify: `src/main/java/com/ironside/challengesphere/service/impl/LeaderboardServiceImpl.java`
- Backend modify: `src/main/java/com/ironside/challengesphere/service/impl/NotificationServiceImpl.java`
- Backend modify: `src/main/java/com/ironside/challengesphere/service/impl/UserServiceImpl.java`
- Backend test: `src/test/java/com/ironside/challengesphere/UserProfilePhotoListRegressionTest.java`

- [ ] **Step 1: Extend the failing avatar coverage test**

Assert that participant users, both leaderboard paths, notification actor/target
fields, update-user responses, and existing search/follower paths all call
`mediaUrlService.toReadableMediaUrl`. Add a unit case proving an external
`https://lh3.googleusercontent.com/...` URL passes through unchanged.

- [ ] **Step 2: Run the focused test and verify it fails**

```bash
./mvnw -q -Dtest=UserProfilePhotoListRegressionTest test
```

Expected: FAIL for participants and leaderboard mappings.

- [ ] **Step 3: Resolve avatars at each response boundary**

Use one helper shape:

```java
private String readableProfilePic(String value) {
    return value == null || value.isBlank()
            ? value
            : mediaUrlService.toReadableMediaUrl(value);
}
```

Apply it while constructing response data. Do not overwrite the stored database
value or cache a signed URL. Return the updated user with a readable URL only after
persisting and invalidating stable profile data.

- [ ] **Step 4: Run avatar and full backend tests**

```bash
./mvnw -q -Dtest=UserProfilePhotoListRegressionTest test
./mvnw -q test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/ironside/challengesphere/service/impl/ChallengeServiceImpl.java \
  src/main/java/com/ironside/challengesphere/service/impl/LeaderboardServiceImpl.java \
  src/main/java/com/ironside/challengesphere/service/impl/NotificationServiceImpl.java \
  src/main/java/com/ironside/challengesphere/service/impl/UserServiceImpl.java \
  src/test/java/com/ironside/challengesphere/UserProfilePhotoListRegressionTest.java
git commit -m "fix: return readable profile photos across APIs"
```

### Task 4: Build Shared Avatar and Media Source Components

**Files:**
- Create: `components/common/AvatarImage.tsx`
- Create: `components/common/MediaSourceChooser.tsx`
- Modify: `services/userService.ts`
- Modify: `services/mediaService.ts`
- Modify: `types/api.ts`
- Modify: `scripts/test-app-polish-media-reliability.mjs`

- [ ] **Step 1: Extend the red test**

Assert `AvatarImage` uses `expo-image`, `createCachedRemoteImageSource`,
`cachePolicy="memory-disk"`, and `onError` fallback. Assert `MediaSourceChooser`
contains Gallery and Camera actions and calls normalized picker helpers.

- [ ] **Step 2: Run the test and verify the new assertions fail**

```bash
npm run test:app-polish
```

Expected: FAIL because both components are missing.

- [ ] **Step 3: Implement `AvatarImage`**

Public props:

```ts
type AvatarImageProps = {
  uri?: string | null;
  size: number;
  borderColor?: string;
  borderWidth?: number;
  style?: StyleProp<ImageStyle>;
};
```

Reset failure state when `uri` changes, use the stable cache source for remote URLs,
and switch to `assets/images/genericman.jpg` after an image error.

- [ ] **Step 4: Implement `MediaSourceChooser`**

Public props:

```ts
type MediaSourceChooserProps = {
  visible: boolean;
  title: string;
  allowsMultipleSelection?: boolean;
  selectionLimit?: number;
  aspect?: [number, number];
  onSelected: (assets: ImagePicker.ImagePickerAsset[]) => void;
  onClose: () => void;
};
```

Render a bottom sheet with icon buttons for Gallery and Camera. Request only the
permission needed for the selected action. Preserve the caller draft on cancel.

- [ ] **Step 5: Add the profile presign client method**

```ts
generateProfilePhotoPresignedUrl(
  userId: number,
  file: GeneratePresignedUrlsRequest['mediaFiles'][number],
): Promise<PresignedUrlsResponse>
```

POST to `/users/${userId}/profile-picture/presigned-url`. Profile upload helpers
return `fileKey`, not the stripped PUT URL.

- [ ] **Step 6: Run focused tests and typecheck**

```bash
npm run test:app-polish
npx tsc --noEmit
```

Expected: PASS for shared-component assertions and no new TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add components/common/AvatarImage.tsx components/common/MediaSourceChooser.tsx \
  services/userService.ts services/mediaService.ts types/api.ts \
  scripts/test-app-polish-media-reliability.mjs
git commit -m "feat: centralize avatar and media source UI"
```

### Task 5: Unify Profile and Challenge Cover Picking

**Files:**
- Modify: `app/profile-setup.tsx`
- Modify: `screens/EditProfile.tsx`
- Modify: `app/(tabs)/create.tsx`
- Modify: `app/edit-challenge.tsx`
- Modify: `scripts/test-app-polish-media-reliability.mjs`

- [ ] **Step 1: Add failing migration assertions**

Require all four screens to render `MediaSourceChooser` and prohibit direct
`launchImageLibraryAsync`/`launchCameraAsync` calls outside the shared component.

- [ ] **Step 2: Run and verify failure**

```bash
npm run test:app-polish
```

Expected: FAIL on direct picker usage.

- [ ] **Step 3: Migrate profile setup and edit**

Opening the avatar action shows the chooser. Normalize the selected asset, upload
through the dedicated profile endpoint, then update the user with the returned
stable `fileKey`. On success update AuthProvider storage and invalidate user caches.

- [ ] **Step 4: Migrate challenge create and edit**

Use the same chooser with 16:9 editing intent and a five-image total limit. Camera
adds one image; Gallery can select up to the remaining limit. Keep existing images
when the chooser is cancelled.

- [ ] **Step 5: Verify**

```bash
npm run test:app-polish
node scripts/test-media-upload-performance.mjs
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/profile-setup.tsx screens/EditProfile.tsx \
  'app/(tabs)/create.tsx' app/edit-challenge.tsx \
  scripts/test-app-polish-media-reliability.mjs
git commit -m "feat: unify profile and challenge media picking"
```

### Task 6: Unify Submission Composition

**Files:**
- Create: `components/common/SubmissionComposer.tsx`
- Modify: `app/(tabs)/challenges.tsx`
- Modify: `app/challenge-details.tsx`
- Modify: `app/challenge-submissions.tsx`
- Modify: `scripts/test-app-polish-media-reliability.mjs`

- [ ] **Step 1: Add failing shared-composer assertions**

Require all three screens to render `SubmissionComposer`; direct picker calls and
duplicate caption/authenticity UI must be absent from those screens.

- [ ] **Step 2: Run and verify failure**

```bash
npm run test:app-polish
```

Expected: FAIL because the composer does not exist.

- [ ] **Step 3: Implement the composer**

Public contract:

```ts
type SubmissionComposerProps = {
  visible: boolean;
  challengeTitle: string;
  dayNumber: number;
  isOneOff: boolean;
  isSubmitting: boolean;
  uploadProgress: number;
  onSubmit: (draft: { assets: ImagePickerAsset[]; caption: string }) => Promise<void>;
  onClose: () => void;
};
```

The sheet starts with `MediaSourceChooser`, supports up to five images, preserves
drafts after upload failures, requires a trimmed caption, displays progress, and
resets only after successful submission or explicit close.

- [ ] **Step 4: Migrate every entry point**

Each screen supplies challenge/day context and its existing mutation callback.
Remove the eager gallery launch in challenge history so tapping Upload always shows
Gallery/Camera first.

- [ ] **Step 5: Verify**

```bash
npm run test:app-polish
node scripts/test-keyboard-safe-composers.mjs
node scripts/test-media-upload-performance.mjs
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/common/SubmissionComposer.tsx 'app/(tabs)/challenges.tsx' \
  app/challenge-details.tsx app/challenge-submissions.tsx \
  scripts/test-app-polish-media-reliability.mjs
git commit -m "feat: use one challenge submission composer"
```

### Task 7: Fix Optional DOB, Read-Only Age, and Keyboard Visibility

**Files:**
- Create: `utils/dateOfBirth.ts`
- Modify: `app/profile-setup.tsx`
- Modify: `scripts/test-app-polish-media-reliability.mjs`
- Test: `scripts/test-ui-regressions.mjs`

- [ ] **Step 1: Write failing DOB behavior tests**

Use the project TS loader to assert:

```js
assert.equal(calculateAge('2000-06-28', new Date(2026, 5, 28)), 26);
assert.equal(calculateAge('2000-06-29', new Date(2026, 5, 28)), 25);
assert.equal(calculateAge('', new Date()), null);
assert.equal(isSelectableDate('2999-01-01'), false);
```

Require the screen to use `DateTimePicker`, a scroll ref, keyboard show handling,
and a non-editable age display.

- [ ] **Step 2: Run and verify failure**

```bash
node scripts/test-ui-regressions.mjs
npm run test:app-polish
```

Expected: FAIL on the missing utility and picker.

- [ ] **Step 3: Implement the utility and UI**

Use local-date `YYYY-MM-DD` formatting. Set picker maximum to today and minimum to
120 years ago. Tapping DOB opens the native picker. Clearing DOB clears age. Age is
rendered as a labelled read-only field with a lock icon.

On keyboard show or DOB focus, call:

```ts
keyboardAwareScrollRef.current?.scrollToEnd({ animated: true });
```

Use `KeyboardAvoidingView` behavior `padding` on iOS and `height` on Android.

- [ ] **Step 4: Verify and commit**

```bash
node scripts/test-ui-regressions.mjs
npm run test:app-polish
npx tsc --noEmit
git add utils/dateOfBirth.ts app/profile-setup.tsx \
  scripts/test-ui-regressions.mjs scripts/test-app-polish-media-reliability.mjs
git commit -m "fix: make onboarding birthday keyboard safe"
```

### Task 8: Support Autoplay and Manual Carousel Paging

**Files:**
- Modify: `components/common/SubmissionMediaCarousel.tsx`
- Modify: `screens/Profile.tsx`
- Modify: `app/user-profile.tsx`
- Modify: `app/photo-details.tsx`
- Modify: `screens/Feed.tsx`
- Modify: `scripts/test-ui-regressions.mjs`

- [ ] **Step 1: Write the failing carousel assertions**

Require `scrollEnabled` regardless of autoplay, `onScrollBeginDrag`,
`onMomentumScrollEnd`, an interaction pause ref, and delayed autoplay resume.

- [ ] **Step 2: Run and verify failure**

```bash
node scripts/test-ui-regressions.mjs
```

Expected: FAIL because `scrollEnabled={!autoPlay}` disables profile swiping.

- [ ] **Step 3: Implement interaction-aware autoplay**

Always enable horizontal scrolling. Clear the autoplay timer on drag start, update
the active index on momentum end, and start a fresh interval after a 3.2-second
idle delay. Catch `scrollToIndex` failures and fall back to `scrollToOffset`.

- [ ] **Step 4: Verify all consumers pass every media URL**

Profile grids use autoplay. Feed and full-screen detail views permit manual paging;
detail views retain zoom. No consumer selects only `mediaUrls[0]`.

- [ ] **Step 5: Verify and commit**

```bash
node scripts/test-ui-regressions.mjs
npm run test:app-polish
npx tsc --noEmit
git add components/common/SubmissionMediaCarousel.tsx screens/Profile.tsx \
  app/user-profile.tsx app/photo-details.tsx screens/Feed.tsx \
  scripts/test-ui-regressions.mjs
git commit -m "fix: combine carousel autoplay with manual swiping"
```

### Task 9: Add Shared Challenge Identity and Refresh the Feed

**Files:**
- Create: `components/common/ChallengeIdentityStrip.tsx`
- Modify: `components/common/ChallengeSummary.tsx`
- Modify: `screens/Feed.tsx`
- Modify: `screens/Profile.tsx`
- Modify: `app/user-profile.tsx`
- Modify: `app/photo-details.tsx`
- Modify: `scripts/test-profile-submission-challenge-labels.mjs`

- [ ] **Step 1: Write failing identity assertions**

Require every submission surface to use `ChallengeIdentityStrip`, and reject trophy
icons adjacent to challenge names. Require props for title, day, category, and
optional navigation.

- [ ] **Step 2: Run and verify failure**

```bash
node scripts/test-profile-submission-challenge-labels.mjs
```

Expected: FAIL on the old trophy pills.

- [ ] **Step 3: Implement the strip**

Render a 34px category-colored icon tile, a small `Challenge` label, a one-line
title, a separate day badge, and chevron only when pressable. Reuse
`getChallengeVisualIdentity` for category color/icon selection.

- [ ] **Step 4: Refresh feed composition**

Keep a restrained post card with:

1. avatar, username, and relative time header;
2. full-width media carousel and day overlay;
3. shared challenge strip;
4. caption;
5. glory/comment actions.

Tighten spacing, reduce pill clutter, preserve suggestions/pagination/refresh, and
use `AvatarImage` for feed and suggested-user avatars.

- [ ] **Step 5: Migrate profile and photo detail surfaces**

Replace duplicate preview pills and `ChallengeSummary` trophy visuals with the
shared strip. Preserve challenge navigation and day values.

- [ ] **Step 6: Verify and commit**

```bash
node scripts/test-profile-submission-challenge-labels.mjs
npm run test:app-polish
npx tsc --noEmit
git add components/common/ChallengeIdentityStrip.tsx \
  components/common/ChallengeSummary.tsx screens/Feed.tsx screens/Profile.tsx \
  app/user-profile.tsx app/photo-details.tsx \
  scripts/test-profile-submission-challenge-labels.mjs
git commit -m "feat: refine submission identity and feed"
```

### Task 10: Show Description Only and Fix Duration Selection

**Files:**
- Modify: `utils/challengeDisplayText.ts`
- Modify: `components/common/ChallengeCard.tsx`
- Modify: `app/(tabs)/global.tsx`
- Create: `components/common/DurationPickerModal.tsx`
- Modify: `app/edit-challenge.tsx`
- Modify: `scripts/test-challenge-list-description.mjs`
- Modify: `scripts/test-edit-challenge-category.mjs`

- [ ] **Step 1: Write failing description tests**

Assert:

```js
assert.equal(
  getMainChallengeDescription({
    description: 'Walk daily\\n\\nRules & Guidelines:\\nPost proof\\n\\nBenefits:\\nEnergy',
  }),
  'Walk daily',
);
```

Also cover dot-only fallback and alternate description fields.

- [ ] **Step 2: Write failing duration modal assertions**

Reject inline `pickerOptions` in edit challenge. Require a modal, independent
`FlatList`, selected checkmark, backdrop close, and bounded height.

- [ ] **Step 3: Run and verify both failures**

```bash
node scripts/test-challenge-list-description.mjs
node scripts/test-edit-challenge-category.mjs
```

Expected: FAIL.

- [ ] **Step 4: Implement description normalization**

Select the first non-placeholder description, pass it through
`parseChallengeDescription`, and return only `mainDescription`. Use it in the
shared card and the global-list mapper; never render embedded rules or benefits.

- [ ] **Step 5: Implement and use `DurationPickerModal`**

The modal accepts `visible`, `value`, `options`, `onSelect`, and `onClose`.
Constrain the list to `min(420, 60% of viewport height)` and close after selection.

- [ ] **Step 6: Verify and commit**

```bash
node scripts/test-challenge-list-description.mjs
node scripts/test-edit-challenge-category.mjs
npm run test:app-polish
npx tsc --noEmit
git add utils/challengeDisplayText.ts components/common/ChallengeCard.tsx \
  'app/(tabs)/global.tsx' components/common/DurationPickerModal.tsx \
  app/edit-challenge.tsx scripts/test-challenge-list-description.mjs \
  scripts/test-edit-challenge-category.mjs
git commit -m "fix: clean challenge descriptions and duration picker"
```

### Task 11: Replace Public Dots and Fix Logout History

**Files:**
- Create: `components/common/CommunityGatheringAnimation.tsx`
- Modify: `app/challenge-created.tsx`
- Modify: `providers/AuthProvider.tsx`
- Modify: `app/_layout.tsx`
- Modify: `app/settings.tsx`
- Modify: `hooks/useAuth.ts`
- Modify: `scripts/test-app-polish-media-reliability.mjs`

- [ ] **Step 1: Add failing animation assertions**

Require five local avatar assets, staggered entrance values, a central challenge
mark, celebration pulse, and settled formation. Reject `audienceDot`.

- [ ] **Step 2: Add failing logout assertions**

Require Settings to call `AuthProvider.logout` without its own redirect. Require
`Stack.Protected` public/authenticated groups, a single-flight logout ref, query
clearing, and no `router.replace('/login')` inside Settings.

- [ ] **Step 3: Run and verify failure**

```bash
npm run test:app-polish
```

Expected: FAIL.

- [ ] **Step 4: Implement the gathering animation**

Use local `user-female-1.png`, `user-male-1.png`, `user-male-2.png`,
`user-male-3.png`, and `genericman.jpg`. Animate translate, scale, and opacity with
staggered native-driver sequences; pulse the central globe/check mark; then keep
the five avatars visible in a compact arc.

- [ ] **Step 5: Centralize logout**

Use `useQueryClient` and a `logoutInFlightRef` in AuthProvider:

```ts
const logout = useCallback(async () => {
  if (logoutInFlightRef.current) return logoutInFlightRef.current;
  logoutInFlightRef.current = (async () => {
    try { await authService.logout(); }
    finally {
      queryClient.clear();
      setUser(null);
      logoutInFlightRef.current = null;
    }
  })();
  return logoutInFlightRef.current;
}, [queryClient]);
```

The auth-failure handler calls this same function. Settings calls `await logout()`
and performs no navigation.

- [ ] **Step 6: Guard route history**

Extract a navigator child inside AuthProvider and render:

```tsx
<Stack.Protected guard={!isAuthenticated}>
  <Stack.Screen name="login" />
  <Stack.Screen name="signup" />
  <Stack.Screen name="forgot-password" />
  <Stack.Screen name="reset-password" />
</Stack.Protected>
<Stack.Protected guard={isAuthenticated}>
  <Stack.Screen name="index" />
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="onboarding" />
  <Stack.Screen name="profile-setup" />
  <Stack.Screen name="avatar-viewer" />
  <Stack.Screen name="challenge-created" />
  <Stack.Screen name="challenge-details" />
  <Stack.Screen name="challenge-invitation" />
  <Stack.Screen name="challenge-submissions" />
  <Stack.Screen name="change-password" />
  <Stack.Screen name="connected-apps" />
  <Stack.Screen name="edit-challenge" />
  <Stack.Screen name="edit-profile" />
  <Stack.Screen name="followers" />
  <Stack.Screen name="global-challenge-details" />
  <Stack.Screen name="global-submissions" />
  <Stack.Screen name="integration-detail" />
  <Stack.Screen name="invitations" />
  <Stack.Screen name="invite-contacts" />
  <Stack.Screen name="leaderboard" />
  <Stack.Screen name="notifications" />
  <Stack.Screen name="photo-details" />
  <Stack.Screen name="privacy-security" />
  <Stack.Screen name="select-users-to-invite" />
  <Stack.Screen name="settings" />
  <Stack.Screen name="user-challenges" />
  <Stack.Screen name="user-followers" />
  <Stack.Screen name="user-profile" />
</Stack.Protected>
```

Keep privacy policy, help, and about screens public. While auth restores, render
`StartupIntro`. Protected-route removal makes Login the only reachable auth root
after logout.

- [ ] **Step 7: Verify and commit**

```bash
npm run test:app-polish
node scripts/test-auth-flows.mjs
npx tsc --noEmit
git add components/common/CommunityGatheringAnimation.tsx \
  app/challenge-created.tsx providers/AuthProvider.tsx app/_layout.tsx \
  app/settings.tsx hooks/useAuth.ts scripts/test-app-polish-media-reliability.mjs
git commit -m "fix: improve public reveal and logout navigation"
```

### Task 12: Full Verification, Backend Deployment, and APK

**Files:**
- Verify all modified files
- Build: `android/app/build/outputs/apk/release/app-release.apk`

- [ ] **Step 1: Run every frontend regression script**

```bash
for test_file in scripts/test-*.mjs; do
  node "$test_file" || exit 1
done
```

Expected: every script prints its pass message and exits 0.

- [ ] **Step 2: Run frontend static checks**

```bash
npx tsc --noEmit
npx expo lint
git diff --check
```

Expected: no new errors and no whitespace failures.

- [ ] **Step 3: Run backend verification and package**

```bash
./mvnw -q test
./mvnw -q -DskipTests clean package
sha256sum target/challengesphere-0.0.1-SNAPSHOT.jar
git diff --check
```

Expected: tests pass and a deployable JAR hash is printed.

- [ ] **Step 4: Deploy the backend to the active EC2 node**

Back up the remote JAR, copy the new JAR to
`/opt/challengesphere/challengesphere.jar`, restart `challengesphere.service`, and
verify:

```bash
systemctl is-active challengesphere.service
curl -fsS http://127.0.0.1:8080/actuator/health
```

Expected: `active` and `{"status":"UP"}`. Confirm the ap-south-1 ALB target remains
healthy. Do not start or deploy to the stopped spare node.

- [ ] **Step 5: Build the signed release APK**

```bash
cd android
./gradlew assembleRelease
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 6: Verify APK existence and signature**

```bash
ls -lh app/build/outputs/apk/release/app-release.apk
/opt/homebrew/share/android-commandlinetools/build-tools/36.0.0/apksigner \
  verify --print-certs app/build/outputs/apk/release/app-release.apk
```

Expected: APK exists and signer SHA-1 is
`B0:45:46:A2:6D:04:B8:76:78:70:BF:63:21:A4:DF:0C:08:6E:62:D7`.

- [ ] **Step 7: Manual Android QA**

Install the APK and verify all twelve acceptance criteria from the design, with
special attention to Gallery/Camera entry parity, avatar fallback/loading, manual
carousel swipes during autoplay, keyboard-safe DOB selection, and repeated Android
Back presses after logout.

- [ ] **Step 8: Final completion audit**

Map each design acceptance criterion to a passing automated check or manual
observation. Confirm no required item is supported only by inference before
declaring the work complete.
