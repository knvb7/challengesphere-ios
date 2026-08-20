import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readSource = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const route = readSource('app/app-support.tsx');
const layout = readSource('app/_layout.tsx');
const screen = readSource('screens/AppSupport.tsx');
const service = readSource('services/supportService.ts');
const mediaService = readSource('services/mediaService.ts');
const settings = readSource('app/settings.tsx');
const helpCenter = readSource('screens/HelpCenter.tsx');
const apiTypes = readSource('types/api.ts');

assert.match(route, /import AppSupport from '@\/screens\/AppSupport'/);
assert.match(route, /<AppSupport onBack=\{\(\) => router\.back\(\)\} \/>/);

assert.match(layout, /<Stack\.Screen name="app-support" \/>/);

assert.match(screen, /MediaSourceChooser/);
assert.match(screen, /const MAX_SCREENSHOTS = 3/);
assert.match(screen, /uploadSupportScreenshots/);
assert.match(screen, /SupportIssueType\.MEDIA_UPLOAD/);
assert.match(screen, /ironside-dev@challengesphere\.com/);
assert.doesNotMatch(screen, /support@ironside\.com/);
assert.match(screen, /selectionLimit=\{MAX_SCREENSHOTS - screenshots\.length\}/);

assert.match(apiTypes, /SUPPORT_SCREENSHOT = 'SUPPORT_SCREENSHOT'/);
assert.match(apiTypes, /export enum SupportIssueType/);
assert.match(apiTypes, /export interface CreateSupportTicketRequest/);

assert.match(mediaService, /generateSupportPresignedUrls/);
assert.match(mediaService, /\/support\/presigned-urls/);
assert.match(mediaService, /MediaType\.SUPPORT_SCREENSHOT/);

assert.match(service, /\/support\/tickets/);
assert.match(service, /createSupportTicket/);

assert.match(settings, /title="App Support"/);
assert.match(settings, /router\.push\('\/app-support' as any\)/);
assert.doesNotMatch(settings, /mailto:support@ironside\.com/);

assert.match(helpCenter, /router\.push\('\/app-support' as any\)/);
assert.doesNotMatch(helpCenter, /mailto:support@ironside\.com/);

console.log('app support checks passed');
