import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const sourcePath = new URL('../utils/challengeParticipantCounts.ts', import.meta.url);
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
  getMinimumVisibleChallengerCount,
  includeCreatorInChallengerCount,
} = sandbox.module.exports;

assert.equal(
  getMinimumVisibleChallengerCount(0),
  1,
  'visible challenger counts should never show zero for an existing challenge',
);

assert.equal(
  getMinimumVisibleChallengerCount(undefined),
  1,
  'missing challenger counts should fall back to the creator',
);

assert.equal(
  getMinimumVisibleChallengerCount(4),
  4,
  'positive challenger counts should be preserved',
);

assert.equal(
  includeCreatorInChallengerCount(0),
  1,
  'list counts that exclude the creator should add the creator',
);

assert.equal(
  includeCreatorInChallengerCount(3),
  4,
  'list counts should include participants plus creator',
);
