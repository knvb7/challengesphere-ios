# Submission Multi-Image Carousel Design

## Problem

A submission can upload multiple image URLs and the backend retains them. The
feed renders only `mediaUrls[0]`, while the own-profile and user-profile
previews parse only the first URL from each submission's stored media string.
As a result, uploaded images after the first cannot be viewed on the primary
post surfaces.

## Approved Experience

- A feed post displays every image in its submission and allows horizontal
  manual swiping, with an indicator when more than one image is available.
- Own-profile and other-user-profile grids remain one tile per submission.
  A tile with multiple images cycles through them automatically.
- Opening a submission from either profile displays the full image set in a
  manually swipeable preview, retaining the current post actions and challenge
  navigation.
- Single-image submissions retain the current static visual behavior.

## Architecture

Add `utils/submissionMedia.ts` as the canonical normalization boundary for
submission image values. It accepts the formats already seen at frontend
boundaries: an array of URLs, a JSON-encoded string array, a comma-separated
string, a single URL, or an absent value. It returns a filtered `string[]`.

Add `components/common/SubmissionMediaCarousel.tsx` as the reusable renderer
for submission images. It receives normalized URLs, dimensions, and an
`autoPlay` option. It uses a horizontal paged `FlatList`, tracks the visible
index, optionally advances only multi-image lists on an interval, and renders
a compact page indicator only when a post contains multiple images. An
optional zoomable mode uses the existing `PinchZoomImage` for full profile
previews; feed cards and small grid tiles use cached `ExpoImage` rendering.

## Integration

`screens/Feed.tsx` replaces its first-image `ExpoImage` with
`SubmissionMediaCarousel` configured for manual paging and the existing feed
photo height. The day badge remains an overlay outside the carousel.

`screens/Profile.tsx` and `app/user-profile.tsx` use the parser for each
submission. Grid tiles render the carousel with automatic progression and
their existing square size. The detail modal renders the carousel in manual,
zoomable mode at the existing square preview size. Existing uncommitted
challenge-title/navigation behavior in these files is retained.

The profile grid tile remains pressable as one post; cycling is visual only.
No backend, upload, database, or API-contract change is required because the
data flow investigation showed all image URLs already arrive at the relevant
clients.

## Error And Empty Handling

When normalization yields no image URLs, each surface keeps its existing empty
image placeholder. Invalid empty entries are ignored. Automatic cycling is
disabled for zero- and one-image submissions, so single-image tiles consume
no carousel timer.

## Verification

Regression checks will first cover:

- media normalization for array, JSON-string, comma-separated, single, and
  empty inputs;
- feed integration using manual carousel behavior rather than only the first
  URL;
- both profile grids configuring carousel auto-play;
- both profile detail previews exposing manually swipeable multi-image media.

The implementation will be verified with the targeted regression script,
TypeScript/lint validation available in the frontend project, and the required
`graphify update .` graph refresh after source modifications.
