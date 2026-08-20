import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/edit-challenge.tsx', import.meta.url), 'utf8');

assert.match(source, /categories: string\[\];/, 'edit form should keep selected categories as an array');
assert.match(source, /function parseCategoryList/, 'edit screen should parse comma-separated category route params');
assert.match(source, /<View style=\{styles\.categoriesGrid\}>[\s\S]*allCategories\.map/, 'edit screen should render wrapped category chips');
assert.doesNotMatch(source, /renderPicker\(\s*'Category'/, 'category selection should not use the inline dropdown picker');
assert.match(source, /categories: selectedCategories\.join\(','\)/, 'save payload should include all selected categories');
assert.match(source, /hashtags: selectedCategories\.map\(\(category\) => category\.toLowerCase\(\)\)\.join\(','\)/, 'save payload should include all selected category hashtags');
assert.match(source, /categoryChipSelected/, 'selected category chips should have a distinct style');
assert.match(source, /if \(category === 'Other'\)[\s\S]*setShowOtherModal\(true\)/, 'Other should open the custom category editor');
assert.match(source, /const confirmOtherCategory = /, 'edit challenge should support confirming a custom category');
assert.match(source, /placeholder="e\.g\. Meditation, Cooking\.\.\."/,
  'edit challenge should render a focused custom-category input');
assert.match(source, /maxLength=\{30\}/, 'custom categories should have a bounded length');
assert.match(source, /numberOfDays:\s*selectedNumberOfDays/, 'duration changes should send the selected duration in days');
assert.match(source, /challengeMode:\s*selectedChallengeMode/, 'duration changes should send the matching challenge mode');
assert.doesNotMatch(source, /size=\{20\}\s*\n\s*size=\{20\}/, 'duration selector icon should not contain duplicate props');

console.log('edit challenge category regression checks passed');
