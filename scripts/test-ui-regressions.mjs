import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function loadTsModule(relativePath) {
  const filePath = path.join(root, relativePath);
  const source = readText(relativePath);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;

  const module = { exports: {} };
  const moduleRequire = createRequire(filePath);
  const localRequire = (specifier) => {
    if (specifier.startsWith('.')) {
      const basePath = path.resolve(path.dirname(filePath), specifier);
      for (const extension of ['.ts', '.tsx']) {
        const candidate = `${basePath}${extension}`;
        if (fs.existsSync(candidate)) {
          return loadTsModule(path.relative(root, candidate));
        }
      }
    }

    return moduleRequire(specifier);
  };

  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: localRequire,
  }, { filename: filePath });
  return module.exports;
}

const duration = loadTsModule('utils/challengeDuration.ts');

const dateOfBirth = loadTsModule('utils/dateOfBirth.ts');
assert.equal(dateOfBirth.calculateAge('2000-06-28', new Date(2026, 5, 28)), 26);
assert.equal(dateOfBirth.calculateAge('2000-06-29', new Date(2026, 5, 28)), 25);
assert.equal(dateOfBirth.calculateAge('', new Date()), null);
assert.equal(dateOfBirth.isSelectableDate('2999-01-01', new Date(2026, 5, 28)), false);

assert.equal(duration.parseDurationToDays('1 Day'), 1);
assert.equal(duration.parseDurationToDays('3 Days'), 3);
assert.equal(duration.parseDurationToDays('1 Week'), 7);
assert.equal(duration.parseDurationToDays('2 Weeks'), 14);
assert.equal(duration.parseDurationToDays('3 Weeks'), 21);
assert.equal(duration.parseDurationToDays('1 Month'), 30);
assert.equal(duration.parseDurationToDays('2 Months'), 60);
assert.equal(duration.parseDurationToDays('3 Months'), 90);
assert.equal(duration.parseDurationToDays('6 months'), 180);
assert.equal(duration.parseDurationToDays('1 year'), 365);
assert.equal(duration.parseDurationToDays('60 Days'), 60);
assert.equal(duration.getDurationLabel(60), '2 Months');
assert.equal(duration.getDurationLabel(180), '6 Months');
assert.equal(duration.getDurationLabel(365), '1 Year');

const tabBar = loadTsModule('utils/tabBarMetrics.ts');

const noInsetMetrics = tabBar.getTabBarMetrics(0);
assert.equal(noInsetMetrics.height, 58);
assert.equal(noInsetMetrics.paddingBottom, 0);

const bottomInsetMetrics = tabBar.getTabBarMetrics(24);
assert.equal(bottomInsetMetrics.height, 82);
assert.equal(bottomInsetMetrics.paddingBottom, 24);

const submissionStats = loadTsModule('utils/challengeSubmissionStats.ts');

assert.equal(
  submissionStats.formatSubmissionDaysValue(
    [{ dayNumber: 1 }, { dayNumber: 2 }],
    90,
  ),
  '2/90',
);
assert.equal(
  submissionStats.formatSubmissionDaysValue(
    [{ dayNumber: 1 }, { dayNumber: 1 }, { dayNumber: 0 }, { dayNumber: 91 }],
    90,
  ),
  '1/90',
);

const apiPage = loadTsModule('utils/apiPage.ts');
const normalizedGloriesPage = apiPage.normalizeSpringPage({
  content: [
    {
      id: 7,
      submissionId: 6,
      userId: 3,
      username: 'mihir_dalal_f5379',
      profilePicUrl: null,
      bio: null,
    },
  ],
  page: {
    size: 50,
    number: 0,
    totalElements: 1,
    totalPages: 1,
  },
});
assert.equal(normalizedGloriesPage.totalElements, 1);
assert.equal(normalizedGloriesPage.last, true);
assert.equal(normalizedGloriesPage.number, 0);
assert.equal(normalizedGloriesPage.content[0].username, 'mihir_dalal_f5379');

assert.equal(
  fs.existsSync(path.join(root, 'utils/submissionMedia.ts')),
  true,
  'submission media normalization utility should exist',
);
const submissionMedia = loadTsModule('utils/submissionMedia.ts');
assert.deepEqual(
  Array.from(submissionMedia.parseSubmissionMediaUrls([' first.jpg ', '', 'second.jpg'])),
  ['first.jpg', 'second.jpg'],
);
assert.deepEqual(
  Array.from(submissionMedia.parseSubmissionMediaUrls('["first.jpg", "second.jpg"]')),
  ['first.jpg', 'second.jpg'],
);
assert.deepEqual(
  Array.from(submissionMedia.parseSubmissionMediaUrls('first.jpg, second.jpg')),
  ['first.jpg', 'second.jpg'],
);
assert.deepEqual(Array.from(submissionMedia.parseSubmissionMediaUrls(' single.jpg ')), ['single.jpg']);
assert.deepEqual(Array.from(submissionMedia.parseSubmissionMediaUrls(undefined)), []);

const submissionDetail = loadTsModule('utils/submissionDetail.ts');
const hydratedDetail = submissionDetail.buildSubmissionDetailData(
  {
    id: '9',
    submissionId: '9',
    photoUrl: 'route-first.jpg',
    mediaUrls: '["route-first.jpg", "route-second.jpg"]',
    challengeSummary: 'Route caption',
    userId: '4',
    userName: '@route_user',
    userPhoto: 'route-avatar.jpg',
    challengeTitle: 'Route Challenge',
    genuineCount: '1',
    commentCount: '2',
  },
  {
    submission: {
      id: 9,
      userId: 7,
      challengeId: 5,
      dayNumber: 3,
      description: 'Fetched caption',
      mediaUrls: '["fetched-first.jpg", "fetched-second.jpg"]',
      submissionTime: '2026-05-28T00:00:00Z',
      gloriesCount: 11,
      commentsCount: 6,
    },
    ownerUser: {
      username: 'alice',
      profilePicUrl: 'fetched-avatar.jpg',
    },
    challengeTitle: 'Fetched Challenge',
  },
);
assert.deepEqual(Array.from(hydratedDetail.mediaUrls), ['fetched-first.jpg', 'fetched-second.jpg']);
assert.equal(hydratedDetail.description, 'Fetched caption');
assert.equal(hydratedDetail.userName, '@alice');
assert.equal(hydratedDetail.userPhoto, 'fetched-avatar.jpg');
assert.equal(hydratedDetail.challengeTitle, 'Fetched Challenge');
assert.equal(hydratedDetail.submissionTime, '2026-05-28T00:00:00Z');
assert.equal(hydratedDetail.genuineCount, 11);
assert.equal(hydratedDetail.commentCount, 6);

const routeOnlyDetail = submissionDetail.buildSubmissionDetailData({
  mediaUrls: '["route-first.jpg", "route-second.jpg"]',
  challengeSummary: 'Route-only caption',
  userName: '@route_user',
  userPhoto: 'route-avatar.jpg',
  submissionTime: '2026-05-27T00:00:00Z',
});
assert.deepEqual(Array.from(routeOnlyDetail.mediaUrls), ['route-first.jpg', 'route-second.jpg']);
assert.equal(routeOnlyDetail.description, 'Route-only caption');
assert.equal(routeOnlyDetail.userPhoto, 'route-avatar.jpg');
assert.equal(routeOnlyDetail.submissionTime, '2026-05-27T00:00:00Z');

const onboardingIntro = loadTsModule('utils/onboardingIntro.ts');
assert.equal(onboardingIntro.getOnboardingSeenKey(42), 'onboarding_intro_seen_user_42');
assert.equal(onboardingIntro.getOnboardingSeenKey(null), 'onboarding_intro_seen_device');
assert.equal(onboardingIntro.getProfileSetupPendingKey(42), 'profile_setup_pending_user_42');
assert.equal(onboardingIntro.getProfileSetupPendingKey(null), 'profile_setup_pending_device');
assert.equal(
  onboardingIntro.getAuthResponseUserId({ accessToken: 'token', tokenType: 'Bearer', user: { id: 7 } }),
  7,
);
assert.equal(
  onboardingIntro.getAuthResponseUserId({ accessToken: 'token', tokenType: 'Bearer', userId: '9' }),
  9,
);
assert.equal(
  onboardingIntro.getAuthResponseUserId({ accessToken: 'token', tokenType: 'Bearer', userId: 'bad-id' }),
  null,
);

const motivationalMessages = loadTsModule('utils/motivationalMessages.ts');
assert.equal(
  typeof motivationalMessages.shouldShowProfileMotivationalTransition,
  'function',
  'motivational messages should expose a deterministic profile transition frequency gate',
);
assert.equal(motivationalMessages.shouldShowProfileMotivationalTransition(0), true);
assert.equal(motivationalMessages.shouldShowProfileMotivationalTransition(0.049), true);
assert.equal(motivationalMessages.shouldShowProfileMotivationalTransition(0.05), false);
assert.equal(motivationalMessages.shouldShowProfileMotivationalTransition(0.999), false);

const challengeCategories = loadTsModule('utils/challengeCategories.ts');
assert.deepEqual(
  Array.from(challengeCategories.parseChallengeCategories('Coding,Health, Fitness')),
  ['Coding', 'Health', 'Fitness'],
);
assert.deepEqual(
  Array.from(challengeCategories.parseChallengeCategories('Coding, Coding, #Health')),
  ['Coding', 'Health'],
);
assert.deepEqual(
  Array.from(challengeCategories.parseChallengeCategories('')),
  ['General'],
);

const userDisplay = loadTsModule('utils/userDisplay.ts');
assert.equal(
  userDisplay.getUserDisplayName({ username: 'mihir', displayName: 'Mihir Dalal' }),
  'Mihir Dalal',
);
assert.equal(
  userDisplay.getUserDisplayName({ username: 'mihir', firstName: 'Mihir', lastName: 'Dalal' }),
  'Mihir Dalal',
);
assert.equal(
  userDisplay.getUserDisplayName({ username: 'mihir', emailId: 'mihir@example.com' }),
  '',
);
assert.equal(
  userDisplay.matchesUserSearch({ username: 'mihir', emailId: 'mihir@example.com' }, 'example.com'),
  false,
);
assert.equal(
  userDisplay.matchesUserSearch({ username: 'mihir', realName: 'Mihir Dalal' }, 'dalal'),
  true,
);

for (const file of ['app/followers.tsx', 'app/user-followers.tsx', 'app/select-users-to-invite.tsx']) {
  assert.doesNotMatch(
    readText(file),
    /<Text[^>]*>\{(?:user|item)\.emailId/,
    `${file} should not render follower/following email IDs`,
  );
}

for (const file of ['app/challenge-details.tsx', 'app/global-challenge-details.tsx', 'app/(tabs)/global.tsx']) {
  assert.doesNotMatch(
    readText(file),
    /\n\s+joinButtonText:\s*{[^}]*fontWeight:\s*['"]700['"]/,
    `${file} should keep Join button text on the standard app font weight`,
  );
}

const editChallengeSource = readText('app/edit-challenge.tsx');
assert.match(
  editChallengeSource,
  /categories: string\[\];/,
  'edit challenge should keep categories as a list, matching create challenge',
);
assert.match(
  editChallengeSource,
  /<View style=\{styles\.categoriesGrid\}>[\s\S]*allCategories\.map/,
  'edit challenge should use wrapped category chips instead of an overflowing dropdown',
);
assert.doesNotMatch(
  editChallengeSource,
  /renderPicker\(\s*'Category'/,
  'edit challenge category selection should not use the inline picker dropdown',
);
assert.match(
  editChallengeSource,
  /categories: selectedCategories\.join\(','\)/,
  'edit challenge should save selected categories as a comma-separated API value',
);
assert.match(
  editChallengeSource,
  /hashtags: selectedCategories\.map\(\(category\) => category\.toLowerCase\(\)\)\.join\(','\)/,
  'edit challenge should save hashtags for all selected categories',
);
assert.doesNotMatch(
  editChallengeSource,
  /mockFollowersAndFollowing|sampleUsers|Add Available Users|For demonstration/,
  'edit challenge invite users should not use hard-coded sample users',
);
assert.match(
  editChallengeSource,
  /useUserFollowers\(currentUserId, 1, 100, currentUserId, currentUserId > 0\)/,
  'edit challenge should load real followers for invite selection',
);
assert.match(
  editChallengeSource,
  /useUserFollowing\(currentUserId, 1, 100, currentUserId, currentUserId > 0\)/,
  'edit challenge should load real following users for invite selection',
);
assert.match(
  editChallengeSource,
  /<FlatList[\s\S]*data=\{filteredInviteUsers\}/,
  'edit challenge invite modal should render real invite candidates',
);
assert.match(
  editChallengeSource,
  /invitedUserIds: form\.invitedUsers\.map\(\(user\) => Number\(user\.id\)\)\.filter\(id => Number\.isFinite\(id\)\)/,
  'edit challenge should send selected invitees to the update API',
);

const onboardingScreenSource = readText('app/onboarding.tsx');
assert.match(onboardingScreenSource, /Community that builds together/);
assert.match(onboardingScreenSource, /Fun challenges/);
assert.match(onboardingScreenSource, /Challenge friends/);
assert.match(onboardingScreenSource, /Private rooms/);
assert.match(onboardingScreenSource, /markIntroCompletedForUser/);
assert.match(onboardingScreenSource, /SocialPhotoStack/);
assert.match(onboardingScreenSource, /CommunityCollage/);
assert.match(onboardingScreenSource, /ChallengeMixer/);
assert.match(onboardingScreenSource, /FriendChallengeDuel/);
assert.match(onboardingScreenSource, /PrizePodium/);
assert.match(onboardingScreenSource, /PrivateRoomPreview/);
assert.match(onboardingScreenSource, /case 'community'/);
assert.match(onboardingScreenSource, /case 'fun'/);
assert.match(onboardingScreenSource, /case 'friends'/);
assert.match(onboardingScreenSource, /case 'prizes'/);
assert.match(onboardingScreenSource, /case 'private'/);
assert.match(onboardingScreenSource, /images\.unsplash\.com/);
assert.match(onboardingScreenSource, /Fitness/);
assert.match(onboardingScreenSource, /Coding/);
assert.match(onboardingScreenSource, /Sports/);
assert.match(onboardingScreenSource, /Cooking/);
assert.match(onboardingScreenSource, /Reading/);
assert.doesNotMatch(onboardingScreenSource, /user-female-1\.png/);
assert.doesNotMatch(onboardingScreenSource, /user-male-1\.png/);
assert.doesNotMatch(onboardingScreenSource, /motionTrack/);
assert.doesNotMatch(onboardingScreenSource, /sweepRail/);
assert.match(onboardingScreenSource, /useLocalSearchParams/);
assert.match(onboardingScreenSource, /shouldReplayIntro/);
assert.match(onboardingScreenSource, /completed && !shouldReplayIntro/);
assert.match(onboardingScreenSource, /getPostIntroRouteForUser/);
assert.match(onboardingScreenSource, /fontWeight:\s*'600'/);
assert.match(onboardingScreenSource, /fontWeight:\s*'500'/);
assert.doesNotMatch(onboardingScreenSource, /fontWeight:\s*'(?:700|800|900)'/);

const appIndexSource = readText('app/index.tsx');
assert.match(appIndexSource, /getStartupRouteForUser/);
assert.match(appIndexSource, /\/onboarding/);

const onboardingServiceSource = readText('services/onboardingService.ts');
assert.match(onboardingServiceSource, /authData\.isNewUser/);
assert.match(onboardingServiceSource, /markProfileSetupPendingForUser/);
assert.match(onboardingServiceSource, /completeProfileSetupForUser/);
assert.match(onboardingServiceSource, /getPostIntroRouteForUser/);
assert.match(onboardingServiceSource, /\/profile-setup/);

const rootLayoutSource = readText('app/_layout.tsx');
assert.match(rootLayoutSource, /<Stack\.Screen name="profile-setup"/);
assert.match(
  rootLayoutSource,
  /<Stack\.Screen name="leaderboard"/,
  'the leaderboard route should be registered as an authenticated stack screen',
);
assert.match(
  rootLayoutSource,
  /<Stack\.Screen name="global-submissions"/,
  'global submissions should be registered as an authenticated stack screen',
);
assert.match(
  rootLayoutSource,
  /import\s*\{\s*SafeAreaProvider\s*\}\s*from 'react-native-safe-area-context';/,
  'root layout should import SafeAreaProvider from react-native-safe-area-context',
);
assert.match(
  rootLayoutSource,
  /<GestureHandlerRootView[\s\S]*<SafeAreaProvider>[\s\S]*<\/SafeAreaProvider>[\s\S]*<\/GestureHandlerRootView>/,
  'root layout should wrap the app with SafeAreaProvider',
);

const settingsSource = readText('app/settings.tsx');
assert.match(settingsSource, /What is this app for\?/);
assert.match(settingsSource, /pathname:\s*'\/onboarding'/);
assert.match(settingsSource, /replay:\s*'1'/);
assert.match(settingsSource, /returnTo:\s*'\/settings'/);

const createChallengeSource = readText('app/(tabs)/create.tsx');
assert.match(
  createChallengeSource,
  /\/\* Invite Friends Modal \*\/[\s\S]*<Modal[\s\S]*presentationStyle="pageSheet"[\s\S]*>\s*<SafeAreaView style=\{styles\.modalContainer\} edges=\{\['top', 'bottom'\]\}>/,
  'create challenge invite friends modal should render inside a top and bottom SafeAreaView',
);
assert.match(
  createChallengeSource,
  /const createSteps = \[[\s\S]*Idea[\s\S]*Format[\s\S]*Look[\s\S]*Audience[\s\S]*\] as const;/,
  'create challenge should define a four-step wizard flow',
);
assert.match(
  createChallengeSource,
  /const \[currentStep, setCurrentStep\] = useState\(0\);/,
  'create challenge should track the active wizard step',
);
assert.match(
  createChallengeSource,
  /const goToNextStep = \(\) => \{[\s\S]*validateCurrentStep\(\)[\s\S]*setCurrentStep/,
  'create challenge should validate the current step before moving forward',
);
assert.match(
  createChallengeSource,
  /currentStep === 0[\s\S]*Challenge Title[\s\S]*currentStep === 1[\s\S]*Challenge Type[\s\S]*currentStep === 2[\s\S]*Challenge Media[\s\S]*currentStep === 3[\s\S]*Challenge Visibility/,
  'create challenge fields should be grouped into progressive wizard screens',
);
assert.match(
  createChallengeSource,
  /currentStep < createSteps\.length - 1[\s\S]*Next[\s\S]*currentStep === createSteps\.length - 1[\s\S]*handleCreateChallenge/,
  'create challenge should show Next before the final Create Challenge action',
);

const commentAndCountSource = readText('components/common/CommentAndCount.tsx');
const feedHookSource = readText('hooks/useFeed.ts');
assert.match(
  commentAndCountSource,
  /import\s*\{\s*SafeAreaView,\s*useSafeAreaInsets\s*\}\s*from 'react-native-safe-area-context';/,
  'comment composer should import stable safe-area metrics',
);
assert.doesNotMatch(
  commentAndCountSource,
  /useKeyboardVisibility|isKeyboardVisible/,
  'comment composer should not switch safe-area geometry while the keyboard animates',
);
assert.match(
  commentAndCountSource,
  /const \{ bottom: bottomInset \} = useSafeAreaInsets\(\);[\s\S]*<KeyboardAvoidingView[\s\S]*keyboardVerticalOffset=\{-bottomInset\}[\s\S]*<SafeAreaView[\s\S]*style=\{styles\.modalContent\}[\s\S]*edges=\{\['bottom'\]\}[\s\S]*>[\s\S]*<\/SafeAreaView>[\s\S]*<\/KeyboardAvoidingView>/,
  'comment composer modal should keep stable bottom safe-area padding and compensate it during keyboard avoidance',
);
assert.match(
  commentAndCountSource,
  /modalContent:[\s\S]*height: '80%',/,
  'comment composer modal should not resize as a posted comment refreshes the list',
);
assert.match(
  commentAndCountSource,
  /<FlatList[\s\S]*ListEmptyComponent=\{[\s\S]*No comments yet[\s\S]*keyboardShouldPersistTaps="handled"/,
  'comment composer should not swap between empty and populated layout trees after posting',
);
assert.doesNotMatch(
  commentAndCountSource,
  /contentContainerStyle=\{comments\.length === 0 \?/,
  'comment composer should not switch list container geometry after the first posted comment arrives',
);
assert.match(
  commentAndCountSource,
  /contentContainerStyle=\{styles\.commentListContent\}/,
  'comment composer should keep stable list container geometry while comments refresh',
);
assert.match(
  commentAndCountSource,
  /postButton:[\s\S]*minWidth:\s*\d+,[\s\S]*height:\s*\d+,[\s\S]*alignItems:\s*'center',[\s\S]*justifyContent:\s*'center',/,
  'comment post button should keep stable dimensions when swapping text for the loading spinner',
);
assert.match(
  commentAndCountSource,
  /const content = newCommentRef\.current\.trim\(\);[\s\S]*!addCommentMutation\.isPending[\s\S]*content,[\s\S]*onCommentSubmit\?\.\(content\)/,
  'comment composer should submit one captured draft while a comment mutation is pending',
);
assert.match(
  feedHookSource,
  /onSuccess:\s*\(createdComment,\s*\{\s*submissionId[\s\S]*\}\)[\s\S]*queryClient\.setQueriesData<PageComment>[\s\S]*content:\s*\[commentForCache,\s*\.\.\.previous\.content\][\s\S]*queryClient\.invalidateQueries/,
  'posting a comment should update the active comments cache before refetching so the sheet does not visually bounce',
);

const challengeSubmissionsSource = readText('app/challenge-submissions.tsx');
const photoDetailsDeleteSource = readText('app/photo-details.tsx');
assert.doesNotMatch(
  challengeSubmissionsSource,
  /handleDeleteSubmission|deleteCandidate|cardDeleteButton/,
  'challenge submission cards should not expose deletion',
);
assert.match(
  photoDetailsDeleteSource,
  /const isOwnSubmission = ownerUserId > 0 && ownerUserId === currentUserId/,
  'opened post options should be restricted to the submission owner',
);
assert.match(
  photoDetailsDeleteSource,
  /rightAction=\{isOwnSubmission \?[\s\S]*accessibilityLabel="Post options"[\s\S]*ellipsis-horizontal/,
  'the opened owner post should place its options menu in the header',
);
assert.match(
  photoDetailsDeleteSource,
  /visible=\{deleteConfirmationVisible\}[\s\S]*Delete post\?[\s\S]*deleteSubmissionMutation\.isPending/,
  'post deletion should use a custom confirmation modal that prevents repeat actions',
);

const challengeCreatedSource = readText('app/challenge-created.tsx');
assert.match(
  challengeCreatedSource,
  /parseChallengeCategories\(challengeDetails\.category\)\.map/,
  'created challenge screen should render category values as individual pills',
);
assert.doesNotMatch(
  challengeCreatedSource,
  /<Text style=\{styles\.chipText\}>\{challengeDetails\.category\}<\/Text>/,
  'created challenge screen should not render comma-separated categories in one chip',
);

assert.match(
  challengeCreatedSource,
  /Public Discovery Enabled[\s\S]*PublicChallengeBroadcastAnimation[\s\S]*publicStage/,
  'created challenge screen should show a public discovery reveal for public challenges',
);
assert.match(
  challengeCreatedSource,
  /Private Stage Secured[\s\S]*privateSecureState[\s\S]*Invitation access secured/,
  'created challenge screen should show a static secure state for private challenges',
);
assert.doesNotMatch(
  challengeCreatedSource,
  /curtainPanel|curtainJoin|revealProgress/,
  'private challenge creation should not run a reveal animation',
);

const challengeDetailsSource = readText('app/challenge-details.tsx');
const challengeDetailsOverviewSource = readText('components/common/ChallengeDetailsOverview.tsx');
assert.match(
  challengeDetailsSource,
  /<ChallengeDetailsOverview/,
  'challenge details should use the shared approved overview',
);

const globalChallengeDetailsSource = readText('app/global-challenge-details.tsx');
assert.match(
  globalChallengeDetailsSource,
  /<ChallengeDetailsOverview/,
  'global challenge details should use the same shared approved overview',
);

assert.match(
  challengeDetailsOverviewSource,
  /parseChallengeCategories[\s\S]*label="Category"/,
  'the shared challenge overview should parse and display all category values',
);
assert.match(
  challengeDetailsOverviewSource,
  /label="Timeline"[\s\S]*formatDate\(startDate\)[\s\S]*formatDate\(endDate\)/,
  'the shared challenge overview should group the start and end dates in its expanded timeline row',
);
assert.match(
  challengeDetailsOverviewSource,
  /return leaderboardRows\.slice\(0, 5\)/,
  'the shared challenge overview should cap the leaderboard preview at five rows',
);
assert.match(
  challengeDetailsSource,
  /useUserChallengeSubmissions\(\s*CURRENT_USER_ID,\s*challengeId,\s*CURRENT_USER_ID,?\s*\)/,
  'challenge details should load the current user submissions before offering the daily upload action',
);
assert.match(
  challengeDetailsSource,
  /const hasSubmittedCurrentDay =[\s\S]*submission\.dayNumber === submissionDay/,
  'challenge details should derive whether the relevant challenge day already has a submission',
);
assert.match(
  challengeDetailsSource,
  /Today's progress is complete[\s\S]*Your effort is captured for today\. Take pride in showing up, then come back tomorrow and keep your streak alive\./,
  'challenge details should show the approved completion message instead of another upload action',
);
assert.doesNotMatch(
  challengeDetailsSource,
  /&apos;/,
  'challenge details text should use apostrophes that React Native renders as characters',
);

const loginRouteSource = readText('app/login.tsx');
assert.match(loginRouteSource, /getPostAuthRoute/);
assert.match(loginRouteSource, /router\.replace\(nextRoute(?:\s+as\s+Href)?\)/);
assert.match(
  loginRouteSource,
  /import\s*\{\s*SafeAreaView\s*\}\s*from 'react-native-safe-area-context';/,
  'login screen should use safe-area-context SafeAreaView',
);
assert.doesNotMatch(
  loginRouteSource,
  /import\s*\{[\s\S]*?SafeAreaView[\s\S]*?\}\s*from 'react-native';/,
  'login screen should not use React Native SafeAreaView',
);
assert.match(
  loginRouteSource,
  /Continue with Google/,
  'login screen should expose Google sign in',
);
assert.match(
  loginRouteSource,
  /authService\.loginWithGoogle\(googleCredentials\)/,
  'login screen should authenticate only with verified Google credentials',
);
assert.doesNotMatch(
  loginRouteSource,
  /TextInput|Password|Create account|Email or username|authService\.login\(/,
  'login screen should not expose password authentication or account creation',
);

const stackRouteSafeAreaFiles = [
  'app/challenge-created.tsx',
  'app/challenge-details.tsx',
  'app/challenge-invitation.tsx',
  'app/challenge-submissions.tsx',
  'app/edit-challenge.tsx',
  'app/followers.tsx',
  'app/global-challenge-details.tsx',
  'app/global-submissions.tsx',
  'app/invitations.tsx',
  'app/photo-details.tsx',
  'app/select-users-to-invite.tsx',
  'app/settings.tsx',
  'app/user-challenges.tsx',
  'app/user-followers.tsx',
  'app/user-profile.tsx',
];

for (const file of stackRouteSafeAreaFiles) {
  assert.doesNotMatch(
    readText(file),
    /edges=\{\[["']top["']\]\}/,
    `${file} should not restrict stack route safe area to only the top edge`,
  );
}

assert.equal(
  fs.existsSync(path.join(root, 'app/profile-setup.tsx')),
  true,
  'new users should receive a required first profile setup screen',
);
const profileSetupSource = readText('app/profile-setup.tsx');
assert.match(profileSetupSource, /Claim your spot/);
assert.match(profileSetupSource, /Your move,[\s\S]*your story\./);
assert.match(profileSetupSource, /Create my profile/);
assert.doesNotMatch(profileSetupSource, /Skip for now/);
assert.match(profileSetupSource, /ALL FIELDS REQUIRED/);
assert.match(profileSetupSource, /YOUR NAME \*/);
assert.match(profileSetupSource, /USERNAME \*/);
assert.match(profileSetupSource, /A SHORT BIO \*/);
assert.match(profileSetupSource, /INTERESTS \*/);
assert.match(profileSetupSource, /BIRTHDAY AND AGE \*/);
assert.match(profileSetupSource, /GENDER \*/);
assert.match(profileSetupSource, /COUNTRY \*/);
assert.match(profileSetupSource, /if \(!localPhotoAsset\)/);
assert.match(profileSetupSource, /if \(!gender\)/);
assert.match(profileSetupSource, /if \(!trimmedCountry\)/);
assert.match(profileSetupSource, /uploadProfilePhotoFromImagePicker/);
assert.match(profileSetupSource, /useUpdateUser/);
assert.match(profileSetupSource, /completeProfileSetupForUser/);

const visibleUserScoreSources = [
  'screens/About.tsx',
  'screens/HelpCenter.tsx',
  'screens/Profile.tsx',
  'screens/EditProfile.tsx',
  'app/user-profile.tsx',
  'app/global-challenge-details.tsx',
  'app/challenge-details.tsx',
].map((file) => [file, readText(file)]);

for (const [file, source] of visibleUserScoreSources) {
  assert.doesNotMatch(
    source,
    /Genuinity\s+(?:Score|Points)|Score:\s*\{[^}]*genuin/i,
    `${file} should not show user genuinity score UI`,
  );
}

const genuinityAndCountSource = readText('components/common/GenuinityAndCount.tsx');
const gloriesModalSource = readText('components/common/GloriesModal.tsx');
assert.match(
  genuinityAndCountSource,
  /submissionId\?: number/,
  'shared glory action should accept a submissionId for opening the glories list',
);
assert.match(
  genuinityAndCountSource,
  /<GloriesModal[\s\S]*submissionId=\{submissionId\}[\s\S]*visible=\{gloriesModalVisible\}/,
  'shared glory action should render the glories modal for long-press visibility',
);
assert.match(
  genuinityAndCountSource,
  /colors=\{isGloried \? \['#2A210F', '#171109'\] : \['#1A1A1A', '#141414'\]\}/,
  'active glory button should use a darker selected background',
);
assert.match(
  genuinityAndCountSource,
  /unGloryButtonActive:[\s\S]*backgroundColor: '#170707'/,
  'active unglory button should use a darker selected background',
);
assert.match(
  gloriesModalSource,
  /import\s*\{\s*SafeAreaView\s*\}\s*from 'react-native-safe-area-context';/,
  'glories modal should import SafeAreaView from react-native-safe-area-context',
);
assert.match(
  gloriesModalSource,
  /<SafeAreaView\s+style=\{styles\.sheet\}\s+edges=\{\['bottom'\]\}>[\s\S]*<\/SafeAreaView>/,
  'glories modal sheet should render inside the bottom safe area',
);

const postActionSources = [
  readText('screens/Feed.tsx'),
  readText('app/photo-details.tsx'),
  readText('components/common/PhotoFeedItem.tsx'),
];

for (const source of postActionSources) {
  assert.match(
    source,
    /<GenuinityAndCount[\s\S]*submissionId=\{[^}]+\}/,
    'post glory action call sites should pass their submission id to the shared action component',
  );
}

const useFeedSource = readText('hooks/useFeed.ts');
assert.match(
  useFeedSource,
  /submissionOwnerUserId\?: number/,
  'optimistic glory hook should accept the submission owner id',
);
assert.match(
  useFeedSource,
  /initialIsUngloried = false/,
  'optimistic glory hook should accept an initial unglory state from the server',
);
assert.match(
  useFeedSource,
  /if \(submissionOwnerUserId === userId\)[\s\S]*showSmallPopup[\s\S]*return;[\s\S]*toggleUnglory\.mutate/,
  'own-submission unglory should show a small popup and return before mutating',
);
assert.match(
  useFeedSource,
  /useToggleGlory[\s\S]*queryClient\.invalidateQueries\(\{ queryKey: feedKeys\.lists\(\) \}\);/,
  'glory toggles should invalidate feed list queries so refreshed feed items keep the latest like state',
);
assert.match(
  useFeedSource,
  /useToggleGlory[\s\S]*queryClient\.invalidateQueries\(\{ queryKey: feedKeys\.gloryStatus\(submissionId, userId\) \}\);/,
  'glory toggles should invalidate full glory status queries',
);

const feedScreenSource = readText('screens/Feed.tsx');
assert.match(
  feedScreenSource,
  /<AvatarImage uri=\{item\.userProfilePicUrl\}/,
  'feed profile circles should reuse a stable cache key when signed image URLs rotate',
);
const avatarImageSource = readText('components/common/AvatarImage.tsx');
assert.match(
  avatarImageSource,
  /<ExpoImage[\s\S]*cachePolicy="memory-disk"/,
  'feed profile circles should use disk-backed expo image caching',
);
const leaderboardScreenSource = readText('app/leaderboard.tsx');
assert.match(
  leaderboardScreenSource,
  /createCachedRemoteImageSource\(item\.profilePictureUrl\)/,
  'leaderboard profile pictures should reuse a stable cache key when signed image URLs rotate',
);
assert.match(
  leaderboardScreenSource,
  /<ExpoImage[\s\S]*cachePolicy="memory-disk"/,
  'leaderboard profile pictures should use disk-backed expo image caching',
);
assert.match(
  challengeDetailsOverviewSource,
  /<AvatarImage[\s\S]*uri=\{url\}/,
  'shared challenge overview avatars should use the resilient shared avatar renderer',
);
assert.match(
  challengeDetailsOverviewSource,
  /<ExpoImage[\s\S]*cachePolicy="memory-disk"/,
  'shared challenge overview photos should use disk-backed expo image caching',
);
assert.match(
  useFeedSource,
  /useToggleUnglory[\s\S]*queryClient\.invalidateQueries\(\{ queryKey: feedKeys\.lists\(\) \}\);/,
  'unglory toggles should invalidate feed list queries because they can clear active glories',
);
assert.match(
  useFeedSource,
  /useToggleUnglory[\s\S]*queryClient\.invalidateQueries\(\{ queryKey: feedKeys\.gloryStatus\(submissionId, userId\) \}\);/,
  'unglory toggles should invalidate full glory status queries',
);
assert.match(
  readText('types/api.ts'),
  /isUngloriedByCurrentUser\?: boolean/,
  'feed items should carry whether the current user has ungloried the submission',
);
assert.match(
  readText('screens/Feed.tsx'),
  /initialIsUngloried: item\.isUngloriedByCurrentUser \?\? false/,
  'feed cards should initialize active unglory state from the feed response',
);

const ownSubmissionGuardSources = [
  readText('screens/Feed.tsx'),
  readText('app/photo-details.tsx'),
];

for (const source of ownSubmissionGuardSources) {
  assert.match(
    source,
    /submissionOwnerUserId|You can.?t unglory your own submission/,
    'post surfaces should either pass owner ids to the hook or block own-submission unglory locally',
  );
}

const profileSubmissionOverlaySources = [
  readText('screens/Profile.tsx'),
  readText('app/user-profile.tsx'),
];

for (const source of profileSubmissionOverlaySources) {
  assert.match(
    source,
    /buildSubmissionDetailRouteParams/,
    'profile submission grids should build the canonical submission detail route',
  );
  assert.doesNotMatch(
    source,
    /selectedSubmission/,
    'profile screens should not maintain a second submission detail renderer',
  );
  assert.match(
    source,
    /pathname: '\/photo-details'/,
    'profile submission grids should navigate to canonical submission details',
  );
  assert.doesNotMatch(
    source,
    /pathname: '\/global-challenge-details'/,
    'profile submission overlays should not navigate to the alternate global challenge page',
  );
}

const myChallengeCardSource = readText('components/common/ChallengeCard.tsx');
assert.match(
  myChallengeCardSource,
  /<Ionicons name="star" size=\{12\} color="#7A5100" \/>[\s\S]*creatorBadgePill:[\s\S]*backgroundColor: '#FFF1A8'[\s\S]*creatorBadgeText:[\s\S]*color: '#7A5100'/,
  'my challenges creator badge should stay readable in the compact challenge card treatment',
);
assert.match(
  myChallengeCardSource,
  /getChallengeFallbackPhotoSource\(challenge\)/,
  'shared challenge cards should choose a bundled fallback photo from challenge tags when no cover exists',
);
assert.doesNotMatch(
  myChallengeCardSource,
  /backgroundColor: '#2a2a2a' \}\]\} \/>/,
  'shared challenge cards should not render an empty gray image placeholder when no cover photo exists',
);
assert.match(
  myChallengeCardSource,
  /challenge\.image \? \{ uri: challenge\.image \} : fallbackPhotoSource/,
  'shared challenge cards should render either an uploaded photo or a tag-matched fallback photo',
);

const feedSource = readText('screens/Feed.tsx');
assert.match(
  feedSource,
  /const mediaUrls = parseSubmissionMediaUrls\(item\.mediaUrls\);[\s\S]*<SubmissionMediaCarousel[\s\S]*mediaUrls=\{mediaUrls\}[\s\S]*height=\{PHOTO_HEIGHT\}/,
  'feed posts should expose all normalized submission images through a manually swipeable carousel',
);
assert.doesNotMatch(
  feedSource,
  /const imageUrl = item\.mediaUrls\?\.\[0\]/,
  'feed posts should not discard every image after the first one',
);

const photoDetailsSource = readText('app/photo-details.tsx');
assert.match(
  photoDetailsSource,
  /useSubmission\(routeSubmissionId\)/,
  'photo details should fetch the canonical submission when opened from a tapped submission id',
);
assert.match(
  photoDetailsSource,
  /useUser\(ownerUserId, currentUserId\)/,
  'photo details should fetch the submission owner so the profile picture is available even when route params are sparse',
);
assert.match(
  photoDetailsSource,
  /const mediaUrls = photoData\.mediaUrls;[\s\S]*<SubmissionMediaCarousel[\s\S]*mediaUrls=\{mediaUrls\}[\s\S]*expandable/,
  'photo details should render all submission images in the shared fullscreen-enabled carousel',
);
assert.match(
  photoDetailsSource,
  /photoData\.description[\s\S]*styles\.description/,
  'photo details should render the submitted caption below the challenge summary',
);
assert.doesNotMatch(
  photoDetailsSource,
  /<PhotoFeedItem/,
  'photo details should not use the single-image PhotoFeedItem renderer',
);

for (const submissionListSource of [
  readText('app/challenge-submissions.tsx'),
  readText('app/global-submissions.tsx'),
]) {
  assert.match(
    submissionListSource,
    /buildSubmissionDetailRouteParams\(\{/,
    'submission list taps should use the canonical full submission route payload',
  );
}

const ownProfileSource = readText('screens/Profile.tsx');
assert.match(
  ownProfileSource,
  /import\s*\{\s*getRandomMotivationalMessage,\s*shouldShowProfileMotivationalTransition\s*\}\s*from '\.\.\/utils\/motivationalMessages';/,
  'own profile should import its motivational transition frequency gate',
);
assert.match(
  ownProfileSource,
  /if \(!user\?\.username \|\| !shouldShowProfileMotivationalTransition\(\)\)[\s\S]*return undefined;[\s\S]*setMotivationalMessage\(getRandomMotivationalMessage\(user\.username\)\)/,
  'own profile should only show the motivational transition after passing the one-in-twenty gate',
);
for (const joinTransitionSource of [
  readText('app/challenge-details.tsx'),
  readText('app/global-challenge-details.tsx'),
]) {
  assert.doesNotMatch(
    joinTransitionSource,
    /shouldShowProfileMotivationalTransition/,
    'challenge join transitions should not use the profile-only frequency gate',
  );
}

for (const source of profileSubmissionOverlaySources) {
  assert.match(
    source,
    /<SubmissionMediaCarousel[\s\S]*mediaUrls=\{mediaUrls\}[\s\S]*width=\{GRID_ITEM_SIZE\}[\s\S]*height=\{GRID_ITEM_SIZE\}[\s\S]*autoPlay/,
    'profile grid tiles should automatically cycle multi-image submissions',
  );
  assert.match(
    source,
    /<SubmissionMediaCarousel[\s\S]*mediaUrls=\{mediaUrls\}[\s\S]*width=\{GRID_ITEM_SIZE\}[\s\S]*height=\{GRID_ITEM_SIZE\}[\s\S]*autoPlay[\s\S]*autoPlayIntervalMs=\{2000\}/,
    'profile grid tiles should rotate multi-image submissions every two seconds',
  );
  assert.match(
    source,
    /<SubmissionMediaCarousel[\s\S]*width=\{GRID_ITEM_SIZE\}[\s\S]*height=\{GRID_ITEM_SIZE\}[\s\S]*contentFit="cover"/,
    'profile grid tiles should crop square thumbnails like Instagram',
  );
  assert.doesNotMatch(
    source,
    /<SubmissionMediaCarousel[\s\S]*width=\{GRID_ITEM_SIZE\}[\s\S]*height=\{GRID_ITEM_SIZE\}[\s\S]*containBackdrop/,
    'profile grid tiles should not render rectangular fitted-image backdrops',
  );
  assert.match(
    source,
    /gridItem:\s*{[\s\S]*width:\s*GRID_ITEM_SIZE,[\s\S]*height:\s*GRID_ITEM_SIZE,/,
    'profile submission cards should stay square instead of adding a rectangular footer',
  );
  assert.match(
    source,
    /submissionChallengeLabel:\s*{[\s\S]*position:\s*'absolute'[\s\S]*bottom:\s*0,/,
    'profile submission challenge labels should overlay inside the square tile',
  );
  assert.doesNotMatch(
    source,
    /height:\s*GRID_ITEM_SIZE\s*\+\s*GRID_FOOTER_HEIGHT/,
    'profile submission cards should not extend below the square image',
  );
}

const challengeServiceSource = readText('services/challengeService.ts');
assert.match(
  challengeServiceSource,
  /normalizeSubmissionsArray/,
  'submission response normalization should tolerate missing submissions arrays'
);
assert.match(
  challengeServiceSource,
  /Array\.isArray\(response\?\.submissions\)/,
  'submission response normalization should guard backend response shape before mapping'
);
assert.match(
  challengeServiceSource,
  /apiClient\.delete<DeleteSubmissionResponse>/,
  'delete submission should consume the backend delete response body'
);
assert.match(
  challengeServiceSource,
  /response\.data \|\| \{[\s\S]*success:\s*true[\s\S]*submissionId/,
  'delete submission should remain compatible with older 204 no-content backend responses'
);

const useChallengesSource = readText('hooks/useChallenges.ts');
assert.match(
  useChallengesSource,
  /Array\.isArray\(prev\?\.submissions\)/,
  'delete submission optimistic cache update should tolerate cached values without submissions'
);
assert.match(
  useChallengesSource,
  /totalCount:\s*Math\.max\(0,\s*\(prev\.totalCount\s*\?\?\s*currentSubmissions\.length\)/,
  'delete submission optimistic cache update should not assume totalCount exists'
);

console.log('ui regression checks passed');
