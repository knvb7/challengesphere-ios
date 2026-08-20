import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sources = [
  readFileSync(new URL('../screens/Profile.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('../app/user-profile.tsx', import.meta.url), 'utf8'),
];

for (const source of sources) {
  assert.doesNotMatch(
    source,
    /Auto scroll|Pause automatic scrolling|isAutoScrolling|toggleAutoScroll|stopAutoScroll|AUTO_SCROLL_|autoScroll/,
    'profile screens should not restore the removed page-level auto-scroll controls',
  );
  assert.match(
    source,
    /<SubmissionMediaCarousel[\s\S]*mediaUrls=\{mediaUrls\}[\s\S]*autoPlay/,
    'multi-image profile posts should use the shared auto-playing media carousel',
  );
  assert.doesNotMatch(
    source,
    /mediaUrls\.slice\(0,\s*1\)/,
    'profile posts should not discard images after the first one',
  );
  assert.match(
    source,
    /const requestNextSubmissionsPage = useCallback[\s\S]*onPress=\{requestNextSubmissionsPage\}/,
    'profile submission pagination should retain its guarded load-more action',
  );
}

assert.match(sources[0], /LinearGradient/, 'challenge captions should use the approved legibility gradient');

console.log('profile submission carousel checks passed');
