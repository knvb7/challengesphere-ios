import assert from 'node:assert/strict';
import fs from 'node:fs';

const files = [
  'screens/About.tsx',
  'screens/HelpCenter.tsx',
  'screens/Profile.tsx',
  'screens/EditProfile.tsx',
  'app/user-profile.tsx',
  'app/global-challenge-details.tsx',
  'app/challenge-details.tsx',
];

for (const file of files) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.doesNotMatch(
    source,
    /Genuinity\s+(?:Score|Points)|Score:\s*\{[^}]*genuin/i,
    `${file} should not show user genuinity score UI`,
  );
}
