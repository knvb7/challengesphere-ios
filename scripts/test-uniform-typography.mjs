import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const appRoots = ['app', 'screens', 'components'];

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : extname(path) === '.tsx' ? [path] : [];
  });
}

for (const relativeRoot of appRoots) {
  for (const file of sourceFiles(join(root, relativeRoot))) {
    const source = readFileSync(file, 'utf8');
    const label = file.slice(root.length + 1);

    assert.doesNotMatch(
      source,
      /fontFamily\s*:/,
      `${label} must inherit the app's native system sans-serif`,
    );
    assert.doesNotMatch(
      source,
      /fontWeight:\s*['"](?:800|900|bold)['"]/,
      `${label} must keep font weights within the softer 400–700 scale`,
    );
  }
}

for (const relativeFile of [
  'website/styles.css',
  'website/invite.html',
  'store-assets/feature-graphic-clean.html',
  'store-assets/feature-graphic-social.html',
]) {
  const source = readFileSync(join(root, relativeFile), 'utf8');
  assert.doesNotMatch(source, /font-family:[^;}]*\bInter\b/i, `${relativeFile} must use the system font stack`);
  assert.doesNotMatch(
    source,
    /font-weight:\s*(?:7(?:[1-9]\d|\d{3,})|[89]\d{2,})/,
    `${relativeFile} must keep font weights at 700 or below`,
  );
}

console.log('uniform typography regression checks passed');
