# My Challenges Dark Gallery Redesign

Date: 2026-07-02  
Status: Approved in browser mockup

## Goal

Redesign the **My Challenges** tab so a user can understand what needs attention, scan up to 10 active challenges, and reach past challenges without confronting a dense dashboard inside every list item.

The approved direction is an image-led, dark-theme gallery. It applies to all states and filters inside the My Challenges screen. It does not redesign global challenge discovery or profile challenge lists.

## Information hierarchy

The screen presents information in this order:

1. Compact header with the title, search control, notification access, and create action.
2. One pending-proof stack when at least one active challenge can accept a submission today.
3. Active, Created, and Joined filter chips.
4. A two-column gallery of active challenges.
5. A visually separate Past challenges doorway with its challenge count.

Submission previews, description text, category tiles, duration tiles, repeated upload footers, and other secondary metadata are removed from this list. They remain available after opening a challenge.

## Pending-proof stack

The pending stack is one visual unit regardless of how many challenges need proof.

- With one pending challenge, show its title, current day or one-off label, and one **Upload proof** button.
- With multiple pending challenges, show the first pending challenge as **Up next** and add a secondary row with compact thumbnails and a **+N more** control.
- For five pending challenges, the label reads **+4 more**.
- Tapping **Upload proof** opens the existing submission composer for the displayed challenge.
- Tapping **+N more** reveals the complete pending queue without inserting repeated upload strips between gallery cards.
- Gallery cards may show a small status badge, but they do not repeat the upload button.
- The first pending challenge follows the current filtered order, so the behavior is deterministic.

If no challenge needs proof, the pending stack is omitted and the gallery moves up.

## Challenge gallery

The active list uses a two-column `FlatList` gallery.

Each card contains:

- A cover image or the existing category fallback image.
- Challenge title, limited to two lines.
- Current day and total days for recurring challenges, or **One-off**.
- Completion percentage and a thin progress indicator.
- One relationship/status badge: **Created**, **Joined**, **Private**, **Upcoming**, **Completed**, or **Inactive**.

Cards do not contain descriptions, recent submissions, category/duration boxes, creator badges, or upload footers.

Tapping a card opens the existing challenge details route. The gallery must remain readable at narrow phone widths and with 10 active challenges.

## Active and past bifurcation

Active and upcoming challenges stay in the main gallery. Completed, inactive, and deleted challenges are excluded from that gallery.

The **Past challenges** row is separated by a divider and shows the number of past challenges. Tapping it switches the screen to a dedicated archive view using the same compact image-card language. The archive includes a clear back affordance and supports Created and Joined filtering.

The existing `/challenges/my` response already supplies active and completed counts and challenge progress data. No new backend endpoint is required.

## Search and filters

Search is collapsed behind the header search icon. Activating it reveals a focused field below the header; clearing or closing it restores the compact layout.

Search matches title and category within the current view and filter. Filter chips use:

- **Active N**
- **Created**
- **Joined**

Counts and results must use deduplicated challenge IDs.

## Components and boundaries

The implementation will introduce My Challenges-specific presentation components:

- `PendingChallengeStack`: renders the primary pending action and the `+N more` queue entry point.
- `MyChallengeGalleryCard`: renders the compact image-led card.
- `PastChallengesRow`: renders the archive boundary and count.

Challenge mapping, challenge-day calculation, fallback image selection, navigation, and the existing submission composer remain shared.

The existing shared `ChallengeCard` stays unchanged for profile and other consumers. This prevents the My Challenges redesign from unintentionally changing unrelated lists.

## Data flow

1. Fetch the existing My Challenges and created-challenges data.
2. Map and deduplicate records by challenge ID.
3. Divide records into active/upcoming and past groups.
4. Apply the selected Created or Joined filter.
5. Apply the search query.
6. Derive pending challenges from filtered active records for which `canUploadToday` is true.
7. Pass the first pending challenge to the primary upload action and the remainder to the queue.

Refresh refetches challenge and submission state using the existing query hooks. A successful upload updates the local submitted-today state and removes that challenge from the pending queue for the current session.

## Loading, empty, and error states

- Loading uses dark gallery skeletons rather than a large centered dashboard.
- A load error keeps pull-to-refresh and presents one restrained retry action.
- No active challenges shows the existing explore/create choices in a simplified dark empty state.
- A filter or search with no results shows a compact message and a clear-filter action.
- No past challenges shows an archive-specific empty state.
- Missing or failed images fall back to the existing deterministic category artwork.

## Visual language

- Background: near-black, not pure black, with restrained purple glow.
- Surfaces: layered charcoal with subtle borders.
- Primary accent: ChallengeSphere purple.
- Attention accent: lime, reserved for pending-count emphasis.
- Cards use a dark bottom gradient so white metadata remains legible over any image.
- Motion is limited to press feedback, search expansion, and pending-queue expansion.

## Accessibility

- All actions have descriptive accessibility labels.
- Text and controls meet readable contrast on dark surfaces.
- Status is communicated with text as well as color.
- Touch targets are at least 44 by 44 points.
- Card titles allow two lines without clipping.
- Reduced-motion users receive no decorative looping animation on this screen.

## Verification

Automated checks will cover:

- One pending challenge shows no `+N more` control.
- Five pending challenges show `+4 more`.
- Zero pending challenges omits the pending stack.
- Active, Created, Joined, and archive filtering.
- Active/past classification and challenge-ID deduplication.
- Gallery cards omit submission previews and repeated upload controls.
- Cover-image fallback behavior.
- Empty, loading, and error states.
- Existing upload composer and challenge-details navigation remain wired.

Manual browser/device verification will cover:

- Narrow Android and iPhone widths.
- One, five, and ten active challenges.
- Long challenge names.
- Light and high-contrast images beneath card gradients.
- Archive navigation, search expansion, pull-to-refresh, and upload completion.
