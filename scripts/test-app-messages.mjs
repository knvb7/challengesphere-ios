import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

assert.equal(existsSync(new URL('../components/AppMessageHost.tsx', import.meta.url)), true);
assert.equal(existsSync(new URL('../utils/appAlert.ts', import.meta.url)), true);

const rootLayout = read('app/_layout.tsx');
const appAlert = read('utils/appAlert.ts');
const messageHost = read('components/AppMessageHost.tsx');
const smallPopup = read('utils/smallPopup.ts');

assert.match(rootLayout, /<AppMessageHost \/>/, 'root layout should mount one in-app message host');
assert.match(appAlert, /if \(buttons\?\.length\)/, 'action confirmations should remain native dialogs');
assert.match(appAlert, /const requiresDecision/, 'single passive OK buttons should use the modern banner');
assert.match(appAlert, /showAppMessage/, 'noninteractive alerts should use the in-app message banner');
assert.match(messageHost, /accessibilityLiveRegion="polite"/, 'messages should be announced accessibly');
assert.match(smallPopup, /showAppMessage/, 'small popups should share the same modern message surface');

console.log('app message surface checks passed');
