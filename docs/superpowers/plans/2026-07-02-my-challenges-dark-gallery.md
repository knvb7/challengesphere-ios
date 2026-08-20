# My Challenges Dark Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overloaded My Challenges list with the approved dark image gallery, a single multi-challenge pending-proof stack, and a separate archive view.

**Architecture:** Keep fetching, mapping, navigation, and the upload composer in `app/(tabs)/challenges.tsx`. Move deterministic grouping/filtering into a pure utility and move My Challenges-only presentation into three focused components so the shared profile `ChallengeCard` does not change.

**Tech Stack:** Expo Router, React Native, TypeScript, Expo LinearGradient, TanStack Query, Node contract tests, Expo ESLint.

---

## File map

- Create `utils/myChallengesPresentation.ts`: deduplicate, partition, filter, and summarize pending challenges.
- Create `components/challenges/MyChallengeGalleryCard.tsx`: image-led two-column challenge card.
- Create `components/challenges/PendingChallengeStack.tsx`: one primary upload action plus expandable `+N more` queue.
- Create `components/challenges/PastChallengesRow.tsx`: archive boundary and count.
- Modify `app/(tabs)/challenges.tsx`: assemble the new header, search, filters, gallery, archive, states, and existing upload modal.
- Create `scripts/test-my-challenges-dark-gallery.mjs`: execute pure helper tests and assert the screen/component contracts.
- Modify `package.json`: expose the focused test command.

### Task 1: Presentation logic

**Files:**
- Create: `utils/myChallengesPresentation.ts`
- Create: `scripts/test-my-challenges-dark-gallery.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing logic test**

Create a test that transpiles the TypeScript utility with the installed `typescript` package, executes it, and verifies:

```js
assert.deepEqual(dedupeChallenges([activeA, activeA, completedB]).map(item => item.id), ['a', 'b']);
assert.deepEqual(partitionChallenges([activeA, upcomingC, completedB, deletedD]), {
  active: [activeA, upcomingC],
  past: [completedB, deletedD],
});
assert.equal(buildPendingSummary([activeA], () => true)?.moreCount, 0);
assert.equal(buildPendingSummary([activeA, activeB, activeC, activeD, activeE], () => true)?.moreLabel, '+4 more');
assert.equal(buildPendingSummary([activeA], () => false), null);
```

Add `"test:my-challenges-gallery": "node ./scripts/test-my-challenges-dark-gallery.mjs"` to `package.json`.

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test:my-challenges-gallery`  
Expected: FAIL because `utils/myChallengesPresentation.ts` does not exist.

- [ ] **Step 3: Implement the pure utility**

Export these signatures:

```ts
export type MyChallengeFilter = 'all' | 'created' | 'joined';

export const dedupeChallenges = (challenges: MappedChallenge[]): MappedChallenge[] =>
  Array.from(new Map(challenges.map(challenge => [challenge.id, challenge])).values());

export const partitionChallenges = (challenges: MappedChallenge[]) => ({
  active: challenges.filter(item => item.status === 'active' || item.status === 'upcoming'),
  past: challenges.filter(item => item.status === 'completed' || item.status === 'deleted'),
});

export const filterMyChallenges = (
  challenges: MappedChallenge[],
  filter: MyChallengeFilter,
  query: string,
): MappedChallenge[] => {
  const relationshipMatches = challenges.filter(challenge =>
    filter === 'all' || (filter === 'created' ? challenge.isCreator : !challenge.isCreator)
  );
  const normalizedQuery = query.trim().toLowerCase();
  return normalizedQuery
    ? relationshipMatches.filter(challenge =>
        challenge.title.toLowerCase().includes(normalizedQuery) ||
        challenge.category.toLowerCase().includes(normalizedQuery)
      )
    : relationshipMatches;
};

export const buildPendingSummary = (
  challenges: MappedChallenge[],
  canUpload: (challenge: MappedChallenge) => boolean,
) => {
  const pending = challenges.filter(canUpload);
  return pending.length
    ? { primary: pending[0], remaining: pending.slice(1), moreCount: pending.length - 1, moreLabel: `+${pending.length - 1} more` }
    : null;
};
```

- [ ] **Step 4: Run the focused test**

Run: `npm run test:my-challenges-gallery`  
Expected: helper assertions pass; component-contract assertions still fail until Tasks 2 and 3.

- [ ] **Step 5: Commit**

```bash
git add package.json utils/myChallengesPresentation.ts scripts/test-my-challenges-dark-gallery.mjs
git commit -m "test: define my challenges gallery behavior"
```

### Task 2: Gallery presentation components

**Files:**
- Create: `components/challenges/MyChallengeGalleryCard.tsx`
- Create: `components/challenges/PendingChallengeStack.tsx`
- Create: `components/challenges/PastChallengesRow.tsx`
- Modify: `scripts/test-my-challenges-dark-gallery.mjs`

- [ ] **Step 1: Add failing component-contract assertions**

Assert that:

```js
assert.match(cardSource, /ImageBackground/);
assert.match(cardSource, /LinearGradient/);
assert.match(cardSource, /numberOfLines=\{2\}/);
assert.doesNotMatch(cardSource, /ChallengeSubmissionPreview|challengeMetaGrid|Upload proof/);
assert.match(stackSource, /moreLabel/);
assert.match(stackSource, /remaining/);
assert.match(stackSource, /Upload proof/);
assert.match(pastSource, /Past challenges/);
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test:my-challenges-gallery`  
Expected: FAIL because the three presentation components do not exist.

- [ ] **Step 3: Implement `MyChallengeGalleryCard`**

Use:

```ts
interface Props {
  challenge: MappedChallenge;
  onPress: () => void;
}
```

Render a 168-point image card using `ImageBackground`, the existing `getChallengeFallbackPhotoSource`, a bottom `LinearGradient`, a single status badge, a two-line title, day/progress metadata, and a thin purple-to-white progress bar. Set `accessibilityRole="button"` and an explicit label.

- [ ] **Step 4: Implement `PendingChallengeStack`**

Use:

```ts
interface Props {
  summary: PendingChallengeSummary;
  onUpload: (challenge: MappedChallenge) => void;
}
```

Show the primary challenge and one **Upload proof** button. When `moreCount > 0`, render thumbnail previews and the exact `moreLabel`; pressing it toggles an in-card queue containing every remaining challenge with a compact upload control.

- [ ] **Step 5: Implement `PastChallengesRow`**

Use:

```ts
interface Props {
  count: number;
  onPress: () => void;
}
```

Render a top divider, **Past challenges**, `Completed and left · N`, and a chevron in a 44-point minimum touch target.

- [ ] **Step 6: Run the focused test**

Run: `npm run test:my-challenges-gallery`  
Expected: component contracts pass.

- [ ] **Step 7: Commit**

```bash
git add components/challenges scripts/test-my-challenges-dark-gallery.mjs
git commit -m "feat: add dark challenge gallery components"
```

### Task 3: Screen integration

**Files:**
- Modify: `app/(tabs)/challenges.tsx`
- Modify: `scripts/test-my-challenges-dark-gallery.mjs`

- [ ] **Step 1: Add failing screen-contract assertions**

Require the screen to import all new components and helpers, use a two-column list, expose archive/search states, retain notifications, creation, pull-to-refresh, challenge-details navigation, and `SubmissionComposer`, and omit `ChallengeCard` plus `useSubmissionPreviews`.

```js
for (const token of [
  'PendingChallengeStack',
  'MyChallengeGalleryCard',
  'PastChallengesRow',
  'partitionChallenges',
  'numColumns={2}',
  'showArchive',
  'searchExpanded',
  'notifications-outline',
  'SubmissionComposer',
]) assert.match(screenSource, new RegExp(token.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')));

assert.doesNotMatch(screenSource, /<ChallengeCard|useSubmissionPreviews/);
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test:my-challenges-gallery`  
Expected: FAIL against the current full-width dashboard list.

- [ ] **Step 3: Replace list derivation**

Use `dedupeChallenges` and `partitionChallenges` on the mapped My Challenges plus created results. Derive:

```ts
const visiblePool = showArchive ? pastChallenges : activeChallenges;
const filteredChallenges = filterMyChallenges(visiblePool, activeTab, searchQuery);
const pendingSummary = showArchive
  ? null
  : buildPendingSummary(filteredChallenges, canUploadToday);
```

Keep the active ceiling display as `${activeChallenges.length} of 10 active`.

- [ ] **Step 4: Replace the header and controls**

Render **My challenges**, compact search, notification, and create icon buttons. Toggle a dark search field with `searchExpanded`. Replace the animated segmented slab with lightweight rounded filter chips labeled **Active N**, **Created**, and **Joined**.

- [ ] **Step 5: Integrate the gallery and archive**

Use a two-column `FlatList` with `columnWrapperStyle`, gallery cards, and a list header containing `PendingChallengeStack` only when pending items exist. Add `PastChallengesRow` to the active footer. When archive is open, show a back control and archive-specific title/empty state.

- [ ] **Step 6: Preserve upload and navigation behavior**

Connect the primary and queued upload actions to `handleUploadMedia`, gallery presses to `handleChallengePress`, notification/create controls to their existing routes, pull-to-refresh to `onRefresh`, and leave the existing upload modal/composer unchanged.

- [ ] **Step 7: Add dark loading, error, and empty states**

Use two-column skeleton cards while loading, one restrained retry action on error, the simplified explore/create empty state for no active challenges, a clear-search action for an empty query result, and an archive-specific empty message.

- [ ] **Step 8: Run focused and regression tests**

Run:

```bash
npm run test:my-challenges-gallery
node scripts/test-challenge-list-redesign.mjs
npx tsc --noEmit
npx expo lint
```

Expected: focused and existing challenge-list tests pass; TypeScript and lint report no new errors in changed files.

- [ ] **Step 9: Commit**

```bash
git add 'app/(tabs)/challenges.tsx' scripts/test-my-challenges-dark-gallery.mjs
git commit -m "feat: redesign my challenges as dark gallery"
```

### Task 4: Visual and interaction verification

**Files:**
- Modify if needed: `app/(tabs)/challenges.tsx`
- Modify if needed: `components/challenges/MyChallengeGalleryCard.tsx`
- Modify if needed: `components/challenges/PendingChallengeStack.tsx`
- Modify if needed: `components/challenges/PastChallengesRow.tsx`

- [ ] **Step 1: Start the Expo web target**

Run: `npm run web -- --port 8081`  
Expected: the app serves locally without a bundling error.

- [ ] **Step 2: Inspect the screen in the in-app browser**

Verify the dark theme, two-column card rhythm, one/five/ten active layouts, long titles, missing-image fallback, and visible Active/Past separation at a narrow mobile viewport.

- [ ] **Step 3: Verify interactions**

Check search expansion, Created/Joined filters, `+4 more` queue expansion for five pending items, archive entry/back, challenge-details navigation, and opening/closing the upload composer.

- [ ] **Step 4: Fix visual regressions and rerun checks**

Run:

```bash
npm run test:my-challenges-gallery
npx tsc --noEmit
git diff --check
```

Expected: all focused checks pass, TypeScript is clean for the implementation, and no whitespace errors remain.

- [ ] **Step 5: Commit final polish**

```bash
git add 'app/(tabs)/challenges.tsx' components/challenges utils/myChallengesPresentation.ts scripts/test-my-challenges-dark-gallery.mjs package.json
git commit -m "fix: polish my challenges gallery states"
```
