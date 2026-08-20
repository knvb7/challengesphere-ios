import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const service = read('services/inviteService.ts');
const hooks = read('hooks/useInvites.ts');
const apiClient = read('services/apiClient.ts');

assert.doesNotMatch(
  service,
  /console\.(?:debug|info|warn|error|log)/,
  'invite service errors can contain capability URLs or request bodies and must not be logged',
);
assert.match(
  service,
  /encodeURIComponent\(inviteCode\)/,
  'invite codes must be encoded before being placed into a request path',
);
assert.match(
  hooks,
  /INVITE_CODE_PATTERN\.test\(inviteCode\)/,
  'the app must reject malformed invite probes before making a network request',
);
assert.doesNotMatch(
  apiClient,
  /fullUrl|console\.(?:debug|info|warn|error|log)/,
  'the HTTP client must not log capability URLs, auth payloads, or token-bearing errors',
);

console.log('invite security regression checks passed');
