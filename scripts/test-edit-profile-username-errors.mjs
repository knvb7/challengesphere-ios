import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(
  new URL('../screens/EditProfile.tsx', import.meta.url),
  'utf8',
);

assert.match(
  source,
  /getApiErrorMessage/,
  'Edit Profile should surface backend API error messages such as username conflicts',
);

assert.match(
  source,
  /challengesphere/i,
  'Edit Profile should reject usernames containing the reserved challengesphere keyword before saving',
);

assert.match(
  source,
  /USERNAME_MIN_LENGTH\s*=\s*5/,
  'Edit Profile should require usernames to contain at least 5 characters',
);

assert.match(
  source,
  /USERNAME_MAX_LENGTH\s*=\s*20/,
  'Edit Profile should limit usernames to at most 20 characters',
);

assert.match(
  source,
  /maxLength=\{USERNAME_MAX_LENGTH\}/,
  'the username input should prevent typing more than 20 characters',
);

assert.doesNotMatch(
  source,
  /response\?\.data\?\.message\s*\|\|/,
  'Edit Profile should not ignore API errorMessage payloads from the backend',
);
