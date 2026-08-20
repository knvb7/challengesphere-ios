# Social and Challenge Moderation Polish Design

**Date:** 2026-07-18  
**Status:** Approved

## Goal

Fix four related experience gaps without broad refactoring:

1. Keep the My Challenges visibility menu on-screen at narrow phone widths.
2. Offer the existing opt-in submissions auto-scroll control on profiles opened from followers and following lists.
3. Replace the floating comment modal with an Instagram-style, keyboard-safe bottom sheet.
4. Require and persist a reason when a creator removes a challenge participant, enforce a challenge-specific ban, and allow only a later direct creator invite to lift that ban.

## Scope and constraints

- Preserve the existing challenge visibility filtering behavior and labels.
- Preserve the existing authenticated-profile auto-scroll behavior and its in-progress pagination corrections.
- A participant ban applies only to one challenge. It does not suspend the user or restrict unrelated app activity.
- A removal reason is trimmed and must contain between 10 and 500 characters on both client and server.
- Voluntary challenge departure never creates a ban.
- Existing user changes in `screens/Profile.tsx`, `app/settings.tsx`, and the backend worktree must be preserved.
- The implementation should follow existing React Native, React Query, Spring Boot, JPA, and Flyway patterns and add no new runtime dependency.

## Chosen approach

Use targeted fixes at the existing ownership boundaries.

- Correct the shared visibility dropdown's menu anchoring rather than compensating in each screen.
- Reproduce the proven profile auto-scroll behavior in the public user-profile screen rather than refactoring both profile screens while one contains uncommitted work.
- Rebuild the existing comment modal in place as a bottom-anchored, keyboard-avoiding sheet.
- Extend the existing `user_challenges` membership row with challenge-ban metadata because it already represents the unique user/challenge relationship and is the source of membership enforcement.

A shared profile auto-scroll hook was rejected for this change because it would expand the diff and risk disturbing active work in `screens/Profile.tsx`. A dedicated comments route was rejected because it would not match the requested Instagram-style sheet. A separate participant-ban table was rejected because the current membership record already survives deactivation and can represent the current ban without introducing a second source of truth.

## Visibility filter

`ChallengeVisibilityDropdown` currently positions a fixed-width menu with `left: 0`. Both active call sites place the trigger at the right side of their content, so the menu grows beyond the viewport.

Anchor the menu to the trigger's right edge with `right: 0`. Keep its existing width, stacking order, options, accessibility state, icons, haptics, and filtering callbacks. Add a focused regression check that rejects a left-anchored menu and confirms right anchoring.

## Public-profile auto-scroll

The authenticated profile already contains the approved auto-scroll behavior. Extend the public user profile with the same interaction:

- Show a `Recent work` toolbar with submission count and `Auto scroll` control only when visible submissions exist and scrolling or pagination is possible.
- Start from the current offset, advance at the same slow fixed cadence, and expose `Pause` while active.
- Stop immediately on manual drag, pull-to-refresh, profile-tab change, navigation blur, pagination error, end-of-content, or unmount.
- Request the next submissions page near the end, prevent duplicate page requests, and resume against the new content height.
- Keep challenge labels, media carousels, submission routing, privacy handling, and empty states unchanged.

This feature applies to any accessible public user profile, including profiles opened from followers and following lists. Private profiles remain governed by their current access rules.

## Instagram-style comments sheet

Keep `CommentAndCount` as the entry point and data owner, but replace the current manually translated 80-percent modal with a bottom-anchored sheet that behaves like Instagram's mobile comments surface.

### Layout

- A dimmed pressable backdrop sits behind the sheet.
- The sheet has rounded top corners, a drag handle, a fixed `Comments` header, a close affordance, a flexing comment list, and a composer docked to its bottom.
- Comment rows retain avatars, tappable usernames, timestamps, existing delete ownership, and compact spacing. Empty and loading states occupy the list area instead of vertically floating the entire surface.
- The composer includes the signed-in user's avatar, a multiline input, and a text `Post` action whose enabled state is unambiguous.

### Keyboard and safe areas

Use platform-aware keyboard avoidance rather than manually translating the entire sheet from keyboard events. The sheet resizes above the keyboard, the comment list gives space to the composer, and the input remains visible while typing.

Apply `useSafeAreaInsets()` at the composer dock. With the keyboard closed, bottom padding is at least the device bottom inset so iPhone home indicators, Android gesture bars, and navigation controls never cover the composer. With the keyboard open, avoid double-counting that inset. The sheet retains top breathing room below notches and status bars.

Dismiss the keyboard before closing or navigating to a profile. Taps inside the list preserve input interaction, and dragging the list uses the platform's natural keyboard-dismiss behavior.

## Participant removal and challenge ban

### Removal request

Introduce a backend request body dedicated to creator removal:

```json
{
  "reason": "Repeated off-topic submissions"
}
```

The frontend reason dialog contains the participant identity, multiline reason input, 10–500 character guidance, live count, cancel action, and destructive remove action. Remove stays disabled until the trimmed input has at least 10 characters. The backend independently trims and validates the same bounds and rejects missing or invalid reasons.

### Persistence

Add a Flyway migration extending `challengesphere.user_challenges` with:

- `banned BOOLEAN NOT NULL DEFAULT FALSE`
- `removal_reason VARCHAR(500)`
- `removed_at TIMESTAMP WITH TIME ZONE`
- `removed_by_user_id BIGINT`

Map the fields on `UserChallenge`. The existing row remains inactive after removal, preserving the current ban reason and audit metadata for that user/challenge relationship.

### Removal transaction

The creator-only remove endpoint receives the reason and performs one transaction:

1. Authenticate the actor from the access token.
2. Load the challenge and verify the actor is its creator.
3. Reject attempts to remove the creator, a missing membership, or an already inactive participant.
4. Trim and validate the reason.
5. Set membership inactive, `banned=true`, record reason, timestamp, and actor.
6. Update participation counts and invalidate challenge, participant, progress, feed, and relevant user caches using existing mechanisms.

The creator identity is never accepted from the client request body.

### Enforcement

All challenge join paths inspect the existing membership before reactivation. If `banned=true`, regular joins, verified invitation acceptance, and invite-link redemption fail with a forbidden response. This ensures an old notification or link cannot bypass removal.

New submission creation and submission re-upload also require an active, non-banned membership. The existing active-membership check remains, while an explicit ban check provides defense in depth and a clear forbidden response. Existing submissions remain stored and visible according to current challenge and submission privacy rules; removal does not delete history.

### Creator reinstatement

The challenge creator's direct invite UI already sends specific `invitedUserIds` through the challenge update flow. Before sending those targeted invitations, the backend clears `banned`, `removal_reason`, `removed_at`, and `removed_by_user_id` for matching inactive membership rows when the authenticated actor owns the challenge.

After this explicit action, the user may accept the new invitation and rejoin normally. Generic public joins, old direct invitations, and invite links cannot clear the ban themselves. If invitation delivery later fails, the creator's explicit allow action still controls the membership state; current notification error reporting remains unchanged.

## API and frontend data flow

The remove mutation changes from a path-only request to a path plus validated body:

```text
Challenge details reason dialog
  -> useRemoveParticipant({ challengeId, participantUserId, reason })
  -> challengeService.removeParticipant(..., { reason })
  -> POST /api/v1/challenges/{challengeId}/participants/{participantUserId}/remove
  -> ChallengeService.removeParticipant(..., reason)
  -> user_challenges ban metadata
```

On success, close the reason dialog, clear its state, refetch challenge details and participants, and show a concise confirmation. On failure, keep the dialog available so the creator does not lose the typed reason, display the server message, and allow retry.

## Errors and edge cases

- Reasons containing only whitespace fail after trimming.
- Reasons over 500 characters are blocked by the input and rejected by the server.
- A stale client attempting removal after the participant already left receives a clear failure and cannot create a ban for an inactive voluntary departure.
- A banned participant cannot use a stale invite or direct API request to reactivate membership.
- Only the creator's targeted invite action clears a ban; voluntary joins and generic invite redemption do not.
- Comment keyboard handling must work with hardware keyboard height zero, Android navigation bars, iOS home indicators, and repeated open/close cycles.
- Auto-scroll must never create more than one interval or concurrent next-page request.
- The dropdown must remain visible in both My Challenges and profile challenge contexts.

## Verification

Frontend regression coverage will verify:

- the visibility menu is right-anchored;
- public profiles expose the same opt-in auto-scroll states and stop conditions;
- the comment sheet is bottom-anchored, keyboard avoiding, safe-area padded, and retains comment creation/deletion/profile navigation;
- removal requires a reason and sends it through the mutation and service.

Backend unit and integration coverage will verify:

- reason trimming and 10–500 character validation;
- creator-only removal and creator-protection rules;
- persisted challenge-ban metadata;
- blocked normal joins, verified-invite joins, submission creation, and re-upload while banned;
- voluntary leave remains unbanned;
- a targeted creator invite clears the ban and permits later rejoin.

Run focused frontend regression scripts, TypeScript, and ESLint for touched files. Run focused Maven tests for challenge and submission services, then the relevant backend test suite. Manually verify on narrow Android and notched iOS layouts with the keyboard closed and open, short and long comment lists, public profile pagination, and the full remove/reinvite/rejoin flow.

## Non-goals

- Global account suspension or moderation.
- Deleting a removed participant's existing submissions.
- Blocking comments or glories across the app.
- Comment replies, likes, editing, pinning, or reaction shortcuts.
- Auto-starting or persisting auto-scroll.
- Refactoring both profile screens into shared components during this fix.
