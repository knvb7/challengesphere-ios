# App Data Preload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Warm the authenticated app's key tab data in sequence so first tab visits feel ready without refetching every time.

**Architecture:** Add a small cache-only preloader that runs once per authenticated app session and calls React Query `prefetchQuery` / `prefetchInfiniteQuery` using the same query keys as the tabs. Add a profile-focus hook that warms followers and following when the profile tab is opened. Keep all preloading best-effort so failures do not block navigation.

**Tech Stack:** Expo Router, React Native, TanStack React Query, existing `challengeService` and `userService`.

---

### Task 1: Regression Test

**Files:**
- Create: `scripts/test-app-data-preload.mjs`

- [ ] **Step 1: Write the failing test**

Create a script that asserts the preloader file exists, starts by warming My Challenges, then global challenges, then profile, and that profile focus warms followers/following.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/test-app-data-preload.mjs`
Expected: FAIL because the preload files do not exist yet.

### Task 2: Startup Preloader

**Files:**
- Create: `components/AppDataPreloader.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Implement `AppDataPreloader`**

Use `useAuthContext` and `useQueryClient`. When `currentUserId > 0`, run one sequence: `prefetchMyChallenges`, then `prefetchGlobalChallenges`, then `prefetchProfile`.

- [ ] **Step 2: Mount it under `AuthProvider`**

Render `<AppDataPreloader />` in `app/_layout.tsx` so it runs after auth restoration.

### Task 3: Profile Follow Preload

**Files:**
- Modify: `components/AppDataPreloader.tsx`
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Export a hook**

Add `useProfileFollowPreload(userId)` that uses `useFocusEffect` to prefetch followers and following page 1.

- [ ] **Step 2: Use it from the profile tab**

Call `useProfileFollowPreload(currentUserId)` in `app/(tabs)/profile.tsx`.

### Task 4: Verify

**Files:**
- Run existing tests and the new regression.

- [ ] **Step 1: Run focused regression**

Run: `node scripts/test-app-data-preload.mjs`
Expected: PASS.

- [ ] **Step 2: Run frontend regression scripts**

Run: `node scripts/test-global-challenges.mjs && node scripts/test-user-profile-photo-normalization.mjs && node scripts/test-app-data-preload.mjs`
Expected: PASS.
