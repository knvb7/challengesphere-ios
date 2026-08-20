import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const providersSource = readText('constants/integrationProviders.ts');
assert.match(
  providersSource,
  /STRAVA:\s*\{[^}]*available:\s*false/,
  'Strava should remain visible but disabled in the integrations list'
);

const serviceSource = readText('services/stravaService.ts');
assert.match(
  serviceSource,
  /toStravaServiceError/,
  'Strava service should normalize backend/API errors before they reach the UI'
);
assert.match(
  serviceSource,
  /normalizeApiError/,
  'Strava errors should use the shared user-facing API normalization'
);
assert.doesNotMatch(
  serviceSource,
  /Add the Strava client ID and secret|not configured on the server/,
  'Strava errors must not expose server configuration instructions to users'
);
assert.doesNotMatch(
  serviceSource,
  /throw error;\s*}\s*export async function connectStrava/,
  'Strava service should not leak raw Axios status messages to the UI'
);
assert.match(
  serviceSource,
  /getStravaAuthorizationUrl/,
  'frontend should request a backend-created Strava OAuth URL'
);
assert.match(
  serviceSource,
  /connectStrava/,
  'frontend should exchange the returned auth code through the backend'
);
assert.match(
  serviceSource,
  /syncStrava/,
  'frontend should sync Strava activities through the backend'
);
assert.doesNotMatch(
  serviceSource,
  /client_secret|STRAVA_CLIENT_SECRET/i,
  'frontend must not contain the Strava client secret'
);

const hookSource = readText('hooks/useStravaIntegration.ts');
assert.match(
  hookSource,
  /WebBrowser\.openAuthSessionAsync/,
  'Strava hook should use the system browser auth session'
);
assert.match(
  hookSource,
  /makeRedirectUri/,
  'Strava hook should create an OAuth redirect URI'
);
assert.match(
  hookSource,
  /getApiErrorMessage\(loadError, 'Could not load your Strava connection\.'/,
  'genuine Strava load failures should use a readable fallback'
);
assert.match(
  serviceSource,
  /response\?\.status === 404[\s\S]*return null/,
  'the normal not-connected response should still resolve to an empty state'
);

const connectedAppsSource = readText('app/connected-apps.tsx');
assert.doesNotMatch(
  connectedAppsSource,
  /useStravaIntegration/,
  'connected apps should not initialize Strava connection state while paused'
);
assert.doesNotMatch(
  connectedAppsSource,
  /provider\.key === 'STRAVA' && isStravaConnected/,
  'Strava rows should not show active OAuth connection state while paused'
);
assert.match(
  connectedAppsSource,
  /Coming soon/,
  'connected apps should keep disabled providers visible as Coming soon'
);

const detailSource = readText('app/integration-detail.tsx');
assert.doesNotMatch(
  detailSource,
  /isStravaProvider/,
  'integration detail should not have an active Strava-specific OAuth branch while paused'
);
assert.doesNotMatch(
  detailSource,
  /Connect Strava/,
  'integration detail should not expose a Strava connect action while paused'
);
assert.doesNotMatch(
  detailSource,
  /activity:read/,
  'integration detail should not expose Strava OAuth scope copy while paused'
);
assert.match(
  detailSource,
  /Coming soon/,
  'direct Strava detail routes should fall back to the generic Coming soon state'
);

console.log('strava integration UI regression checks passed');
