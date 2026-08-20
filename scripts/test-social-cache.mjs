import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readFrontend = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const hooksSource = readFrontend('hooks/useFeed.ts');
const gloryServiceSource = readFileSync(
  new URL(
    '../../challengesphere/src/main/java/com/ironside/challengesphere/service/impl/GloryServiceImpl.java',
    import.meta.url
  ),
  'utf8'
);

assert.match(hooksSource, /const SOCIAL_CACHE_STALE_TIME_MS = 10 \* 60 \* 1000;/);
assert.match(hooksSource, /const SOCIAL_CACHE_GC_TIME_MS = 30 \* 60 \* 1000;/);
assert.match(
  hooksSource,
  /useInfiniteGloriesForSubmission = \(submissionId: number, pageSize = 20\)/,
  'the initial glory modal request should stay lightweight'
);
assert.match(
  gloryServiceSource,
  /mediaUrlService\.toReadableMediaUrl/,
  'glory avatars should use the same readable media URL path as comments and profiles'
);

for (const hookName of [
  'useFeedComments',
  'useGloriesForSubmission',
  'useInfiniteGloriesForSubmission',
  'useGloryStatus',
]) {
  const start = hooksSource.indexOf(`export const ${hookName}`);
  assert.ok(start >= 0, `${hookName} should exist`);
  const nextExport = hooksSource.indexOf('export const ', start + 20);
  const block = hooksSource.slice(start, nextExport >= 0 ? nextExport : undefined);
  assert.match(block, /staleTime:\s*SOCIAL_CACHE_STALE_TIME_MS/, `${hookName} should retain fresh data for ten minutes`);
  assert.match(block, /gcTime:\s*SOCIAL_CACHE_GC_TIME_MS/, `${hookName} should retain inactive cached data for thirty minutes`);
}

const addCommentStart = hooksSource.indexOf('export const useAddComment');
const updateCommentStart = hooksSource.indexOf('export const useUpdateComment');
const addCommentBlock = hooksSource.slice(addCommentStart, updateCommentStart);
assert.doesNotMatch(
  addCommentBlock,
  /setQueriesData<PageComment>[\s\S]*queryClient\.invalidateQueries\(\{ queryKey: feedKeys\.comments\(submissionId\) \}\)/,
  'adding a comment should keep the updated cache instead of immediately forcing another request'
);

console.log('social cache checks passed');
