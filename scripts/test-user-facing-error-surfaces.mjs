import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const sourceRoots = ['app', 'screens', 'components', 'hooks'];
const sourceExtensions = new Set(['.ts', '.tsx']);

const collectSourceFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return sourceExtensions.has(extname(entry.name)) ? [path] : [];
  }));
  return nestedFiles.flat();
};

const files = (await Promise.all(
  sourceRoots.map((directory) => collectSourceFiles(join(root, directory))),
)).flat();

const forbiddenPatterns = [
  {
    label: 'raw error.message rendering',
    pattern: /\b(?:err|error|[a-z][A-Za-z]*Error)\?*\.message\b|\((?:err|error)\s+as\s+any\)\?*\.message\b/,
  },
  {
    label: 'raw backend response message rendering',
    pattern: /\.response\?*\.data\?*\.(?:errorMessage|message|error)\b/,
  },
  {
    label: 'developer-facing unknown error copy',
    pattern: /["']Unknown error["']/,
  },
];

for (const file of files) {
  const source = (await readFile(file, 'utf8'))
    // This is an internal control-flow sentinel and is never rendered.
    .replace(/error instanceof Error && error\.message === 'missing-challenge'/g, 'known-sentinel');

  for (const { label, pattern } of forbiddenPatterns) {
    assert.doesNotMatch(source, pattern, `${relative(root, file)} contains ${label}`);
  }
}

const [appAlert, appMessage] = await Promise.all([
  readFile(join(root, 'utils/appAlert.ts'), 'utf8'),
  readFile(join(root, 'utils/appMessage.ts'), 'utf8'),
]);
assert.match(
  appAlert,
  /const safeMessage = message \? getSafeErrorMessage\(message\)/,
  'dialogs must sanitize final error copy',
);
assert.match(
  appMessage,
  /const safeMessage = message\.message[\s\S]*getSafeErrorMessage\(message\.message\)/,
  'toasts must sanitize final error copy',
);
assert.match(appAlert, /getSafeErrorTitle/, 'dialogs must sanitize raw error titles');
assert.match(appMessage, /getSafeErrorTitle/, 'toasts must sanitize raw error titles');

console.log('User-facing error surfaces use the centralized error translator.');
