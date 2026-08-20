# Daily Submission Completed State Design

## Problem

The challenge details screen shows `Upload Today's Progress` whenever a joined
challenge is active. It does not inspect the current user's existing
submissions, so the action remains available after today's submission has
already been posted. The submission timeline already prevents duplicate
uploads, but the details screen presents the wrong state.

## Approved Experience

For an active challenge in which the participant already has an active
submission for the current day, replace the upload button with a non-clickable
completion card:

**Today's progress is complete**

Your effort is captured for today. Take pride in showing up, then come back
tomorrow and keep your streak alive.

For a completed one-off challenge, the same card treatment uses one-off wording
so the copy does not suggest a future daily entry.

## Data Flow

`app/challenge-details.tsx` will use the existing
`useUserChallengeSubmissions` query already used by the timeline screen. The
screen will consider the current day complete when the returned active
submissions contain the relevant day number: `currentDay` for a daily
challenge, or day `1` for a one-off challenge.

While that query is still loading, the upload action is not rendered. This
prevents a stale upload affordance from briefly appearing before the submitted
state is known. The existing submission timeline eligibility check remains a
second guard if navigation is triggered elsewhere.

## Scope

- Modify `app/challenge-details.tsx` to load current-user submissions, guard
  quick upload, and render the completion card.
- Extend `scripts/test-ui-regressions.mjs` with assertions for the new state
  derivation and completed-state copy.
- Do not change API contracts or submission creation behavior.

