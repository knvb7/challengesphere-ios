import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

const exploreSource = read('../app/(tabs)/global.tsx');
const challengesSource = read('../app/(tabs)/challenges.tsx');
const feedSource = read('../screens/Feed.tsx');
const profileSource = read('../screens/Profile.tsx');
const photoDetailsSource = read('../app/photo-details.tsx');
const mediaCarouselSource = read('../components/common/SubmissionMediaCarousel.tsx');
const rootLayoutSource = read('../app/_layout.tsx');
const userProfileSource = read('../app/user-profile.tsx');

assert.match(
  exploreSource,
  /<FlatList[\s\S]*?data=\{exploreListItems\}[\s\S]*?onEndReached=\{searchMode === ['"]challenges['"] \? loadMoreChallenges : undefined\}/,
  'Explore should use one virtualized list for its growing results',
);
assert.doesNotMatch(
  exploreSource,
  /<ScrollView[\s\S]*?<FlatList[\s\S]*?scrollEnabled=\{false\}/,
  'Explore must not disable virtualization by nesting a non-scrolling FlatList inside a ScrollView',
);

for (const [name, source] of [
  ['Explore', exploreSource],
  ['Challenges', challengesSource],
  ['Friends feed', feedSource],
]) {
  assert.match(source, /initialNumToRender=\{[34]\}/, `${name} should cap its initial render batch`);
  assert.match(source, /maxToRenderPerBatch=\{[34]\}/, `${name} should cap incremental render batches`);
  assert.match(source, /windowSize=\{5\}/, `${name} should keep a bounded render window`);
  assert.match(
    source,
    /removeClippedSubviews=\{Platform\.OS === ['"]android['"]\}/,
    `${name} should clip offscreen rows on Android`,
  );
}

assert.doesNotMatch(
  feedSource,
  /Dimensions\.get\(['"]window['"]\)/,
  'feed media sizing should respond to live viewport changes',
);
assert.match(
  feedSource,
  /useWindowDimensions\(\)[\s\S]*?getFeedMediaMetrics\(viewportWidth\)/,
  'feed media should derive bounded dimensions from the current viewport',
);
assert.doesNotMatch(
  profileSource,
  /Dimensions\.get\(['"]window['"]\)/,
  'profile tiles should respond to live viewport changes',
);
assert.doesNotMatch(
  profileSource,
  /<SubmissionMediaCarousel[\s\S]*?autoPlay/,
  'profile grid thumbnails should not run concurrent autoplay loops',
);
assert.match(
  mediaCarouselSource,
  /const pauseAutoplay = React\.useCallback\(\(\) => \{\s*if \(!autoPlay\) return;/,
  'media taps should not schedule autoplay state work when autoplay is disabled',
);
assert.match(
  mediaCarouselSource,
  /const resumeAutoplay = React\.useCallback\(\(\) => \{\s*if \(!autoPlay\) return;/,
  'non-autoplay media should not leave delayed resume timers behind',
);
assert.match(
  photoDetailsSource,
  /ownerUserId === currentUserId[\s\S]*?router\.navigate\(['"]\/\(tabs\)\/profile['"]\)/,
  'post details should return to the existing tab navigator for the owner profile',
);
assert.doesNotMatch(
  photoDetailsSource,
  /ownerUserId === currentUserId[\s\S]{0,120}?router\.push\(['"]\/\(tabs\)\/profile['"]\)/,
  'post details must not stack a duplicate tab navigator',
);
assert.match(
  rootLayoutSource,
  /<Stack[\s\S]*?screenOptions=\{\{[\s\S]*?freezeOnBlur:\s*true/,
  'the tab navigator should be frozen while a post detail screen covers it',
);
assert.match(
  feedSource,
  /mediaOverlayEnabled=\{visibleSubmissionIds\.has\(item\.item\.submissionId\)\}/,
  'feed pinch overlays should only stay mounted for genuinely visible posts',
);
assert.match(feedSource, /onViewableItemsChanged=\{onViewableItemsChanged\}/);
assert.match(
  feedSource,
  /useIsFocused\(\)[\s\S]*?if \(!isFocused\) \{\s*setVisibleSubmissionIds\(new Set\(\)\)/,
  'feed media overlays should be released when another tab or post covers the feed',
);
assert.match(
  mediaCarouselSource,
  /rootOverlayEnabled=\{rootOverlayEnabled && Math\.abs\(index - activeIndex\) <= 1\}/,
  'offscreen feed carousels should not retain root-level image clones',
);
assert.match(
  mediaCarouselSource,
  /mediaUrls\.length === 1[\s\S]*?renderMediaItem\(\{ item: mediaUrls\[0\], index: 0 \}\)/,
  'single-photo posts should not mount a nested FlatList',
);
assert.match(mediaCarouselSource, /initialNumToRender=\{1\}[\s\S]*?windowSize=\{3\}/);
assert.doesNotMatch(
  userProfileSource,
  /<SubmissionMediaCarousel[\s\S]*?autoPlay/,
  'other-user profile grids should not run one autoplay timer per submission',
);
for (const [name, source] of [
  ['Profile', profileSource],
  ['User profile', userProfileSource],
]) {
  assert.match(
    source,
    /mediaUrls=\{mediaUrls\.slice\(0, 1\)\}/,
    `${name} grids should mount one lightweight thumbnail per submission`,
  );
  assert.doesNotMatch(
    source,
    /onScroll=\{\(\{ nativeEvent \}\) => \{/,
    `${name} should not auto-append heavy grid pages during ordinary scrolling`,
  );
}

console.log('UI responsiveness checks passed.');
