# Profile Submissions Auto-Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the authenticated profile's two-column submissions gallery and add an opt-in slow hands-free vertical scrolling mode.

**Architecture:** Keep submission data, pagination, routing, and rendering in `screens/Profile.tsx`. Add measured scroll state and one lifecycle-safe timer loop around the existing `ScrollView`; add a focused source-level regression script to protect the interaction contract without introducing a new runtime abstraction.

**Tech Stack:** Expo 54, React 19, React Native 0.81, TypeScript, Expo Router, Ionicons, `expo-linear-gradient`, Node assertion regression scripts.

## Global Constraints

- Change only the authenticated profile in `screens/Profile.tsx`; leave `app/user-profile.tsx` unchanged.
- Auto-scroll is opt-in, uses one deliberately slow speed, never loops, and never persists between sessions.
- A manual drag, refresh, tab switch, navigation blur, bottom reached, pagination failure, or unmount pauses the mode.
- Preserve two-column media tiles, challenge labels, detail navigation, refresh, and infinite pagination.
- Do not add dependencies or backend changes.

---

### Task 1: Lock the Refined Gallery Contract

**Files:**
- Create: `scripts/test-profile-submissions-auto-scroll.mjs`
- Inspect: `screens/Profile.tsx`

**Interfaces:**
- Consumes: the rendered own-profile source in `screens/Profile.tsx`.
- Produces: a deterministic regression command that fails until the toolbar, toggle, timer loop, pause hooks, cleanup, and accessible labels exist.

- [ ] **Step 1: Write the failing source-level regression test**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../screens/Profile.tsx', import.meta.url), 'utf8');

assert.match(source, /Recent work/, 'submissions should have a gallery heading');
assert.match(source, /moment(?:s)?/, 'the gallery should expose the submission count');
assert.match(source, /Auto scroll/, 'the toolbar should expose the hands-free mode');
assert.match(source, /Pause/, 'the active mode should expose a pause action');
assert.match(source, /setInterval/, 'auto-scroll should advance on a slow fixed cadence');
assert.match(source, /scrollTo\(\{ y:/, 'the loop should advance the existing profile ScrollView');
assert.match(source, /onScrollBeginDrag=\{stopAutoScroll\}/, 'manual dragging should pause automation');
assert.match(source, /clearInterval/, 'the timer must be cleaned up');
assert.match(source, /accessibilityLabel=\{isAutoScrolling \? 'Pause automatic scrolling' : 'Start automatic scrolling'\}/, 'the toggle state should be accessible');
assert.match(source, /LinearGradient/, 'challenge captions should use the approved legibility gradient');

console.log('profile submissions auto-scroll checks passed');
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node scripts/test-profile-submissions-auto-scroll.mjs`  
Expected: FAIL at `Recent work` because the approved toolbar is not implemented yet.

- [ ] **Step 3: Commit the regression contract with Task 2 after it turns green**

The test intentionally remains failing until the implementation is present; do not commit a red branch checkpoint.

---

### Task 2: Implement the Gallery Toolbar and Slow Scroll Lifecycle

**Files:**
- Modify: `screens/Profile.tsx`
- Test: `scripts/test-profile-submissions-auto-scroll.mjs`

**Interfaces:**
- Consumes: `useInfiniteUserSubmissions`, the existing profile `ScrollView`, `sortedSubmissions`, `fetchNextPage`, `hasNextPage`, and `isFetchingNextPage`.
- Produces: `stopAutoScroll(): void`, `toggleAutoScroll(): void`, measured scroll state, and an accessible gallery toolbar.

- [ ] **Step 1: Add imports, constants, and scroll lifecycle state**

Add `LinearGradient` from `expo-linear-gradient`; define `AUTO_SCROLL_INTERVAL_MS = 40` and `AUTO_SCROLL_STEP_PX = 1`. Track the scroll ref, interval ref, current offset, viewport/content heights, `isAutoScrolling`, and render-triggering measurements. Destructure `isFetchNextPageError` from the existing infinite query.

- [ ] **Step 2: Add the stop, toggle, and timer-loop callbacks**

```tsx
const stopAutoScroll = useCallback(() => {
  if (autoScrollIntervalRef.current) {
    clearInterval(autoScrollIntervalRef.current);
    autoScrollIntervalRef.current = null;
  }
  setIsAutoScrolling(false);
}, []);

const toggleAutoScroll = useCallback(() => {
  if (isAutoScrolling) {
    stopAutoScroll();
    return;
  }
  setIsAutoScrolling(true);
}, [isAutoScrolling, stopAutoScroll]);

useEffect(() => {
  if (!isAutoScrolling || activeTab !== 'submissions') return undefined;
  autoScrollIntervalRef.current = setInterval(() => {
    const maxOffset = Math.max(0, contentHeightRef.current - viewportHeightRef.current);
    if (currentScrollOffsetRef.current >= maxOffset - 1) {
      if (!hasNextPage && !isFetchingNextPage) stopAutoScroll();
      return;
    }
    const y = Math.min(maxOffset, currentScrollOffsetRef.current + AUTO_SCROLL_STEP_PX);
    currentScrollOffsetRef.current = y;
    scrollViewRef.current?.scrollTo({ y, animated: false });
  }, AUTO_SCROLL_INTERVAL_MS);
  return stopAutoScroll;
}, [activeTab, hasNextPage, isAutoScrolling, isFetchingNextPage, stopAutoScroll]);
```

Add effects that stop on pagination error and tab change, and a focus cleanup that stops when navigating away. Call `stopAutoScroll()` before refresh.

- [ ] **Step 3: Measure and connect the existing ScrollView**

Attach `ref`, `onLayout`, `onContentSizeChange`, and `onScrollBeginDrag={stopAutoScroll}`. In `onScroll`, update `currentScrollOffsetRef.current` before running the existing near-bottom pagination logic. Use the latest refs inside the timer so content growth after pagination is observed.

- [ ] **Step 4: Render the approved toolbar and accessible mode control**

Above `gridContainer`, render `Recent work`, the pluralized total (`1 moment` or `N moments`), and the control only when `scrollContentHeight > scrollViewportHeight + 1`. The button uses `play`/`pause`, `Auto scroll`/`Pause`, `accessibilityRole="button"`, the exact state-dependent label from Task 1, and `accessibilityState={{ selected: isAutoScrolling }}`.

- [ ] **Step 5: Apply the refined tile treatment**

Tighten the grid gap, keep square two-column sizing, soften the tile border, and replace the opaque challenge label wrapper with a `LinearGradient` from transparent black to opaque near-black. Preserve the trophy frame, title, carousel, placeholder, and detail press targets.

- [ ] **Step 6: Run the focused checks and verify GREEN**

Run:

```bash
node scripts/test-profile-submissions-auto-scroll.mjs
node scripts/test-profile-submission-challenge-labels.mjs
node scripts/test-profile-data-flow.mjs
```

Expected: all three print their success message and exit 0.

- [ ] **Step 7: Run static verification**

Run: `npx tsc --noEmit`  
Expected: exit 0, or record pre-existing errors separately and confirm no error references `screens/Profile.tsx`.

Run: `npx eslint screens/Profile.tsx scripts/test-profile-submissions-auto-scroll.mjs`  
Expected: exit 0.

- [ ] **Step 8: Commit the implementation**

```bash
git add screens/Profile.tsx scripts/test-profile-submissions-auto-scroll.mjs docs/superpowers/plans/2026-07-16-profile-submissions-auto-scroll.md
git commit -m "feat: add profile submissions auto-scroll"
```

---

### Task 3: Render and Inspect the Final Screen

**Files:**
- Inspect: `screens/Profile.tsx`
- Create only if device rendering is unavailable: `output/profile-submissions-auto-scroll-preview.html`

**Interfaces:**
- Consumes: the implemented gallery states and existing local Expo app.
- Produces: visual evidence that the approved Direction A layout is usable at a phone viewport.

- [ ] **Step 1: Start the existing Expo web or Android development target**

Run: `npm run web` (or use the configured Android emulator when authenticated profile data is required).  
Expected: the app starts without a build error.

- [ ] **Step 2: Inspect the authenticated Profile → Submissions screen**

Verify the toolbar hierarchy, two-column spacing, challenge-caption contrast, inactive `Auto scroll` state, active `Pause` state, manual-drag pause, and bottom stop. If authentication prevents a live render, produce a faithful static preview from the approved implementation values and inspect it at a mobile viewport.

- [ ] **Step 3: Re-run the focused regression test after visual adjustments**

Run: `node scripts/test-profile-submissions-auto-scroll.mjs`  
Expected: `profile submissions auto-scroll checks passed`.
