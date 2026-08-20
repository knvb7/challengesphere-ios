import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const sourceRoots = [
  'app',
  'screens',
  'components',
  'constants',
  'utils',
  'assets',
  'android/app/src/main/res',
  'website',
  'store-assets',
];
const supportedExtensions = new Set(['.css', '.html', '.json', '.svg', '.ts', '.tsx', '.xml']);
const files = [join(root, 'app.json')];

function collectFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(path);
    } else if (supportedExtensions.has(extname(path))) {
      files.push(path);
    }
  }
}

for (const sourceRoot of sourceRoots) {
  collectFiles(join(root, sourceRoot));
}

function rgbToHsl(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;

  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
    if (hue < 0) hue += 360;
  }

  return { hue, saturation, lightness };
}

function isPurpleRatherThanViolet(red, green, blue) {
  const { hue, saturation, lightness } = rgbToHsl(red, green, blue);
  return hue > 270 && hue <= 305 && saturation >= 0.45 && lightness < 0.94;
}

const alternatePrimaryPattern = /#(?:6d36ff|7c3aed|8b5cf6|a855f7|6d35ff|6c32ff)\b/i;
const violations = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const label = relative(root, file);

  const alternatePrimary = source.match(alternatePrimaryPattern);
  if (alternatePrimary) {
    violations.push(`${label}: alternate violet primary ${alternatePrimary[0]}`);
  }

  if (/--purple(?:\b|-)|\b(?:color|background(?:-color)?):\s*purple\b/i.test(source)) {
    violations.push(`${label}: purple-named CSS token or color`);
  }

  for (const match of source.matchAll(/#([0-9a-f]{6})(?:[0-9a-f]{2})?\b/gi)) {
    const value = match[1];
    const channels = [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
    if (isPurpleRatherThanViolet(...channels)) {
      violations.push(`${label}: ${match[0]} is purple/magenta; use the violet palette`);
    }
  }

  for (const match of source.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi)) {
    const channels = match.slice(1, 4).map(Number);
    if (isPurpleRatherThanViolet(...channels)) {
      violations.push(`${label}: ${match[0]} is purple/magenta; use the violet palette`);
    }
  }
}

assert.deepEqual(violations, [], `Found non-canonical purple colors:\n${violations.join('\n')}`);

const paletteSource = readFileSync(join(root, 'constants/Colors.ts'), 'utf8');
for (const [role, value] of [
  ['primary', '#4700EC'],
  ['accent', '#6C42E8'],
  ['surface', '#F0ECFF'],
  ['border', '#DDD4FF'],
  ['soft', '#7B55E7'],
  ['text', '#5B3FE5'],
]) {
  assert.match(paletteSource, new RegExp(`${role}: ['"]${value}['"]`), `Missing canonical violet ${role}`);
}

console.log('uniform violet color regression checks passed');
