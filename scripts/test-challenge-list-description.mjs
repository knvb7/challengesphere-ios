import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs, { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function loadTsModule(relativePath) {
  const filePath = path.join(root, relativePath);
  const output = ts.transpileModule(readText(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;
  const module = { exports: {} };
  const moduleRequire = createRequire(filePath);
  const localRequire = (specifier) => {
    if (specifier.startsWith('.')) {
      const basePath = path.resolve(path.dirname(filePath), specifier);
      for (const extension of ['.ts', '.tsx']) {
        const candidate = `${basePath}${extension}`;
        if (fs.existsSync(candidate)) {
          return loadTsModule(path.relative(root, candidate));
        }
      }
    }
    return moduleRequire(specifier);
  };

  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: localRequire,
  }, { filename: filePath });
  return module.exports;
}

const challengeCardSource = readText('components/common/ChallengeCard.tsx');
const challengesTabSource = readText('app/(tabs)/challenges.tsx');
const challengeTextSource = readText('utils/challengeDisplayText.ts');
assert.equal(
  existsSync(path.join(root, 'utils/challengeDisplayText.ts')),
  true,
  'challenge descriptions should be normalized in a shared utility'
);
const challengeText = loadTsModule('utils/challengeDisplayText.ts');

assert.equal(
  challengeText.getDisplayDescription({
    description: '...',
    challengeDescription: 'Run five kilometres before breakfast.',
  }),
  'Run five kilometres before breakfast.',
  'literal dot placeholders must not hide a real description from another API field'
);
assert.equal(
  challengeText.getDisplayDescription({ description: '…' }),
  'No description available.',
  'ellipsis-only descriptions must render a readable fallback'
);

assert.match(
  challengeCardSource,
  /import \{[^}]*getDisplayDescription[^}]*\} from ['"].*challengeDisplayText['"]/,
  'ChallengeCard should use the shared placeholder-aware description normalizer'
);
assert.match(
  challengeTextSource,
  /challengeDescription/,
  'description normalization should accept alternate challengeDescription fields'
);
assert.match(
  challengeTextSource,
  /No description available\./,
  'challenge cards should render a readable fallback instead of a blank area'
);
assert.match(
  challengeCardSource,
  /const displayDescription = getDisplayDescription\(challenge\)/,
  'ChallengeCard should render the normalized display description'
);
assert.match(
  challengesTabSource,
  /description:\s*getDisplayDescription\(\{\s*description:\s*progressChallenge\.description,\s*challengeDescription:\s*c\.description,\s*\}\)/,
  'created challenge list should preserve the full description when progress rows contain only dots'
);

console.log('challenge list description checks passed');
