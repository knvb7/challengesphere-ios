import assert from 'node:assert/strict';
import fs from 'node:fs';

const analyticsConfig = fs.readFileSync(new URL('../website/analytics-config.js', import.meta.url), 'utf8');
const script = fs.readFileSync(new URL('../website/script.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../website/index.html', import.meta.url), 'utf8');
const functionSource = fs.readFileSync(new URL('../website/netlify/functions/interest.js', import.meta.url), 'utf8');
const appsScript = fs.readFileSync(new URL('../website/google-sheets-webhook.gs', import.meta.url), 'utf8');

assert.match(
  analyticsConfig,
  /window\.CHALLENGESPHERE_ANALYTICS_ENDPOINT = '\/\.netlify\/functions\/interest'/,
  'website should submit interest events to the same-origin Netlify function',
);

assert.doesNotMatch(
  script,
  /mode:\s*'no-cors'/,
  'frontend should not use no-cors because it hides failed submissions',
);

assert.match(
  index,
  /name="website"/,
  'interest form should include a honeypot field',
);

assert.match(
  index,
  /data-netlify="true"/,
  'interest form should be available to Netlify Forms as a fallback',
);

assert.match(
  script,
  /postToNetlifyForm/,
  'form submit should fall back to Netlify Forms when the server-side Google Sheets bridge is not configured',
);

assert.match(
  functionSource,
  /CHALLENGESPHERE_APPS_SCRIPT_URL/,
  'Netlify function should read the Apps Script URL from an environment variable',
);

assert.match(
  functionSource,
  /CHALLENGESPHERE_WEBHOOK_SECRET/,
  'Netlify function should forward a private webhook secret',
);

assert.match(
  appsScript,
  /WEBHOOK_SECRET_PROPERTY = 'CHALLENGESPHERE_WEBHOOK_SECRET'/,
  'Apps Script should verify the server-side webhook secret',
);
