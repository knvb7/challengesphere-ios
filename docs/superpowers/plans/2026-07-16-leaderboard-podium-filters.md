# Leaderboard Podium and Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved podium leaderboard with four real ranking filters, debounced participant search, a compact personal-rank card, and a matching challenge-details preview.

**Architecture:** Keep data fetching and screen composition in `app/leaderboard.tsx`, driven by `activeLeaderboardType`. Derive podium and standings collections from normalized entries, and update only the existing preview styles/actions in `ChallengeDetailsOverview.tsx`; no new runtime dependencies or backend work are needed.

**Tech Stack:** Expo 54, React 19, React Native 0.81, TypeScript, Expo Router, TanStack Query, Ionicons, `expo-linear-gradient`, Node assertion regression scripts.

## Global Constraints

- Use only Overall, Submissions, Glories, and Streak modes supported by the current API.
- Do not add date-period, following, geography, or score-history filters.
- Keep existing user-profile and read-only challenge-submission navigation.
- Keep the challenge-details preview capped at five Overall entries.
- Do not change profile, submission tiles, scoring rules, backend APIs, or database code.

---

### Task 1: Lock the Leaderboard Interaction Contract

**Files:**
- Create: `scripts/test-leaderboard-podium-filters.mjs`
- Inspect: `app/leaderboard.tsx`
- Inspect: `components/common/ChallengeDetailsOverview.tsx`

**Interfaces:**
- Consumes: source text for the dedicated leaderboard and shared challenge overview.
- Produces: a regression command covering supported filters, query wiring, podium split, debounced search, and matching preview.

- [ ] **Step 1: Write the failing regression script**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const leaderboard = read('app/leaderboard.tsx');
const overview = read('components/common/ChallengeDetailsOverview.tsx');

for (const type of ['OVERALL', 'SUBMISSIONS', 'GLORIES', 'STREAK']) {
  assert.match(leaderboard, new RegExp(`LeaderboardType\\.${type}`));
}
assert.match(leaderboard, /activeLeaderboardType/);
assert.match(leaderboard, /useChallengeLeaderboard\(challengeId, activeLeaderboardType/);
assert.match(leaderboard, /podiumEntries/);
assert.match(leaderboard, /standingEntries/);
assert.match(leaderboard, /setTimeout\([\s\S]*setAppliedParticipantSearch/);
assert.match(leaderboard, /LeaderboardPodium/);
assert.match(overview, /View full leaderboard/);
assert.match(overview, /getPreviewRankStyle/);

console.log('leaderboard podium and filter checks passed');
```

- [ ] **Step 2: Run the script and verify RED**

Run: `node scripts/test-leaderboard-podium-filters.mjs`  
Expected: FAIL because `activeLeaderboardType` does not exist.

---

### Task 2: Implement the Dedicated Podium Leaderboard

**Files:**
- Modify: `app/leaderboard.tsx`
- Test: `scripts/test-leaderboard-podium-filters.mjs`

**Interfaces:**
- Consumes: `LeaderboardType`, `useChallengeLeaderboard`, normalized `rankedEntries`, participants, search results, and existing route handlers.
- Produces: `activeLeaderboardType`, `podiumEntries`, `standingEntries`, `getLeaderboardMetric`, and `LeaderboardPodium`.

- [ ] **Step 1: Add ranking metadata and active filter state**

Define an ordered `LEADERBOARD_FILTERS` array for Overall, Submissions, Glories, and Streak. Add `activeLeaderboardType` state, use it in `useChallengeLeaderboard`, and expose `getLeaderboardMetric(type, entry)` to return the score value, unit, and supporting text for the active mode.

- [ ] **Step 2: Make participant search debounced and remove the extra button**

```tsx
useEffect(() => {
  const timeout = setTimeout(() => {
    setAppliedParticipantSearch(participantSearch.trim());
  }, 250);
  return () => clearTimeout(timeout);
}, [participantSearch]);
```

Keep `onSubmitEditing` for immediate keyboard submission, preserve clear behavior, and remove the separate Search button and its styles.

- [ ] **Step 3: Derive podium and standings data**

```tsx
const podiumEntries = useMemo(
  () => appliedSearchTerm ? [] : filteredEntries.filter((entry) => !entry.isUnranked).slice(0, 3),
  [appliedSearchTerm, filteredEntries],
);
const standingEntries = useMemo(
  () => appliedSearchTerm ? filteredEntries : filteredEntries.slice(podiumEntries.length),
  [appliedSearchTerm, filteredEntries, podiumEntries.length],
);
```

Use the selected response's `currentUserRank`; use `useUserRank` only as an Overall fallback.

- [ ] **Step 4: Build the compact rank card, filter pills, and podium**

Render the compact personal-rank card, horizontally scrollable accessible mode pills, simplified search field, and `LeaderboardPodium` above the standings list. Order visual podium columns second/first/third while preserving explicit place labels and profile navigation.

- [ ] **Step 5: Refine ranking rows and states**

Update rows to show the active metric unit and supporting statistic, retain the current-user highlight, profile navigation, submissions action, refresh, retry, and ranked/unranked search states. Use `standingEntries` as FlatList data.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run: `node scripts/test-leaderboard-podium-filters.mjs`  
Expected: `leaderboard podium and filter checks passed`.

---

### Task 3: Match the Challenge-Details Preview

**Files:**
- Modify: `components/common/ChallengeDetailsOverview.tsx`
- Test: `scripts/test-leaderboard-podium-filters.mjs`
- Test: `scripts/test-challenge-details-overview-redesign.mjs`

**Interfaces:**
- Consumes: `topRows`, `onLeaderboardPress`, and existing participant row callbacks.
- Produces: `getPreviewRankStyle(rank)` and a `View full leaderboard` action.

- [ ] **Step 1: Add preview rank styling**

Define `getPreviewRankStyle(rank)` returning gold, silver, bronze, or neutral background/border/text colors. Apply it to each preview rank badge while keeping visible place numbers.

- [ ] **Step 2: Add the full-leaderboard action**

Replace the standalone section title with a header row containing `Top Leaderboard` and a `View full leaderboard` button when `onLeaderboardPress` exists. Keep row presses routed through `onLeaderboardParticipantPress` first.

- [ ] **Step 3: Run focused and existing regressions**

Run:

```bash
node scripts/test-leaderboard-podium-filters.mjs
node scripts/test-leaderboard-cache-freshness.mjs
node scripts/test-challenge-details-overview-redesign.mjs
```

Expected: all commands print their success message and exit 0.

- [ ] **Step 4: Run static verification**

Run: `npx tsc --noEmit`  
Expected: exit 0.

Run: `npx eslint app/leaderboard.tsx components/common/ChallengeDetailsOverview.tsx scripts/test-leaderboard-podium-filters.mjs`  
Expected: exit 0.

- [ ] **Step 5: Verify visually on Android**

Open a populated challenge leaderboard and inspect Overall, Submissions, Glories, Streak, search, current-user highlighting, podium order, sparse results, and the challenge-details preview. Re-run the focused regression after any visual adjustment.

---

### Task 4: Keep Sparse Leaderboards Useful

**Files:**
- Modify: `app/leaderboard.tsx`
- Modify: `scripts/test-leaderboard-podium-filters.mjs`

**Interfaces:**
- Consumes: `filteredEntries`, `podiumEntries`, and the existing `FlatList` row renderer.
- Produces: a compact filter scroller and a complete `standingEntries` collection containing ranks one through three.

- [ ] **Step 1: Extend the regression test**

Assert that the filter `ScrollView` uses `styles.tabScroll`, `tabScroll` sets `flexGrow: 0`, `standingEntries` resolves to `filteredEntries`, and the list renders a visible `Standings` title.

- [ ] **Step 2: Verify RED**

Run: `node scripts/test-leaderboard-podium-filters.mjs`  
Expected: FAIL because standings still slices away podium entries and has no section title.

- [ ] **Step 3: Implement the complete standings list**

```tsx
const standingEntries = filteredEntries;
```

Render `Standings` immediately above the list whenever entries exist. Keep search behavior unchanged because `filteredEntries` already contains the matching ranked and unranked participants.

- [ ] **Step 4: Verify GREEN and static checks**

Run:

```bash
node scripts/test-leaderboard-podium-filters.mjs
npx eslint app/leaderboard.tsx scripts/test-leaderboard-podium-filters.mjs
npx tsc --noEmit
```

Expected: all commands exit 0.

- [ ] **Step 5: Verify visually on Android**

Open a two-participant challenge leaderboard. Confirm the four filters remain compact, the podium is fully visible, and `Standings` contains ranks 1 and 2 beneath it.
