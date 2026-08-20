# Profile Motivation Frequency Design

## Problem

The own-profile screen displays the full-screen motivational transition every
time it receives focus once a username is available. Repeated visits therefore
show the same style of interruption on every visit, even though the copy is
randomized.

## Approved Experience

The motivational transition on the current user's profile appears on roughly
one out of every twenty eligible profile focuses. It remains random rather
than following a visible schedule. A user may therefore occasionally see two
nearby occurrences or a longer gap, but over time the display probability is
five percent per eligible focus.

Motivational transitions shown after successfully joining a challenge are not
changed.

## Implementation

Add a pure helper to `utils/motivationalMessages.ts`:

```ts
export const shouldShowProfileMotivationalTransition = (
  randomValue = Math.random(),
): boolean => randomValue < 0.05;
```

The injected number keeps the frequency rule deterministic in tests while the
default runtime path uses normal randomness.

In `screens/Profile.tsx`, import the helper and use it inside the existing
`useFocusEffect` after checking that a username exists. If the helper returns
false, do not select a message, show the overlay, or start its timeout. The
existing show/hide logic remains intact for the five-percent path.

## Verification

Extend `scripts/test-ui-regressions.mjs` to test the exact threshold: values
below `0.05` show the profile transition and values at or above `0.05` do not.
The script also checks that `screens/Profile.tsx` gates its focus effect using
the helper and that the two challenge-detail join paths do not use it.
