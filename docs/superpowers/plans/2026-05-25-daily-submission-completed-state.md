# Daily Submission Completed State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop showing the daily upload action after the current user has already submitted for the current challenge day and show the approved completion message instead.

**Architecture:** The challenge details screen will reuse the existing current-user challenge-submissions query that already powers the timeline. It will derive a boolean for the relevant day, prevent quick upload when true, and conditionally render a passive completion card instead of the upload button.

**Tech Stack:** React Native, Expo Router, TanStack Query, Node assertion regression script

---

### Task 1: Capture The Details-Screen Regression

**Files:**
- Modify: `scripts/test-ui-regressions.mjs`

- [ ] **Step 1: Write the failing regression assertions**

Add assertions checking that `app/challenge-details.tsx` imports and invokes
`useUserChallengeSubmissions`, derives a `hasSubmittedCurrentDay` value, and
renders `Today's progress is complete` with the approved supporting copy.

- [ ] **Step 2: Run the targeted regression script to verify it fails**

Run: `node scripts/test-ui-regressions.mjs`

Expected: `AssertionError` reporting the missing submitted-day details screen
behavior.

### Task 2: Render The Authoritative Completed State

**Files:**
- Modify: `app/challenge-details.tsx`

- [ ] **Step 1: Use existing submission data**

Import `useUserChallengeSubmissions`, query for the logged-in user's
submissions in the current challenge, and compute whether day `currentDay`
(or day `1` for one-off mode) is already represented.

- [ ] **Step 2: Prevent stale upload navigation**

Hide the upload affordance while the query is loading and return early from
`handleQuickUpload` with an informative alert if a completed-day upload is
invoked from stale rendered state.

- [ ] **Step 3: Replace the action with a completion card**

When the relevant day has already been submitted, render a non-clickable card
with the approved daily copy, using one-off-specific text for one-off
challenges. Add only the styles required for this card.

- [ ] **Step 4: Run the regression script to verify it passes**

Run: `node scripts/test-ui-regressions.mjs`

Expected: `ui regression checks passed`.

### Task 3: Broader Validation

**Files:**
- Modify: none

- [ ] **Step 1: Lint affected TypeScript/React code**

Run: `npm run lint`

Expected: exit code `0` with no newly introduced lint errors.

- [ ] **Step 2: Review the diff**

Run: `git diff -- app/challenge-details.tsx scripts/test-ui-regressions.mjs docs/superpowers`
