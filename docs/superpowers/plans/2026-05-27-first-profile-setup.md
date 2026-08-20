# First Profile Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present a polished, optional one-time profile setup walkthrough after onboarding for newly created credential and Google accounts.

**Architecture:** The backend explicitly identifies newly created authenticated accounts with `isNewUser`. The frontend converts that signal into per-user pending onboarding state, resolves startup/post-intro navigation through one service, and renders a focused profile setup route that reuses the existing profile update/upload APIs.

**Tech Stack:** React Native, Expo Router, AsyncStorage, TypeScript, Spring Boot, JUnit/MockMvc

---

### Task 1: New-User Authentication Contract

**Files:**
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/api/response/AuthResponse.java`
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/controller/AuthController.java`
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/service/impl/AuthServiceImpl.java`
- Test: `../challengesphere/src/test/java/com/ironside/challengesphere/AuthIntegrationTest.java`
- Modify: `types/api.ts`

- [ ] Add a failing registration API assertion that expects `$.isNewUser` to equal `true`.
- [ ] Run the targeted backend test and confirm it fails because the response has no new-user flag.
- [ ] Add nullable `Boolean isNewUser` to the Java response and optional `isNewUser?: boolean` to the TypeScript response.
- [ ] Set `isNewUser` for credential registration and for Google sign-in only when a user is created rather than linked or found.
- [ ] Run the targeted backend test until it passes.

### Task 2: Pending Setup Navigation

**Files:**
- Modify: `utils/onboardingIntro.ts`
- Modify: `services/onboardingService.ts`
- Modify: `app/onboarding.tsx`
- Modify: `app/index.tsx`
- Modify: `app/_layout.tsx`
- Test: `scripts/test-ui-regressions.mjs`

- [ ] Add failing frontend regression assertions for a per-user pending profile setup key, the `/profile-setup` route, post-intro navigation, and new-user activation.
- [ ] Run `node scripts/test-ui-regressions.mjs` and confirm the missing profile setup behavior fails.
- [ ] Implement pending state methods in `onboardingService`, recording pending setup from `authData.isNewUser`.
- [ ] Route completed intro and app startup to setup while pending, then register the Expo Router screen.
- [ ] Run the frontend regression script until route assertions pass.

### Task 3: Claim Your Spot Screen

**Files:**
- Create: `app/profile-setup.tsx`
- Test: `scripts/test-ui-regressions.mjs`

- [ ] Add failing source-level coverage for the approved headline, `Make it mine`, `Skip for now`, completion call, and profile update/upload integration.
- [ ] Create the dark gold-and-green profile setup screen with photo picker, 140-character bio, live preview, save, retry alert, and skip action.
- [ ] On save, reuse `userService.generatePresignedUrls`, `useUpdateUser`, stored auth user update, and clear the pending setup marker only on success.
- [ ] On skip, clear the pending marker and enter challenges without submitting profile changes.
- [ ] Run UI regressions and lint.

### Task 4: Validation

**Files:**
- Modify only if validation reveals an issue in the files above.

- [ ] Run frontend regression checks and lint.
- [ ] Run the backend auth test suite relevant to the changed response contract.
- [ ] Run `graphify update .` in the frontend repository as required by repository instructions and record any visualization-size limitation.
- [ ] Review the final diff to ensure existing unrelated working-tree changes were not overwritten.
