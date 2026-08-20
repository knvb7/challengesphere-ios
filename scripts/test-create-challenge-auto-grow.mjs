import assert from 'node:assert/strict';
import fs from 'node:fs';

const createChallengeSource = fs.readFileSync('app/(tabs)/create.tsx', 'utf8');
const customTextInputSource = fs.readFileSync('components/common/CustomTextInput.tsx', 'utf8');

for (const label of ['Description', 'Rules & Guidelines', 'Rewards & Benefits']) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const autoGrowingField = new RegExp(
    `label="${escapedLabel}"[\\s\\S]*?multiline[\\s\\S]*?autoGrow[\\s\\S]*?style=\\{styles\\.textArea\\}[\\s\\S]*?\\/>`,
  );

  assert.match(
    createChallengeSource,
    autoGrowingField,
    `${label} should grow with its content`,
  );
}

const textAreaStyle = createChallengeSource.match(/textArea:\s*\{([\s\S]*?)\n\s*\},/)?.[1] ?? '';
assert.match(textAreaStyle, /minHeight:\s*100,/, 'long-form fields should keep a readable initial height');
assert.doesNotMatch(textAreaStyle, /\bheight:/, 'long-form fields should not have a fixed height');

assert.match(customTextInputSource, /autoGrow\?: boolean;/);
assert.match(
  customTextInputSource,
  /event\.nativeEvent\.contentSize\.height/,
  'auto-growing inputs should measure their rendered content',
);
assert.match(
  customTextInputSource,
  /scrollEnabled=\{shouldAutoGrow \? false : scrollEnabled\}/,
  'auto-growing inputs should not scroll internally',
);
assert.match(
  customTextInputSource,
  /\{ height: contentHeight \}/,
  'auto-growing inputs should apply the measured content height',
);

console.log('create challenge auto-growing field checks passed');
