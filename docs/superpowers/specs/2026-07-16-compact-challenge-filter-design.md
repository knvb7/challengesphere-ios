# Compact My Challenges Visibility Filter

Date: 2026-07-16
Status: Approved

## Goal

Remove the vertical space consumed by the visibility filter on the My Challenges screen without changing its filtering behavior.

## Layout

Place `ChallengeVisibilityDropdown` at the far right of the existing Active, Created, and Past tab row. Group the three tabs on the left and keep the dropdown aligned to the right within the same row.

Delete the standalone `visibilityFilterBar` row. The category chips then follow immediately below the combined tabs-and-filter row.

The dropdown keeps its current label, icons, touch target, and downward-opening menu. Its menu must remain above the category chips and challenge list when open.

## Behavior

No filtering logic changes. Selecting All, Public, or Private continues to update `visibilityFilter`, apply the current haptic feedback, and filter the visible challenges.

Search, tab selection, category filtering, counts, loading states, and archive behavior remain unchanged.

## Responsive behavior

The left tab group may shrink within the row, while the visibility dropdown remains fully visible and tappable. The layout targets the existing narrow phone width shown in the provided Android screenshot.

## Verification

An automated source-level regression check will verify that the dropdown is rendered inside the compact tab/filter row and that the standalone visibility filter row no longer exists. Existing visibility-filter checks will verify All, Public, and Private behavior.

Manual verification will confirm that the combined row fits at the target Android width, the dropdown opens above neighboring content, and category chips move upward by the height of the removed row.
