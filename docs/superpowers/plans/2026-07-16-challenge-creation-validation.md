# Challenge Creation Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce concise, matching validation rules when challenges are created through the mobile form or backend API.

**Architecture:** The frontend owns immediate field feedback through named constants and one reusable form validator. The backend accepts both the new split-field request and the released app's combined-description request, then canonicalizes both through a focused content policy before persistence.

**Tech Stack:** Expo React Native, TypeScript, Spring Boot 3, Jakarta Bean Validation, Java 17

## Global Constraints

- Title: required, trimmed, 5 to 80 characters.
- Description: required, trimmed, 20 to 500 characters.
- Rules: required, trimmed, 10 to 1,000 characters.
- Categories: 1 to 5 entries, each 2 to 30 characters, unique ignoring case, with commas rejected.
- Rewards retain the existing optional 1,000-character limit.
- Existing duration, five-cover-photo, and twenty-invite limits remain unchanged.
- Do not add or run tests. Verify with TypeScript and Maven compilation only.

---

### Task 1: Frontend Validation Primitives

**Files:**
- Create: `constants/challengeValidation.ts`
- Modify: `types/api.ts:170-184`
- Modify: `components/common/CustomTextInput.tsx:4-63`

**Interfaces:**
- Produces: `CHALLENGE_VALIDATION` constants and `validateChallengeCategory(category: string): string | null`.
- Produces: `ChallengeCreateRequest.rules: string`.
- Produces: optional `helperText` support on `CustomTextInput`.

- [ ] **Step 1: Add the shared frontend limits and category validator**

```ts
export const CHALLENGE_VALIDATION = {
  title: { min: 5, max: 80 },
  description: { min: 20, max: 500 },
  rules: { min: 10, max: 1000 },
  rewards: { max: 1000 },
  category: { min: 2, max: 30, maxCount: 5 },
} as const;

export const validateChallengeCategory = (value: string): string | null => {
  const category = value.trim();
  if (category.length < CHALLENGE_VALIDATION.category.min) return 'Category must be at least 2 characters';
  if (category.length > CHALLENGE_VALIDATION.category.max) return 'Category must be at most 30 characters';
  if (category.includes(',')) return 'Category cannot contain commas';
  return null;
};
```

- [ ] **Step 2: Add `rules: string` to `ChallengeCreateRequest`**

- [ ] **Step 3: Add `helperText?: string` to `CustomTextInputProps` and render it only when no error exists**

```tsx
{error ? <Text style={styles.errorText}>{error}</Text> : helperText ? (
  <Text style={styles.helperText}>{helperText}</Text>
) : null}
```

- [ ] **Step 4: Compile the frontend**

Run: `npx tsc --noEmit --pretty false`

Expected: exit code 0 with no TypeScript diagnostics.

### Task 2: Challenge Form Enforcement

**Files:**
- Modify: `app/(tabs)/create.tsx:37-210,275-455,614-750,1045-1088`

**Interfaces:**
- Consumes: `CHALLENGE_VALIDATION` and `validateChallengeCategory` from Task 1.
- Produces: a create payload containing separate trimmed `description`, `rules`, and optional `benefits`.

- [ ] **Step 1: Replace duplicated required-only checks with a single `validateChallengeForm` helper**

The helper must trim values and return exact field errors for title, description, rules, categories, and numeric participants. Step validation filters this complete error object to fields owned by the current step; final submission uses it unchanged.

```ts
const validateLength = (value: string, label: string, min: number, max: number) => {
  const length = value.trim().length;
  if (length < min) return `${label} must be at least ${min} characters`;
  if (length > max) return `${label} must be at most ${max} characters`;
  return '';
};
```

- [ ] **Step 2: Enforce category count and normalized uniqueness**

Reject selection after five categories, reject invalid custom category names, and reject custom names that duplicate an existing category after `trim().toLocaleLowerCase()` normalization.

- [ ] **Step 3: Align input maximums and counters**

Set title `maxLength={80}`, description `maxLength={500}`, rules `maxLength={1000}`, rewards `maxLength={1000}`, and custom category `maxLength={30}`. Pass helper text in the form `${trimmedLength}/${max}` for title, description, and rules.

- [ ] **Step 4: Send canonical request fields**

```ts
const createRequest: ChallengeCreateRequest = {
  title: form.title.trim(),
  description: form.description.trim(),
  rules: form.rules.trim(),
  creatorUserId: CURRENT_USER_ID,
  benefits: form.rewards.trim() || undefined,
  categories: normalizedCategories.join(','),
  hashtags: normalizedCategories.map(category => category.toLowerCase()).join(','),
  isPrivate: form.isPrivate,
  startDate: resolvedStartDate,
  numberOfDays,
  challengeMode: form.challengeMode,
  coverPhotoUrls: coverPhotoUrls.length > 0 ? coverPhotoUrls : undefined,
  invitedUserIds: selectedFriends.map(friend => Number(friend.id)).filter(Number.isFinite),
};
```

- [ ] **Step 5: Compile the frontend again**

Run: `npx tsc --noEmit --pretty false`

Expected: exit code 0.

### Task 3: Backend Request Policy and Canonical Storage

**Files:**
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/api/request/ChallengeCreateRequest.java:13-49`
- Create: `../challengesphere/src/main/java/com/ironside/challengesphere/service/impl/ChallengeCreationContentPolicy.java`
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/service/impl/ChallengeServiceImpl.java:254-290`

**Interfaces:**
- Consumes: new requests with separate `description`, `rules`, and `benefits`, plus legacy requests with `Rules & Guidelines:` embedded in `description`.
- Produces: `ChallengeCreationContentPolicy.Content(title, description, rules, benefits, categories, hashtags, storedDescription)`.

- [ ] **Step 1: Add safe raw-payload bounds to the DTO**

Use `@Size(max = 80)` on title, `@Size(max = 2600)` on raw description for legacy compatibility, `@Size(max = 1000)` on optional rules and benefits, and `@Size(max = 160)` on categories and hashtags. Keep title and description `@NotBlank`; service policy enforces parsed minimums and required rules.

- [ ] **Step 2: Implement `ChallengeCreationContentPolicy`**

The policy exposes constants matching the frontend and a static `validateAndNormalize(ChallengeCreateRequest)` method. It trims all text, parses legacy `Rules & Guidelines:` and `Benefits:` sections only when `rules` is absent, validates the resulting field lengths, parses categories, rejects blanks/commas/duplicates/more than five entries, and returns canonical values.

Backend violations throw `ChallengeSphereException` with `HttpStatus.BAD_REQUEST` and a field-specific message such as `Title must be between 5 and 80 characters`.

Canonical storage remains:

```text
<main description>

Rules & Guidelines:
<rules>

Benefits:
<optional benefits>
```

- [ ] **Step 3: Normalize before persistence in `ChallengeServiceImpl`**

Call the policy before obtaining the creator lock. Populate `title`, `description`, `hashtags`, `categories`, and `benefits` from the returned content instead of directly copying request strings. Leave the current cover-photo validation, `resolveChallengeDuration`, creator participant insertion, cache invalidation, creation-count update, and invitation notification calls in their current order.

- [ ] **Step 4: Compile the backend without tests**

Run: `./mvnw -DskipTests compile`

Expected: `BUILD SUCCESS`; test execution does not occur.

### Task 4: Cross-Stack Verification

**Files:**
- Inspect only: all files changed in Tasks 1-3

- [ ] **Step 1: Inspect the final diff for limit parity**

Run searches for `80`, `500`, `1000`, `maxCount`, and category validation in both projects. Confirm there are no remaining create-form values of title `255`, description `1000`, or rules `2000`.

- [ ] **Step 2: Run whitespace and compilation checks**

Run:

```bash
git -C ChallengeSphere-Frontend diff --check
git -C challengesphere diff --check
(cd ChallengeSphere-Frontend && npx tsc --noEmit --pretty false)
(cd challengesphere && ./mvnw -DskipTests compile)
```

Expected: all commands exit 0. Do not run test commands.

- [ ] **Step 3: Report deployment status separately**

The validation change is complete locally after compilation. Do not claim it is live until a new backend artifact and frontend build are explicitly deployed and smoke-checked.
