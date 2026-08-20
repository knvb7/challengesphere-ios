# Unified Social and Submission Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make avatars reliable, unify submission details, enrich the disabled feed, animate only public challenge creation, and replace native follow popups.

**Architecture:** The existing `/photo-details` route becomes the only submission detail renderer. `AvatarImage`, a new feed holding component, and a new follow action sheet become shared frontend surfaces. The backend signs the detached user included in authentication responses so no S3 object key reaches avatar renderers.

**Tech Stack:** Expo Router 6, React Native, Reanimated, Expo Image, TanStack Query, Spring Boot 3, JUnit 5, Mockito.

---

## File Map

- `utils/submissionDetail.ts`: builds normalized route parameters and display data.
- `app/photo-details.tsx`: authoritative submission detail screen.
- `components/common/AvatarImage.tsx`: resilient cached avatar renderer.
- `components/common/FollowActionSheet.tsx`: shared relationship confirmation UI.
- `components/feed/FeedComingSoon.tsx`: rich disabled-feed holding scene.
- `components/common/CommunityGatheringAnimation.tsx`: public creation celebration.
- `AuthServiceImpl.java`: signs the detached user returned by authentication.
- `scripts/test-unified-social-submission-polish.mjs`: source-level cross-surface regression coverage.

The worktree contains approved uncommitted changes in shared files. Implementation
steps must not stage or commit those files because doing so would capture unrelated
user work.

### Task 1: Add Cross-Surface Regression Coverage

**Files:**
- Create: `scripts/test-unified-social-submission-polish.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing source regression**

Create assertions that require:

```js
assert.match(profile, /pathname:\s*['"]\/photo-details['"]/);
assert.match(userProfile, /pathname:\s*['"]\/photo-details['"]/);
assert.doesNotMatch(profile, /visible=\{!!selectedSubmission\}/);
assert.doesNotMatch(userProfile, /visible=\{!!selectedSubmission\}/);
assert.match(feedTab, /FeedComingSoon/);
assert.match(challengeCreated, /!isPrivate[\s\S]*CommunityGatheringAnimation/);
assert.doesNotMatch(challengeCreated, /curtainPanel|curtainJoin/);
assert.match(userProfile, /FollowActionSheet/);
assert.doesNotMatch(userProfile, /Alert\.alert\(\s*user\.isFollowing \? ['"]Unfollow User/);
```

Also require `AvatarImage` in Profile, user-profile, ChallengeDetailsOverview,
and edit-challenge.

- [ ] **Step 2: Expose the regression command**

Add:

```json
"test:social-polish": "node ./scripts/test-unified-social-submission-polish.mjs"
```

- [ ] **Step 3: Run and verify RED**

Run:

```bash
npm run test:social-polish
```

Expected: FAIL because profile screens still use inline modals and
`FollowActionSheet`/`FeedComingSoon` do not exist.

### Task 2: Sign Profile Images in Authentication Responses

**Files:**
- Backend modify: `src/main/java/com/ironside/challengesphere/service/impl/AuthServiceImpl.java`
- Backend test: `src/test/java/com/ironside/challengesphere/service/impl/AuthServiceImplTest.java`

- [ ] **Step 1: Write failing backend tests**

Add a mocked `MediaUrlService` to setup and verify:

```java
@Test
void loginReturnsReadableDetachedProfilePhoto() throws Exception {
    User user = activePasswordUser();
    user.setProfilePicUrl("profiles/user_42/avatar.jpg");
    stubSuccessfulLogin(user);
    when(mediaUrlService.toReadableMediaUrl(user.getProfilePicUrl()))
            .thenReturn("https://signed.example/avatar.jpg");

    AuthResponse response = authService.login(loginRequest());

    assertNotSame(user, response.getUser());
    assertEquals("https://signed.example/avatar.jpg", response.getUser().getProfilePicUrl());
    assertEquals("profiles/user_42/avatar.jpg", user.getProfilePicUrl());
}
```

Add a second test confirming an external Google avatar passes through the
service without mutating the entity.

- [ ] **Step 2: Run and verify RED**

```bash
./mvnw -q -Dtest=AuthServiceImplTest test
```

Expected: FAIL because the response currently contains the original user.

- [ ] **Step 3: Implement detached readable auth users**

Inject `MediaUrlService`. In `buildAuthResponse`, copy the user with
`BeanUtils.copyProperties`, sign nonblank `profilePicUrl`, and set the copy on
the response. If signing fails, log and retain the original value on the copy.

- [ ] **Step 4: Run and verify GREEN**

```bash
./mvnw -q -Dtest=AuthServiceImplTest,UserProfilePhotoListRegressionTest test
```

Expected: PASS.

### Task 3: Finish the Shared Avatar Migration

**Files:**
- Modify: `components/common/AvatarImage.tsx`
- Modify: `components/common/ChallengeDetailsOverview.tsx`
- Modify: `screens/Profile.tsx`
- Modify: `app/user-profile.tsx`
- Modify: `app/edit-challenge.tsx`
- Modify: `app/integration-detail.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Extend the failing source regression**

Require each primary surface to import and render `AvatarImage`. Require
`AvatarImage` to use `createCachedRemoteImageSource`, `cachePolicy="memory-disk"`,
and `onError`.

- [ ] **Step 2: Run and verify RED**

```bash
npm run test:social-polish
```

Expected: FAIL on remaining `CircularPhoto` and direct remote image surfaces.

- [ ] **Step 3: Migrate avatar renderers**

Replace remote profile usages with:

```tsx
<AvatarImage
  uri={profilePicUrl}
  size={size}
  style={existingAvatarStyle}
  accessibilityLabel={`${username}'s profile picture`}
/>
```

Keep direct `ExpoImage` only for challenge/submission media and local provider
logos. Preserve tap targets and avatar-viewer navigation.

- [ ] **Step 4: Verify GREEN**

```bash
npm run test:social-polish
npx tsc --noEmit
```

Expected: PASS.

### Task 4: Route Every Submission to One Detail Screen

**Files:**
- Modify: `utils/submissionDetail.ts`
- Modify: `screens/Profile.tsx`
- Modify: `app/user-profile.tsx`
- Modify: `app/challenge-submissions.tsx`
- Modify: `app/global-submissions.tsx`
- Test: `scripts/test-unified-social-submission-polish.mjs`
- Test: `scripts/test-profile-data-flow.mjs`

- [ ] **Step 1: Add failing utility and route tests**

Require a shared `buildSubmissionDetailRouteParams` helper and require all four
entry points to call it before navigating to `/photo-details`.

- [ ] **Step 2: Run and verify RED**

```bash
npm run test:social-polish
node scripts/test-profile-data-flow.mjs
```

Expected: FAIL because every caller currently constructs or displays details
differently.

- [ ] **Step 3: Add the route builder**

The helper accepts the submission, parsed media URLs, author fallback, challenge
title, and participant count. It returns string-valued Expo Router params for
the fields consumed by `buildSubmissionDetailData`.

- [ ] **Step 4: Replace profile inline overlays**

On grid press, call the route builder and:

```tsx
router.push({ pathname: '/photo-details', params });
```

Remove `selectedSubmission`, modal-only challenge fetching, local
`SubmissionGloryActions`, relative-time helpers, duplicated modal JSX, and
preview-only styles from both profile files.

- [ ] **Step 5: Migrate challenge callers**

Use the same builder in `challenge-submissions.tsx` and
`global-submissions.tsx`. Preserve authoritative refetching in
`photo-details.tsx`.

- [ ] **Step 6: Verify GREEN**

```bash
npm run test:social-polish
node scripts/test-profile-data-flow.mjs
npx tsc --noEmit
```

Expected: PASS.

### Task 5: Build the Rich Disabled-Feed Scene

**Files:**
- Create: `components/feed/FeedComingSoon.tsx`
- Modify: `app/(tabs)/index.tsx`
- Modify: `scripts/test-feed-disabled-ui.mjs`
- Test: `scripts/test-unified-social-submission-polish.mjs`

- [ ] **Step 1: Write failing feed assertions**

Require the component, Reanimated shared values, existing local avatars,
challenger count, and three compact activity preview rows. Reject `http`,
`https`, and remote image sources.

- [ ] **Step 2: Run and verify RED**

```bash
node scripts/test-feed-disabled-ui.mjs
npm run test:social-polish
```

Expected: FAIL because the current feed state is plain text and one counter.

- [ ] **Step 3: Implement the component**

Use a bounded central activity motif and staggered preview rows for challenge
updates, progress, and friends. Use Reanimated opacity/translation only. Keep
the live `useTotalUserCount` query and stable unavailable/loading states.

- [ ] **Step 4: Replace the inline feed state**

`app/(tabs)/index.tsx` imports `FeedComingSoon`; the enabled `Feed` branch is
unchanged.

- [ ] **Step 5: Verify GREEN**

```bash
node scripts/test-feed-disabled-ui.mjs
npm run test:social-polish
npx tsc --noEmit
```

Expected: PASS.

### Task 6: Animate Only Public Challenge Creation

**Files:**
- Modify: `app/challenge-created.tsx`
- Modify: `components/common/CommunityGatheringAnimation.tsx`
- Test: `scripts/test-unified-social-submission-polish.mjs`
- Test: `scripts/test-ui-regressions.mjs`

- [ ] **Step 1: Write failing branch assertions**

Require `CommunityGatheringAnimation` only under `!isPrivate` and reject all
private curtain animation identifiers.

- [ ] **Step 2: Run and verify RED**

```bash
npm run test:social-polish
node scripts/test-ui-regressions.mjs
```

Expected: FAIL because the private branch still renders an animated curtain.

- [ ] **Step 3: Implement the public-only branch**

Keep the public people-gathering animation. Replace the private branch with a
static shield/lock panel. Remove private animated values and curtain styles.
Do not delay navigation.

- [ ] **Step 4: Verify GREEN**

```bash
npm run test:social-polish
node scripts/test-ui-regressions.mjs
```

Expected: PASS.

### Task 7: Replace Native Follow Popups

**Files:**
- Create: `components/common/FollowActionSheet.tsx`
- Modify: `app/user-profile.tsx`
- Modify: `app/followers.tsx`
- Modify: `app/user-followers.tsx`
- Modify: `app/(tabs)/global.tsx`
- Modify: `app/challenge-details.tsx`
- Modify: `app/global-challenge-details.tsx`
- Modify: `screens/Feed.tsx`
- Test: `scripts/test-unified-social-submission-polish.mjs`

- [ ] **Step 1: Write failing relationship UI tests**

Require every relationship screen to render `FollowActionSheet` and reject
native relationship confirmation titles. Require success/error feedback through
`showAppMessage`.

- [ ] **Step 2: Run and verify RED**

```bash
npm run test:social-polish
```

Expected: FAIL because follow surfaces still call `Alert.alert`.

- [ ] **Step 3: Implement `FollowActionSheet`**

Props:

```ts
type FollowActionSheetProps = {
  visible: boolean;
  username: string;
  profilePicUrl?: string | null;
  isFollowing: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};
```

Render a transparent bottom modal with `AvatarImage`, concise copy, Cancel, and
Follow/Unfollow. The destructive treatment applies only to unfollow. Disable
both dismissal and confirm duplication while pending.

- [ ] **Step 4: Migrate relationship callers**

Each screen stores the selected target and desired action, opens the sheet, and
invokes its existing mutation from `onConfirm`. Preserve all current refetch and
optimistic relationship updates.

Success:

```ts
showAppMessage({
  type: 'success',
  title: isFollowing ? 'Unfollowed' : 'Following',
  message: `@${username}`,
});
```

Failure uses `type: 'error'` and leaves the sheet open or closes it without
changing relationship state.

- [ ] **Step 5: Verify GREEN**

```bash
npm run test:social-polish
npx tsc --noEmit
npx expo lint
```

Expected: PASS with no warnings.

### Task 8: Full Verification

**Files:**
- No production edits expected.

- [ ] **Step 1: Run all frontend regressions**

```bash
set -e
for script in scripts/test-*.mjs; do node "$script"; done
```

Expected: every script exits 0.

- [ ] **Step 2: Run static checks**

```bash
npx tsc --noEmit
npx expo lint
```

Expected: no errors or warnings.

- [ ] **Step 3: Run backend tests**

```bash
./mvnw -q test
```

Expected: exit 0.

- [ ] **Step 4: Build and smoke-test Android**

```bash
cd android
./gradlew assembleRelease
```

Verify the APK certificate with `apksigner`, install it on
`ChallengeSphere_API35`, cold-launch `com.challengesphere.app/.MainActivity`,
and confirm there is no `AndroidRuntime` or `ReactNativeJS` fatal error.

- [ ] **Step 5: Review the final diff**

Run `git diff --check` in both repositories and confirm unrelated dirty files
were not reverted or staged.
