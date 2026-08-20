import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/challenge-submissions.tsx', import.meta.url), 'utf8');

assert.equal(
  source.includes('useReuploadSubmission'),
  false,
  'challenge submissions screen should not import/use the reupload mutation'
);
assert.equal(
  source.includes('reuploadingSubmission'),
  false,
  'challenge submissions screen should not keep reupload-specific state'
);
assert.equal(
  source.includes('Reupload'),
  false,
  'challenge submissions screen should not render reupload UI text'
);
assert.match(
  source,
  /<Ionicons name="sparkles" size=\{14\} color="#FFD700" \/>[\s\S]*s\.gloriesCount/,
  'challenge submission cards should use the established Glory sparkle icon'
);

console.log('submission UI regression checks passed');
