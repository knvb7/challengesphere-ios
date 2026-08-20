import assert from 'node:assert/strict';
import fs from 'node:fs';

const overviewSource = fs.readFileSync(
  'components/common/ChallengeDetailsOverview.tsx',
  'utf8',
);

assert.match(
  overviewSource,
  /<SubmissionMediaCarousel[\s\S]*mediaUrls=\{uploadedCoverPhotoUrls\}[\s\S]*autoPlay[\s\S]*contentFit="contain"/,
  'challenge details should auto-play every uploaded cover photo in a horizontal carousel',
);
assert.match(
  overviewSource,
  /uploadedCoverPhotoUrls\.length > 0 && heroWidth > 0/,
  'the carousel should render only after its responsive page width is measured',
);
assert.match(
  overviewSource,
  /onLayout=\{handleHeroLayout\}/,
  'challenge cover carousel pages should match the available hero width',
);

console.log('challenge cover carousel checks passed');
