import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => {
  const absolutePath = path.join(root, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';
};

const settings = read('app/settings.tsx');
const layout = read('app/_layout.tsx');
const route = read('app/feature-request.tsx');
const screen = read('screens/FeatureRequest.tsx');
const service = read('services/supportService.ts');
const hook = read('hooks/useSupport.ts');
const types = read('types/api.ts');

assert.match(settings, /SectionHeader title="Feature Request"/, 'feature requests must have a standalone Settings section');
assert.match(settings, /router\.push\('\/feature-request'/, 'Settings must open the dedicated route');
assert.match(route, /FeatureRequest/, 'the route must render the feature request screen');
assert.match(layout, /Stack\.Screen name="feature-request"/, 'the route must be inside the authenticated stack');
assert.match(screen, /MESSAGE_MIN_LENGTH = 10/, 'the screen must enforce the minimum length');
assert.match(screen, /MESSAGE_MAX_LENGTH = 300/, 'the screen must cap requests at 300 characters');
assert.match(screen, /What should we add, and how would it help\?/, 'the screen must prompt for both idea and value');
assert.match(screen, /FeatureRequestCategory\.CHALLENGES/, 'the screen must expose categorized requests');
assert.match(screen, /message\.trim\(\)/, 'the screen must send trimmed text');
assert.match(service, /post<FeatureRequestResponse>\('\/support\/feature-requests'/, 'the service must call the authenticated feature endpoint');
assert.match(hook, /useCreateFeatureRequest/, 'the data layer must expose a focused mutation hook');
assert.match(types, /export enum FeatureRequestCategory/, 'the API category contract must be typed');

console.log('Feature request frontend checks passed.');
