import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = process.cwd();
const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

const introPath = 'components/StartupIntro.tsx';
const cleanLogoPath = 'assets/images/logo-mark-clean.png';
assert.equal(
  existsSync(path.join(root, introPath)),
  true,
  'StartupIntro component should exist'
);
assert.equal(
  existsSync(path.join(root, cleanLogoPath)),
  true,
  'StartupIntro should have a transparent logo mark asset without the app-icon box'
);

const indexSource = readText('app/index.tsx');
const introSource = readText(introPath);
const cleanLogo = PNG.sync.read(readFileSync(path.join(root, cleanLogoPath)));

assert.match(
  indexSource,
  /import StartupIntro from ['"]@\/components\/StartupIntro['"]/,
  'startup route should import the reusable premium intro component'
);
assert.match(
  indexSource,
  /return <StartupIntro \/>;/,
  'startup route should render StartupIntro while routing is resolving'
);
assert.doesNotMatch(
  indexSource,
  /<Text[\s\S]*challengesphere[\s\S]*<\/Text>/,
  'startup route should not render the old plain black text screen inline'
);
assert.match(
  introSource,
  /react-native-reanimated/,
  'StartupIntro should use Reanimated for native-friendly motion'
);
assert.match(
  introSource,
  /expo-linear-gradient/,
  'StartupIntro should use layered gradients for premium depth'
);
assert.match(
  introSource,
  /require\(['"]\.\.\/assets\/images\/logo-mark-clean\.png['"]\)/,
  'StartupIntro should use the transparent local logo mark asset'
);
assert.equal(
  cleanLogo.data[(Math.floor(cleanLogo.width / 2) * 4) + 3],
  0,
  'transparent logo mark should not keep the app-icon tile along the top edge'
);
assert.doesNotMatch(
  introSource,
  /FloatingSignal|SIGNALS|signalIcon|haloTick/,
  'StartupIntro should stay clean without floating signal boxes or orbit tick lines'
);
assert.doesNotMatch(
  introSource,
  /logoPlate|logoGradient/,
  'StartupIntro logo should not sit inside a visible box or gradient plate'
);
assert.doesNotMatch(
  introSource,
  /styles\.halo|haloSize|ringStyle/,
  'StartupIntro should not draw a circular halo around the logo'
);
assert.match(
  introSource,
  />challengesphere</,
  'StartupIntro should render the brand wordmark in lowercase'
);
assert.doesNotMatch(
  introSource,
  /real challenges, shared momentum/,
  'StartupIntro should not render the old supporting tagline'
);
assert.doesNotMatch(
  introSource,
  /progressTrack|progressShimmer|shimmer/,
  'StartupIntro should not render a loading bar'
);
assert.doesNotMatch(
  introSource,
  /https?:\/\//,
  'StartupIntro should not load remote images or assets'
);
assert.match(
  indexSource,
  /setTimeout\(\(\) => setMinimumIntroElapsed\(true\), 1000\)/,
  'startup routing should use the intended one-second minimum intro without an unbounded delay',
);

console.log('startup intro checks passed');
