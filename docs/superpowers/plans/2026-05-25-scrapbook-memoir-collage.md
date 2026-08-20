# Scrapbook Memoir Collage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render each exported ChallengeSphere memoir as a branded scrapbook-style collage with adaptive photo arrangements and a polished overflow treatment after twelve photos.

**Architecture:** Keep data selection in `utils/memoirCollage.ts` and rendering in `app/challenge-submissions.tsx`. Extend capture data with hidden-photo count, then replace equal grid calculation with deterministic template positions for small, medium, and dense photo counts while retaining the existing local `captureRef` export flow.

**Tech Stack:** React Native, Expo Image/asset `require`, react-native-view-shot, TypeScript, Node assertion regression scripts.

---

### Task 1: Capture Overflow Requirements In A Failing Test

**Files:**
- Modify: `scripts/test-client-memoir-generation.mjs`

- [ ] **Step 1: Add source assertions for the redesigned renderer**

Extend the existing script with:

```js
const utilitySource = readFileSync(new URL('../utils/memoirCollage.ts', import.meta.url), 'utf8');

assert.match(utilitySource, /MEMOIR_MAX_PHOTOS = 12/);
assert.match(utilitySource, /remainingPhotoCount/);
assert.match(source, /require\('\.\.\/assets\/images\/logo\.png'\)/);
assert.match(source, />challengesphere<\/Text>/);
assert.match(source, /getMemoirTileLayouts/);
assert.match(source, /remainingPhotoCount > 0/);
assert.match(source, /\+.*remainingPhotoCount.*more/);
assert.match(source, /START YOUR CHALLENGE/);
```

- [ ] **Step 2: Run the test and observe RED**

Run: `node scripts/test-client-memoir-generation.mjs`

Expected: fail because the current utility limits photos to nine and the renderer has no wordmark, tile templates, or overflow tile.

### Task 2: Prepare Twelve-Photo Capture Data

**Files:**
- Modify: `utils/memoirCollage.ts`
- Test: `scripts/test-client-memoir-generation.mjs`

- [ ] **Step 1: Extend data assertions through executable utility tests**

Load the transpiled TypeScript utility using the existing TypeScript dependency and assert:

```js
const captureData = createMemoirCaptureData({
  submissions: submissionsWithFourteenPhotoUrls,
  challengeTitle: 'Hello',
  challengeDateRange: '1 - 25 May',
  summaryDaysValue: '12/90',
  generatedAt: new Date('2026-05-25T00:00:00Z'),
});
assert.equal(captureData.photos.length, 12);
assert.equal(captureData.remainingPhotoCount, 2);
```

Include a video URL in the input and assert it is excluded from both visible photos and the overflow total.

- [ ] **Step 2: Implement capture data changes**

Update the utility contract:

```ts
export const MEMOIR_MAX_PHOTOS = 12;

export type MemoirCaptureData = {
  // existing fields
  remainingPhotoCount: number;
};
```

Collect every eligible photo, return the first twelve as `photos`, and calculate:

```ts
remainingPhotoCount: Math.max(0, allPhotos.length - MEMOIR_MAX_PHOTOS)
```

- [ ] **Step 3: Run the focused script**

Run: `node scripts/test-client-memoir-generation.mjs`

Expected: source requirements for rendering still fail until Task 3 is implemented; executable data assertions pass.

### Task 3: Render The Branded Scrapbook Collage

**Files:**
- Modify: `app/challenge-submissions.tsx`
- Test: `scripts/test-client-memoir-generation.mjs`

- [ ] **Step 1: Replace grid metrics with template placements**

Add a tile-layout type:

```ts
type MemoirTileLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  rotation: string;
};
```

Implement `getMemoirTileLayouts(photoCount)` with fixed scrapbook coordinates for:

```text
1-3 photos: spacious feature tile placement
4-7 photos: medium layered mosaic placement
8-12 photos: dense 12-position scrapbook placement
```

Each returned array contains exactly one position for each visible photo.

- [ ] **Step 2: Rebuild the capture composition**

In `MemoirCaptureView`:

```tsx
<View style={styles.memoirBrandRow}>
  <Image source={require('../assets/images/logo.png')} style={styles.memoirLogo} />
  <Text style={styles.memoirWordmark}>challengesphere</Text>
</View>
```

Render a positioned `memoirCollageStage` containing photo tiles with each layout's absolute coordinates and rotation. Add day badges to visible photos. If the current item is the final tile and `data.remainingPhotoCount > 0`, overlay:

```tsx
<View style={styles.memoirOverflowTile}>
  <Text style={styles.memoirOverflowValue}>+{data.remainingPhotoCount}</Text>
  <Text style={styles.memoirOverflowLabel}>more</Text>
</View>
```

Layer a keepsake title card over the stage with the challenge title and date range. Replace the existing report-like footer third value with a restrained marketing invitation while retaining uploads and days:

```tsx
<Text style={styles.memoirCta}>START YOUR CHALLENGE</Text>
```

- [ ] **Step 3: Style the approved composition**

Use a warm paper canvas, compact top brand signature, white-bordered shadowed photo tiles, dark pill day labels, cream title note, and dark rounded footer. The styles must remain within the existing `360 x 450` capture surface so the generated `1080 x 1350` output retains portrait export sizing.

- [ ] **Step 4: Run GREEN verification for the focused test**

Run: `node scripts/test-client-memoir-generation.mjs`

Expected: `client memoir generation regression checks passed`.

### Task 4: Validate Existing Behavior

**Files:**
- Verify: `app/challenge-submissions.tsx`, `utils/memoirCollage.ts`, `scripts/test-client-memoir-generation.mjs`

- [ ] **Step 1: Run regression, formatting, and compilation checks**

Run:

```bash
node scripts/test-client-memoir-generation.mjs
node scripts/test-ui-regressions.mjs
git diff --check
npx tsc --noEmit
npm run lint
```

Expected: regression scripts and TypeScript pass; lint has no errors, with any existing warnings reported.

- [ ] **Step 2: Refresh repository graph**

Run: `graphify update .`

Expected: AST refresh runs; if HTML output remains blocked by the already oversized graph renderer limit, report that exact limitation.
