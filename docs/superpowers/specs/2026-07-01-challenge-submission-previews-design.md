# Challenge Submission Previews Design

**Date:** 2026-07-01

## Goal

Match the supplied ChallengeSphere challenge-card reference by adding image-submission previews to:

- My Challenges
- Global Challenges
- another user's profile Challenges tab
- challenge detail screens opened from those cards

The existing challenge metadata, actions, permissions, and navigation must continue to work.

## Product behavior

### My Challenges and Global Challenges

Each challenge card shows a `Recent submissions` panel between the challenge header and metadata tiles.

- Show image media from the challenge's four newest submissions, newest first.
- Use at most one preview image per submission so the row represents recent submissions rather than every attachment in one submission.
- Render up to four rounded thumbnails.
- If more than four matching submissions exist, darken the fourth thumbnail and show `+N`, where `N` is the number not displayed.
- `View all` opens the existing challenge submissions experience.
- When no image submissions exist, show:
  - `No recent submissions yet.`
  - `Be the first one to submit!`

### Profile Challenges tab

The card layout is the same, but preview data is filtered to the profile being viewed.

- Show only that user's four newest image submissions for the challenge.
- The heading is `User submissions`.
- The total and `+N` count include only that user's matching submissions.
- The empty state describes the viewed user rather than inviting the viewer to submit.
- `View all` opens the existing submissions screen scoped to the viewed user when that route supports the scope.

### Opened challenge

Both regular and global challenge detail screens show a full-width submission preview section in the shared challenge overview.

- Opening from My Challenges or Global Challenges shows the challenge's newest image submissions.
- Opening from a profile challenge card carries the profile user ID so the detail preview remains filtered to that user.
- The preview section uses the same thumbnail, overflow, empty, loading, and error behavior as cards.
- Tapping a thumbnail opens the corresponding submission/photo detail.
- `View all` uses the existing challenge submissions route, retaining the user filter when applicable.

## Visual design

Create one reusable dark submission-preview panel based on the supplied reference:

- subtle border and dark translucent background
- camera icon, compact section title, and purple `View all` action
- four equal-width rounded image thumbnails in one row
- dark circular/gradient overflow treatment on the fourth image
- centered two-line empty state in the same fixed panel footprint

Card spacing, typography, borders, and metadata tiles should be adjusted only where needed to match the reference. Existing app design tokens and cached remote-image utilities remain authoritative.

## Data design

Add a batch preview endpoint so list screens do not issue one network request per card.

Request:

- a deduplicated list of visible challenge IDs
- optional `userId` for profile-scoped previews
- fixed preview limit of four

Response per challenge:

- challenge ID
- newest preview items with submission ID, media URL, submission time, and user ID
- total number of matching image submissions

Backend rules:

- enforce the same challenge/submission visibility and privacy checks as existing submission endpoints
- order deterministically by submission time descending, then submission ID descending
- select the first usable image URL from each submission
- exclude submissions without image media
- filter by `userId` only when supplied and authorized by normal profile visibility
- return an empty entry for accessible challenges with no matching images
- never expose inaccessible private challenge data

Frontend:

- one query per rendered challenge list, keyed by sorted challenge IDs and optional profile user ID
- map results by challenge ID
- cache through the existing query layer
- pass preview data into the shared card/panel; the visual component performs no fetching
- detail screens may use the same endpoint with a single challenge ID to keep response semantics identical

## States and failures

- Loading: render a stable-height skeleton/placeholder to prevent card layout jumps.
- Empty: render the specified empty copy.
- Partial media failure: hide failed thumbnails and retain working images.
- Preview request failure: keep the challenge card/detail usable and show a quiet unavailable/empty panel; never fail the parent screen.
- Refresh: challenge-list and detail pull-to-refresh operations also refresh preview data.

## Testing

Backend tests cover:

- newest-first ordering and deterministic tie-breaking
- maximum four returned previews
- correct total and overflow count
- one image per submission
- profile user filtering
- submissions without images
- private/inaccessible challenges
- mixed accessible challenge IDs in one batch

Frontend tests cover:

- four thumbnails and `+N`
- zero, one, and fewer-than-four previews
- profile-specific heading/copy and filter propagation
- card press, thumbnail press, and `View all` navigation
- My, Global, profile, regular detail, and global detail integration
- preview errors do not break challenge rendering

## Out of scope

- Changing upload rules or submission creation
- Replacing the existing full submissions galleries
- Video playback inside the compact preview row
- Broad redesigns outside challenge cards and challenge details
