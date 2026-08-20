# Authenticated Compact Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved balanced compact text scale across authenticated ChallengeSphere surfaces while leaving authentication and onboarding typography unchanged.

**Architecture:** The existing UI owns type sizes within page-local `StyleSheet` declarations. Keep that architecture: apply a mechanical `-1px` transformation to `fontSize` declarations of `12px` and above in the authenticated screen and authenticated shared-component file set; preserve `11px` and smaller metadata labels, and reduce paired explicit text `lineHeight` values by `1px` for vertical density. Leave icons and excluded routes unchanged.

**Tech Stack:** Expo Router, React Native `StyleSheet`, Node.js source regression scripts, TypeScript, Expo ESLint.

---

### Task 1: Typography Regression Guard

**Files:**
- Create: `scripts/test-authenticated-compact-typography.mjs`

- [ ] **Step 1: Write the failing source regression test**

Create a Node assertion script that reads the signed-in surface files and checks representative before-to-after changes:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const compactExpectations = [
  ['screens/Feed.tsx', /username:[\s\S]*fontSize: 13,/],
  ['screens/Profile.tsx', /previewUsername:[\s\S]*fontSize: 13,/],
  ['app\/\(tabs\)\/challenges\.tsx', /fontSize: 21,/],
  ['app/challenge-details.tsx', /fontSize: 23,/],
  ['app/settings.tsx', /fontSize: 19,/],
  ['components/common/ChallengeCard.tsx', /fontSize: 13,/],
  ['components/common/CommentAndCount.tsx', /fontSize: 15,/],
  ['components/common/ProfileStats.tsx', /fontSize: 17,/],
];

for (const [file, pattern] of compactExpectations) {
  assert.match(read(file), pattern, `${file} should use balanced compact signed-in text sizing`);
}

assert.match(read('screens/Feed.tsx'), /dayBadgeText:[\s\S]*fontSize: 10,/);
assert.match(read('components/common/ChallengeCard.tsx'), /fontSize: 11,/);
assert.match(read('app/login.tsx'), /fontSize:/);
assert.match(read('app/signup.tsx'), /fontSize:/);
assert.match(read('app/onboarding.tsx'), /fontSize: 36,/);

console.log('authenticated compact typography regression checks passed');
```

- [ ] **Step 2: Run it to establish RED**

Run: `node scripts/test-authenticated-compact-typography.mjs`

Expected: `AssertionError` because representative signed-in styles still use their current larger text values.

### Task 2: Authenticated Typography Pass

**Files:**
- Modify: `app/(tabs)/challenges.tsx`, `app/(tabs)/create.tsx`, `app/(tabs)/global.tsx`
- Modify: `app/avatar-viewer.tsx`, `app/challenge-created.tsx`, `app/challenge-details.tsx`, `app/challenge-invitation.tsx`, `app/challenge-submissions.tsx`, `app/edit-challenge.tsx`, `app/followers.tsx`, `app/global-challenge-details.tsx`, `app/global-submissions.tsx`, `app/invitations.tsx`, `app/leaderboard.tsx`, `app/notifications.tsx`, `app/select-users-to-invite.tsx`, `app/settings.tsx`, `app/user-challenges.tsx`, `app/user-followers.tsx`, `app/user-profile.tsx`
- Modify: `screens/About.tsx`, `screens/ChangePassword.tsx`, `screens/EditProfile.tsx`, `screens/Feed.tsx`, `screens/HelpCenter.tsx`, `screens/PrivacySecurity.tsx`, `screens/Profile.tsx`, `screens/Settings.tsx`
- Modify: `components/common/ChallengeCard.tsx`, `components/common/ChallengeSummary.tsx`, `components/common/CommentAndCount.tsx`, `components/common/CustomButton.tsx`, `components/common/CustomTextInput.tsx`, `components/common/FeedPhoto.tsx`, `components/common/GenuinityAndCount.tsx`, `components/common/GloriesModal.tsx`, `components/common/Header.tsx`, `components/common/ImageUploader.tsx`, `components/common/OptionSelector.tsx`, `components/common/PhotoDetailsHeader.tsx`, `components/common/PhotoFeedItem.tsx`, `components/common/ProfileStats.tsx`

- [ ] **Step 1: Apply the selected scale**

For each listed file, transform every text declaration matching `fontSize: N` as follows:

```text
N >= 12: fontSize: N - 1
N <= 11: fontSize: N
```

For explicit text styles in the same files that declare `lineHeight: N`, reduce `N` by `1px` alongside the changed font size so body copy and helper rows gain the intended vertical density.

Do not edit `app/login.tsx`, `app/signup.tsx`, `app/onboarding.tsx`, `screens/auth/*`, icon `size` props, avatar/image dimensions, tab icon sizing, or oversized decorative `components/common/MotivationalTransition.tsx` content.

- [ ] **Step 2: Run the focused test to establish GREEN**

Run: `node scripts/test-authenticated-compact-typography.mjs`

Expected: `authenticated compact typography regression checks passed`

### Task 3: Validation

**Files:**
- Verify only; no expected production edits.

- [ ] **Step 1: Check formatting and excluded-route scope**

Run: `git diff --check`

Expected: no whitespace errors.

Run: `git diff --name-only -- app/login.tsx app/signup.tsx app/onboarding.tsx screens/auth`

Expected: no output.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: exit code `0`.

- [ ] **Step 3: Lint**

Run: `npm run lint`

Expected: exit code `0`; pre-existing warnings may remain and must be reported.
