import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const providersSource = readText('constants/integrationProviders.ts');
assert.match(providersSource, /HEVY:\s*\{[^}]*available:\s*false/, 'Hevy should remain visible but disabled in the integrations list');

const serviceSource = readText('services/hevyService.ts');
assert.match(serviceSource, /\/integrations\/hevy\/connect/, 'frontend should save Hevy API keys through the backend');
assert.match(serviceSource, /\/integrations\/hevy\/sync/, 'frontend should sync Hevy workouts through the backend');
assert.match(serviceSource, /toHevyServiceError/, 'Hevy service should normalize backend errors');

const hookSource = readText('hooks/useHevyIntegration.ts');
assert.match(hookSource, /setApiKey\(''\)/, 'Hevy API key should be cleared from local state after saving');
assert.match(hookSource, /saveApiKey/, 'Hevy hook should expose a save action');

const detailSource = readText('app/integration-detail.tsx');
assert.doesNotMatch(detailSource, /isHevyProvider/, 'integration detail should not have an active Hevy-specific branch while paused');
assert.doesNotMatch(detailSource, /Save Hevy Key/, 'integration detail should not expose a Hevy save action while paused');
assert.doesNotMatch(detailSource, /Sync Hevy|handleSyncHevy/, 'integration detail should not expose a Hevy sync action');
assert.doesNotMatch(detailSource, /https:\/\/hevy\.com\/settings\?developer/, 'Hevy detail should not link users to developer settings while paused');
assert.doesNotMatch(detailSource, /Open Hevy Settings/, 'Hevy detail should not provide setup actions while paused');
assert.doesNotMatch(detailSource, /Generate API Key|Copy the key|Hevy Pro|beta testing Hevy API/, 'Hevy detail should not expose setup instructions while paused');
assert.match(detailSource, /Coming soon/, 'direct Hevy detail routes should fall back to the generic Coming soon state');

const connectedAppsSource = readText('app/connected-apps.tsx');
assert.doesNotMatch(connectedAppsSource, /useHevyIntegration/, 'connected apps should not initialize Hevy connection state while paused');
assert.doesNotMatch(connectedAppsSource, /provider\.key === 'HEVY' && isHevyConnected/, 'Hevy rows should not show active connection state while paused');
assert.match(connectedAppsSource, /Coming soon/, 'connected apps should keep disabled providers visible as Coming soon');

const challengeDetailsSource = readText('app/challenge-details.tsx');
assert.doesNotMatch(challengeDetailsSource, /showHevySyncCard/, 'challenge details should not render a Hevy sync card');
assert.doesNotMatch(challengeDetailsSource, /showIntegrationSyncCard\s*=\s*[^;]*showHevySyncCard/, 'Hevy should not expose a sync button on the challenge detail card');

console.log('hevy integration UI regression checks passed');
