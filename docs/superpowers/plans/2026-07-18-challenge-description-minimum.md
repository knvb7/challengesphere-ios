# Challenge Description Minimum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lower the trimmed minimum length for newly created challenge descriptions from 20 characters to 10 characters.

**Architecture:** The Expo form and Spring Boot API each own a named description-length constant. Update both constants so client-side feedback and server-side enforcement continue to share the same `10–500` contract without changing request or persistence behavior.

**Tech Stack:** Expo React Native, TypeScript, Spring Boot 3, Java 17

## Global Constraints

- A challenge description remains required.
- Its trimmed length must be between 10 and 500 characters, inclusive.
- All other challenge-creation validation remains unchanged.
- Do not add or run tests.
- Verification is limited to static diff inspection and frontend/backend constant parity.

---

### Task 1: Frontend Description Minimum

**Files:**
- Modify: `constants/challengeValidation.ts:3`

**Interfaces:**
- Consumes: `CHALLENGE_VALIDATION.description.min` in `app/(tabs)/create.tsx`.
- Produces: a frontend description contract of `{ min: 10, max: 500 }`.

- [ ] **Step 1: Lower the frontend description minimum**

Change the description entry in `CHALLENGE_VALIDATION` to:

```ts
description: { min: 10, max: 500 },
```

- [ ] **Step 2: Inspect the frontend diff without running tests**

Run:

```bash
git diff --check -- constants/challengeValidation.ts
git diff -- constants/challengeValidation.ts
```

Expected: no whitespace errors; the only code change is `description.min` changing from `20` to `10`, while `description.max` remains `500`.

- [ ] **Step 3: Commit the frontend change**

```bash
git add constants/challengeValidation.ts
git commit -m "fix: lower challenge description minimum"
```

### Task 2: Backend Description Minimum

**Files:**
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/service/impl/ChallengeCreationContentPolicy.java:21`

**Interfaces:**
- Consumes: `DESCRIPTION_MIN_LENGTH` in `ChallengeCreationContentPolicy.validateAndNormalize(ChallengeCreateRequest)`.
- Produces: a backend description contract with `DESCRIPTION_MIN_LENGTH = 10` and `DESCRIPTION_MAX_LENGTH = 500`.

- [ ] **Step 1: Lower the backend description minimum**

Change the constant declaration to:

```java
public static final int DESCRIPTION_MIN_LENGTH = 10;
```

- [ ] **Step 2: Inspect the backend diff without running tests**

Run from `../challengesphere`:

```bash
git diff --check -- src/main/java/com/ironside/challengesphere/service/impl/ChallengeCreationContentPolicy.java
git diff -- src/main/java/com/ironside/challengesphere/service/impl/ChallengeCreationContentPolicy.java
```

Expected: no whitespace errors; the only code change is `DESCRIPTION_MIN_LENGTH` changing from `20` to `10`, while `DESCRIPTION_MAX_LENGTH` remains `500`.

- [ ] **Step 3: Commit the backend change**

```bash
git add src/main/java/com/ironside/challengesphere/service/impl/ChallengeCreationContentPolicy.java
git commit -m "fix: lower challenge description minimum"
```

### Task 3: Cross-Stack Static Verification

**Files:**
- Inspect: `constants/challengeValidation.ts`
- Inspect: `../challengesphere/src/main/java/com/ironside/challengesphere/service/impl/ChallengeCreationContentPolicy.java`

**Interfaces:**
- Consumes: the frontend and backend constants changed in Tasks 1 and 2.
- Produces: evidence that both creation paths enforce the same `10–500` description range.

- [ ] **Step 1: Confirm exact frontend/backend parity without running tests**

Run from `ChallengeSphere-Frontend`:

```bash
rg -n "description: \{ min: 10, max: 500 \}" constants/challengeValidation.ts
rg -n "DESCRIPTION_(MIN|MAX)_LENGTH = (10|500)" ../challengesphere/src/main/java/com/ironside/challengesphere/service/impl/ChallengeCreationContentPolicy.java
```

Expected frontend match:

```text
3:  description: { min: 10, max: 500 },
```

Expected backend matches:

```text
21:    public static final int DESCRIPTION_MIN_LENGTH = 10;
22:    public static final int DESCRIPTION_MAX_LENGTH = 500;
```

- [ ] **Step 2: Confirm no unintended files were changed by this implementation**

Run in each repository:

```bash
git show --stat --oneline HEAD
```

Expected: the frontend implementation commit contains only `constants/challengeValidation.ts`, and the backend implementation commit contains only `ChallengeCreationContentPolicy.java`. Pre-existing working-tree changes remain untouched.
