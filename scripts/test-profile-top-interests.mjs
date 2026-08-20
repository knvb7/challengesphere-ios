import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const utilityPath = new URL('../utils/profileInterests.ts', import.meta.url);
const utilitySource = fs.readFileSync(utilityPath, 'utf8')
  .replace(
    "import { parseChallengeCategories } from './challengeCategories';",
    "const { parseChallengeCategories } = require('./challengeCategories');",
  );
const categorySource = read('utils/challengeCategories.ts');

const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const categoryModule = { exports: {} };
vm.runInNewContext(transpile(categorySource), {
  exports: categoryModule.exports,
  module: categoryModule,
});

const utilityModule = { exports: {} };
vm.runInNewContext(transpile(utilitySource), {
  exports: utilityModule.exports,
  module: utilityModule,
  require: (request) => {
    assert.equal(request, './challengeCategories');
    return categoryModule.exports;
  },
});

const { buildTopProfileInterests } = utilityModule.exports;
const result = buildTopProfileInterests([
  { categories: 'Coding, Fitness' },
  { categories: 'coding' },
  { categories: 'Learning, Coding' },
  { categories: 'Fitness' },
  { categories: 'Creativity' },
  { categories: 'coding, Coding' },
]);

assert.deepEqual(
  JSON.parse(JSON.stringify(result)),
  [
    { label: 'Coding', count: 4 },
    { label: 'Fitness', count: 2 },
    { label: 'Creativity', count: 1 },
  ],
  'interests should count each normalized category once per created challenge and rank ties alphabetically',
);

const componentSource = read('components/common/ProfileTopInterests.tsx');
assert.match(componentSource, /height: 26/, 'interest chips should remain compact');
assert.match(componentSource, /visibleInterests = interests\.slice\(0, 3\)/, 'only three interests should render');
assert.doesNotMatch(componentSource, /fontFamily/, 'the component must preserve the app system font');
assert.match(
  componentSource,
  /backgroundColor: 'rgba\(143, 107, 255, 0\.10\)'/,
  'interest pills should use only a subtle violet tint',
);
assert.match(componentSource, /borderRadius: 13/, 'interest chips should render as fully rounded pills');
assert.doesNotMatch(componentSource, /container:[\s\S]{0,180}borderWidth/, 'the compact section should not add another enclosing card');
assert.doesNotMatch(componentSource, /TouchableOpacity|toggleButton|expanded/, 'interests should not be hidden behind a button');
assert.match(componentSource, /visibleInterests\.length === 0\) return null/, 'zero interests should render nothing');

for (const profilePath of ['screens/Profile.tsx', 'app/user-profile.tsx']) {
  const source = read(profilePath);
  assert.match(source, /<ProfileTopInterests interests=\{topInterests\}/);
  assert.match(
    source,
    /username[\s\S]{0,700}styles\.bio[\s\S]{0,200}<ProfileTopInterests interests=\{topInterests\}/,
    `${profilePath} should place interests below the bio`,
  );
}

const serviceSource = read('services/challengeService.ts');
assert.match(
  serviceSource,
  /topInterests: buildTopProfileInterests\(createdChallenges\)/,
  'the full creator challenge set should drive interests before gallery pagination',
);

console.log('profile top interests checks passed');
