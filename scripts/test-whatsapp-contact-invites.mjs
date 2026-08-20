import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const packageSource = read('package.json');
const appConfigSource = read('app.config.ts');
const settingsSource = read('app/settings.tsx');
const invitationsSource = read('app/invitations.tsx');
const challengeCreatedSource = read('app/challenge-created.tsx');
const challengeDetailsSource = read('app/challenge-details.tsx');
const inviteLinksSource = read('constants/inviteLinks.ts');
const inviteContactsSource = read('app/invite-contacts.tsx');
const androidManifestSource = read('android/app/src/main/AndroidManifest.xml');

assert.match(packageSource, /"expo-contacts"/, 'contacts invite flow should depend on expo-contacts');
assert.match(appConfigSource, /expo-contacts/, 'Expo config should include the contacts plugin');
assert.match(appConfigSource, /NSContactsUsageDescription/, 'iOS contacts permission text should be configured');
assert.match(appConfigSource, /LSApplicationQueriesSchemes[\s\S]*whatsapp/, 'iOS should be allowed to query WhatsApp URLs');
assert.match(appConfigSource, /READ_CONTACTS/, 'Android contacts permission should be configured');
assert.match(androidManifestSource, /android\.permission\.READ_CONTACTS/, 'Android manifest should include contacts permission for local APK builds');
assert.match(androidManifestSource, /android:scheme="whatsapp"/, 'Android manifest should allow WhatsApp URL queries for local APK builds');

assert.match(inviteLinksSource, /PLAY_STORE_URL[\s\S]*play\.google\.com\/store\/apps\/details\?id=com\.challengesphere\.app/, 'Android Play Store URL should use the app package');
assert.match(inviteLinksSource, /APP_STORE_URL[\s\S]*apps\.apple\.com\/app\/challengesphere/, 'iOS App Store URL should be configured separately');
assert.match(inviteLinksSource, /buildAppInviteMessage/, 'app invite message builder should be centralized');
assert.match(inviteLinksSource, /buildChallengeInviteMessage/, 'challenge invite message builder should be centralized');
assert.match(inviteLinksSource, /CS_LOGO_SYMBOL/, 'WhatsApp invites should include a compact ChallengeSphere logo symbol');
assert.match(inviteLinksSource, /ChallengeSphere\s+\\u00b7\s+Daily challenges/, 'WhatsApp invites should carry a branded headline');
assert.match(inviteLinksSource, /Show up with me/, 'WhatsApp challenge invites should feel more personal and interesting');
assert.match(inviteLinksSource, /Join my sphere/, 'WhatsApp app invites should have a clear branded call to action');

assert.match(inviteContactsSource, /expo-contacts/, 'invite contacts screen should read device contacts');
assert.match(inviteContactsSource, /useGenerateInviteLink/, 'challenge mode should generate a backend invite link when needed');
assert.match(inviteContactsSource, /whatsapp:\/\/send\?/, 'invite contacts screen should use the WhatsApp app URL scheme');
assert.match(inviteContactsSource, /https:\/\/wa\.me\//, 'invite contacts screen should have a WhatsApp web fallback');
assert.match(inviteContactsSource, /requestPermissionsAsync/, 'invite contacts screen should request contacts permission');
assert.match(inviteContactsSource, /getContactsAsync/, 'invite contacts screen should list contacts');
assert.doesNotMatch(inviteContactsSource, /useEffect\([\s\S]{0,180}loadContacts\(\)/, 'invite contacts should not request permission on mount');
assert.match(inviteContactsSource, /Share\.share\(\{\s*message/, 'invite screen should support the native share sheet before contacts');
assert.match(inviteContactsSource, /Clipboard\.setStringAsync/, 'invite screen should support copying the invite before contacts');
assert.match(inviteContactsSource, /Browse contacts/, 'contacts permission should be triggered by an explicit browse action');

assert.match(settingsSource, /pathname:\s*'\/invite-contacts'[\s\S]*mode:\s*'app'/, 'settings should expose app invite via contacts');
assert.match(invitationsSource, /pathname:\s*'\/invite-contacts'[\s\S]*mode:\s*'challenge'/, 'challenge invitations should expose WhatsApp contacts sharing');
assert.match(challengeCreatedSource, /pathname:\s*'\/invite-contacts'[\s\S]*mode:\s*'challenge'/, 'challenge-created share action should open challenge WhatsApp contacts flow');
assert.match(challengeDetailsSource, /handleShareChallengeInvite/, 'challenge details should expose WhatsApp invite sharing');
assert.match(challengeDetailsSource, /isParticipant[\s\S]*Contacts or WhatsApp/, 'participants who are not creators should retain contacts and WhatsApp sharing');
assert.doesNotMatch(challengeDetailsSource, /Only the challenge creator can invite friends/, 'challenge details should not block invite sharing for non-creators');

console.log('WhatsApp contact invite regression checks passed');
