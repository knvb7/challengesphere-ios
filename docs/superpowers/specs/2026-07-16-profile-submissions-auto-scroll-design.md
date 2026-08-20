# Profile Submissions Refined Gallery Design

**Date:** 2026-07-16  
**Status:** Approved visual direction (A: Refined gallery)

## Goal

Redesign the authenticated user's Profile → Submissions tab as a more polished, content-dense gallery and add an optional hands-free mode that scrolls submissions slowly by itself.

The redesign must retain the familiar two-column browsing model, existing profile information, profile tabs, challenge labels, media carousels, submission detail navigation, pull-to-refresh, and paginated loading.

## Scope

This change applies to the authenticated user's profile in `screens/Profile.tsx`. The public user profile remains unchanged. No backend or API changes are required.

## Visual Design

The existing profile header and three-way tab control remain in place. The Submissions tab gains a compact gallery toolbar immediately above the grid:

- Left side: `Recent work` and the resolved submission count, such as `48 moments`.
- Right side: a bordered purple `Auto scroll` pill with a small status dot and play icon.
- Active state: the pill becomes `Pause`, uses a filled purple treatment, and shows that hands-free scrolling is running.

The gallery remains two columns to preserve scanning speed. Tiles keep their square media crop and bottom challenge label, but use consistent rounded corners, a quieter border, a stronger bottom gradient for label legibility, and slightly tighter grid spacing. Existing no-media placeholders and multi-image carousel behavior remain intact.

The empty state retains the existing message and does not show auto-scroll controls because there is nothing to scroll.

## Auto-Scroll Interaction

Auto-scroll is opt-in and never starts automatically.

1. Tapping `Auto scroll` begins a gentle, constant vertical glide from the user's current scroll position.
2. The control changes to `Pause` while active. Tapping it pauses without changing position.
3. Beginning a manual drag immediately pauses auto-scroll, after which normal manual scrolling continues.
4. Auto-scroll pauses when the Submissions tab loses focus, when the user switches profile tabs, or when the screen unmounts.
5. Reaching the bottom stops auto-scroll and restores the inactive `Auto scroll` control.
6. If more pages are available near the bottom, existing pagination loads them. Auto-scroll waits while the next page is loading, then continues when the new content is available. If loading fails or no next page exists, it stops at the current end.
7. Pull-to-refresh pauses auto-scroll before refreshing.

The initial release uses one deliberately slow speed rather than exposing speed settings. This keeps the mode simple and matches the requested hands-free behavior.

## Component and State Design

The implementation stays local to `Profile.tsx` to avoid a premature abstraction for a single screen.

New local state and refs track:

- whether auto-scroll is active;
- the `ScrollView` instance;
- current vertical offset;
- viewport and content heights;
- the active animation/timer handle; and
- whether pagination is currently extending the gallery.

A small local `ProfileSubmissionsToolbar` render helper or focused component presents the count and mode toggle. The existing submission mapping and navigation code remain the source of truth for gallery content.

The scroll loop advances the `ScrollView` by a small distance on a short cadence, producing a constant slow movement rather than repeated large animated jumps. All loop handles are cancelled on pause and cleanup to prevent background scrolling or duplicate timers.

## Data Flow

`useInfiniteUserSubmissions` continues to provide pages, total count, and pagination state. Flattened, date-sorted submissions continue to drive the gallery. Scroll measurements from the existing `ScrollView` determine the current position and whether the bottom has been reached.

Auto-scroll does not alter submission data, ordering, caching, or detail route parameters.

## Error and Edge Cases

- Zero or one short row: the auto-scroll control is hidden when content does not exceed the viewport.
- Pagination failure: stop at the current end; existing query behavior remains responsible for retrying.
- Manual gesture during auto-scroll: pause immediately and preserve the user's touch interaction.
- Tab switch or navigation away: cancel the active loop.
- Refresh: pause first, then run the existing refresh flow.
- Content height changes after media loads or pagination: use the latest measured height rather than a captured value.

## Accessibility

- The toggle exposes `accessibilityRole="button"`, an explicit `accessibilityLabel`, and an active-state hint.
- Active and inactive states differ by text and icon as well as color.
- Manual scrolling always overrides automation.
- The slow movement avoids abrupt jumps and flashing content.

## Verification

Add a focused source-level regression script covering:

- the gallery toolbar and submission count;
- the auto-scroll start/pause states;
- pause-on-drag and cleanup behavior;
- stop-at-bottom behavior;
- continued use of existing challenge labels and submission detail routing.

Run the new regression script, the existing profile submission label test, the profile data-flow regression test, TypeScript checking, and lint for the touched files. Render the screen in the app or a faithful local preview and visually verify the toolbar, two-column grid, active state, and small-screen spacing.

## Non-Goals

- Changing the public user profile.
- Replacing the two-column grid with a full-screen feed.
- Automatically enabling the mode on page load.
- Persisting the mode between app sessions.
- Adding speed settings, looping back to the top, or changing backend pagination.
