# Interest-Based User Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let new users choose profile interests and use those interests to suggest people in the People section and feed.

**Architecture:** Persist normalized interest slugs on `users`, expose a backend `/api/v1/users/suggestions` endpoint that ranks active, unblocked, not-already-followed users by shared interests, then consume it from the frontend. The frontend stores interests during first-time profile setup and renders a compact suggested-user row in People and an Instagram-style carousel in the feed.

**Tech Stack:** Spring Boot, PostgreSQL/Flyway, React Native Expo, TanStack Query, existing script-based regression tests.

---

### Task 1: Backend Interest Persistence

**Files:**
- Create: `challengesphere/src/main/java/com/ironside/challengesphere/model/StringListConverter.java`
- Create: `challengesphere/src/main/resources/db/migration/V19__add_user_interests.sql`
- Modify: `challengesphere/src/main/java/com/ironside/challengesphere/model/User.java`
- Modify: `challengesphere/src/main/java/com/ironside/challengesphere/api/request/UpdateUserRequest.java`
- Modify: `challengesphere/src/main/java/com/ironside/challengesphere/service/impl/UserServiceImpl.java`
- Test: `challengesphere/src/test/java/com/ironside/challengesphere/UserInterestRegressionTest.java`

- [ ] Add a failing Java source regression that checks `User` and `UpdateUserRequest` expose `interests`, and the service writes incoming interests.
- [ ] Add a converter that stores `List<String>` as normalized comma-separated slugs.
- [ ] Add `interests` to the user entity and update request.
- [ ] Save incoming interests in `updateUserDetails`.
- [ ] Add Flyway migration for `challengesphere.users.interests TEXT`.
- [ ] Run the Java regression.

### Task 2: Backend Suggested Users Endpoint

**Files:**
- Modify: `challengesphere/src/main/java/com/ironside/challengesphere/service/UserService.java`
- Modify: `challengesphere/src/main/java/com/ironside/challengesphere/service/impl/UserServiceImpl.java`
- Modify: `challengesphere/src/main/java/com/ironside/challengesphere/repository/UserRepository.java`
- Modify: `challengesphere/src/main/java/com/ironside/challengesphere/controller/UserController.java`
- Test: `challengesphere/src/test/java/com/ironside/challengesphere/UserInterestRegressionTest.java`

- [ ] Extend the failing regression to check for `getSuggestedUsers`, `/suggestions`, and a repository query that excludes followed/blocked/self users.
- [ ] Add `UserService.getSuggestedUsers(currentUserId, page, pageSize)`.
- [ ] Add `UserRepository.findSuggestedUsers`.
- [ ] Add `GET /api/v1/users/suggestions`.
- [ ] Return `UserSearchResponse` with `query = "suggested"`.
- [ ] Run the Java regression.

### Task 3: Frontend API, Types, and Hooks

**Files:**
- Modify: `ChallengeSphere-Frontend/types/api.ts`
- Modify: `ChallengeSphere-Frontend/services/userService.ts`
- Modify: `ChallengeSphere-Frontend/hooks/useUsers.ts`
- Test: `ChallengeSphere-Frontend/scripts/test-interest-suggestions.mjs`

- [ ] Add a failing script regression for `interests`, `getSuggestedUsers`, and `useSuggestedUsers`.
- [ ] Add `interests?: string[]` to `User` and `UpdateUserRequest`.
- [ ] Add `userService.getSuggestedUsers(page, pageSize)`.
- [ ] Add `userKeys.suggestions` and `useSuggestedUsers`.
- [ ] Run the frontend suggestion regression.

### Task 4: Profile Setup Interest Picker

**Files:**
- Modify: `ChallengeSphere-Frontend/app/profile-setup.tsx`
- Test: `ChallengeSphere-Frontend/scripts/test-interest-suggestions.mjs`

- [ ] Extend the failing regression to check profile setup renders interest choices and saves `interests`.
- [ ] Add a fixed interest catalog with labels and slugs.
- [ ] Hydrate selected interests from `user.interests`.
- [ ] Include interest changes in `hasChanges`.
- [ ] Save `interests` in `updateUser.mutateAsync`.
- [ ] Run the frontend suggestion regression.

### Task 5: People Section and Feed Suggestions

**Files:**
- Modify: `ChallengeSphere-Frontend/app/(tabs)/global.tsx`
- Modify: `ChallengeSphere-Frontend/screens/Feed.tsx`
- Test: `ChallengeSphere-Frontend/scripts/test-interest-suggestions.mjs`

- [ ] Extend the failing regression to check empty People mode uses `useSuggestedUsers` and feed renders a suggested people carousel.
- [ ] In People mode, replace the empty search prompt with suggested users when the search box is empty.
- [ ] In Feed, insert a compact suggested-user carousel after the first post when suggestions exist.
- [ ] Wire follow/unfollow buttons through existing mutations.
- [ ] Run `node scripts/test-interest-suggestions.mjs`, `node scripts/test-ui-regressions.mjs`, and `npx tsc --noEmit`.

### Self-Review

- Spec coverage: onboarding interests, People suggestions, feed suggestions, backend persistence, and ranking endpoint are covered.
- Placeholder scan: no deferred implementation placeholders.
- Type consistency: frontend and backend use `interests` as `string[]` at API boundaries; backend stores normalized text internally.
