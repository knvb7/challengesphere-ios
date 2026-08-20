import assert from 'node:assert/strict';
import fs from 'node:fs';

const settings = fs.readFileSync(new URL('../app/settings.tsx', import.meta.url), 'utf8');
const privacy = fs.readFileSync(new URL('../screens/PrivacySecurity.tsx', import.meta.url), 'utf8');
const deletion = fs.readFileSync(new URL('../app/delete-account.tsx', import.meta.url), 'utf8');
const entryConfirmation = fs.readFileSync(new URL('../utils/accountDeletionConfirmation.ts', import.meta.url), 'utf8');

const accountControlIndex = settings.indexOf('<SectionHeader title="Account Control" />');
const sessionIndex = settings.indexOf('<SectionHeader title="Session" />');
const logoutIndex = settings.indexOf('title="Logout"', sessionIndex);

assert.ok(accountControlIndex >= 0, 'Settings must show Account Control');
assert.ok(sessionIndex > accountControlIndex, 'Account Control must be immediately before Session');
assert.ok(logoutIndex > sessionIndex, 'Logout must remain inside the Session section');
assert.match(settings, /onPress=\{handleDeleteAccount\}/, 'Settings deletion entry must use the guarded handler');
assert.match(settings, /danger\s*\/>/, 'Settings deletion entry must use destructive styling');
assert.match(privacy, /confirmAccountDeletionEntry/, 'Privacy & Safety must use the same guarded deletion entry');

assert.match(entryConfirmation, /warning \(1 of 3\)/, 'Entry warning must identify the first confirmation');
assert.match(entryConfirmation, /type DELETE/, 'Entry warning must prepare the user for typed confirmation');
assert.match(entryConfirmation, /No, keep my account/, 'Entry warning must make the safe action explicit');
assert.match(entryConfirmation, /style: 'destructive'/, 'Continuing must be visually destructive');

assert.match(deletion, /Confirmation 2 of 3/, 'Deletion screen must identify the typed confirmation step');
assert.match(deletion, /confirmation\.trim\(\)\.toUpperCase\(\) === 'DELETE'/, 'Deletion must require the exact DELETE phrase');
assert.match(deletion, /Final warning \(3 of 3\)/, 'Deletion must require a final warning after typed confirmation');
assert.match(deletion, /text: 'Delete permanently'/, 'The final destructive action must be explicit');

console.log('Account deletion safeguards regression checks passed.');
