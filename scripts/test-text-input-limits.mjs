import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const sourceRoots = ['app', 'components', 'screens'];
const failures = [];

function visitFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return visitFiles(fullPath);
    return entry.isFile() && fullPath.endsWith('.tsx') ? [fullPath] : [];
  });
}

for (const filePath of sourceRoots.flatMap((directory) => visitFiles(path.join(root, directory)))) {
  if (filePath.endsWith(path.join('components', 'common', 'CustomTextInput.tsx'))) {
    continue;
  }

  const source = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function visit(node) {
    if (ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sourceFile);
      if (tag === 'TextInput' || tag === 'CustomTextInput') {
        const hasMaxLength = node.attributes.properties.some(
          (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === 'maxLength'
        );
        if (!hasMaxLength) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          failures.push(`${path.relative(root, filePath)}:${line}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

assert.deepEqual(
  failures,
  [],
  `Every user-editable text field must declare maxLength. Missing: ${failures.join(', ')}`
);

console.log('text input length limit checks passed');
