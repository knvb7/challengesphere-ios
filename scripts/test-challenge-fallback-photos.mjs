import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();
const require = createRequire(import.meta.url);

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
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
  vm.runInNewContext(output, { module, exports: module.exports, require }, { filename: filePath });
  return module.exports;
}

const fallbacks = loadTsModule('utils/challengeFallbackPhotos.ts');

assert.equal(fallbacks.getChallengeFallbackPhotoKey({ hashtags: 'leetcode,dsa' }), 'coding');
assert.equal(fallbacks.getChallengeFallbackPhotoKey({ category: 'Fitness' }), 'fitness');
assert.equal(fallbacks.getChallengeFallbackPhotoKey({ title: 'Drink water every day' }), 'health');
assert.equal(fallbacks.getChallengeFallbackPhotoKey({ category: 'Learning', description: 'Read a book' }), 'learning');
assert.equal(fallbacks.getChallengeFallbackPhotoKey({ hashtags: 'painting,creative' }), 'creativity');
assert.equal(fallbacks.getChallengeFallbackPhotoKey({ title: 'Plan my morning routine' }), 'productivity');
assert.equal(fallbacks.getChallengeFallbackPhotoKey({ title: 'Try something new' }), 'lifestyle');

for (const [key, assetPaths] of Object.entries(fallbacks.challengeFallbackPhotoAssetPaths)) {
  assert.equal(assetPaths.length, 4, key + ' should have four fallback symbol variants');
  for (const assetPath of assetPaths) {
    assert.match(assetPath, new RegExp('/' + key + '-[1234]\\.png$'), assetPath + ' should be a numbered category symbol PNG');
    assert.doesNotMatch(assetPath, /\.jpe?g$/i, assetPath + ' should not point to photo fallback artwork');
    assert.ok(fs.existsSync(path.join(root, assetPath)), assetPath + ' should exist');
  }
}

const codingVariantA = fallbacks.getChallengeFallbackPhotoAssetPath({ id: 101, title: 'Code every morning', category: 'Coding' });
const codingVariants = new Set(
  Array.from({ length: 12 }, (_, index) =>
    fallbacks.getChallengeFallbackPhotoAssetPath({ id: 101 + index, title: 'Code every morning', category: 'Coding' })
  )
);
assert.match(codingVariantA, /coding-[1234]\.png$/);
assert.equal(
  fallbacks.getChallengeFallbackPhotoAssetPath({ id: 101, title: 'Code every morning', category: 'Coding' }),
  codingVariantA,
  'fallback variant should stay stable for the same challenge seed'
);
assert.ok(
  codingVariants.size > 1,
  'different challenge ids in the same category should distribute across fallback variants'
);

const fallbackSource = readText('utils/challengeFallbackPhotos.ts');
assert.doesNotMatch(
  fallbackSource,
  /challenge-fallbacks\/[a-z-]+\.jpe?g/,
  'challenge fallback mapper should not use photo assets'
);
assert.match(
  fallbackSource,
  /getChallengeFallbackPhotoAssetPath[\s\S]*getStableVariantIndex/,
  'challenge fallback mapper should choose a stable pseudo-random variant per challenge'
);

const sourcesDoc = readText('assets/images/challenge-fallbacks/SOURCES.md');
assert.match(sourcesDoc, /four locally generated, vector-style PNG category symbols per category/);
assert.match(sourcesDoc, /avoid people, avatar, portrait, and AI-character imagery/);

console.log('challenge fallback icon checks passed');
