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

const catalog = loadTsModule('constants/challengeTemplates.ts');
const templates = catalog.CHALLENGE_TEMPLATES;

assert.equal(templates.length, 25, 'the evergreen quick-start catalog must contain exactly 25 templates');
assert.equal(new Set(templates.map((template) => template.id)).size, 25, 'template ids must be unique');
assert.equal(catalog.CHALLENGE_TEMPLATE_AVAILABLE_THROUGH, '2027-07-31');

const fallbackKeys = new Set([
  'coding',
  'fitness',
  'health',
  'learning',
  'creativity',
  'productivity',
  'lifestyle',
]);

for (const template of templates) {
  assert.match(template.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${template.id} should be route-safe`);
  assert.ok(template.title.length >= 5 && template.title.length <= 80, `${template.id} title length`);
  assert.ok(template.description.length >= 10 && template.description.length <= 500, `${template.id} description length`);
  assert.ok(template.rules.length >= 10 && template.rules.length <= 1000, `${template.id} rules length`);
  assert.ok(template.categories.length > 0 && template.categories.length <= 5, `${template.id} categories`);
  assert.equal(template.availabilityThrough, '2027-07-31', `${template.id} availability`);
  assert.ok(fallbackKeys.has(template.fallbackKey), `${template.id} should use a bundled fallback category`);
  assert.match(template.proofPrompt, /photo/i, `${template.id} should support a photo submission`);
  assert.match(template.proofPrompt, /caption/i, `${template.id} should support a caption check-in`);
  assert.doesNotMatch(JSON.stringify(template), /https?:\/\//i, `${template.id} must not add remote media`);
  assert.match(template.rules, /exact locations/i, `${template.id} should carry the shared location guardrail`);
  assert.match(template.rules, /other people/i, `${template.id} should carry the shared consent guardrail`);
}

assert.equal(catalog.getChallengeTemplateById(' MOVE-YOUR-WAY-10 ')?.id, 'move-your-way-10');
assert.equal(catalog.getChallengeTemplateById('missing-template'), undefined);
assert.equal(
  catalog.getAvailableChallengeTemplates(new Date('2027-07-31T12:00:00.000Z')).length,
  25,
  'templates should remain available through 31 July 2027',
);
assert.equal(
  catalog.getAvailableChallengeTemplates(new Date('2027-08-01T00:00:00.000Z')).length,
  0,
  'templates should expire after the configured availability window',
);

const catalogScreen = readText('app/challenge-templates.tsx');
assert.match(catalogScreen, /CHALLENGE_TEMPLATE_CATEGORIES\.map/, 'catalog should expose category filters');
assert.match(catalogScreen, /placeholder="Search templates"/, 'catalog should support text search');
assert.match(catalogScreen, /getChallengeFallbackPhotoSource/, 'catalog should use existing bundled fallback art');
assert.match(catalogScreen, /pathname: '\/\(tabs\)\/create'[\s\S]*templateId: template\.id/, 'Use Template should open create with a template id');
assert.doesNotMatch(catalogScreen, /https?:\/\//i, 'catalog screen should not load remote media');

const globalScreen = readText('app/(tabs)/global.tsx');
assert.match(globalScreen, /<Text style=\{styles\.headerTitle\}>Explore<\/Text>/, 'global tab header should be Explore');
assert.ok(
  globalScreen.indexOf('Challenge friends') < globalScreen.indexOf('Join globally'),
  'the private friends strategy should appear before global challenge discovery',
);
assert.match(globalScreen, /router\.push\('\/challenge-templates'/, 'Explore should link to the complete catalog');
assert.match(globalScreen, /pathname: '\/\(tabs\)\/create'[\s\S]*params: \{ templateId \}/, 'featured templates should route into create');

const createScreen = readText('app/(tabs)/create.tsx');
assert.match(createScreen, /'Productivity'/, 'every official template category should remain selectable in the editor');

console.log('challenge template catalog checks passed');
