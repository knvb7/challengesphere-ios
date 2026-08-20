# Fullscreen Media Zoom Design

## Goal

Make every user-uploaded challenge and submission image smoothly pinch-zoomable in a shared fullscreen viewer, while keeping pinch gestures out of feed and grid cards.

## User Experience

- Feed, profile, challenge-submission, global-submission, and challenge-photo images open a fullscreen viewer when the image or its expand affordance is tapped.
- Selected photos in upload composers and challenge create/edit forms also open the same fullscreen viewer before upload.
- Existing card-level navigation remains available outside the image-specific fullscreen action.
- Upload preview remove buttons keep their current behavior and do not open the viewer.
- The fullscreen viewer supports:
  - focal-point pinch zoom;
  - panning while zoomed;
  - double-tap to zoom in or reset;
  - spring-based boundary correction and reset;
  - horizontal paging between images when the active image is at 1×.
- Horizontal paging is disabled while the active image is zoomed or being manipulated so paging does not fight pinch/pan gestures.
- Closing or changing images resets gesture state so the next image starts at 1×.

## Scope

### Submission media

- Feed cards.
- Signed-in and other-user profile submission grids.
- Challenge submission timelines.
- Global submission grids.
- Canonical post/photo details.
- Submission preview thumbnails that navigate to canonical post details remain navigation-only because they are compact challenge summary controls rather than media surfaces.

### Challenge and upload media

- Challenge detail photo carousels.
- Submission composer selected-photo previews.
- Shared image uploader previews.
- Challenge create and edit selected-photo previews.

Decorative app images, avatars, logos, onboarding artwork, and integration icons are outside this feature.

## Architecture

- `PinchZoomImage` remains the single gesture implementation and reports whether its image is actively zoomed or manipulated.
- `SubmissionMediaViewer` becomes the reusable fullscreen viewer for both remote and local image URIs and owns paging lock state.
- A shared `useFullscreenMediaViewer` hook manages viewer visibility and selected index for upload preview surfaces, avoiding repeated modal state.
- `SubmissionMediaCarousel` renders lightweight static images in cards and opens `SubmissionMediaViewer` on image tap or the existing expand affordance.
- Challenge photo carousels use the same viewer instead of running pinch gestures inline.

## Gesture Coordination

- A fullscreen image reports interaction start before pinch/pan updates and reports idle only after scale returns to 1×.
- The viewer disables its horizontal `FlatList` scrolling while the current image is zoomed or under gesture control.
- Single taps remain available for opening the viewer on non-fullscreen media.
- Child remove buttons stop or avoid parent image-open handling.
- Zoom state is keyed to the active image and reset on viewer close or page change.

## Error Handling

- Invalid or empty media lists do not open the fullscreen viewer.
- A failed image load leaves the fullscreen viewer closable and does not trap paging or zoom state.
- Local upload asset URIs and remote cached URLs use the same viewer interface.

## Tests

- Add source regression coverage proving card/grid carousels do not enable inline pinch and do open the shared fullscreen viewer.
- Verify the fullscreen viewer pauses paging during zoom and restores paging after reset or page change.
- Verify challenge photo carousels and upload preview surfaces use the shared viewer.
- Verify upload remove buttons remain separate controls.
- Run the focused media-zoom regression script, the broader UI regression suite, TypeScript, and lint checks.
