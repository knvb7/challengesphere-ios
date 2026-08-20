import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CommonActions, TabRouter } from '@react-navigation/routers';

const layoutSource = fs.readFileSync(
  new URL('../app/(tabs)/_layout.tsx', import.meta.url),
  'utf8',
);
const tabButtonSource = fs.readFileSync(
  new URL('../components/HapticTab.tsx', import.meta.url),
  'utf8',
);
const instantTabSceneSource = fs.readFileSync(
  new URL('../components/navigation/InstantTabScene.tsx', import.meta.url),
  'utf8',
);
const createTabSource = fs.readFileSync(new URL('../app/(tabs)/create.tsx', import.meta.url), 'utf8');
const exploreTabSource = fs.readFileSync(new URL('../app/(tabs)/global.tsx', import.meta.url), 'utf8');
const challengeTileSource = fs.readFileSync(
  new URL('../components/challenges/ChallengeTileSubmissionBack.tsx', import.meta.url),
  'utf8',
);
const galleryCardSources = [
  'GlobalChallengeGalleryCard',
  'MyChallengeGalleryCard',
  'ProfileChallengeGalleryCard',
].map((name) => ({
  name,
  source: fs.readFileSync(
    new URL(`../components/challenges/${name}.tsx`, import.meta.url),
    'utf8',
  ),
}));
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

assert.match(
  layoutSource,
  /import\s*\{\s*HapticTab\s*\}\s*from\s*['"]@\/components\/HapticTab['"]/,
  'bottom tabs should use the shared immediate-feedback button',
);

assert.match(
  layoutSource,
  /lazy:\s*true/,
  'data-heavy tab content should remain lazy',
);

assert.doesNotMatch(
  layoutSource,
  /lazy:\s*false/,
  'bottom tabs must not eagerly mount every data-heavy screen',
);

assert.match(
  layoutSource,
  /freezeOnBlur:\s*true/,
  'inactive tabs should be frozen so media and query updates cannot block tab presses',
);

assert.doesNotMatch(
  layoutSource,
  /freezeOnBlur:\s*false/,
  'visited inactive tabs must not keep competing for the JavaScript thread',
);

assert.match(
  layoutSource,
  /detachInactiveScreens=\{true\}/,
  'inactive native scenes should detach so visited tabs do not accumulate drawing work',
);

assert.doesNotMatch(
  layoutSource,
  /detachInactiveScreens=\{false\}/,
  'visited data-heavy tabs must not all remain attached',
);

assert.match(
  layoutSource,
  /animation:\s*['"]none['"]/,
  'bottom tab switches should not wait on transition animations',
);

assert.match(
  tabButtonSource,
  /const activateTab = \(\) => \{[\s\S]*?navigation\.getState\(\)[\s\S]*?state\.routes\.find\(\(candidate\) => candidate\.name === routeName\)[\s\S]*?navigation\.emit\([\s\S]*?type: ['"]tabPress['"][\s\S]*?target: targetRoute\.key[\s\S]*?tabPressEvent\.defaultPrevented[\s\S]*?state\.routes\[state\.index\]\?\.key === targetRoute\.key[\s\S]*?CommonActions\.navigate\(targetRoute\.name, targetRoute\.params\)/,
  'tab activation should emit once and dispatch from live navigator state',
);

assert.doesNotMatch(
  tabButtonSource,
  /useRoute/,
  'a shared tab button must not infer its destination from ambient route context',
);

assert.match(
  tabButtonSource,
  /onPressIn=\{\(ev\) => \{[\s\S]*?Platform\.OS !== ['"]web['"][\s\S]*?clearTimeout\(resetHandledRef\.current\)[\s\S]*?if \(!handledOnPressInRef\.current\)[\s\S]*?handledOnPressInRef\.current = activateTab\(\)[\s\S]*?hapticFeedback\.tabSwitch\(\)[\s\S]*?props\.onPressIn\?\.\(ev\)/,
  'native tabs should activate on touch-down before waiting for release',
);

assert.match(
  tabButtonSource,
  /onPress=\{\(ev\) => \{[\s\S]*?handledOnPressInRef\.current[\s\S]*?handledOnPressInRef\.current = false;[\s\S]*?return;[\s\S]*?if \(!activateTab\(\)\) props\.onPress\?\.\(ev\)/,
  'release should consume native press-in activation while retaining accessibility fallback',
);

assert.match(
  tabButtonSource,
  /Platform\.OS === ['"]web['"][\s\S]*?if \(!activateTab\(\)\) props\.onPress\?\.\(ev\)/,
  'web and keyboard activation should also resolve the destination from live state',
);

assert.match(
  layoutSource,
  /import InstantTabScene[\s\S]*?renderTabScreenLayout[\s\S]*?<InstantTabScene routeName=\{route\.name\}>\{children\}<\/InstantTabScene>[\s\S]*?screenLayout=\{renderTabScreenLayout\}/,
  'each tab scene should be wrapped in its route-specific instant skeleton gate',
);

assert.doesNotMatch(
  instantTabSceneSource,
  /InteractionManager/,
  'tab content must not wait behind an unbounded interaction queue',
);

assert.match(
  instantTabSceneSource,
  /requestAnimationFrame\(\(\) => \{[\s\S]*?requestAnimationFrame\(\(\) => \{/,
  'heavy content should wait until the destination skeleton has painted',
);

assert.match(
  instantTabSceneSource,
  /revealAttemptRef[\s\S]*?cancelled = true[\s\S]*?revealAttemptRef\.current \+= 1[\s\S]*?cancelAnimationFrame\(firstFrame\)[\s\S]*?cancelAnimationFrame\(secondFrame\)/,
  'blurred tab reveals should be canceled and invalidated',
);

assert.match(
  instantTabSceneSource,
  /startTransition\(\(\) => setCandidateEpoch\(attempt\)\)[\s\S]*?mountedRef\.current[\s\S]*?isFocused && candidateEpoch === revealAttemptRef\.current[\s\S]*?<TabSceneSkeleton routeName=\{routeName\}/,
  'only the latest focused reveal epoch may replace the skeleton',
);

assert.match(
  instantTabSceneSource,
  /ContentCommitBoundary onCommit=\{markContentCommitted\}[\s\S]*?useLayoutEffect\(onCommit, \[onCommit\]\)/,
  'successfully mounted tab content should remain ready on revisits',
);

assert.doesNotMatch(
  layoutSource,
  /screenListeners=|TabActions\.jumpTo|event\.preventDefault\(\)/,
  'the navigator must preserve normal tabPress and focused-tab reselect semantics',
);

assert.doesNotMatch(
  challengeTileSource,
  /Animated\.loop/,
  'challenge tiles must not start perpetual native animations that survive tab switches',
);

assert.match(
  createTabSource,
  /const shouldLoadInvitees = CURRENT_USER_ID > 0 && \(currentStep === 3 \|\| showInviteModal\);/,
  'Create should defer connection queries until the invite UI is needed',
);
assert.match(
  createTabSource,
  /useUserFollowers\([\s\S]*?shouldLoadInvitees\)[\s\S]*?useUserFollowing\([\s\S]*?shouldLoadInvitees\)/,
  'Create should gate both invitee queries during its initial tab mount',
);
assert.match(
  exploreTabSource,
  /useSuggestedUsers\([\s\S]*?searchMode === ['"]people['"] && peopleSearchQuery\.trim\(\)\.length === 0[\s\S]*?\)/,
  'Explore should not fetch people suggestions while its challenge results are visible',
);

for (const { name, source } of galleryCardSources) {
  const rendersSubmissionBack = /<ChallengeTileSubmissionBack/.test(source);

  if (rendersSubmissionBack) {
    assert.match(
      source,
      /if \(nextFlipped\) setBackLoadedForId\(challenge\.id\)/,
      `${name} should load its submission back only when the user first flips it`,
    );
    assert.match(
      source,
      /backLoadedForId === challenge\.id \? \([\s\S]*?<ChallengeTileSubmissionBack/,
      `${name} should not mount hidden submission images on its front face`,
    );
  }
}

const tabMetadata = [
  {
    screenName: 'challenges',
    routeName: 'challenges',
    renderer: 'renderChallengesTabButton',
    testId: 'challenges',
    label: 'Challenges',
  },
  {
    screenName: 'index',
    routeName: 'index',
    renderer: 'renderFriendsTabButton',
    testId: 'friends',
    label: 'Friends',
  },
  {
    screenName: 'create',
    routeName: 'create',
    renderer: 'renderCreateTabButton',
    testId: 'create',
    label: 'Create',
  },
  {
    screenName: 'global',
    routeName: 'global',
    renderer: 'renderExploreTabButton',
    testId: 'explore',
    label: 'Explore',
  },
  {
    screenName: 'profile',
    routeName: 'profile',
    renderer: 'renderProfileTabButton',
    testId: 'profile',
    label: 'Profile',
  },
];

for (const { screenName, routeName, renderer, testId, label } of tabMetadata) {
  assert.match(
    layoutSource,
    new RegExp(`const ${renderer} = \\(props:[\\s\\S]*?routeName=["']${routeName}["']`),
    `the ${label} button should be permanently bound to the ${routeName} route`,
  );
  assert.match(
    layoutSource,
    new RegExp(`name=["']${screenName}["'][\\s\\S]*?tabBarButton: ${renderer}[\\s\\S]*?tabBarAccessibilityLabel: ["']${label} tab["'][\\s\\S]*?tabBarButtonTestID: ["']bottom-tab-${testId}["']`),
    `the ${label} tab should expose stable accessibility and automation identifiers`,
  );
}

const shellMetadata = [
  ['challenges', 'Challenges', 'challenges'],
  ['index', 'Friends', 'friends'],
  ['create', 'Create a challenge', 'create'],
  ['global', 'Explore', 'explore'],
  ['profile', 'Profile', 'profile'],
];

for (const [routeName, title, testId] of shellMetadata) {
  assert.match(
    instantTabSceneSource,
    new RegExp(`${routeName}: \\{ title: ["']${title}["'][\\s\\S]*?testId: ["']${testId}["'] \\}`),
    `the ${routeName} scene should have a route-specific skeleton shell`,
  );
}

const routeNames = ['challenges', 'index', 'create', 'global', 'profile'];
const routerOptions = {
  routeNames,
  routeParamList: Object.fromEntries(routeNames.map((routeName) => [routeName, undefined])),
  routeGetIdList: Object.fromEntries(routeNames.map((routeName) => [routeName, undefined])),
};
const tabRouter = TabRouter({ initialRouteName: 'challenges' });
const initialTabState = tabRouter.getInitialState(routerOptions);

const dispatchRoute = (state, routeName) => {
  const nextState = tabRouter.getStateForAction(state, CommonActions.navigate(routeName), routerOptions);
  assert.ok(nextState, `the ${routeName} tab action should be handled`);
  return nextState;
};

// Model the stock callback's immutable focus snapshot for A -> B -> A. The
// second press is lost even though the live state has already moved to B.
const renderedFocused = initialTabState.routes.map((_, index) => index === initialTabState.index);
let stockState = initialTabState;
stockState = dispatchRoute(stockState, 'index');
if (!renderedFocused[0]) stockState = dispatchRoute(stockState, 'challenges');

assert.equal(
  stockState.routes[stockState.index]?.name,
  'index',
  'the stale render-time focus model should reproduce the dropped return tap',
);

// The custom button reads the live state for each completed press, so the
// identical sequence ends on the last requested route without a Profile tap.
let liveState = initialTabState;
liveState = dispatchRoute(liveState, 'index');
if (liveState.routes[liveState.index]?.name !== 'challenges') {
  liveState = dispatchRoute(liveState, 'challenges');
}

assert.equal(
  liveState.routes[liveState.index]?.name,
  'challenges',
  'live focus checks should make the final rapid tab press win',
);

class SkeletonGateModel {
  constructor(name, frames) {
    this.name = name;
    this.frames = frames;
    this.focused = false;
    this.mounted = false;
    this.attempt = 0;
    this.candidate = null;
  }

  focus() {
    this.focused = true;
    if (this.mounted) return;
    const attempt = ++this.attempt;
    let cancelled = false;
    this.cancel = () => {
      cancelled = true;
      if (this.attempt === attempt) this.attempt += 1;
    };
    this.frames.push(() => {
      if (cancelled || this.attempt !== attempt) return;
      this.frames.push(() => {
        if (!cancelled && this.attempt === attempt) this.candidate = attempt;
      });
    });
  }

  blur() {
    this.focused = false;
    this.cancel?.();
  }

  get view() {
    return this.mounted || (this.focused && this.candidate === this.attempt)
      ? `content:${this.name}`
      : `skeleton:${this.name}`;
  }

  commit() {
    if (this.view.startsWith('content:')) this.mounted = true;
  }
}

const frameQueue = [];
const sceneModels = Object.fromEntries(
  ['index', 'global', 'create'].map((name) => [name, new SkeletonGateModel(name, frameQueue)]),
);

let sceneState = initialTabState;
const focusScene = (routeName) => {
  const currentRouteName = sceneState.routes[sceneState.index]?.name;
  sceneModels[currentRouteName]?.blur();
  sceneState = dispatchRoute(sceneState, routeName);
  sceneModels[routeName]?.focus();
  assert.equal(sceneState.routes[sceneState.index]?.name, routeName);
};

focusScene('index');
assert.equal(sceneModels.index.view, 'skeleton:index');

// Let the first tab schedule its reveal, then abandon it before the second
// frame. This is the race that previously let stale heavy content win.
frameQueue.shift()?.();
focusScene('global');
assert.equal(sceneModels.global.view, 'skeleton:global');

const abandonedFrameBatch = frameQueue.splice(0);
abandonedFrameBatch.forEach((callback) => callback());
focusScene('create');
assert.equal(sceneModels.create.view, 'skeleton:create');

while (frameQueue.length > 0) {
  const frame = frameQueue.splice(0);
  frame.forEach((callback) => callback());
}

assert.equal(sceneModels.index.view, 'skeleton:index');
assert.equal(sceneModels.global.view, 'skeleton:global');
assert.equal(sceneModels.create.view, 'content:create');
sceneModels.create.commit();
sceneModels.create.blur();
assert.equal(sceneModels.create.view, 'content:create', 'committed scenes should stay mounted');

assert.equal(
  packageJson.scripts['test:tabs'],
  'node ./scripts/test-bottom-tabs-eager-mount.mjs',
  'the focused tab regression should be available from npm',
);

console.log('bottom tab responsiveness checks passed');
