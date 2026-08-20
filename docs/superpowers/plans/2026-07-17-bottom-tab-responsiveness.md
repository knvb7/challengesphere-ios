# Bottom Tab Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bottom-tab taps register promptly without adding backend work or losing tab state.

**Architecture:** Let React Navigation mount tabs lazily, then freeze already-mounted tabs while blurred so inactive screens do not compete for the JavaScript thread. Keep navigation dispatch owned by React Navigation and connect the existing tab-button wrapper for immediate press feedback.

**Tech Stack:** Expo Router 6, React Navigation bottom tabs 7, React Native 0.81, react-native-screens, Node assertion scripts.

## Global Constraints

- Add no API calls, polling, query invalidation, or startup prefetch work.
- Preserve React Navigation's normal `onPress`, accessibility, and routing behavior.
- Preserve mounted tab state when switching away and back.
- Keep tab scene animation set to `none` so transitions add no delay.
- Do not modify the user's unrelated `screens/Profile.tsx` work or APK deletions.

---

### Task 1: Guard the responsive tab configuration

**Files:**
- Modify: `scripts/test-bottom-tabs-eager-mount.mjs`
- Modify: `app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `HapticTab(props: BottomTabBarButtonProps)` from `components/HapticTab.tsx`.
- Produces: Expo Router tab screen options with `lazy: true`, `freezeOnBlur: true`, `animation: 'none'`, and `tabBarButton: HapticTab`.

- [x] **Step 1: Replace the eager-mount regression with responsiveness assertions**

```js
assert.match(
  layoutSource,
  /import\s*\{\s*HapticTab\s*\}\s*from\s*['"]@\/components\/HapticTab['"]/,
  'bottom tabs should use the shared immediate-feedback button',
);

assert.match(
  layoutSource,
  /lazy:\s*true/,
  'bottom tabs should mount lazily so inactive screens do not block taps',
);

assert.doesNotMatch(
  layoutSource,
  /lazy:\s*false/,
  'bottom tabs must not eagerly mount every data-heavy screen',
);

assert.match(
  layoutSource,
  /freezeOnBlur:\s*true/,
  'mounted inactive tabs should be frozen to avoid background rendering',
);

assert.match(
  layoutSource,
  /tabBarButton:\s*HapticTab/,
  'tab presses should provide immediate feedback through HapticTab',
);

assert.match(
  layoutSource,
  /animation:\s*['"]none['"]/,
  'bottom tab switches should not wait on transition animations',
);
```

- [x] **Step 2: Run the focused test and verify it fails for the missing responsive configuration**

Run: `node scripts/test-bottom-tabs-eager-mount.mjs`

Expected: FAIL because `_layout.tsx` still contains `lazy: false` and does not configure `freezeOnBlur` or `tabBarButton`.

- [x] **Step 3: Apply the minimal navigator change**

Add the shared button import:

```tsx
import { HapticTab } from '@/components/HapticTab';
```

Update the existing `screenOptions` object without changing routes, query hooks, or the startup preloader:

```tsx
screenOptions={{
  lazy: true,
  freezeOnBlur: true,
  animation: 'none',
  tabBarButton: HapticTab,
  tabBarShowLabel: false,
  // existing tab bar and scene styles remain unchanged
}}
```

- [x] **Step 4: Run the focused test and verify it passes**

Run: `node scripts/test-bottom-tabs-eager-mount.mjs`

Expected: `bottom tab responsiveness checks passed`.

- [x] **Step 5: Run related static verification**

Run: `npx expo lint 'app/(tabs)/_layout.tsx' components/HapticTab.tsx`

Expected: exit code 0 with no errors in the modified navigation path.

Run: `node scripts/test-ui-regressions.mjs`

Expected: `UI regression checks passed`.

Run: `git diff --check`

Expected: exit code 0 with no whitespace errors.

- [x] **Step 6: Refresh the code graph if the graphify CLI is available**

Run: `graphify update .`

Expected: graph update completes successfully. If the CLI is unavailable, report that verification limitation without modifying graph artifacts manually.

Execution note: `graphify` is not installed in this environment. Targeted lint,
TypeScript compilation, and `git diff --check` passed. The broader UI regression
suite retains its pre-existing, unrelated Edit Challenge follower-loading assertion
failure.

- [x] **Step 7: Commit only the focused implementation files**

```bash
git add 'app/(tabs)/_layout.tsx' scripts/test-bottom-tabs-eager-mount.mjs docs/superpowers/plans/2026-07-17-bottom-tab-responsiveness.md
git commit -m "Fix bottom tab responsiveness"
```
