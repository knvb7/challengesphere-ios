import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readSource = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const pinchZoom = readSource('components/common/PinchZoomImage.tsx');
const zoomOverlay = readSource('components/common/PinchZoomOverlay.tsx');
const viewer = readSource('components/common/SubmissionMediaViewer.tsx');
const carousel = readSource('components/common/SubmissionMediaCarousel.tsx');
const feed = readSource('screens/Feed.tsx');
const photoDetails = readSource('app/photo-details.tsx');
const rootLayout = readSource('app/_layout.tsx');
const challengeOverview = readSource('components/common/ChallengeDetailsOverview.tsx');
const challengeCarousel = readSource('components/common/ChallengePhotoCarousel.tsx');
const submissionComposer = readSource('components/common/SubmissionComposer.tsx');
const imageUploader = readSource('components/common/ImageUploader.tsx');
const createChallenge = readSource('app/(tabs)/create.tsx');
const editChallenge = readSource('app/edit-challenge.tsx');

assert.match(pinchZoom, /onZoomChange\?: \(zoomed: boolean\) => void/);
assert.match(pinchZoom, /zoomMode\?: 'persistent' \| 'transient'/);
assert.match(
  pinchZoom,
  /currentFocalX\.value\s*\+ \(savedTranslateX\.value - startFocalX\.value\) \* scaleRatio/,
);
assert.match(
  pinchZoom,
  /currentFocalY\.value\s*\+ \(savedTranslateY\.value - startFocalY\.value\) \* scaleRatio/,
);
assert.match(pinchZoom, /const rubberBandTranslate = \(/);
assert.match(pinchZoom, /const onZoomChangeRef = React\.useRef\(onZoomChange\)/);
assert.match(pinchZoom, /\.onFinalize\(\(\) => \{/);
assert.match(pinchZoom, /\.manualActivation\(true\)/);
assert.match(pinchZoom, /manager\.fail\(\)/);
assert.match(pinchZoom, /\.maxPointers\(1\)/);
assert.match(pinchZoom, /\.averageTouches\(true\)/);
assert.match(pinchZoom, /zoomMode === 'transient'/);
assert.match(pinchZoom, /Gesture\.Race\(pinch, singleTap\)/);
assert.doesNotMatch(pinchZoom, /\.onBegin\(/, 'one pointer must not start pinch side effects');
assert.match(pinchZoom, /energyThreshold:/);
assert.match(pinchZoom, /completedResetAnimations\.value < 3/);
assert.match(pinchZoom, /onAccessibilityTap=\{isPressable \? handlePress : undefined\}/);
assert.match(pinchZoom, /\[doubleTap, isPressable, pan, pinch, singleTap, zoomMode\]/);
const resetEffect = pinchZoom.slice(
  pinchZoom.indexOf('React.useEffect(() => {'),
  pinchZoom.indexOf('const pinch ='),
);
assert.doesNotMatch(
  resetEffect,
  /\n\s+onZoomChange,\n/,
  'callback identity must not reset an active pinch',
);

assert.match(zoomOverlay, /PinchZoomOverlayProvider/);
assert.match(zoomOverlay, /overlay\.scale\.value/);
assert.match(zoomOverlay, /overlay\.active\.value/);
assert.match(zoomOverlay, /registerOverlay/);
assert.match(zoomOverlay, /pointerEvents="none"/);
assert.match(rootLayout, /<PinchZoomOverlayProvider>/);
assert.match(viewer, /scrollEnabled=\{!isZoomed\}/);
assert.match(viewer, /onZoomChange=\{index === activeIndex \? setIsZoomed : undefined\}/);
assert.match(viewer, /<GestureHandlerRootView style=\{styles\.gestureRoot\}>/);
assert.match(carousel, /zoomMode="transient"/);
assert.match(
  carousel,
  /rootOverlayEnabled=\{rootOverlayEnabled && Math\.abs\(index - activeIndex\) <= 1\}/,
);
assert.match(carousel, /disableIntervalMomentum/);
assert.match(carousel, /onZoomChange\?: \(zoomed: boolean\) => void/);
assert.match(carousel, /zoomedIndexRef\.current !== index/);
assert.match(carousel, /if \(zoomedIndexRef\.current !== null\) return;/);
assert.match(carousel, /offset: scrollOffsetRef\.current/);
assert.match(feed, /scrollEnabled=\{zoomedSubmissionId === null\}/);
assert.match(feed, /const FeedCard = React\.memo\(/);
assert.doesNotMatch(feed, /removeClippedSubviews=\{false\}/);
assert.match(photoDetails, /scrollEnabled=\{!isMediaZoomed\}/);
assert.match(photoDetails, /numberActiveTouches === 1/);
assert.match(photoDetails, /swipeDismissBlockedRef\.current = true/);
assert.match(photoDetails, /onZoomChange=\{handleMediaZoomChange\}/);
assert.match(
  challengeOverview,
  /<SubmissionMediaCarousel[\s\S]*mediaUrls=\{uploadedCoverPhotoUrls\}/,
);
assert.match(challengeCarousel, /accessibilityLabel="Open image fullscreen"/);
assert.match(challengeCarousel, /<SubmissionMediaViewer/);
assert.doesNotMatch(challengeCarousel, /<PinchZoomImage/);
assert.match(submissionComposer, /openViewer\(assets\.map\(\(asset\) => asset\.uri\), index\)/);
assert.match(imageUploader, /openViewer\(selectedImages\.map\(\(image\) => image\.uri\), index\)/);
assert.match(
  createChallenge,
  /openViewer\(form\.photos\.map\(\(photo\) => photo\.uri\), index\)/,
);
assert.match(
  editChallenge,
  /openViewer\(form\.photos\.map\(\(photo\) => photo\.uri\), index\)/,
);

console.log('submission pinch and fullscreen media zoom checks passed');
