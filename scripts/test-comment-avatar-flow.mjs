import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const frontend = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const backend = (path) => readFileSync(new URL(`../../challengesphere/${path}`, import.meta.url), 'utf8');

const componentSource = frontend('components/common/CommentAndCount.tsx');
const sheetSource = frontend('components/common/CommentsSheet.tsx');
const hooksSource = frontend('hooks/useFeed.ts');
const serviceInterfaceSource = backend('src/main/java/com/ironside/challengesphere/service/CommentService.java');
const serviceImplSource = backend('src/main/java/com/ironside/challengesphere/service/impl/CommentServiceImpl.java');
const controllerSource = backend('src/main/java/com/ironside/challengesphere/controller/CommentController.java');

assert.match(
  sheetSource,
  /AvatarImage/,
  'comment avatars should use the shared resilient avatar component'
);
assert.match(
  sheetSource,
  /<AvatarImage uri=\{comment\.profilePicUrl\}/,
  'rendered comment avatars should normalize remote profile photo sources'
);
assert.match(
  componentSource,
  /profilePicUrl:\s*currentUserAvatar/,
  'new comment mutations should carry the current user profile photo into the optimistic cache path'
);
assert.match(
  hooksSource,
  /profilePicUrl\?:\s*string\s*\|\s*null/,
  'add-comment mutation variables should accept the author profile photo'
);
assert.match(
  hooksSource,
  /profilePicUrl:\s*createdComment\.profilePicUrl\s*\?\?\s*profilePicUrl/,
  'add-comment cache update should preserve profilePicUrl from the response or local author'
);

assert.match(
  serviceInterfaceSource,
  /CommentResponse createComment/,
  'comment service should return enriched comment responses when creating comments'
);
assert.match(
  controllerSource,
  /ResponseEntity<CommentResponse> createComment/,
  'create-comment endpoint should return enriched comment responses'
);
assert.match(
  serviceImplSource,
  /mediaUrlService\.toReadableMediaUrl/,
  'comment response mapping should convert profile photos into readable URLs'
);

console.log('comment avatar flow regression checks passed');
