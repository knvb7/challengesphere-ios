import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const createScreen = readFileSync(
  path.join(process.cwd(), 'app/(tabs)/create.tsx'),
  'utf8',
);

const headingIndex = createScreen.indexOf('Private by default');
const warningIndex = createScreen.indexOf(
  'Challenge visibility cannot be changed after creation.',
);
const privateOptionIndex = createScreen.indexOf('Private Challenge', warningIndex);
const publicOptionIndex = createScreen.indexOf('Public Challenge', privateOptionIndex);

assert.ok(headingIndex >= 0, 'visibility step should retain its heading');
assert.ok(
  warningIndex > headingIndex &&
    privateOptionIndex > warningIndex &&
    publicOptionIndex > privateOptionIndex,
  'the immutable-visibility warning should appear before both visibility choices',
);
assert.match(
  createScreen,
  /accessibilityLabel="Important: Challenge visibility cannot be changed after creation\."/,
  'the visibility warning should have a concise accessible label',
);
assert.match(
  createScreen,
  /style=\{styles\.visibilityWarningCard\}[\s\S]*?accessibilityRole="alert"[\s\S]*?accessibilityLiveRegion="polite"/,
  'the warning card should be announced as a polite accessibility alert',
);
assert.match(
  createScreen,
  /visibilityWarningCard:\s*\{[\s\S]*?borderColor:[\s\S]*?backgroundColor:/,
  'the immutable-visibility message should retain distinct warning styling',
);

console.log('challenge visibility warning regression check passed');
