import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const readBackend = (path) => readFileSync(new URL(`../../challengesphere/${path}`, import.meta.url), 'utf8');

const appConfig = JSON.parse(read('app.json')).expo;
const androidManifest = read('android/app/src/main/AndroidManifest.xml');
const iosInfo = read('ios/challengesphere/Info.plist');
const iosEntitlements = read('ios/challengesphere/challengesphere.entitlements');
const netlify = read('website/netlify.toml');
const webInvite = read('website/invite.html');
const appleAssociation = JSON.parse(read('website/.well-known/apple-app-site-association'));
const androidAssociation = JSON.parse(read('website/.well-known/assetlinks.json'));
const associationDocs = read('website/.well-known/README.md');
const dynamicRoute = read('app/invite/[inviteCode].tsx');
const inviteScreen = read('app/challenge-invitation.tsx');
const pendingService = read('services/pendingInviteService.ts');
const pendingRedirect = read('components/PendingInviteRedirect.tsx');
const rootLayout = read('app/_layout.tsx');
const pushRouting = read('services/pushNotificationService.ts');
const contactSharing = read('app/invite-contacts.tsx');
const invitations = read('app/invitations.tsx');
const backendInviteService = readBackend('src/main/java/com/ironside/challengesphere/service/impl/InviteServiceImpl.java');
const backendInviteResponse = readBackend('src/main/java/com/ironside/challengesphere/api/response/InviteLinkResponse.java');
const backendSecurity = readBackend('src/main/java/com/ironside/challengesphere/config/SecurityConfig.java');
const backendRateLimit = readBackend('src/main/java/com/ironside/challengesphere/security/RateLimitingFilter.java');
const backendCors = readBackend('src/main/java/com/ironside/challengesphere/config/WebMvcConfig.java');
const backendProdProperties = readBackend('src/main/resources/application-prod.properties');

assert.deepEqual(appConfig.scheme, ['challengesphere', 'myapp'], 'brand scheme should be primary while retaining myapp compatibility');
assert.ok(appConfig.ios.associatedDomains.includes('applinks:challengesphere.com'), 'iOS config should declare the invite universal-link domain');
assert.ok(appConfig.android.intentFilters.some((filter) => filter.autoVerify && filter.data?.some((item) => item.host === 'challengesphere.com' && item.pathPrefix === '/invite')), 'Android config should declare verified invite links');
assert.match(androidManifest, /android:scheme="challengesphere"/, 'native Android manifest should register the brand scheme');
assert.match(androidManifest, /android:scheme="myapp"/, 'native Android manifest should retain the legacy scheme');
assert.match(androidManifest, /android:autoVerify="true"[\s\S]*android:host="challengesphere\.com"[\s\S]*android:pathPrefix="\/invite"/, 'native Android manifest should route HTTPS invites');
assert.match(iosInfo, /<string>challengesphere<\/string>[\s\S]*<string>myapp<\/string>/, 'native iOS config should register brand and legacy schemes');
assert.match(iosEntitlements, /com\.apple\.developer\.associated-domains[\s\S]*applinks:challengesphere\.com/, 'native iOS entitlements should declare the universal-link domain');

assert.match(netlify, /from = "\/invite\/\*"[\s\S]*to = "\/invite\.html"[\s\S]*status = 200/, 'Netlify should rewrite invite URLs to the fallback page');
assert.match(netlify, /command = "node \.\/scripts\/generate-app-association-files\.mjs"/, 'Netlify should validate and generate association files before publishing');
assert.match(netlify, /for = "\/\.well-known\/apple-app-site-association"[\s\S]*Content-Type = "application\/json/, 'AASA should be served as JSON');
assert.match(netlify, /for = "\/\.well-known\/assetlinks\.json"[\s\S]*Content-Type = "application\/json/, 'Android association should be served as JSON');
assert.deepEqual(appleAssociation.applinks.details, [], 'missing Apple Team ID must fail closed instead of claiming a guessed app ID');
assert.equal(androidAssociation[0].target.package_name, 'com.challengesphere.app', 'Android association should target the production package');
assert.ok(androidAssociation[0].target.sha256_cert_fingerprints.includes('4D:E7:9F:77:E9:AE:35:5A:66:91:6B:6E:63:09:F9:86:E2:5A:30:EF:EF:A0:18:AB:21:1A:52:44:E0:B4:C4:74'), 'Android association should use the discovered release certificate');
assert.match(associationDocs, /Play App Signing[\s\S]*APPLE_TEAM_ID/, 'association deployment requirements should be documented');
assert.match(webInvite, /\/\^\\\/invite\\\/\(\[A-Za-z0-9\]\{8,12\}\)/, 'web fallback should accept only canonical invite codes');
assert.match(webInvite, /challengesphere:\/\/invite\//, 'web fallback should open the branded native route');
assert.match(webInvite, /\/invites\/\$\{encodeURIComponent\(inviteCode\)\}/, 'web fallback should load the public invite preview');
assert.match(webInvite, /inviterName[\s\S]*challengeDurationDays[\s\S]*participantCount[\s\S]*proofMode[\s\S]*challengeRules/, 'web fallback should render the decision context before app open');

assert.match(dynamicRoute, /challenge-invitation/, 'dynamic invite route should reuse the invitation screen');
assert.match(pendingService, /AsyncStorage\.setItem\(PENDING_INVITE_CODE_KEY/, 'invite codes should persist across authentication');
assert.match(pendingService, /\^\[A-Za-z0-9\]\{8,12\}\$/, 'only canonical invite codes should be persisted');
assert.match(inviteScreen, /if \(!isAuthenticated\) \{[\s\S]*pendingInviteService\.save\(inviteCode\)[\s\S]*router\.replace\('\/login'\)/, 'the join action should persist a signed-out invite before login');
assert.doesNotMatch(inviteScreen, /\(!isAuthenticated && Boolean\(inviteCode\)\)/, 'signed-out visitors should not be hidden behind an auth loading state');
assert.match(inviteScreen, /inviterName[\s\S]*challengeDurationDays[\s\S]*participantCount[\s\S]*proofMode[\s\S]*challengeRules/, 'native preview should show inviter, schedule, submission format, activity, and rules');
assert.match(pendingRedirect, /isInviteRoute[\s\S]*isLoading \|\| !isAuthenticated \|\| isInviteRoute[\s\S]*pendingInviteService\.get\(\)[\s\S]*\/invite\/\$\{inviteCode\}/, 'pending invites should resume immediately after authentication');
assert.doesNotMatch(pendingRedirect, /topSegment !== '\(tabs\)'/, 'optional onboarding must not delay an accepted invite');
assert.match(rootLayout, /<PendingInviteRedirect \/>/, 'root layout should mount deferred invite routing');
assert.match(inviteScreen, /pendingInviteService\.clear\(inviteCode\)[\s\S]*pathname: '\/challenge-details'[\s\S]*id: String\(data\.challengeId\)/, 'acceptance should clear the pending code and open the joined challenge');
assert.match(pushRouting, /type === 'CHALLENGE_INVITE'[\s\S]*router\.push\('\/notifications'\)/, 'invite pushes should open the actionable inbox');

assert.doesNotMatch(contactSharing, /useEffect\([\s\S]{0,180}loadContacts\(\)/, 'contacts permission must not be requested on mount');
assert.match(contactSharing, /Share\.share\(\{ message, title \}\)/, 'native sharing should be available before contacts');
assert.match(contactSharing, /Clipboard\.setStringAsync\(value\)/, 'copying should be available before contacts');
assert.match(contactSharing, /expiresInHours: 720/, 'direct challenge sharing should create 30-day invite links');
assert.match(invitations, /maxUses: 10, expiresInHours: 720/, 'managed invite links should default to 30 days while retaining max uses');
assert.match(backendInviteService, /DEFAULT_EXPIRY_HOURS = 720; \/\/ 30 days/, 'backend invite default should be 30 days');
assert.match(backendInviteService, /deactivateInvite/, 'creator revocation support must remain intact');
assert.match(backendInviteService, /parseStoredContent[\s\S]*countActiveByChallengeId[\s\S]*setPendingCount\(null\)/, 'public previews should provide safe activity context without fabricating pending recipients');
assert.match(backendInviteResponse, /inviterName[\s\S]*challengeStartDate[\s\S]*participantCount[\s\S]*remainingUses/, 'backend invite response should expose preview decision fields');

assert.ok(
  backendSecurity.includes('new RegexRequestMatcher("^/api/v1/invites/[A-Za-z0-9]{8,12}/?$", "GET")'),
  'security should define a narrow public invite preview matcher',
);
assert.match(backendSecurity, /requestMatchers\(PUBLIC_INVITE_PREVIEW\)\.permitAll\(\)/, 'only the narrow preview matcher should be public');
assert.match(backendRateLimit, /invite-probe[\s\S]*20[\s\S]*Duration\.ofMinutes\(5\)/, 'public invite previews should retain probe rate limiting');
assert.match(backendCors, /https:\/\/challengesphere\.com/, 'backend CORS default should include the production invite website');
assert.match(backendProdProperties, /APP_CORS_ALLOWED_ORIGINS:https:\/\/challengesphere\.com/, 'production CORS should default safely while allowing deployment overrides');

const generatorPath = fileURLToPath(new URL('../website/scripts/generate-app-association-files.mjs', import.meta.url));
const websiteDirectory = fileURLToPath(new URL('../website/', import.meta.url));
const missingTeamResult = spawnSync(process.execPath, [generatorPath], {
  cwd: websiteDirectory,
  env: { ...process.env, APPLE_TEAM_ID: '' },
  encoding: 'utf8',
});
assert.notEqual(missingTeamResult.status, 0, 'association generation should fail when the Apple Team ID is missing');

const generatedDirectory = mkdtempSync(join(tmpdir(), 'challengesphere-associations-'));
try {
  const generatedResult = spawnSync(process.execPath, [generatorPath], {
    cwd: websiteDirectory,
    env: {
      ...process.env,
      APPLE_TEAM_ID: 'ABCDE12345',
      ASSOCIATION_OUTPUT_DIR: generatedDirectory,
    },
    encoding: 'utf8',
  });
  assert.equal(generatedResult.status, 0, generatedResult.stderr || 'association generator should succeed with valid signing identifiers');

  const generatedApple = JSON.parse(readFileSync(join(generatedDirectory, 'apple-app-site-association'), 'utf8'));
  const generatedAndroid = JSON.parse(readFileSync(join(generatedDirectory, 'assetlinks.json'), 'utf8'));
  assert.equal(generatedApple.applinks.details[0].appID, 'ABCDE12345.com.challengesphere.app');
  assert.deepEqual(generatedApple.applinks.details[0].paths, ['/invite/*']);
  assert.equal(generatedAndroid[0].target.package_name, 'com.challengesphere.app');
} finally {
  rmSync(generatedDirectory, { recursive: true, force: true });
}

console.log('External invite journey regression checks passed');
