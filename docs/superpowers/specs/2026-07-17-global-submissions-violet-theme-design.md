# Global Submissions Violet Theme Design

## Goal

Bring the global submissions page for every challenge into the app's violet visual theme by removing all green and yellow accents from that screen.

## Scope

Only `app/global-submissions.tsx` will change. The screen's layout, copy, filters, sorting, pagination, submission grid, and interaction behavior will remain unchanged.

Neutral surface and text colors will remain unchanged so the page retains its existing dark-theme contrast and hierarchy.

## Palette

- Primary action and active control: `#4700EC`
- Highlight icon and supporting accent: `#8F6BFF`
- Violet-tinted surface: `#170F2A`
- Violet border: `#34215E`
- Active control text and icons: `#F8FAFC`

## Visual Changes

- Replace green filter labels and active-filter metadata with violet highlights.
- Replace the green day-selector background and border with violet-tinted equivalents.
- Replace the yellow calendar treatment with violet icon and surface colors.
- Replace yellow reset and filter-result accents with violet.
- Replace green active sort chips with the primary violet and use white text/icons for contrast.
- Keep existing violet header, dropdown selection, load-more, retry, and refresh treatments consistent with the unified palette.

## Data and Behavior

No state, navigation, API, filtering, sorting, pagination, accessibility behavior, or submission rendering logic will change.

## Error Handling

Existing loading, empty, and error states remain functionally unchanged. Their action accents will use the same violet hierarchy.

## Verification

- Run TypeScript compilation without emitting files.
- Run an Expo Android production export to confirm the screen bundles successfully.
- Run a diff-integrity check for whitespace errors.
- Do not run unit tests, per the user's standing request.

