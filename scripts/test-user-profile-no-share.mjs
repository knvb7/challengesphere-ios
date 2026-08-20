import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = readFileSync(path.join(root, 'app/user-profile.tsx'), 'utf8');

assert.doesNotMatch(
  source,
  /\bShare\b|handleShareProfile|share-outline|shareButton/,
  'other-user profiles should not expose a share option',
);
assert.match(
  source,
  /isOfficialProfile \? \(\s*<View style=\{styles\.headerActionButton\} \/>/,
  'other-user profile header should keep a right-side spacer after removing share',
);
assert.doesNotMatch(
  source,
  /handleMessage|messageButton|Direct Message|chatbubble-outline/,
  'other-user profiles should not expose messaging while direct messages are unavailable',
);

console.log('user profile unavailable action removal checks passed');
