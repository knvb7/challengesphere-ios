# Owner Post Delete Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move owner submission deletion from challenge cards into a three-dot menu on the shared opened post/media details screen.

**Architecture:** `app/photo-details.tsx` becomes the sole delete entry point and uses the resolved submission owner to gate its menu. `PhotoDetailsHeader` accepts an optional right-side action, while the existing delete mutation continues to own optimistic cache updates. A focused source regression script protects placement, ownership gating, confirmation, and removal of the old inline action.

**Tech Stack:** Expo Router, React Native, TypeScript, TanStack Query, Node assertion scripts

---

### Task 1: Add failing owner-menu regression coverage

**Files:**
- Create: `scripts/test-owner-post-delete-menu.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create a Node source regression test that reads `app/photo-details.tsx`, `components/common/PhotoDetailsHeader.tsx`, and `app/challenge-submissions.tsx`. Assert that the details screen imports and calls `useDeleteSubmission`, derives `isOwnSubmission` by comparing the resolved owner with `currentUserId`, passes an ellipsis action to `PhotoDetailsHeader`, renders `Delete post` in an options modal, renders a separate `Delete post?` confirmation modal, calls `mutateAsync` with `submissionId`, `userId`, and `challengeId`, and calls `router.back()` after success. Assert that the challenge submission screen no longer contains `handleDeleteSubmission`, `deleteCandidate`, or `cardDeleteButton`.

Add this package script:

```json
"test:owner-delete-menu": "node ./scripts/test-owner-post-delete-menu.mjs"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:owner-delete-menu`

Expected: FAIL because `photo-details.tsx` has no owner delete menu and `challenge-submissions.tsx` still has an inline delete button.

- [ ] **Step 3: Commit the failing test**

```bash
git add scripts/test-owner-post-delete-menu.mjs package.json
git commit -m "test: cover owner post delete menu"
```

### Task 2: Add the optional header action

**Files:**
- Modify: `components/common/PhotoDetailsHeader.tsx`
- Test: `scripts/test-owner-post-delete-menu.mjs`

- [ ] **Step 1: Extend the failing test**

Require the header to define `rightAction?: React.ReactNode` and render `rightAction || <View style={styles.placeholder} />`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:owner-delete-menu`

Expected: FAIL on the missing `rightAction` prop.

- [ ] **Step 3: Implement the optional slot**

Add `rightAction?: React.ReactNode` to `PhotoDetailsHeaderProps`, destructure it, and replace the fixed placeholder with:

```tsx
{rightAction || <View style={styles.placeholder} />}
```

- [ ] **Step 4: Run test to verify the header checks pass**

Run: `npm run test:owner-delete-menu`

Expected: Remaining failures concern the missing details-screen menu and old inline button; the header assertions pass.

- [ ] **Step 5: Commit**

```bash
git add components/common/PhotoDetailsHeader.tsx scripts/test-owner-post-delete-menu.mjs
git commit -m "feat: support photo header actions"
```

### Task 3: Implement the owner-only options and confirmation flow

**Files:**
- Modify: `app/photo-details.tsx`
- Test: `scripts/test-owner-post-delete-menu.mjs`

- [ ] **Step 1: Add details-screen state and ownership checks**

Import `Modal`, `useState`, `Alert`, and `useDeleteSubmission`. Add:

```tsx
const deleteSubmissionMutation = useDeleteSubmission();
const [optionsVisible, setOptionsVisible] = useState(false);
const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
const isOwnSubmission = ownerUserId > 0 && ownerUserId === currentUserId;
```

Only pass a three-dot `ellipsis-horizontal` button to the header when `isOwnSubmission` is true.

- [ ] **Step 2: Add options and confirmation behavior**

Selecting `Delete post` closes the options modal and opens the confirmation modal. Confirmation calls:

```tsx
await deleteSubmissionMutation.mutateAsync({
  submissionId,
  userId: currentUserId,
  challengeId: photoData.challengeId,
});
setDeleteConfirmationVisible(false);
router.back();
```

If IDs are invalid or the mutation fails, keep the details screen open and call `Alert.alert('Delete Failed', ...)`. Disable dismissal and repeat deletion while the mutation is pending.

- [ ] **Step 3: Add modal UI and styles**

Render a bottom options sheet with `Delete post` and `Cancel`, plus a centered confirmation card titled `Delete post?`. Keep both modals outside `actionsContainer`; use destructive red styling only inside the options/confirmation surfaces.

- [ ] **Step 4: Run the focused test**

Run: `npm run test:owner-delete-menu`

Expected: The details-screen ownership/menu/flow assertions pass; only old challenge-card delete assertions may still fail.

- [ ] **Step 5: Commit**

```bash
git add app/photo-details.tsx scripts/test-owner-post-delete-menu.mjs
git commit -m "feat: add owner post options menu"
```

### Task 4: Remove challenge-card deletion

**Files:**
- Modify: `app/challenge-submissions.tsx`
- Test: `scripts/test-owner-post-delete-menu.mjs`

- [ ] **Step 1: Remove the old entry point**

Remove `useDeleteSubmission`, delete mutation/state/callbacks, the inline card action JSX, the delete confirmation modal, and styles used only by that flow. Restore the card body to its normal layout without action-specific padding.

- [ ] **Step 2: Run the focused test**

Run: `npm run test:owner-delete-menu`

Expected: PASS.

- [ ] **Step 3: Run existing UI regression coverage**

Update outdated assertions in `scripts/test-ui-regressions.mjs` so they expect the confirmation flow in `app/photo-details.tsx` and no inline challenge-card delete. Run:

```bash
node scripts/test-ui-regressions.mjs
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/challenge-submissions.tsx scripts/test-owner-post-delete-menu.mjs scripts/test-ui-regressions.mjs
git commit -m "refactor: remove inline submission delete action"
```

### Task 5: Verify the complete change

**Files:**
- Verify: `app/photo-details.tsx`
- Verify: `components/common/PhotoDetailsHeader.tsx`
- Verify: `app/challenge-submissions.tsx`

- [ ] **Step 1: Run focused and static checks**

```bash
npm run test:owner-delete-menu
npx tsc --noEmit
npx expo lint app/photo-details.tsx components/common/PhotoDetailsHeader.tsx app/challenge-submissions.tsx
```

Expected: All commands exit successfully.

- [ ] **Step 2: Refresh the architecture graph**

Run: `graphify update .`

Expected: Graphify completes successfully.

- [ ] **Step 3: Inspect the scoped diff**

Run:

```bash
git diff --check
git status --short
```

Expected: No whitespace errors; only scoped files plus pre-existing user changes are present.
