# Submission Multi-Image Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display every uploaded image for a submission through swipeable feed and profile previews, with automatically cycling profile grid thumbnails.

**Architecture:** Normalize all submission media representations in one utility and render them through one configurable paged carousel. Feed cards and profile modals opt into manual swipe; compact profile tiles opt into auto-play while retaining one tile per submission.

**Tech Stack:** React Native, Expo Image, TypeScript, Node assertion regression script

---

### Task 1: Capture Media Normalization And Surface Requirements

**Files:**
- Create: `utils/submissionMedia.ts`
- Modify: `scripts/test-ui-regressions.mjs`

- [ ] **Step 1: Write failing media and integration tests**

Load `utils/submissionMedia.ts` in the existing Node script and assert:

```js
assert.deepEqual(parseSubmissionMediaUrls(['first.jpg', '', 'second.jpg']), ['first.jpg', 'second.jpg']);
assert.deepEqual(parseSubmissionMediaUrls('["first.jpg","second.jpg"]'), ['first.jpg', 'second.jpg']);
assert.deepEqual(parseSubmissionMediaUrls('first.jpg, second.jpg'), ['first.jpg', 'second.jpg']);
```

Add source assertions requiring the feed and both profile components to import
`SubmissionMediaCarousel`; require `autoPlay` in profile grid call sites and
`zoomable` in profile modal call sites.

- [ ] **Step 2: Run tests to prove they fail first**

Run: `node scripts/test-ui-regressions.mjs`

Expected: failure because `utils/submissionMedia.ts` or
`SubmissionMediaCarousel` integration does not exist.

- [ ] **Step 3: Implement only URL normalization**

Export:

```ts
export type SubmissionMediaValue = string | string[] | null | undefined;
export function parseSubmissionMediaUrls(raw: SubmissionMediaValue): string[] { /* normalize formats */ }
```

The function will trim and discard empty URL values, parse JSON arrays when
possible, and otherwise parse a comma-separated string.

### Task 2: Add The Reusable Submission Carousel

**Files:**
- Create: `components/common/SubmissionMediaCarousel.tsx`

- [ ] **Step 1: Implement the reusable pager**

Create a component with this interface:

```ts
interface SubmissionMediaCarouselProps {
  mediaUrls: string[];
  width: number;
  height: number;
  autoPlay?: boolean;
  autoPlayIntervalMs?: number;
  zoomable?: boolean;
  borderRadius?: number;
}
```

Render a horizontal `FlatList` with `pagingEnabled`, cached `ExpoImage`
content by default and `PinchZoomImage` when `zoomable` is true. Maintain an
active index from scroll completion, automatically advance only when
`autoPlay && mediaUrls.length > 1`, and draw indicators only for multi-image
content.

### Task 3: Integrate The Feed And Profile Surfaces

**Files:**
- Modify: `screens/Feed.tsx`
- Modify: `screens/Profile.tsx`
- Modify: `app/user-profile.tsx`

- [ ] **Step 1: Convert feed post media to manual swipe**

Replace `item.mediaUrls?.[0]` rendering with:

```tsx
<SubmissionMediaCarousel
  mediaUrls={parseSubmissionMediaUrls(item.mediaUrls)}
  width={SCREEN_WIDTH - 22}
  height={PHOTO_HEIGHT}
/>
```

Keep the day badge in its existing overlay container and retain the existing
placeholder when no media URLs are present.

- [ ] **Step 2: Convert profile grid media to automatic cycling**

In both profile components, normalize each `sub.mediaUrls` and replace the
single thumbnail image with:

```tsx
<SubmissionMediaCarousel
  mediaUrls={mediaUrls}
  width={GRID_ITEM_SIZE}
  height={GRID_ITEM_SIZE}
  autoPlay
  borderRadius={4}
/>
```

Keep tile presses opening one selected submission and retain empty
placeholders.

- [ ] **Step 3: Convert profile previews to manual, zoomable paging**

For `selectedSubmission` in both modal previews, normalize all URLs and use:

```tsx
<SubmissionMediaCarousel
  mediaUrls={mediaUrls}
  width={IMAGE_WIDTH}
  height={IMAGE_WIDTH}
  zoomable
/>
```

Do not alter existing challenge-title resolution or modal post actions.

- [ ] **Step 4: Run targeted regression checks**

Run: `node scripts/test-ui-regressions.mjs`

Expected: `ui regression checks passed`.

### Task 4: Validate And Refresh Codebase Metadata

**Files:**
- Modify: `graphify-out/` generated metadata, if `graphify update .` writes changes

- [ ] **Step 1: Compile and lint the frontend**

Run: `npx tsc --noEmit` and `npm run lint`

Expected: exit code `0`, or clearly identify pre-existing failures outside the
modified carousel paths.

- [ ] **Step 2: Refresh the project graph**

Run: `graphify update .`

Expected: successful graph update after TypeScript source modifications.

- [ ] **Step 3: Inspect the scoped diff**

Run: `git diff -- utils/submissionMedia.ts components/common/SubmissionMediaCarousel.tsx screens/Feed.tsx screens/Profile.tsx app/user-profile.tsx scripts/test-ui-regressions.mjs`

Expected: only carousel work plus the pre-existing profile/script edits being
preserved in files that were already modified.
