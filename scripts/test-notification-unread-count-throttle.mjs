import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

const source = readText('hooks/useNotifications.ts');

assert.match(
  source,
  /export const UNREAD_COUNT_STALE_TIME_MS = 10 \* 1000;/,
  'unread notification count should have a short cache window so badges update quickly'
);
assert.match(
  source,
  /export const UNREAD_COUNT_REFETCH_INTERVAL_MS = 15 \* 1000;/,
  'unread notification count should poll on a bounded interval while the app is active'
);
assert.match(
  source,
  /refetchOnMount:\s*'always'/,
  'unread notification count should refresh when the badge is mounted'
);
assert.match(
  source,
  /refetchOnWindowFocus:\s*'always'/,
  'unread notification count should refresh when the app regains focus'
);
assert.match(
  source,
  /refetchOnReconnect:\s*'always'/,
  'unread notification count should refresh after connectivity returns'
);
assert.match(
  source,
  /refetchInterval:\s*UNREAD_COUNT_REFETCH_INTERVAL_MS/,
  'unread notification count should use the bounded refresh interval constant'
);
assert.match(
  source,
  /queryClient\.setQueryData\(notificationKeys\.unread\(userId\), response\.unreadCount \?\? 0\)/,
  'notifications list responses should seed the unread count cache'
);
assert.match(
  source,
  /setQueryData<number>\(notificationKeys\.unread\(userId\),\s*\(previous = 0\) => Math\.max\(0, previous - 1\)\)/,
  'marking one unread notification read should update the unread count cache without refetching it'
);
assert.doesNotMatch(
  source,
  /invalidateQueries\(\{\s*queryKey:\s*notificationKeys\.unread\(userId\)\s*\}\)/,
  'marking one notification read should not invalidate the unread-count query'
);

console.log('notification unread count throttle checks passed');
