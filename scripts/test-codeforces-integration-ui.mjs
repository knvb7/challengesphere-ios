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
    URLSearchParams,
  }, { filename: filePath });
  return module.exports;
}

const codeforces = loadTsModule('services/codeforcesService.ts');
const leetcode = loadTsModule('services/leetcodeService.ts');
const challengeIntegrations = loadTsModule('utils/challengeIntegrations.ts');
const integrationLocks = loadTsModule('utils/integrationLocks.ts');
const codeforcesSource = readText('services/codeforcesService.ts');
const leetcodeSource = readText('services/leetcodeService.ts');
const integrationDetailSource = readText('app/integration-detail.tsx');

assert.equal(codeforces.normalizeCodeforcesHandle('  @tourist  '), 'tourist');
assert.equal(codeforces.normalizeCodeforcesHandle(''), '');
assert.equal(codeforces.isAcceptedCodeforcesVerdict('OK'), true);
assert.equal(codeforces.isAcceptedCodeforcesVerdict('WRONG_ANSWER'), false);
assert.match(
  codeforcesSource,
  /const RECENT_SUBMISSIONS_LIMIT = 20;/,
  'Codeforces save-handle preview should fetch only the top 20 recent submissions'
);
assert.doesNotMatch(
  codeforcesSource,
  /RECENT_SUBMISSIONS_LIMIT = 1000/,
  'Codeforces save-handle preview should not request 1000 submissions'
);

const mappedSubmission = codeforces.mapCodeforcesSubmission({
  id: 123456,
  contestId: 4,
  creationTimeSeconds: 1700000000,
  programmingLanguage: 'GNU C++17',
  verdict: 'OK',
  problem: {
    contestId: 4,
    index: 'A',
    name: 'Watermelon',
    rating: 800,
    tags: ['math'],
  },
});

assert.equal(mappedSubmission.id, 123456);
assert.equal(mappedSubmission.problemName, 'A. Watermelon');
assert.equal(mappedSubmission.accepted, true);
assert.equal(mappedSubmission.problemUrl, 'https://codeforces.com/contest/4/problem/A');
assert.equal(mappedSubmission.programmingLanguage, 'GNU C++17');

assert.equal(leetcode.normalizeLeetCodeUsername('  @leetcode_user  '), 'leetcode_user');
assert.equal(leetcode.normalizeLeetCodeUsername(''), '');
assert.match(
  leetcodeSource,
  /const RECENT_ACCEPTED_SUBMISSIONS_LIMIT = 20;/,
  'LeetCode save-handle preview should fetch only the top 20 accepted submissions'
);
assert.doesNotMatch(
  leetcodeSource,
  /RECENT_ACCEPTED_SUBMISSIONS_LIMIT = 1000/,
  'LeetCode save-handle preview should not request 1000 accepted submissions'
);

const mappedLeetCodeSubmission = leetcode.mapLeetCodeAcceptedSubmission({
  id: '987654',
  title: 'Two Sum',
  titleSlug: 'two-sum',
  timestamp: '1700000000',
});

assert.equal(mappedLeetCodeSubmission.id, '987654');
assert.equal(mappedLeetCodeSubmission.title, 'Two Sum');
assert.equal(mappedLeetCodeSubmission.accepted, true);
assert.equal(mappedLeetCodeSubmission.problemUrl, 'https://leetcode.com/problems/two-sum/');
assert.equal(mappedLeetCodeSubmission.submittedAt, '2023-11-14T22:13:20.000Z');

const leetcodeSnapshot = leetcode.mapLeetCodeProfileSnapshot('  LeetUser  ', {
  matchedUser: {
    username: 'LeetUser',
    profile: {
      realName: 'Leet User',
      userAvatar: 'https://assets.leetcode.com/avatar.png',
      ranking: 12345,
      reputation: 99,
    },
    submitStats: {
      acSubmissionNum: [
        { difficulty: 'All', count: 150, submissions: 240 },
        { difficulty: 'Easy', count: 80, submissions: 100 },
        { difficulty: 'Medium', count: 60, submissions: 110 },
        { difficulty: 'Hard', count: 10, submissions: 30 },
      ],
    },
  },
  recentAcSubmissionList: [
    {
      id: '987654',
      title: 'Two Sum',
      titleSlug: 'two-sum',
      timestamp: '1700000000',
    },
  ],
});

assert.equal(leetcodeSnapshot.username, 'LeetUser');
assert.equal(leetcodeSnapshot.totalSolved, 150);
assert.equal(leetcodeSnapshot.easySolved, 80);
assert.equal(leetcodeSnapshot.mediumSolved, 60);
assert.equal(leetcodeSnapshot.hardSolved, 10);
assert.equal(leetcodeSnapshot.acceptedCount, 1);
assert.equal(leetcodeSnapshot.submissions[0].problemUrl, 'https://leetcode.com/problems/two-sum/');

const savedAt = '2026-05-28T00:00:00.000Z';
assert.equal(
  integrationLocks.isIntegrationLockedUntil(savedAt, '2026-06-03T23:59:59.000Z'),
  true,
  'saved integrations should be locked before seven full days pass'
);
assert.equal(
  integrationLocks.isIntegrationLockedUntil(savedAt, '2026-06-04T00:00:00.000Z'),
  false,
  'saved integrations should unlock after seven days'
);

assert.equal(
  challengeIntegrations.resolveChallengeIntegrationProvider({ integrationProvider: 'CODEFORCES' }),
  'CODEFORCES',
  'challenge integration resolver should respect explicit provider values'
);
assert.equal(
  challengeIntegrations.resolveChallengeIntegrationProvider({ title: 'Codeforces daily grind' }),
  'CODEFORCES',
  'challenge integration resolver should detect Codeforces challenge copy'
);
assert.equal(
  challengeIntegrations.resolveChallengeIntegrationProvider({ title: 'LeetCode daily grind' }),
  'LEETCODE',
  'challenge integration resolver should detect LeetCode challenge copy'
);
assert.equal(
  challengeIntegrations.resolveChallengeIntegrationProvider({ title: 'Daily coding habit' }),
  null,
  'challenge integration resolver should not treat generic coding challenges as a platform integration'
);
assert.equal(
  challengeIntegrations.resolveChallengeIntegrationProvider({ integrationProvider: 'STRAVA', title: 'Strava 5K run' }),
  null,
  'challenge integration resolver should ignore paused explicit Strava provider values'
);
assert.equal(
  challengeIntegrations.resolveChallengeIntegrationProvider({ integrationProvider: 'HEVY', title: 'Hevy lifting log' }),
  null,
  'challenge integration resolver should ignore paused explicit Hevy provider values'
);
assert.equal(
  challengeIntegrations.resolveChallengeIntegrationProvider({ title: 'Strava cycling challenge' }),
  null,
  'challenge integration resolver should not detect paused Strava challenge copy'
);
assert.equal(
  challengeIntegrations.resolveChallengeIntegrationProvider({ title: 'Hevy strength workout' }),
  null,
  'challenge integration resolver should not detect paused Hevy challenge copy'
);

const settingsSource = readText('app/settings.tsx');
assert.doesNotMatch(
  settingsSource,
  /pathname:\s*'\/connected-apps'/,
  'settings should not route to the connected apps screen'
);
assert.doesNotMatch(
  settingsSource,
  /Connected Apps/,
  'settings should not expose a Connected Apps entry'
);
assert.doesNotMatch(
  settingsSource,
  /Your integrations/,
  'settings should not include the removed Your integrations section'
);
assert.doesNotMatch(
  settingsSource,
  /integrationCard|integrationsSection|Remove Codeforces|Remove LeetCode/,
  'settings should not render integration management cards anymore'
);
assert.doesNotMatch(
  settingsSource,
  /disconnectCodeforces|disconnectLeetCode/,
  'settings should not own integration disconnect actions anymore'
);
const profileSource = readText('screens/Profile.tsx');
assert.match(
  profileSource,
  /Integrations/,
  'profile should expose an Integrations entry point'
);
assert.match(
  profileSource,
  /pathname:\s*'\/connected-apps'/,
  'profile + Connect entry should route to connected apps'
);
assert.match(
  profileSource,
  /connectAppsButton:\s*{[\s\S]*?position:\s*'absolute'/,
  'profile connect button should be a header action positioned independently from the centered title'
);
assert.match(
  profileSource,
  /connectAppsButton:\s*{[\s\S]*?right:\s*62/,
  'profile connect button should sit directly to the left of the settings button'
);
assert.match(
  profileSource,
  /IntegrationLogo[\s\S]*INTEGRATION_PROVIDERS\.CODEFORCES[\s\S]*IntegrationLogo[\s\S]*INTEGRATION_PROVIDERS\.LEETCODE/,
  'profile connect entry should use an overlapping stack of active integration logos'
);
assert.doesNotMatch(
  profileSource,
  /INTEGRATION_PROVIDERS\.STRAVA/,
  'profile connect entry should not imply paused integrations are active'
);
assert.match(
  profileSource,
  /connectAppsLogoOverlap/,
  'profile integration logos should overlap like social avatar stacks'
);

const integrationLogoSource = readText('components/integrations/IntegrationLogo.tsx');
const integrationProvidersSource = readText('constants/integrationProviders.ts');
assert.match(
  integrationDetailSource,
  /validatedHandle\s*===\s*normalizedDraftHandle/,
  'integration save should only activate after validating the current Codeforces/LeetCode value'
);
assert.match(
  integrationDetailSource,
  /Top \{Math\.min\(snapshot\.submissions\.length, 20\)\} solved/,
  'integration detail should label provider submissions as a top-20 solved-problem preview'
);
assert.match(
  integrationDetailSource,
  /inputValidateButton:[\s\S]*backgroundColor:\s*["']#22C55E["']/,
  'validate button should be green'
);
assert.match(
  integrationDetailSource,
  /primaryButton:[\s\S]*backgroundColor:\s*["']#22C55E["']/,
  'save button should be green'
);
assert.doesNotMatch(
  integrationDetailSource,
  /Sync Codeforces|Sync LeetCode|handleSync\s*=/,
  'Codeforces and LeetCode sync should not appear on the integration detail page'
);
assert.doesNotMatch(
  integrationDetailSource,
  /Sync Strava|Sync Hevy|handleSyncStrava|handleSyncHevy/,
  'app integration detail pages should not show sync actions'
);
assert.doesNotMatch(
  integrationDetailSource,
  /useStravaIntegration|useHevyIntegration|isStravaProvider|isHevyProvider/,
  'paused integrations should not initialize active detail hooks or provider branches'
);
assert.doesNotMatch(
  integrationDetailSource,
  /Connect Strava|Save Hevy Key|Open Hevy Settings|HEVY_DEVELOPER_SETTINGS_URL/,
  'paused integrations should not expose connect or setup actions on the detail page'
);
assert.match(
  integrationLogoSource,
  /CodeforcesBarsLogo/,
  'Codeforces should use the three-bar logo mark'
);
assert.match(
  integrationLogoSource,
  /source=\{\{ uri: provider\.logoUri \}\}/,
  'integration logos should render provider image URLs when no custom local mark is required'
);
assert.doesNotMatch(
  integrationLogoSource,
  /StravaMarkLogo|stravaChevron/,
  'Strava should use the Icon-Icons image asset instead of the local chevron approximation'
);
assert.match(
  integrationProvidersSource,
  /logoUri: 'https:\/\/images\.icon-icons\.com\/2108\/PNG\/512\/strava_icon_130820\.png'/,
  'Strava should use the Icon-Icons PNG asset'
);
assert.match(
  integrationProvidersSource,
  /logoCreditHref: 'https:\/\/icon-icons\.com\/authors\/816-terence-eden'/,
  'Strava icon metadata should keep the Terence Eden author href for attribution'
);

const connectedAppsSource = readText('app/connected-apps.tsx');
assert.match(
  connectedAppsSource,
  /pathname:\s*'\/integration-detail'/,
  'connected apps screen should route available providers to an integration detail screen'
);
assert.match(
  connectedAppsSource,
  /provider:\s*provider\.key/,
  'connected apps screen should pass the selected provider to the detail screen'
);
assert.doesNotMatch(
  connectedAppsSource,
  /Save Handle|Sync Codeforces|TextInput/,
  'connected apps list should not own provider-specific handle entry anymore'
);
assert.match(
  connectedAppsSource,
  /INTEGRATION_PROVIDER_LIST/,
  'connected apps screen should render providers from shared metadata'
);
assert.match(
  connectedAppsSource,
  /Connected/,
  'connected apps screen should show connection state'
);
assert.doesNotMatch(
  connectedAppsSource,
  /useStravaIntegration|useHevyIntegration/,
  'connected apps screen should not initialize paused integration hooks'
);
assert.doesNotMatch(
  connectedAppsSource,
  /provider\.key === 'STRAVA'|provider\.key === 'HEVY'/,
  'connected apps screen should not read paused integration connection state'
);
assert.match(
  integrationProvidersSource,
  /Strava/,
  'connected apps screen should list Strava as a future integration'
);
assert.match(
  integrationProvidersSource,
  /LeetCode/,
  'connected apps screen should list LeetCode as a future integration'
);
assert.match(
  integrationProvidersSource,
  /INTEGRATION_PROVIDER_LIST = \[\s*INTEGRATION_PROVIDERS\.CODEFORCES,\s*INTEGRATION_PROVIDERS\.LEETCODE,\s*INTEGRATION_PROVIDERS\.STRAVA,/,
  'LeetCode should sit directly below Codeforces in the integrations list'
);
assert.match(
  integrationProvidersSource,
  /CODING_INTEGRATIONS_ENABLED\s*=\s*false/,
  'coding integrations should remain soft-disabled until the product is ready',
);
assert.match(
  integrationProvidersSource,
  /LEETCODE:[\s\S]*?available:\s*CODING_INTEGRATIONS_ENABLED/,
  'LeetCode availability should follow the shared coding-integration feature flag',
);
assert.match(
  integrationProvidersSource,
  /STRAVA:[\s\S]*?available:\s*false/,
  'Strava should remain visible but disabled while paused'
);
assert.match(
  integrationProvidersSource,
  /HEVY:[\s\S]*?available:\s*false/,
  'Hevy should remain visible but disabled while paused'
);
assert.match(
  integrationProvidersSource,
  /HEALTH_CONNECT:[\s\S]*?available:\s*false/,
  'Health Connect should remain visible but disabled while paused'
);
assert.match(
  integrationProvidersSource,
  /Android Health Connect/,
  'connected apps screen should list Android Health Connect as a future integration'
);
assert.match(
  connectedAppsSource,
  /Coming soon/,
  'disabled integrations should explain that they are coming soon'
);
assert.doesNotMatch(
  connectedAppsSource,
  /heroCard|heroTitle|eyebrow/,
  'integrations page should stay minimal and avoid the heavier hero treatment'
);
assert.match(
  connectedAppsSource,
  /headerTitle:\s*{[\s\S]*?fontWeight:\s*'600'/,
  'integrations page should use the same moderate header weight as the app settings screen'
);

assert.match(
  integrationDetailSource,
  /Disconnect/,
  'integration detail should own integration disconnect actions'
);
assert.match(
  integrationDetailSource,
  /Save Codeforces/,
  'integration detail should expose a separate Codeforces save button'
);
assert.match(
  integrationDetailSource,
  /Save LeetCode/,
  'integration detail should expose a separate LeetCode save button'
);
assert.match(
  integrationDetailSource,
  /validateActionLabel = ["']Validate["']/,
  'integration detail should keep validate text compact enough for narrow buttons'
);
assert.match(
  integrationDetailSource,
  /isLeetCodeProvider[\s\S]*syncLeetCodeProfile\(\s*normalizedDraftHandle,?\s*\)[\s\S]*setValidatedLeetCodeSnapshot/,
  'LeetCode validate should fetch the public profile and display it in the UI'
);
assert.match(
  integrationDetailSource,
  /inputRow[\s\S]*TextInput[\s\S]*inputValidateButton[\s\S]*handleValidateHandle/,
  'validate should be a small action inside the handle input row'
);
assert.match(
  integrationDetailSource,
  /isCodeforcesProvider[\s\S]*syncCodeforcesProfile\(\s*normalizedDraftHandle,?\s*\)[\s\S]*setValidatedCodeforcesSnapshot/,
  'Codeforces validate should fetch the public profile and display it in the UI'
);
assert.doesNotMatch(
  integrationDetailSource,
  /Linking\.openURL\(buildCodeforcesProfileUrl\(normalizedDraftHandle\)\)/,
  'Codeforces validation should not treat opening the public profile as validation'
);
assert.match(
  integrationDetailSource,
  /validatedLeetCodeSnapshot \|\| latestSnapshot/,
  'LeetCode validation preview should take precedence over the latest in-memory sync snapshot'
);
assert.match(
  integrationDetailSource,
  /validatedCodeforcesSnapshot \|\| latestSnapshot/,
  'Codeforces validation preview should take precedence over the latest in-memory sync snapshot'
);
assert.doesNotMatch(
  integrationDetailSource,
  /disabled=\{!isConnected \|\| isSyncing\}/,
  'sync should not appear on the integration detail page'
);
assert.match(
  integrationDetailSource,
  /style=\{\[\s*styles\.primaryButton[\s\S]*onPress=\{handleConfirmAndSave\}[\s\S]*saveActionLabel/,
  'save should be the green primary action after the input'
);
assert.match(
  integrationDetailSource,
  /Confirm carefully\. After saving, you cannot change this \$\{credentialLabel\} for 7 days\./,
  'save should warn about the 7-day username lock before persisting'
);
assert.match(
  integrationDetailSource,
  /public Codeforces APIs/,
  'integration detail should explain public API usage'
);
assert.match(
  integrationDetailSource,
  /No password, token, private message, or private account data/,
  'integration detail should reassure users that private data is not requested'
);
assert.match(
  integrationDetailSource,
  /Is this your Codeforces handle\?/,
  'integration detail should ask users to confirm the handle before saving'
);
assert.match(
  integrationDetailSource,
  /7 days/,
  'integration detail should explain the seven-day edit lock'
);
assert.match(
  integrationDetailSource,
  /isHandleLocked/,
  'integration detail should block handle editing while locked'
);
assert.match(
  integrationDetailSource,
  /const disconnectDisabled = handleEditingLocked \|\| isSaving \|\| isSyncing;/,
  'integration detail should disable disconnect while the saved handle is locked'
);
assert.match(
  integrationDetailSource,
  /style=\{\[styles\.disconnectButton,\s*disconnectDisabled && styles\.disconnectButtonDisabled\]\}[\s\S]*onPress=\{handleDisconnect\}[\s\S]*disabled=\{disconnectDisabled\}/,
  'disconnect button should be visibly disabled and non-pressable until handle changes unlock'
);
assert.match(
  integrationDetailSource,
  /public LeetCode profile/,
  'integration detail should explain public LeetCode profile usage'
);
assert.match(
  integrationDetailSource,
  /Is this your LeetCode username\?/,
  'integration detail should ask users to confirm the LeetCode username before saving'
);

const challengeDetailsSource = readText('app/challenge-details.tsx');
assert.match(
  challengeDetailsSource,
  /useCodeforcesIntegration/,
  'challenge details should read the saved Codeforces integration'
);
assert.match(
  challengeDetailsSource,
  /resolveChallengeIntegrationProvider/,
  'challenge details should only show sync UI for integrated challenges'
);
assert.match(
  challengeDetailsSource,
  /Sync Codeforces/,
  'Codeforces-integrated challenges should expose a manual sync action'
);
assert.match(
  challengeDetailsSource,
  /useLeetCodeIntegration/,
  'challenge details should read the saved LeetCode integration'
);
assert.match(
  challengeDetailsSource,
  /Sync LeetCode/,
  'LeetCode-integrated challenges should expose a manual sync action'
);

console.log('codeforces integration UI regression checks passed');
