import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

assert.equal(
  existsSync(path.join(root, 'screens/PrivacyPolicy.tsx')),
  true,
  'PrivacyPolicy screen should exist'
);
assert.equal(
  existsSync(path.join(root, 'app/privacy-policy.tsx')),
  true,
  'privacy-policy route should exist'
);

const policySource = readText('screens/PrivacyPolicy.tsx');
const routeSource = readText('app/privacy-policy.tsx');
const settingsSource = readText('app/settings.tsx');
const privacySecuritySource = readText('screens/PrivacySecurity.tsx');
const aboutSource = readText('screens/About.tsx');
const helpCenterSource = readText('screens/HelpCenter.tsx');

for (const requiredText of [
  'Privacy Policy',
  'Effective date: June 26, 2026',
  'ironside-dev@challengesphere.com',
  'Information we collect',
  'How we use information',
  'Photos, submissions, and public content',
  'How we share information',
  'Data retention',
  'Your choices and rights',
  'Children and minors',
  'Changes to this policy',
]) {
  assert.match(policySource, new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `policy should include "${requiredText}"`);
}

assert.match(
  routeSource,
  /<PrivacyPolicy onBack=\{\(\) => router\.back\(\)\} \/>/,
  'privacy-policy route should render PrivacyPolicy with back navigation'
);
assert.match(
  settingsSource,
  /title="Privacy Policy"[\s\S]*router\.push\('\/privacy-policy' as any\)/,
  'settings should link to the in-app privacy policy'
);
assert.match(
  privacySecuritySource,
  /router\.push\('\/privacy-policy' as any\)/,
  'Privacy & Security footer should open the in-app privacy policy'
);
assert.match(
  aboutSource,
  /title="Privacy Policy"[\s\S]*router\.push\('\/privacy-policy' as any\)/,
  'About should link to the in-app privacy policy'
);
assert.match(
  helpCenterSource,
  /label="Privacy Policy"[\s\S]*router\.push\('\/privacy-policy' as any\)/,
  'Help Center should link to the in-app privacy policy'
);
assert.doesNotMatch(
  `${policySource}\n${aboutSource}\n${helpCenterSource}`,
  /https:\/\/ironside\.com\/privacy/,
  'privacy policy entry points should not depend on an external placeholder URL'
);

console.log('privacy policy page checks passed');
