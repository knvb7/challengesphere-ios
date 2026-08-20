# Social and Challenge Moderation Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep challenge filters and comments correctly positioned, extend profile auto-scroll to followed users, and make creator removals persist and enforce a reversible challenge-specific ban.

**Architecture:** Make narrow fixes at the existing UI and service ownership boundaries. The React Native frontend retains its current screens, React Query hooks, and modal entry points; the Spring backend extends the durable `user_challenges` relationship and treats it as the authoritative source for membership bans, join eligibility, and posting eligibility.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript 5.9, React Query 5, Spring Boot 3.5, Java 17, JPA, PostgreSQL, Flyway, JUnit 5, Mockito.

## Global Constraints

- Preserve the existing challenge visibility filter labels and filtering behavior.
- Preserve the uncommitted pagination corrections in `screens/Profile.tsx`; do not stage or rewrite that file.
- A participant ban applies to one challenge only.
- Trim removal reasons and enforce 10–500 characters on the client and server.
- Only a targeted invite sent by the authenticated challenge creator clears a ban.
- Voluntary leave never bans a participant.
- Do not delete existing submissions when removing a participant.
- Add no runtime dependency.

---

## File structure

### Frontend

- `components/challenges/ChallengeVisibilityDropdown.tsx`: viewport-safe menu anchoring.
- `app/user-profile.tsx`: public-profile auto-scroll state, lifecycle, toolbar, and pagination coordination.
- `components/common/CommentAndCount.tsx`: Instagram-style comment sheet, keyboard avoidance, and safe-area composer.
- `app/challenge-details.tsx`: creator removal-reason dialog and mutation state.
- `hooks/useChallenges.ts`: reason-aware removal mutation contract and cache invalidation.
- `services/challengeService.ts`: removal request body transport.
- `scripts/test-social-challenge-polish.mjs`: focused source regression coverage for all frontend changes.
- `scripts/test-keyboard-safe-composers.mjs`: update comment-sheet assertions to the approved stable geometry.

### Backend

- `src/main/resources/db/migration/V30__add_challenge_participant_bans.sql`: durable membership-ban columns.
- `src/main/java/com/ironside/challengesphere/model/UserChallenge.java`: JPA mapping and safe default.
- `src/main/java/com/ironside/challengesphere/api/request/RemoveParticipantRequest.java`: validated request body.
- `src/main/java/com/ironside/challengesphere/controller/ChallengeController.java`: authenticated reason-bearing removal endpoint.
- `src/main/java/com/ironside/challengesphere/service/ChallengeService.java`: updated removal interface.
- `src/main/java/com/ironside/challengesphere/service/impl/ChallengeServiceImpl.java`: remove, reject joins, and creator reinstate behavior.
- `src/main/java/com/ironside/challengesphere/service/impl/SubmissionServiceImpl.java`: active/non-banned membership enforcement for create and re-upload.
- `src/test/java/com/ironside/challengesphere/service/impl/ChallengeParticipantBanTest.java`: removal, join, leave, and reinstate tests.
- `src/test/java/com/ironside/challengesphere/service/impl/SubmissionParticipantBanTest.java`: create/re-upload ban enforcement tests.

---

### Task 1: Keep the visibility menu on-screen

**Files:**
- Modify: `scripts/test-social-challenge-polish.mjs`
- Modify: `components/challenges/ChallengeVisibilityDropdown.tsx`

**Interfaces:**
- Consumes: `ChallengeVisibilityDropdownProps` and existing filter option constants.
- Produces: the same component contract with a right-anchored 184px menu.

- [ ] **Step 1: Write the failing regression**

Create the focused script with the anchoring assertion:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const dropdown = read('components/challenges/ChallengeVisibilityDropdown.tsx');

assert.match(dropdown, /menu:[\s\S]*right:\s*0,/, 'visibility menu should open inward from the right edge');
assert.doesNotMatch(dropdown, /menu:[\s\S]*left:\s*0,/, 'visibility menu must not overflow from a right-edge trigger');
```

- [ ] **Step 2: Run the regression and confirm failure**

Run: `node scripts/test-social-challenge-polish.mjs`

Expected: FAIL with `visibility menu should open inward from the right edge`.

- [ ] **Step 3: Correct the root anchoring**

Change only the menu position:

```ts
menu: {
  position: 'absolute',
  top: 42,
  right: 0,
  width: 184,
  padding: 6,
  borderRadius: 16,
  backgroundColor: '#141218',
  borderWidth: 1,
  borderColor: '#302B3D',
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.38,
  shadowRadius: 18,
  elevation: 12,
  zIndex: 30,
},
```

- [ ] **Step 4: Verify focused and existing filter behavior**

Run:

```bash
node scripts/test-social-challenge-polish.mjs
npm run test:challenge-visibility-filter
```

Expected: both scripts PASS.

---

### Task 2: Extend auto-scroll to public user profiles

**Files:**
- Modify: `scripts/test-social-challenge-polish.mjs`
- Modify: `app/user-profile.tsx`

**Interfaces:**
- Consumes: `useInfiniteUserSubmissions`, existing `ScrollView`, `hasNextPage`, `fetchNextPage`, and `isFetchingNextPage`.
- Produces: local `stopAutoScroll(): void`, `toggleAutoScroll(): void`, and `requestNextSubmissionsPage(): void`; no shared API change.

- [ ] **Step 1: Add failing source regressions**

Append assertions that target `app/user-profile.tsx` specifically:

```js
const publicProfile = read('app/user-profile.tsx');
assert.match(publicProfile, /Auto scroll/, 'public profile should expose auto-scroll');
assert.match(publicProfile, /onScrollBeginDrag=\{stopAutoScroll\}/, 'manual drag should stop public-profile auto-scroll');
assert.match(publicProfile, /useFocusEffect/, 'navigation blur should stop public-profile auto-scroll');
assert.match(publicProfile, /autoScrollPageRequestRef/, 'pagination requests should be deduplicated');
assert.match(publicProfile, /scrollEventThrottle=\{16\}/, 'auto-scroll should track the native offset continuously');
```

- [ ] **Step 2: Run the regression and confirm failure**

Run: `node scripts/test-social-challenge-polish.mjs`

Expected: FAIL with `public profile should expose auto-scroll`.

- [ ] **Step 3: Add the lifecycle and pagination state**

Import `useFocusEffect` from Expo Router and add the same cadence used by `screens/Profile.tsx`:

```ts
const AUTO_SCROLL_INTERVAL_MS = 32;
const AUTO_SCROLL_STEP_PX = 0.7;

const scrollViewRef = useRef<ScrollView | null>(null);
const autoScrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
const currentScrollOffsetRef = useRef(0);
const autoScrollTargetOffsetRef = useRef(0);
const autoScrollPageRequestRef = useRef(false);
const viewportHeightRef = useRef(0);
const contentHeightRef = useRef(0);
const [isAutoScrolling, setIsAutoScrolling] = useState(false);
const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
const [scrollContentHeight, setScrollContentHeight] = useState(0);
```

Implement `stopAutoScroll`, `toggleAutoScroll`, deduplicated pagination, one interval effect, tab/error stop effects, and a blur cleanup. `onRefresh` must call `stopAutoScroll()` before setting refresh state.

- [ ] **Step 4: Wire scroll measurements and manual override**

Give the existing `ScrollView` its ref, `onLayout`, `onContentSizeChange`, `onScrollBeginDrag`, and 16ms scroll events. The handler must update offset/geometry, request the next submissions page only through `requestNextSubmissionsPage`, and keep created-challenge pagination intact.

- [ ] **Step 5: Add the Instagram-adjacent gallery toolbar**

Before the public submission grid render:

```tsx
<View style={styles.galleryToolbar}>
  <View>
    <Text style={styles.galleryTitle}>Recent work</Text>
    <Text style={styles.galleryCount}>{totalSubmissionCount} {totalSubmissionCount === 1 ? 'moment' : 'moments'}</Text>
  </View>
  {canAutoScroll ? (
    <TouchableOpacity
      style={[styles.autoScrollButton, isAutoScrolling && styles.autoScrollButtonActive]}
      onPress={toggleAutoScroll}
      accessibilityRole="button"
      accessibilityLabel={isAutoScrolling ? 'Pause automatic scrolling' : 'Start automatic scrolling'}
      accessibilityState={{ selected: isAutoScrolling }}
    >
      <View style={styles.autoScrollStatusDot} />
      <Ionicons name={isAutoScrolling ? 'pause' : 'play'} size={12} color="#ffffff" />
      <Text style={styles.autoScrollButtonText}>{isAutoScrolling ? 'Pause' : 'Auto scroll'}</Text>
    </TouchableOpacity>
  ) : null}
</View>
```

Copy the approved toolbar styles from `screens/Profile.tsx` so the two profiles are visually consistent.

- [ ] **Step 6: Verify auto-scroll behavior**

Run:

```bash
node scripts/test-social-challenge-polish.mjs
node scripts/test-profile-submissions-auto-scroll.mjs
npx tsc --noEmit
```

Expected: both scripts PASS and TypeScript exits 0.

---

### Task 3: Rebuild comments as an Instagram-style keyboard-safe sheet

**Files:**
- Modify: `scripts/test-social-challenge-polish.mjs`
- Modify: `scripts/test-keyboard-safe-composers.mjs`
- Modify: `components/common/CommentAndCount.tsx`

**Interfaces:**
- Consumes: existing comment queries/mutations, `useSafeAreaInsets`, `Modal`, and `FlatList`.
- Produces: the unchanged `CommentAndCountProps` component contract with stable bottom-sheet geometry.

- [ ] **Step 1: Add failing sheet-geometry assertions**

Require a keyboard-avoiding wrapper, safe-area spacer, bottom anchoring, and backdrop dismissal while rejecting manual keyboard translation:

```js
const comments = read('components/common/CommentAndCount.tsx');
assert.match(comments, /<KeyboardAvoidingView[\s\S]*behavior=\{Platform\.OS === 'ios' \? 'padding' : 'height'\}/);
assert.match(comments, /<View style=\{\[styles\.inputRowSpacer,\s*\{ height: bottomInset \}\]\} \/>/);
assert.match(comments, /modalContainer:[\s\S]*justifyContent:\s*'flex-end'/);
assert.match(comments, /onPress=\{closeComments\}[\s\S]*accessibilityLabel="Close comments"/);
assert.doesNotMatch(comments, /keyboardTranslateY|Keyboard\.addListener/);
```

Update `test-keyboard-safe-composers.mjs` to assert `KeyboardAvoidingView`, a stable `height: '88%'`, `keyboardVerticalOffset={-bottomInset}`, and `inputRowSpacer` rather than the obsolete manual translation.

- [ ] **Step 2: Run the focused regressions and confirm failure**

Run:

```bash
node scripts/test-social-challenge-polish.mjs
node scripts/test-keyboard-safe-composers.mjs
```

Expected: FAIL on the new comment-sheet assertions.

- [ ] **Step 3: Replace keyboard event translation with layout avoidance**

Remove `Animated`, `Easing`, keyboard inset state, `useWindowDimensions`, and keyboard listeners. Wrap the modal content as follows:

```tsx
<Modal visible={isModalVisible} animationType={modalAnimationType} transparent statusBarTranslucent onRequestClose={closeComments}>
  <KeyboardAvoidingView
    style={styles.keyboardAvoidingContainer}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={-bottomInset}
  >
    <TouchableOpacity
      style={styles.backdrop}
      activeOpacity={1}
      onPress={closeComments}
      accessibilityRole="button"
      accessibilityLabel="Close comments"
    />
    <View style={styles.modalContent}>
      <View style={styles.handleBar} />
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {fetchingComments && !loadingComments ? <ActivityIndicator size="small" color="#8B5CF6" /> : null}
        </View>
        <Text style={styles.headerText}>Comments</Text>
        <TouchableOpacity style={styles.closeButton} onPress={closeComments} accessibilityLabel="Close comments">
          <Ionicons name="close" size={22} color="#F5F5F5" />
        </TouchableOpacity>
      </View>
      {loadingComments ? (
        <View style={styles.centered}><ActivityIndicator size="small" color="#8B5CF6" /></View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item, index) => (item.id ?? item.commentId ?? `comment-${index}`).toString()}
          renderItem={renderComment}
          style={styles.list}
          contentContainerStyle={styles.commentListContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="chatbubble-outline" size={34} color="#333" />
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation.</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        />
      )}
      <View style={[styles.inputDock, { paddingBottom: 0 }]}>
        <View style={styles.inputRow}>
          <AvatarImage uri={user?.profilePicUrl} size={30} style={styles.inputAvatar} />
          <TextInput
            ref={inputRef}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a comment..."
            placeholderTextColor="#777"
            style={styles.input}
            multiline
            maxLength={2000}
            textAlignVertical="center"
          />
          <TouchableOpacity
            style={[styles.postButton, (!newComment.trim() || addCommentMutation.isPending) && styles.postButtonDisabled]}
            onPress={handleSubmit}
            disabled={!newComment.trim() || addCommentMutation.isPending}
          >
            <Text style={styles.postText}>Post</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.inputRowSpacer, { height: bottomInset }]} />
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>
```

The sheet remains `height: '88%'`, `maxHeight: '88%'`, bottom aligned, rounded only at the top, and separated from the list by the existing hairline borders.

- [ ] **Step 4: Polish rows and composer without changing data behavior**

Keep the current avatar/user navigation, newest-first ordering, deletion options, optimistic cache behavior, loading state, and empty state. Give the input a maximum height, the `Post` action a stable minimum width, and `keyboardShouldPersistTaps="handled"` plus platform-native dismiss mode on the list.

- [ ] **Step 5: Verify comment behavior**

Run:

```bash
node scripts/test-social-challenge-polish.mjs
node scripts/test-keyboard-safe-composers.mjs
node scripts/test-comment-avatar-flow.mjs
npx tsc --noEmit
```

Expected: all scripts PASS and TypeScript exits 0.

---

### Task 4: Persist and enforce challenge participant bans

**Files:**
- Create: `../challengesphere/src/main/resources/db/migration/V30__add_challenge_participant_bans.sql`
- Create: `../challengesphere/src/main/java/com/ironside/challengesphere/api/request/RemoveParticipantRequest.java`
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/model/UserChallenge.java`
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/controller/ChallengeController.java`
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/service/ChallengeService.java`
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/service/impl/ChallengeServiceImpl.java`
- Create: `../challengesphere/src/test/java/com/ironside/challengesphere/service/impl/ChallengeParticipantBanTest.java`

**Interfaces:**
- Consumes: authenticated actor ID, challenge ID, participant ID, and JSON `{ "reason": string }`.
- Produces: `removeParticipant(Long challengeId, Long actorUserId, Long participantUserId, String reason)` and durable `UserChallenge` ban metadata.

- [ ] **Step 1: Write the failing service tests**

Create Mockito tests for:

```java
@Test void creatorRemovalPersistsTrimmedReasonAndBanMetadata();
@Test void removalRejectsReasonShorterThanTenTrimmedCharacters();
@Test void bannedParticipantCannotJoinNormallyOrFromVerifiedInvite();
@Test void voluntaryLeaveDoesNotSetBanned();
@Test void targetedCreatorInviteClearsBanMetadata();
```

The main assertion for removal is:

```java
LeaveChallengeResponse response = service.removeParticipant(51L, 2L, 7L, "  Repeated spam posts  ");
assertTrue(response.isSuccess());
assertFalse(membership.getActive());
assertTrue(membership.getBanned());
assertEquals("Repeated spam posts", membership.getRemovalReason());
assertEquals(2L, membership.getRemovedByUserId());
assertNotNull(membership.getRemovedAt());
verify(userChallengeRepository).save(membership);
```

- [ ] **Step 2: Run the tests and confirm compilation failure**

Run: `./mvnw -Dtest=ChallengeParticipantBanTest test`

Expected: FAIL because ban fields and the reason-bearing service signature do not exist.

- [ ] **Step 3: Add the migration and model mapping**

Migration:

```sql
ALTER TABLE challengesphere.user_challenges
    ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS removal_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS removed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS removed_by_user_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_user_challenges_banned
    ON challengesphere.user_challenges (challenge_id, user_id)
    WHERE banned = TRUE;
```

Map `Boolean banned = false`, `String removalReason`, `Timestamp removedAt`, and `Long removedByUserId` with explicit column names.

- [ ] **Step 4: Add the validated request and controller body**

```java
@Data
@NoArgsConstructor
public class RemoveParticipantRequest {
    @NotBlank(message = "A removal reason is required")
    @Size(max = 500, message = "A removal reason must not exceed 500 characters")
    private String reason;
}
```

Controller:

```java
public ResponseEntity<LeaveChallengeResponse> removeParticipant(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long challengeId,
        @PathVariable Long participantUserId,
        @Valid @RequestBody RemoveParticipantRequest request) throws ChallengeSphereException {
    Long actorUserId = SecurityAccess.requireUserId(principal);
    return ResponseEntity.ok(challengeService.removeParticipant(
            challengeId, actorUserId, participantUserId, request.getReason()));
}
```

- [ ] **Step 5: Implement atomic creator removal**

Normalize with `reason == null ? "" : reason.trim()` and reject lengths outside 10–500 with `BAD_REQUEST`. Load the membership directly, reject inactive/missing users, then set inactive and all four ban fields in the existing transaction. Reuse current participant/timeline cache invalidation and accepted-count update logic, and return the current `LeaveChallengeResponse.success(...)` shape.

- [ ] **Step 6: Block all joins and clear only from direct creator invites**

Before reactivating an existing membership in `joinChallenge`, reject `Boolean.TRUE.equals(userChallenge.getBanned())` with `FORBIDDEN` and message `You were removed from this challenge by its creator.` for both normal and verified-invite entry points.

In `updateChallenge`, when `actorUserId.equals(challenge.getCreatorId())`, find inactive banned memberships matching `request.getInvitedUserIds()`, clear all four ban fields, and save those rows before dispatching targeted invite notifications.

- [ ] **Step 7: Run focused backend tests**

Run:

```bash
./mvnw -Dtest=ChallengeParticipantBanTest,ChallengeOwnerParticipationTest test
```

Expected: BUILD SUCCESS.

---

### Task 5: Enforce bans for new posts and re-uploads

**Files:**
- Create: `../challengesphere/src/test/java/com/ironside/challengesphere/service/impl/SubmissionParticipantBanTest.java`
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/service/impl/SubmissionServiceImpl.java`

**Interfaces:**
- Consumes: `UserChallengeRepository.findByUserIdAndChallengeId(userId, challengeId)`.
- Produces: `requireActiveChallengeMembership(Long userId, Long challengeId): UserChallenge` used by both write paths.

- [ ] **Step 1: Write failing create and re-upload tests**

For a membership with `active=false` and `banned=true`, assert both methods fail before storage or moderation side effects:

```java
ChallengeSphereException error = assertThrows(
        ChallengeSphereException.class,
        () -> service.createSubmission(request));
assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
assertEquals("You were removed from this challenge by its creator.", error.getResponseMessage());
verify(submissionRepository, never()).save(any());
```

The re-upload test stubs the existing submission and challenge, then asserts the same forbidden response and no save.

- [ ] **Step 2: Run and confirm failure**

Run: `./mvnw -Dtest=SubmissionParticipantBanTest test`

Expected: FAIL because re-upload does not currently inspect membership and create reports only inactive membership.

- [ ] **Step 3: Centralize membership enforcement**

```java
private UserChallenge requireActiveChallengeMembership(Long userId, Long challengeId)
        throws ChallengeSphereException {
    UserChallenge membership = userChallengeRepository.findByUserIdAndChallengeId(userId, challengeId)
            .orElseThrow(() -> new ChallengeSphereException(
                    "User is not a participant of this challenge. Please join the challenge first.",
                    HttpStatus.BAD_REQUEST,
                    logger));
    if (Boolean.TRUE.equals(membership.getBanned())) {
        throw new ChallengeSphereException(
                "You were removed from this challenge by its creator.",
                HttpStatus.FORBIDDEN,
                logger);
    }
    if (!Boolean.TRUE.equals(membership.getActive())) {
        throw new ChallengeSphereException("User has left this challenge", HttpStatus.BAD_REQUEST, logger);
    }
    return membership;
}
```

Use the returned membership in create for one-off completion, and invoke the helper in re-upload after loading the challenge and before consuming uploads or scanning media.

- [ ] **Step 4: Verify submission safety**

Run:

```bash
./mvnw -Dtest=SubmissionParticipantBanTest,SubmissionMediaSecurityIntegrationTest test
```

Expected: BUILD SUCCESS.

---

### Task 6: Collect and transport the creator's removal reason

**Files:**
- Modify: `scripts/test-remove-participant-flow.mjs`
- Modify: `scripts/test-social-challenge-polish.mjs`
- Modify: `services/challengeService.ts`
- Modify: `hooks/useChallenges.ts`
- Modify: `app/challenge-details.tsx`

**Interfaces:**
- Consumes: `{ challengeId: number; participantUserId: number; reason: string }`.
- Produces: `POST .../remove` with body `{ reason }`; an Instagram-adjacent, keyboard-safe destructive confirmation dialog.

- [ ] **Step 1: Expand the failing cross-layer regression**

Require:

```js
assert.match(frontendScreen, /removeReason\.trim\(\)\.length >= 10/);
assert.match(frontendScreen, /maxLength=\{500\}/);
assert.match(frontendHook, /participantUserId:\s*number;\s*reason:\s*string/);
assert.match(frontendService, /\{\s*reason\s*\}/);
assert.match(backendController, /@Valid @RequestBody RemoveParticipantRequest request/);
assert.match(backendService, /getRemovalReason\(\)|setRemovalReason/);
```

- [ ] **Step 2: Run and confirm failure**

Run:

```bash
node scripts/test-remove-participant-flow.mjs
node scripts/test-social-challenge-polish.mjs
```

Expected: FAIL on the reason flow assertions.

- [ ] **Step 3: Update the service and mutation contracts**

```ts
async removeParticipant(
  challengeId: number,
  participantUserId: number,
  reason: string,
): Promise<LeaveChallengeResponse> {
  const response = await apiClient.post<LeaveChallengeResponse>(
    `/challenges/${challengeId}/participants/${participantUserId}/remove`,
    { reason },
  );
  return response.data;
}
```

The hook mutation accepts all three fields, passes the trimmed reason, and retains the current invalidations.

- [ ] **Step 4: Replace the alert with reason-dialog state**

Add:

```ts
const [participantPendingRemoval, setParticipantPendingRemoval] = useState<ParticipantRow | null>(null);
const [removeReason, setRemoveReason] = useState('');
const normalizedRemoveReason = removeReason.trim();
const canConfirmRemoval = normalizedRemoveReason.length >= 10
  && normalizedRemoveReason.length <= 500
  && !removeParticipantMutation.isPending;
```

`handleRemoveParticipant` sets the target and clears the reason. Render a transparent bottom dialog with a dim backdrop, participant name, explanatory copy, multiline `TextInput`, live `{normalizedRemoveReason.length}/500`, Cancel, and destructive Remove. Wrap it in the same iOS-padding/Android-height `KeyboardAvoidingView` and use the existing `bottomInset`.

On error, keep the dialog and text. On success, clear/close, refetch challenge and participants, and show `Participant Removed`.

- [ ] **Step 5: Verify frontend removal flow**

Run:

```bash
node scripts/test-remove-participant-flow.mjs
node scripts/test-social-challenge-polish.mjs
npx tsc --noEmit
npx eslint app/challenge-details.tsx app/user-profile.tsx components/common/CommentAndCount.tsx components/challenges/ChallengeVisibilityDropdown.tsx hooks/useChallenges.ts services/challengeService.ts
```

Expected: both scripts PASS, TypeScript exits 0, and targeted ESLint reports no new errors.

---

### Task 7: Integrated verification and graph refresh

**Files:**
- Verify all modified files.
- Refresh: `graphify-out/` if the configured graph tool is available.

**Interfaces:**
- Consumes: completed frontend and backend tasks.
- Produces: evidence that the full requested behavior is consistent across layers.

- [ ] **Step 1: Run the frontend regression set**

```bash
node scripts/test-social-challenge-polish.mjs
node scripts/test-challenge-visibility-filter.mjs
node scripts/test-profile-submissions-auto-scroll.mjs
node scripts/test-keyboard-safe-composers.mjs
node scripts/test-comment-avatar-flow.mjs
node scripts/test-remove-participant-flow.mjs
npx tsc --noEmit
```

Expected: every command exits 0.

- [ ] **Step 2: Run the backend regression set**

```bash
./mvnw -Dtest=ChallengeParticipantBanTest,ChallengeOwnerParticipationTest,SubmissionParticipantBanTest,SubmissionMediaSecurityIntegrationTest test
```

Expected: BUILD SUCCESS with zero failures/errors.

- [ ] **Step 3: Check diffs and migration integrity**

Run:

```bash
git diff --check
git status --short
git -C ../challengesphere diff --check
git -C ../challengesphere status --short
```

Expected: no whitespace errors; pre-existing user changes remain present and unstaged unless they overlap an intentionally modified backend file.

- [ ] **Step 4: Refresh the architecture graph**

Run: `graphify update .`

Expected: successful AST graph refresh. If the executable is not installed, record that as a non-code verification limitation.

- [ ] **Step 5: Manual device verification**

Verify on a narrow Android viewport and a notched iOS viewport:

1. Open the My Challenges visibility filter and confirm all options remain on-screen.
2. Open a follower/following profile, start auto-scroll, drag to pause, and allow pagination to continue.
3. Open comments with the keyboard closed/open; type multiple lines and confirm the composer stays above keyboard and gesture/navigation areas.
4. Remove a participant with short and valid reasons, attempt stale-link rejoin and posting, directly invite them again, then accept and post after rejoining.

Expected: all four workflows match the approved specification.
