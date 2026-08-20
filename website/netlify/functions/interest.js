const FIELD_MAX_LENGTHS = Object.freeze({
  event: 64,
  visitorId: 128,
  page: 2048,
  referrer: 2048,
  source: 256,
  medium: 256,
  campaign: 256,
  userAgent: 512,
  language: 64,
  timezone: 128,
  screen: 64,
  viewport: 64,
});

const EVENT_ALLOWLIST = new Set([
  'page_view',
  'hero_beta_click',
  'tester_opt_in_click',
  'google_play_click',
  'app_store_click',
]);

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitBuckets = new Map();

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
});

const sanitize = (value, maxLength) => {
  let sanitized = value == null ? '' : String(value);
  sanitized = sanitized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  sanitized = sanitized.slice(0, maxLength);

  if (/^\s*[=+\-@]/.test(sanitized)) {
    sanitized = `'${sanitized}`.slice(0, maxLength);
  }

  return sanitized;
};

const parseBody = (event) => {
  const rawBody = event.body || '';

  if (!rawBody) return {};

  const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';

  if (contentType.includes('application/json')) {
    return JSON.parse(rawBody);
  }

  return Object.fromEntries(new URLSearchParams(rawBody).entries());
};

const getClientIdentifier = (event, payload) => {
  const forwardedFor = event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'] || '';
  const ip = forwardedFor.split(',')[0].trim() || event.headers['client-ip'] || 'unknown-ip';
  const visitorId = sanitize(payload.visitorId, FIELD_MAX_LENGTHS.visitorId) || 'anonymous';

  return `${ip}:${visitorId}`;
};

const consumeRateLimit = (key) => {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now - bucket.startedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  bucket.count += 1;
  return true;
};

const validatePayload = (payload) => {
  const eventName = sanitize(payload.event, FIELD_MAX_LENGTHS.event);

  if (!EVENT_ALLOWLIST.has(eventName)) {
    return 'Unsupported event.';
  }

  if (payload.website) {
    return 'Invalid submission.';
  }

  return '';
};

const buildForwardPayload = (payload) => {
  const forwardPayload = {
    serverSecret: process.env.CHALLENGESPHERE_WEBHOOK_SECRET || '',
  };

  Object.entries(FIELD_MAX_LENGTHS).forEach(([key, maxLength]) => {
    forwardPayload[key] = sanitize(payload[key], maxLength);
  });

  return forwardPayload;
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(204, {});
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed.' });
  }

  const appsScriptUrl = process.env.CHALLENGESPHERE_APPS_SCRIPT_URL;
  const webhookSecret = process.env.CHALLENGESPHERE_WEBHOOK_SECRET;

  if (!appsScriptUrl || !webhookSecret) {
    return json(503, { ok: false, error: 'Website analytics is not configured yet.' });
  }

  let payload;
  try {
    payload = parseBody(event);
  } catch (error) {
    return json(400, { ok: false, error: 'Invalid request body.' });
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return json(400, { ok: false, error: validationError });
  }

  if (!consumeRateLimit(getClientIdentifier(event, payload))) {
    return json(429, { ok: false, error: 'Too many requests. Please try again later.' });
  }

  const response = await fetch(appsScriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: new URLSearchParams(buildForwardPayload(payload)).toString(),
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok || data?.ok === false) {
    return json(502, { ok: false, error: data?.error || 'Unable to record this website event right now.' });
  }

  return json(200, { ok: true });
};
