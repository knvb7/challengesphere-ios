# Leaderboard Podium and Filters Design

**Date:** 2026-07-16  
**Status:** Approved visual direction (A: Podium + standings)

## Goal

Make challenge ranking feel competitive, legible, and useful by redesigning the dedicated leaderboard around a top-three podium, a compact personal-rank summary, real score-mode filters, and faster participant search. Give the challenge-details top-five preview the same ranking language.

## Scope

The primary change is `app/leaderboard.tsx`. The compact top-five section in `components/common/ChallengeDetailsOverview.tsx` receives matching rank styling and a clear full-leaderboard action.

No backend, database, challenge-detail hero, profile, submission tile, or navigation changes are included.

## Supported Ranking Filters

The filter row exposes the four modes already supported by the leaderboard API:

- Overall (`LeaderboardType.OVERALL`)
- Submissions (`LeaderboardType.SUBMISSIONS`)
- Glories (`LeaderboardType.GLORIES`)
- Streak (`LeaderboardType.STREAK`)

Changing a filter updates the query key through `useChallengeLeaderboard`, displays the cached result when available, and fetches the selected ranking. Date-period filters are not included because the current endpoint does not accept a period.

The active mode controls score labels:

- Overall: `points`
- Submissions: `submissions`
- Glories: `glories`
- Streak: `days`

The numerical rank and score returned by the selected leaderboard response remain authoritative. Entry fields such as `submissionCount`, `gloriesCount`, and `currentStreak` provide supporting context where available.

## Screen Structure

### Header

Keep the back navigation, `Leaderboard` title, and challenge title. Reduce unused vertical space so ranking content begins quickly.

### Personal Rank Card

Replace the large two-column panel with one compact purple gradient card:

- `Your position` and the selected mode's rank;
- selected mode score with its unit;
- percentile or `Ranked N of M` context when available.

For Overall only, the existing `useUserRank` result may remain a fallback when the leaderboard response omits `currentUserRank`. Other modes use the selected leaderboard response so an Overall rank is never mislabeled as a Submissions, Glories, or Streak rank.

### Ranking Mode Filters

Render a horizontally scrollable pill row for Overall, Submissions, Glories, and Streak. The active pill uses the purple filled state; inactive pills use the existing dark surface. Each pill has a text label and accessible selected state.

### Search

Use one compact search field with no separate Search button. Participant matching updates after a short debounce while typing. The clear affordance resets the field immediately.

Search continues to merge challenge participants with the existing user-search response, allowing ranked and unranked participants to be found. While search is active, results use the normal list and the podium is hidden.

### Podium

When search is empty, render up to the first three ranked entries as a podium:

- first place centered and visually tallest with gold treatment;
- second place on the left with silver treatment;
- third place on the right with bronze treatment;
- avatar, display name, selected-mode score, and place number for each entry.

Podium cards remain tappable and open the participant profile. Missing avatars use the existing placeholder. With fewer than three ranked entries, render only the available places without empty podium blocks.

### Standings List

When the podium is visible, the standings list still includes the complete ranking, including ranks one through three. The podium is the visual highlight; standings is the precise, scannable table and must remain useful for challenges with only one to three ranked participants. During search, it includes every matching participant, including top-three entries and unranked matches.

Each row contains:

- compact rank badge;
- avatar and display name;
- one supporting statistic appropriate to the active mode;
- selected-mode score and unit;
- a submissions affordance for ranked users.

The current user's row uses a subtle purple highlight and `You` label. Pressing the row opens the user profile; pressing the submissions affordance retains the existing read-only challenge-submissions route.

## Challenge-Details Preview

Keep the preview capped at five entries and ranked by Overall. Update its rank badges to gold, silver, bronze, and neutral treatments, improve score alignment, and add a `View full leaderboard` action when `onLeaderboardPress` exists.

Participant rows retain their existing profile navigation behavior. The empty state remains compact and says `No rankings yet`.

## Data Flow

`activeLeaderboardType` drives `useChallengeLeaderboard(challengeId, activeLeaderboardType, leaderboardLimit, userId)`. The response entries are normalized with their existing rank/unranked handling, then passed through debounced participant search.

Derived collections are separated by purpose:

- `podiumEntries`: first three ranked results when search is empty;
- `standingEntries`: all ranked results when search is empty;
- `filteredEntries`: all matching ranked and unranked results while searching.

Changing ranking mode clears neither the search text nor navigation state. It does reset the list scroll position to the top so the selected ranking starts predictably.

## Loading, Empty, and Error States

- Initial load: podium-shaped skeleton plus ranking-row skeletons.
- Filter change with cached data: keep the cached surface while the selected mode refreshes.
- Filter change without cached data: show the leaderboard skeleton under the persistent header and filters.
- Search in progress: keep existing matches visible until debounced results settle.
- No ranking entries: show `No rankings yet` and `Be the first to submit!`.
- No search match: show `No participant found` and retain a one-tap clear action.
- Fetch error: keep the existing retry action and retry the active ranking mode.

## Accessibility

- Ranking filters use button roles and `accessibilityState={{ selected: true }}` for the active mode.
- Podium order is reflected in DOM/component order and announced place labels.
- Score values include their unit in accessible text.
- Search retains a clear label and return-key behavior.
- Color is not the only distinction between first, second, and third; place numbers remain visible.

## Verification

Add focused regression coverage for:

- all four `LeaderboardType` filter values;
- selected leaderboard type driving `useChallengeLeaderboard`;
- podium and standings split;
- search hiding the podium and including all matching entries;
- metric-specific score units;
- Overall-only fallback to `useUserRank`;
- gold/silver/bronze challenge-preview rank treatments and full-leaderboard action;
- preserved profile and submission navigation.

Run the focused leaderboard regression, leaderboard cache-freshness regression, TypeScript, and targeted ESLint. Verify on the Android emulator at a narrow phone viewport with populated, sparse, empty, searched, and filter-loading states.

## Non-Goals

- Weekly, monthly, or yearly filters.
- New scoring rules or score calculations.
- Backend leaderboard changes.
- Following-only or geography filters.
- Rank movement history, notifications, rewards, or animations.
- Redesigning unrelated challenge-details sections.
