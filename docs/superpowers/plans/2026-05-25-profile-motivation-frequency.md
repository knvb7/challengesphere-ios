# Profile Motivation Frequency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the own-profile motivational transition to a random five-percent occurrence while keeping challenge-join transitions unchanged.

**Architecture:** A pure utility function owns the probability threshold and accepts an optional deterministic sample for tests. The existing profile focus effect consults the helper before showing its existing transition; no other motivational call sites change.

**Tech Stack:** React Native, TypeScript, Node assertion regression script

---

### Task 1: Define The Frequency Contract

**Files:**
- Modify: `scripts/test-ui-regressions.mjs`
- Modify: `utils/motivationalMessages.ts`

- [ ] **Step 1: Add failing deterministic assertions**

Add:

```js
const motivationalMessages = loadTsModule('utils/motivationalMessages.ts');
assert.equal(motivationalMessages.shouldShowProfileMotivationalTransition(0), true);
assert.equal(motivationalMessages.shouldShowProfileMotivationalTransition(0.049), true);
assert.equal(motivationalMessages.shouldShowProfileMotivationalTransition(0.05), false);
assert.equal(motivationalMessages.shouldShowProfileMotivationalTransition(0.999), false);
```

- [ ] **Step 2: Prove the assertion fails**

Run: `node scripts/test-ui-regressions.mjs`

Expected: failure because
`shouldShowProfileMotivationalTransition` is not yet exported.

- [ ] **Step 3: Implement the threshold helper**

Add:

```ts
export const shouldShowProfileMotivationalTransition = (
  randomValue = Math.random(),
): boolean => randomValue < 0.05;
```

### Task 2: Gate Only Own-Profile Focus

**Files:**
- Modify: `screens/Profile.tsx`
- Modify: `scripts/test-ui-regressions.mjs`

- [ ] **Step 1: Add failing integration assertions**

Require `screens/Profile.tsx` to import and check
`shouldShowProfileMotivationalTransition()` before selecting a message. Assert
that `app/challenge-details.tsx` and `app/global-challenge-details.tsx` do not
reference this profile-only helper.

- [ ] **Step 2: Prove the integration assertion fails**

Run: `node scripts/test-ui-regressions.mjs`

Expected: failure because profile focus does not yet call the helper.

- [ ] **Step 3: Guard the existing focus animation**

Import the helper and change the early return to:

```ts
if (!user?.username || !shouldShowProfileMotivationalTransition()) {
  return undefined;
}
```

- [ ] **Step 4: Verify behavior and types**

Run: `node scripts/test-ui-regressions.mjs && npx tsc --noEmit && npm run lint`

Expected: checks pass, allowing any already-present project lint warnings that
do not arise from these edits.

### Task 3: Refresh Project Metadata

**Files:**
- Modify: `graphify-out/` generated metadata when generated successfully

- [ ] **Step 1: Run required Graphify refresh**

Run: `graphify update .`

Expected: AST metadata refresh; record the known HTML node-limit failure if
the existing oversized graph cannot generate visualization output.
