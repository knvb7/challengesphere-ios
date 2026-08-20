import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const uiFiles = [
  'app/(tabs)/create.tsx',
  'app/edit-challenge.tsx',
  'app/(tabs)/challenges.tsx',
  'components/common/ImageUploader.tsx',
  'screens/HelpCenter.tsx',
];

const forbiddenPatterns = [
  /\bVideo\b/,
  /\bVideos\b/,
  /\bvideo\b/,
  /\bvideos\b/,
  /videocam/,
  /MediaTypeOptions\.Videos/,
  /expo-av/,
  /allowVideo/,
];

for (const file of uiFiles) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  for (const pattern of forbiddenPatterns) {
    assert.equal(
      pattern.test(source),
      false,
      `${file} should not expose video UI/functionality (${pattern})`
    );
  }
}

console.log('no video UI regression checks passed');
