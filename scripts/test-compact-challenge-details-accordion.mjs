import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = readFileSync(
  path.join(root, 'components/common/ChallengeDetailsOverview.tsx'),
  'utf8',
);

assert.match(
  source,
  /const \[detailsExpanded, setDetailsExpanded\] = useState\(false\)/,
  'challenge metadata should start collapsed on every mount',
);
assert.match(source, /accessibilityRole="button"/);
assert.match(source, /accessibilityState=\{\{ expanded: detailsExpanded \}\}/);
assert.match(
  source,
  /accessibilityLabel=\{detailsExpanded \? 'Hide challenge details' : 'Show challenge details'\}/,
);
assert.match(source, /detailsExpanded \? 'Show less' : 'Show more'/);
assert.match(source, /detailsExpanded && \(/, 'metadata rows should render only after expansion');
assert.match(source, /categoryPills\.join\(', '\) \|\| 'General'/);
assert.match(source, /duration \|\| `\$\{numberOfDays \|\| 1\} days`/);
assert.match(source, /label="Timeline"/);
assert.match(source, /formatDate\(startDate\)/);
assert.match(source, /formatDate\(endDate\)/);
assert.match(source, /label="Created" value=\{formatDateTime\(createdAt\)\}/);
assert.match(source, /label="Visibility"[\s\S]*value=\{visibility\}/);
assert.match(source, /visibleTags\.length > 0/);
assert.doesNotMatch(source, /styles\.detailGrid/);
assert.doesNotMatch(source, /const DetailTile/);

console.log('compact challenge details accordion checks passed');
