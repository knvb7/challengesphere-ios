import fs from 'node:fs';
import path from 'node:path';

const roots = ['app', 'components', 'hooks', 'providers', 'screens', 'services', 'utils'];
const sourceFiles = roots.flatMap((root) => walk(root));

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (/console\.(?:log|debug|info|warn|error)\s*\(/.test(source)) {
    throw new Error(`Mobile source must not emit potentially sensitive console logs: ${file}`);
  }
}

console.log('sensitive logging regression checks passed');

function walk(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(root, entry.name);
    if (entry.isDirectory()) return walk(child);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [child] : [];
  });
}
