# Branded Memoir Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the exported memoir to prominently advertise ChallengeSphere while preserving the challenge title and submission collage.

**Architecture:** Keep the existing off-screen React Native capture flow and 1080x1350 export dimensions. Change only `MemoirCaptureView` and its styles so the runtime data and image-loading behavior remain unchanged.

**Tech Stack:** React Native, Expo Image, `react-native-view-shot`, TypeScript

---

### Task 1: Rework memoir branding and footer

**Files:**
- Modify: `app/challenge-submissions.tsx`

- [x] **Step 1: Update the memoir header hierarchy**

Keep the logo and ChallengeSphere wordmark at the top, label the image as a challenge memoir, and place the challenge name and progress metadata above the collage.

- [x] **Step 2: Preserve the photo collage**

Retain the current collage tile layouts, day badges, overflow indicator, and image load callbacks so capture readiness is unchanged.

- [x] **Step 3: Replace the footer call to action**

Remove the trailing play icon treatment and render `DOWNLOAD CHALLENGESPHERE NOW` as the dominant footer line with `START YOUR CHALLENGE ON GOOGLE PLAY` beneath it.

- [x] **Step 4: Verify source correctness**

Run:

```bash
npx tsc --noEmit
git diff --check -- app/challenge-submissions.tsx
```

Expected: both commands exit successfully.
