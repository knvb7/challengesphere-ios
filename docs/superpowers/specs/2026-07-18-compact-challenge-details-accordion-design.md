# Compact Challenge Details Accordion Design

**Date:** 2026-07-18
**Status:** Approved interaction and visual direction

## Goal

Replace the dense challenge metadata tile grid with one polished, compact details card. The card is collapsed whenever a challenge screen first opens and reveals the complete metadata with one tap.

The redesign should make the screen easier to scan while preserving every useful challenge detail.

## Scope

The change applies to the shared `ChallengeDetailsOverview` used by both personal and global challenge detail screens. No API, data model, navigation, or backend changes are required.

The hero image, title, description, progress, submission preview, creator, participants, leaderboard, and global-submissions actions retain their existing behavior.

## Chosen Design

Use an inline accordion rather than a modal, bottom sheet, or separate screen. Inline expansion requires only one tap, keeps the user in context, and does not add another navigation layer.

### Collapsed State

The existing `Challenge Details` heading and seven separate tiles are replaced by one full-width card containing:

- a violet-tinted circular information icon;
- the title `Challenge details`;
- a one-line summary in the form `Category · Duration · Visibility`;
- a trailing `Show more` label and downward chevron.

The card uses the existing dark surface palette, a subtle violet border, generous horizontal padding, and clear text hierarchy. It is collapsed on every initial mount; the state is not persisted between visits.

### Expanded State

Tapping anywhere on the card expands it inline and changes the trailing control to `Show less` with an upward chevron. The expanded content remains inside the same rounded surface.

Metadata is presented as calm, full-width rows separated by subtle dividers rather than individual tiles:

- `Category` with the parsed category list;
- `Duration` with the configured duration or calculated day count;
- `Timeline` with the formatted start and end dates;
- `Created` with the formatted creation date and time;
- `Visibility` with the public or private value and matching icon.

The current day is not repeated in the expanded metadata because the status card and summary strip already show it above. When tags exist, they appear at the bottom of the expanded card as compact violet pills.

A second tap collapses the card. Expansion is local UI state and does not trigger loading, navigation, or an API request.

## Component Design

Keep the behavior inside `components/common/ChallengeDetailsOverview.tsx`, which already owns formatting and presentation of these fields. Add one local boolean state for expansion and small presentational helpers only if they make the metadata rows clearer.

The existing `DetailTile` presentation and its unused styles should be removed if the accordion makes them unreachable. No screen-level props or duplicate state are needed because both challenge screens receive the behavior through the shared component.

## Accessibility

- The accordion header exposes `accessibilityRole="button"`.
- It reports expanded or collapsed state through `accessibilityState`.
- The accessibility label clearly says either `Show challenge details` or `Hide challenge details`.
- Text and icons communicate the state in addition to color.
- The entire header row is the touch target, with comfortable padding for one-handed use.

## Error and Edge Cases

- Missing category falls back to `General`.
- Missing duration falls back to the calculated day count.
- Missing or invalid dates continue to display `Not set` through the existing formatters.
- Long summary values remain on one line and truncate cleanly without displacing the toggle.
- No tags means the tags area is omitted without leaving empty spacing.
- Re-rendering from refreshed challenge data preserves the current expanded state while the mounted screen remains open.

## Verification

Add a focused source-level regression script that verifies:

- the metadata area is collapsed by default;
- one shared press target controls expansion;
- `Show more` and `Show less` states are both present;
- the former tile grid is no longer rendered;
- all existing metadata remains available in the expanded content;
- accessibility state and labels are provided.

Run the focused regression script, TypeScript checking, lint for the touched files, and the existing challenge-details-related checks. Visually inspect a challenge in both collapsed and expanded states at a narrow Android phone width.

## Non-Goals

- Hiding the hero, title, description, progress, submissions, creator, participants, leaderboard, or action controls.
- Moving metadata to a modal, bottom sheet, or separate route.
- Persisting the accordion state between screen visits.
- Changing challenge data, API calls, navigation, or permissions.
- Broadly redesigning the rest of the challenge details screen.
