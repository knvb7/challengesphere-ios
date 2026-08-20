import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readSource = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const layout = readSource('app/_layout.tsx');
const settings = readSource('app/settings.tsx');
const screen = readSource('app/whats-next.tsx');

const authenticatedRoutesStart = layout.indexOf('<Stack.Protected guard={isAuthenticated}>');
const authenticatedRoutesEnd = layout.indexOf('</Stack.Protected>', authenticatedRoutesStart);
const whatsNextRouteIndex = layout.indexOf('<Stack.Screen name="whats-next" />');
assert.ok(
  authenticatedRoutesStart >= 0
    && whatsNextRouteIndex > authenticatedRoutesStart
    && whatsNextRouteIndex < authenticatedRoutesEnd,
  'the roadmap should be registered as an authenticated route',
);
assert.match(settings, /<SectionHeader title="Shape ChallengeSphere" \/>/);
assert.match(settings, /Integrations and the product roadmap are intentionally hidden from Settings for now\./);
assert.doesNotMatch(settings, /title="What's next"/);
assert.doesNotMatch(settings, /router\.push\('\/whats-next' as any\)/);
assert.match(settings, /title="Request a Feature"/);

const preferencesIndex = settings.indexOf('<SectionHeader title="App Preferences" />');
const requestIndex = settings.indexOf('title="Request a Feature"');
const helpIndex = settings.indexOf('<SectionHeader title="Help & Legal" />');
assert.ok(preferencesIndex < requestIndex, 'product feedback should follow App Preferences');
assert.ok(requestIndex < helpIndex, 'product-shaping links should appear before Help & Legal');

const roadmapTitles = [
  'Integrations',
  'Video uploads',
  'Global feed',
];
for (const title of roadmapTitles) {
  assert.ok(screen.includes(`title: '${title}'`), `missing roadmap item: ${title}`);
}
const roadmapItemCount = [...screen.matchAll(/^\s{4}title: '[^']+',$/gm)].length;
assert.equal(roadmapItemCount, roadmapTitles.length, 'the tested roadmap items should match the screen');
assert.equal(roadmapItemCount, 3, 'the roadmap should contain only the three approved priorities');
assert.doesNotMatch(screen, /Coding activity sync|Fitness & health sync|Challenge rematches|Flexible check-ins/);
assert.doesNotMatch(screen, /status:|timeline|much more/i, 'the roadmap UI should stay simple');
assert.match(screen, /Plans may evolve as we learn/);
assert.doesNotMatch(screen, /router\.push\('\/feature-request' as any\)/, 'the Settings row already owns feature requests');
assert.match(screen, /accessibilityLabel="Go back"/);
assert.doesNotMatch(screen, /(?:\bQ[1-4]\b|January|February|March|April|May|June|July|August|September|October|November|December)?\s*\b20\d{2}\b/i, 'roadmap copy should not make date promises');

console.log("what's next roadmap checks passed");
