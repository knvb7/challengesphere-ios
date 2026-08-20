# Fullscreen Media Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all challenge and submission upload images open into one smoothly pinch-zoomable fullscreen viewer without adding pinch gestures to cards or grids.

**Architecture:** Keep `PinchZoomImage` as the gesture engine, extend it to report active zoom state, and let `SubmissionMediaViewer` lock horizontal paging while an image is zoomed. Add a small `useFullscreenMediaViewer` hook so list, hero, and pre-upload preview surfaces share index/visibility state without duplicating behavior.

**Tech Stack:** Expo, React Native, TypeScript, React Native Gesture Handler, Reanimated, Node assertion scripts

---

### Task 1: Add failing fullscreen zoom coverage

**Files:**
- Create: `scripts/test-fullscreen-media-zoom.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing regression test**

Create a Node assertion script that reads:

```text
components/common/PinchZoomImage.tsx
components/common/SubmissionMediaViewer.tsx
components/common/SubmissionMediaCarousel.tsx
components/common/ChallengeDetailsOverview.tsx
components/common/SubmissionComposer.tsx
components/common/ImageUploader.tsx
app/challenge-submissions.tsx
app/global-submissions.tsx
app/(tabs)/create.tsx
app/edit-challenge.tsx
```

Assert that:

```js
assert.match(pinchZoom, /onZoomChange\?: \(zoomed: boolean\) => void/);
assert.match(viewer, /scrollEnabled=\{!isZoomed\}/);
assert.match(viewer, /onZoomChange=\{setIsZoomed\}/);
assert.match(carousel, /accessibilityLabel="Open image fullscreen"/);
assert.doesNotMatch(carousel, /zoomable \? \([\s\S]*<PinchZoomImage/);
assert.match(challengeOverview, /useFullscreenMediaViewer/);
assert.match(submissionComposer, /openViewer\(index\)/);
assert.match(imageUploader, /openViewer\(index\)/);
assert.match(challengeSubmissions, /openViewer\(urls, 0\)/);
assert.match(globalSubmissions, /openViewer\(urls, 0\)/);
assert.match(createChallenge, /openViewer\(form\.photos\.map\(\(photo\) => photo\.uri\), index\)/);
assert.match(editChallenge, /openViewer\(form\.photos\.map\(\(photo\) => photo\.uri\), index\)/);
```

Add:

```json
"test:fullscreen-media-zoom": "node ./scripts/test-fullscreen-media-zoom.mjs"
```

- [ ] **Step 2: Verify the new test fails**

Run: `npm run test:fullscreen-media-zoom`

Expected: FAIL on the missing zoom callback and paging lock.

- [ ] **Step 3: Commit the test**

```bash
git add scripts/test-fullscreen-media-zoom.mjs package.json
git commit -m "test: cover fullscreen media zoom"
```

### Task 2: Coordinate zoom and fullscreen paging

**Files:**
- Create: `hooks/useFullscreenMediaViewer.ts`
- Modify: `components/common/PinchZoomImage.tsx`
- Modify: `components/common/SubmissionMediaViewer.tsx`
- Test: `scripts/test-fullscreen-media-zoom.mjs`

- [ ] **Step 1: Add the shared viewer-state hook**

Export:

```ts
export function useFullscreenMediaViewer() {
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  const openViewer = useCallback((urls: string[], index = 0) => {
    const validUrls = urls.filter(Boolean);
    if (!validUrls.length) return;
    setMediaUrls(validUrls);
    setInitialIndex(Math.min(Math.max(index, 0), validUrls.length - 1));
    setVisible(true);
  }, []);

  const closeViewer = useCallback(() => setVisible(false), []);

  return { mediaUrls, initialIndex, visible, openViewer, closeViewer };
}
```

- [ ] **Step 2: Extend the pinch component**

Add `onZoomChange?: (zoomed: boolean) => void` and a `resetKey?: string | number` prop. Use Reanimated `runOnJS` only when the boolean zoom state changes. Report `true` during pinch/pan or when settled above 1×, and `false` after reset. Reset scale/translations when `resetKey` changes.

- [ ] **Step 3: Lock paging in the viewer**

Track `isZoomed`, pass `onZoomChange={setIsZoomed}` and `resetKey={`${visible}-${activeIndex}`}` to the active `PinchZoomImage`, and set:

```tsx
scrollEnabled={!isZoomed}
```

Reset `isZoomed` when the viewer opens, closes, or changes active page.

- [ ] **Step 4: Run the focused test**

Run: `npm run test:fullscreen-media-zoom`

Expected: Core gesture assertions pass; surface assertions remain failing.

- [ ] **Step 5: Commit**

```bash
git add hooks/useFullscreenMediaViewer.ts components/common/PinchZoomImage.tsx components/common/SubmissionMediaViewer.tsx scripts/test-fullscreen-media-zoom.mjs
git commit -m "feat: coordinate fullscreen zoom gestures"
```

### Task 3: Make submission surfaces open fullscreen

**Files:**
- Modify: `components/common/SubmissionMediaCarousel.tsx`
- Modify: `app/challenge-submissions.tsx`
- Modify: `app/global-submissions.tsx`
- Test: `scripts/test-fullscreen-media-zoom.mjs`

- [ ] **Step 1: Make carousel images fullscreen-only**

Remove inline `PinchZoomImage` rendering and the `zoomable` prop. Render every carousel image as a static `ExpoImage` inside a `Pressable`:

```tsx
<Pressable
  accessibilityLabel="Open image fullscreen"
  accessibilityRole="button"
  onPress={() => {
    pauseAutoplay();
    setActiveIndex(index);
    setViewerVisible(true);
  }}
>
  <ExpoImage ... />
</Pressable>
```

Keep the existing expand button as a second fullscreen affordance and keep horizontal carousel paging enabled.

- [ ] **Step 2: Add one viewer to challenge submissions**

Use `useFullscreenMediaViewer` at screen level. The image area calls:

```tsx
onPress={() => openViewer(urls, 0)}
```

Render one `SubmissionMediaViewer` near the screen root with the hook state. Keep description/social card content outside this image press target.

- [ ] **Step 3: Add one viewer to global submissions**

Parse every submission’s URLs, open them from the grid thumbnail with `openViewer(urls, 0)`, and render one screen-level `SubmissionMediaViewer`.

- [ ] **Step 4: Run the focused test**

Run: `npm run test:fullscreen-media-zoom`

Expected: Submission surface assertions pass.

- [ ] **Step 5: Commit**

```bash
git add components/common/SubmissionMediaCarousel.tsx app/challenge-submissions.tsx app/global-submissions.tsx scripts/test-fullscreen-media-zoom.mjs
git commit -m "feat: open submissions in fullscreen viewer"
```

### Task 4: Make challenge hero and upload previews fullscreen

**Files:**
- Modify: `components/common/ChallengeDetailsOverview.tsx`
- Modify: `components/common/SubmissionComposer.tsx`
- Modify: `components/common/ImageUploader.tsx`
- Modify: `app/(tabs)/create.tsx`
- Modify: `app/edit-challenge.tsx`
- Test: `scripts/test-fullscreen-media-zoom.mjs`

- [ ] **Step 1: Add challenge hero fullscreen viewing**

Use `useFullscreenMediaViewer` with the real `coverPhotoUrls`. Wrap the hero image in a press target only when uploaded cover URLs exist, call `openViewer(validCoverUrls, 0)`, and render `SubmissionMediaViewer`. Fallback artwork remains non-interactive.

- [ ] **Step 2: Add submission composer preview viewing**

Use the hook with `assets.map(asset => asset.uri)`. Wrap only the preview image with:

```tsx
<Pressable onPress={() => openViewer(assets.map((asset) => asset.uri), index)}>
```

Keep the remove button as its own sibling press target and render one viewer.

- [ ] **Step 3: Add shared image uploader preview viewing**

Use the same hook and wrap each preview image with `openViewer(selectedImages.map(image => image.uri), index)`. Preserve the remove control and render one viewer.

- [ ] **Step 4: Add challenge create/edit preview viewing**

In both form screens, use the hook, wrap each `mediaPreview` image in an indexed press target, preserve remove buttons, and render one `SubmissionMediaViewer` per screen.

- [ ] **Step 5: Run the focused test**

Run: `npm run test:fullscreen-media-zoom`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/common/ChallengeDetailsOverview.tsx components/common/SubmissionComposer.tsx components/common/ImageUploader.tsx app/'(tabs)'/create.tsx app/edit-challenge.tsx scripts/test-fullscreen-media-zoom.mjs
git commit -m "feat: zoom challenge and upload photos"
```

### Task 5: Verify all media zoom behavior

**Files:**
- Verify all files changed above
- Modify only if assertions are stale: `scripts/test-ui-regressions.mjs`

- [ ] **Step 1: Run regression suites**

```bash
npm run test:fullscreen-media-zoom
npm run test:owner-delete-menu
node scripts/test-ui-regressions.mjs
```

Expected: All scripts pass.

- [ ] **Step 2: Run static checks**

```bash
npx tsc --noEmit
npx expo lint components/common/PinchZoomImage.tsx components/common/SubmissionMediaViewer.tsx components/common/SubmissionMediaCarousel.tsx components/common/ChallengeDetailsOverview.tsx components/common/SubmissionComposer.tsx components/common/ImageUploader.tsx app/challenge-submissions.tsx app/global-submissions.tsx app/'(tabs)'/create.tsx app/edit-challenge.tsx hooks/useFullscreenMediaViewer.ts
```

Expected: Exit code 0.

- [ ] **Step 3: Refresh and inspect**

Run `graphify update .`; if unavailable, report that maintenance limitation. Then run:

```bash
git diff --check -- components/common/PinchZoomImage.tsx components/common/SubmissionMediaViewer.tsx components/common/SubmissionMediaCarousel.tsx components/common/ChallengeDetailsOverview.tsx components/common/SubmissionComposer.tsx components/common/ImageUploader.tsx app/challenge-submissions.tsx app/global-submissions.tsx app/'(tabs)'/create.tsx app/edit-challenge.tsx hooks/useFullscreenMediaViewer.ts scripts/test-fullscreen-media-zoom.mjs package.json
```

Expected: No scoped whitespace errors.
