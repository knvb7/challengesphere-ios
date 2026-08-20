import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const readSource = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');
const helperSource = readSource('utils/myChallengesPresentation.ts');
const compiledHelper = ts.transpileModule(helperSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const helperModule = { exports: {} };
new Function('exports', 'module', compiledHelper)(helperModule.exports, helperModule);

const { summarizeDailyCompletion } = helperModule.exports;

assert.equal(
  summarizeDailyCompletion([]),
  null,
  'zero due challenges must not create a vacuous completion celebration',
);
assert.equal(
  summarizeDailyCompletion([
    { isDueToday: true, statusReady: false, submittedToday: true },
  ]),
  null,
  'the banner must wait for authoritative submission status',
);
assert.equal(
  summarizeDailyCompletion([
    { isDueToday: true, statusReady: true, submittedToday: true },
    { isDueToday: true, statusReady: true, submittedToday: false },
  ]),
  null,
  'one pending check-in must keep the completion banner hidden',
);
assert.deepEqual(
  summarizeDailyCompletion([
    { isDueToday: true, statusReady: true, submittedToday: true },
    { isDueToday: false, statusReady: true, submittedToday: false },
    { isDueToday: true, statusReady: true, submittedToday: true },
  ]),
  { completedCount: 2 },
  'resolved lobby or otherwise not-due challenges must not block a real daily win',
);

const screenSource = readSource('app/(tabs)/challenges.tsx');
const bannerSource = readSource('components/challenges/DailyCompletionBanner.tsx');

assert.match(
  screenSource,
  /const activeChallengeIds = useMemo\([\s\S]*activeChallenges[\s\S]*useUserChallengeSubmissionStatuses\([\s\S]*activeChallengeIds/,
  'daily completion must use unfiltered active challenges, not visible filter results',
);
assert.match(
  screenSource,
  /challenge\.status === "active"[\s\S]*crewStatus\?\.data\?\.state === "ACTIVE"/,
  'only active and started private challenges should count as due today',
);
assert.match(
  screenSource,
  /!showingPast && dailyCompletionSummary[\s\S]*<DailyCompletionBanner/,
  'the initial active screen should render the banner only for a completed daily summary',
);
assert.match(bannerSource, /testID="daily-completion-banner"/);
assert.match(bannerSource, /All done for today/);
assert.match(bannerSource, /Enjoy the rest of your day\./);
assert.doesNotMatch(
  bannerSource,
  /LinearGradient|sparkles|ALL CLEAR|shadowOpacity/,
  'the completion banner should stay minimal and avoid decorative effects',
);
assert.match(
  bannerSource,
  /AccessibilityInfo\.isReduceMotionEnabled\(\)[\s\S]*entrance\.setValue\(1\)[\s\S]*checkScale\.setValue\(1\)/,
  'the entrance motion should respect the device reduced-motion setting',
);
assert.match(
  bannerSource,
  /<Animated\.View[\s\S]*style=\{\[styles\.container, animatedStyle\]\}/,
  'the banner should use a restrained animated entrance',
);
assert.match(
  bannerSource,
  /Animated\.spring\(checkScale,[\s\S]*bounciness: 7,[\s\S]*useNativeDriver: true/,
  'the completion check should use one small native-driven pop animation',
);
assert.match(bannerSource, /borderColor: '#32DB65'/);
assert.match(bannerSource, /backgroundColor: '#42E875'/);
assert.match(
  bannerSource,
  /accessibilityLabel=\{accessibilityLabel\}/,
  'the celebratory banner should have a concise screen-reader summary',
);
assert.match(bannerSource, /accessibilityLiveRegion="polite"/);

console.log('daily completion banner regression checks passed');
