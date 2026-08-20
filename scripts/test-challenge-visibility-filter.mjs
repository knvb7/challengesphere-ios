import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const read = (relativePath) => fs.readFileSync(new URL(relativePath, root), 'utf8');

const sourcePath = new URL('../utils/challengeVisibilityFilter.ts', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});

const sandbox = {
  exports: {},
  module: { exports: {} },
};
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(transpiled.outputText, sandbox, { filename: sourcePath.pathname });

const {
  CHALLENGE_VISIBILITY_FILTER_OPTIONS,
  filterChallengesByVisibility,
  getChallengeVisibilityFilterLabel,
} = sandbox.module.exports;

const challenges = [
  { id: 'public-1', isPrivate: false },
  { id: 'private-1', isPrivate: true },
  { id: 'public-2' },
];

assert.deepEqual(
  filterChallengesByVisibility(challenges, 'all').map((challenge) => challenge.id),
  ['public-1', 'private-1', 'public-2'],
  'all visibility filter should keep every challenge',
);

assert.deepEqual(
  filterChallengesByVisibility(challenges, 'public').map((challenge) => challenge.id),
  ['public-1', 'public-2'],
  'public visibility filter should keep challenges where isPrivate is false or missing',
);

assert.deepEqual(
  filterChallengesByVisibility(challenges, 'private').map((challenge) => challenge.id),
  ['private-1'],
  'private visibility filter should keep only private challenges',
);

assert.equal(
  JSON.stringify(CHALLENGE_VISIBILITY_FILTER_OPTIONS.map((option) => option.value)),
  JSON.stringify(['all', 'public', 'private']),
  'visibility dropdown should expose all, public, and private options',
);

assert.equal(getChallengeVisibilityFilterLabel('public'), 'Public');
assert.equal(getChallengeVisibilityFilterLabel('private'), 'Private');

for (const screenPath of [
  'app/(tabs)/challenges.tsx',
  'screens/Profile.tsx',
  'app/user-profile.tsx',
]) {
  const source = read(screenPath);
  assert.match(
    source,
    /ChallengeVisibilityDropdown/,
    `${screenPath} should render the shared visibility dropdown`,
  );
  assert.match(
    source,
    /filterChallengesByVisibility/,
    `${screenPath} should filter challenges by visibility`,
  );
}

console.log('challenge visibility filter checks passed');
