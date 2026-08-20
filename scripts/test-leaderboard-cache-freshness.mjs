import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'hooks/useUsers.ts'), 'utf8');

assert.match(
  source,
  /const LEADERBOARD_CACHE_STALE_TIME_MS = 10 \* 1000;/,
  'leaderboard data should become stale quickly so DB/Redis write-through updates are visible without invalidation'
);

assert.match(
  source,
  /const LEADERBOARD_RANK_CACHE_STALE_TIME_MS = 10 \* 1000;/,
  'leaderboard rank data should become stale quickly so updated ranks are visible without invalidation'
);

assert.match(
  source,
  /staleTime: LEADERBOARD_CACHE_STALE_TIME_MS,/,
  'challenge leaderboard queries should use the short leaderboard stale window'
);

assert.match(
  source,
  /staleTime: LEADERBOARD_RANK_CACHE_STALE_TIME_MS,/,
  'user rank queries should use the short leaderboard stale window'
);

console.log('leaderboard cache freshness checks passed');
