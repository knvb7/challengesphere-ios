# Scrapbook Memoir Collage Design

## Goal

Replace the rigid memoir export with a beautiful, shareable ChallengeSphere collage that foregrounds photos while visibly branding the exported artifact.

## Existing Problem

The current portrait memoir renders a fixed rectangular grid and displays at most nine photos. When multiple photos are present the export reads as a simple list of boxes rather than a composed collage, while the small uppercase brand line does not market ChallengeSphere strongly enough in shared images.

## Approved Experience

The export becomes a scrapbook-style portrait collage:

- A compact brand signature at the top displays the real app logo beside lowercase `challengesphere`.
- Photos are arranged as a composed mosaic with varied tile dimensions and subtle rotation, white photographic borders, rounded corners, and depth shadows.
- A small keepsake-style title card is layered over the collage and includes the challenge title plus concise date/progress context.
- A slim dark footer retains key statistics and a restrained invitation to start a challenge through ChallengeSphere.
- Photo day badges remain legible but secondary to the imagery.

## Photo Count Behavior

The memoir includes up to 12 visible photo positions.

- `1-3` photos use spacious feature placements.
- `4-7` photos use a relaxed mosaic with larger tiles.
- `8-12` photos use the full dense scrapbook composition.
- When the challenge contains more than 12 eligible photos, the twelfth tile becomes an overlay tile showing `+N more`, where `N` is the number of eligible photos not shown.

The statistics bar continues to display the full submission upload count. The export does not attempt to render an unbounded number of tiny images.

## Architecture

`utils/memoirCollage.ts` remains the data preparation boundary. It will:

- raise the visible photo limit from 9 to 12;
- count all eligible photo URLs before selecting the first 12;
- expose the number of additional hidden photos through `remainingPhotoCount` in `MemoirCaptureData`.

`app/challenge-submissions.tsx` remains the frontend rendering and capture boundary. It will:

- replace equal-cell grid metrics with photo-count template placement data;
- render the logo asset and lowercase wordmark;
- position the photo tiles using the approved scrapbook templates;
- tint the final tile with the overflow indicator when `remainingPhotoCount > 0`;
- retain the existing client-side `captureRef` export pipeline and output aspect ratio.

No API, backend collage endpoint, submission upload, or database change is required.

## Error And Empty Handling

When no eligible photo is present, retain the text-summary fallback but render it inside the branded memoir composition. Failed or video URLs are not treated as photos. Image loading and capture continue using the existing timeout/capture error behavior.

## Verification

Regression checks must cover:

- data creation retaining 12 visible photos and reporting overflow for additional eligible photos;
- video media not increasing visible or hidden photo count;
- renderer inclusion of the logo/lowercase wordmark, scrapbook tile template logic, overflow overlay, and shareable footer callout;
- continued client-side `captureRef` generation without backend collage calls.

Run the focused memoir regression script, existing UI/regression checks affected by the screen, TypeScript validation, and lint. Report the known graph visualization limit if `graphify update .` cannot render the already oversized project graph.
