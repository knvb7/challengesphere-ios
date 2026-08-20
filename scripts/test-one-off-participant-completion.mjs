import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const helperSource = readFileSync(path.join(root, 'utils/challengeCompletion.ts'), 'utf8');
const compiledHelper = ts.transpileModule(helperSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const helperModule = { exports: {} };
const localRequire = (specifier) => {
  if (specifier === './challengeMode') {
    return {
      isOneOffChallengeMode: (mode) =>
        mode?.trim().toUpperCase().replace(/[\s-]+/g, '_') === 'ONE_OFF',
    };
  }
  throw new Error(`Unexpected test dependency: ${specifier}`);
};
new Function('exports', 'module', 'require', compiledHelper)(
  helperModule.exports,
  helperModule,
  localRequire,
);

const { isViewerChallengeCompleted } = helperModule.exports;

assert.equal(
  isViewerChallengeCompleted({
    status: 'active',
    challengeMode: 'ONE_OFF',
    crewState: 'COMPLETED',
    hasSubmittedCurrentDay: false,
  }),
  false,
  'shared crew completion must not close an unfinished participant one-off',
);
assert.equal(
  isViewerChallengeCompleted({
    status: 'active',
    challengeMode: 'ONE_OFF',
    crewState: 'COMPLETED',
    hasSubmittedCurrentDay: true,
  }),
  true,
  'a one-off should close for the participant who submitted',
);
assert.equal(
  isViewerChallengeCompleted({
    status: 'active',
    challengeMode: 'DAILY',
    crewState: 'COMPLETED',
  }),
  true,
  'daily challenges should retain shared crew completion behavior',
);
assert.equal(
  isViewerChallengeCompleted({
    status: 'completed',
    challengeMode: 'ONE_OFF',
  }),
  true,
  'an authoritative participant-completed status should remain completed',
);

const detailsSource = readFileSync(path.join(root, 'app/challenge-details.tsx'), 'utf8');
const cardSource = readFileSync(
  path.join(root, 'components/challenges/MyChallengeGalleryCard.tsx'),
  'utf8',
);

assert.match(
  detailsSource,
  /isViewerChallengeCompleted\(\{[\s\S]*hasSubmittedCurrentDay,[\s\S]*crewState: crewStatus\?\.state/,
  'challenge details should combine personal submission state with crew lifecycle state',
);
assert.match(
  cardSource,
  /isViewerChallengeCompleted\(\{[\s\S]*status: challenge\.status,[\s\S]*challengeMode: challenge\.challengeMode,[\s\S]*crewState/,
  'active gallery badges should use viewer-aware one-off completion',
);

console.log('one-off participant completion regression checks passed');
