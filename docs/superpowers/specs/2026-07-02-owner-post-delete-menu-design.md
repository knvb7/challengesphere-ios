# Owner Post Delete Menu Design

## Goal

Make post deletion available only through a deliberate owner-only options menu in the opened post/media details screen. Do not expose deletion beside glory/like or comment actions, on profile tiles, or on challenge submission cards.

## User Experience

- The shared post/media details screen shows a three-dot options button in the top-right header only when the viewed submission belongs to the signed-in user.
- Opening a submission from either the user's profile or a challenge leads to the same owner menu.
- Tapping the three-dot button opens a compact options sheet containing a destructive `Delete post` action and a cancel action.
- Tapping `Delete post` opens the existing styled confirmation dialog before any deletion occurs.
- While deletion is running, repeat actions are disabled.
- After successful deletion, the details screen closes and submission-related caches are refreshed so profile and challenge lists no longer show the deleted post.
- If deletion fails, the details screen stays open and displays the existing app error treatment.

## Placement and Visibility

- The options button belongs in the shared details header, not over the media and not in the social action row.
- The options button is not rendered when ownership cannot be confirmed or when another user's post is being viewed.
- The currently exposed delete button is removed from challenge submission cards.
- Profile grid tiles remain navigation-only and do not gain a delete affordance.

## Architecture

- Extend the shared photo details screen to determine ownership from the canonical submission response, with route owner data used only while canonical data is unavailable.
- Reuse `useDeleteSubmission` for the server request and cache synchronization.
- Keep the options sheet and confirmation dialog local to the details screen because this is the only supported delete entry point.
- Reuse or minimally extend the shared photo header so it can render the owner options trigger without duplicating header layout.

## Safety and Error Handling

- Never show the delete option based solely on a profile/challenge entry point; compare the resolved submission owner ID with the signed-in user ID.
- Require explicit confirmation after selecting `Delete post`.
- Preserve the post and viewer state after a failed request and show a clear failure message.

## Tests

- Add a regression check proving the challenge submission card has no inline delete control.
- Add regression checks proving the details screen renders a three-dot owner options trigger, gates it by ownership, and keeps it outside the glory/comment action row.
- Add checks for the options-sheet-to-confirmation flow and successful mutation/navigation behavior.
- Run the focused regression script, type checking, and relevant existing UI regression checks.
