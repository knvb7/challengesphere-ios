const SHEET_NAME = 'Website Leads';
const SPREADSHEET_ID_OR_URL = 'PASTE_YOUR_GOOGLE_SHEET_ID_OR_URL_HERE';
const ACCEPT_PUBLIC_WRITES = false;
const WEBHOOK_SECRET_PROPERTY = 'CHALLENGESPHERE_WEBHOOK_SECRET';
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 12;
const RATE_LIMIT_CACHE_PREFIX = 'website_lead_rate_v1_';

const FIELD_MAX_LENGTHS = Object.freeze({
  event: 64,
  name: 120,
  email: 320,
  interest: 120,
  message: 2000,
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
  viewport: 64
});

function doPost(event) {
  const payload = parsePayload_(event);

  if (!isAuthorizedPayload_(payload)) {
    return json_({ ok: false, error: 'Lead collection is temporarily unavailable.' });
  }

  const lock = LockService.getScriptLock();
  let lockAcquired = false;

  try {
    lockAcquired = lock.tryLock(10000);
    if (!lockAcquired) {
      return json_({ ok: false, error: 'Request temporarily unavailable. Please try again.' });
    }

    if (!consumeRateLimit_(payload.visitorId)) {
      return json_({ ok: false, error: 'Too many requests. Please try again later.' });
    }

    const spreadsheet = getSpreadsheet_();
    const sheet = getOrCreateSheet_(spreadsheet);
    const timestamp = new Date();

    sheet.appendRow([
      timestamp,
      sanitizeCell_(payload.event, FIELD_MAX_LENGTHS.event),
      sanitizeCell_(payload.name, FIELD_MAX_LENGTHS.name),
      sanitizeCell_(payload.email, FIELD_MAX_LENGTHS.email),
      sanitizeCell_(payload.interest, FIELD_MAX_LENGTHS.interest),
      sanitizeCell_(payload.message, FIELD_MAX_LENGTHS.message),
      sanitizeCell_(payload.visitorId, FIELD_MAX_LENGTHS.visitorId),
      sanitizeCell_(payload.page, FIELD_MAX_LENGTHS.page),
      sanitizeCell_(payload.referrer, FIELD_MAX_LENGTHS.referrer),
      sanitizeCell_(payload.source, FIELD_MAX_LENGTHS.source),
      sanitizeCell_(payload.medium, FIELD_MAX_LENGTHS.medium),
      sanitizeCell_(payload.campaign, FIELD_MAX_LENGTHS.campaign),
      sanitizeCell_(payload.userAgent, FIELD_MAX_LENGTHS.userAgent),
      sanitizeCell_(payload.language, FIELD_MAX_LENGTHS.language),
      sanitizeCell_(payload.timezone, FIELD_MAX_LENGTHS.timezone),
      sanitizeCell_(payload.screen, FIELD_MAX_LENGTHS.screen),
      sanitizeCell_(payload.viewport, FIELD_MAX_LENGTHS.viewport)
    ]);

    return json_({ ok: true });
  } catch (_error) {
    return json_({ ok: false, error: 'Unable to process request. Please try again.' });
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

function isAuthorizedPayload_(payload) {
  if (ACCEPT_PUBLIC_WRITES) {
    return true;
  }

  const configuredSecret = PropertiesService.getScriptProperties().getProperty(WEBHOOK_SECRET_PROPERTY);
  const suppliedSecret = payload && payload.serverSecret;

  return Boolean(configuredSecret) && suppliedSecret === configuredSecret;
}

function doGet() {
  return json_({ ok: true, message: 'ChallengeSphere interest webhook is running.' });
}

function getSpreadsheet_() {
  const spreadsheetId = extractSpreadsheetId_(SPREADSHEET_ID_OR_URL);

  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('No spreadsheet found. Paste your Google Sheet ID or URL into SPREADSHEET_ID_OR_URL.');
  }

  return active;
}

function extractSpreadsheetId_(value) {
  if (!value || value === 'PASTE_YOUR_GOOGLE_SHEET_ID_OR_URL_HERE') {
    return '';
  }

  const match = String(value).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : String(value).trim();
}

function sanitizeCell_(value, maxLength) {
  let sanitized = value == null ? '' : String(value);
  sanitized = sanitized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  sanitized = sanitized.slice(0, maxLength);

  if (/^\s*[=+\-@]/.test(sanitized)) {
    sanitized = `'${sanitized}`.slice(0, maxLength);
  }

  return sanitized;
}

function consumeRateLimit_(visitorId) {
  const normalizedVisitorId = normalizeRateLimitIdentifier_(visitorId);
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    normalizedVisitorId,
    Utilities.Charset.UTF_8
  );
  const digestKey = Utilities.base64EncodeWebSafe(digest).replace(/=+$/, '');
  const cacheKey = `${RATE_LIMIT_CACHE_PREFIX}${digestKey}`;
  const cache = CacheService.getScriptCache();
  const currentCount = Number(cache.get(cacheKey) || '0');

  if (!Number.isFinite(currentCount) || currentCount < 0) {
    return false;
  }
  if (currentCount >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  cache.put(cacheKey, String(currentCount + 1), RATE_LIMIT_WINDOW_SECONDS);
  return true;
}

function normalizeRateLimitIdentifier_(visitorId) {
  const normalized = (visitorId == null ? '' : String(visitorId))
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim()
    .toLowerCase()
    .slice(0, FIELD_MAX_LENGTHS.visitorId);

  return normalized || 'anonymous';
}

function testAppendLead() {
  const result = doPost({
    parameter: {
      serverSecret: PropertiesService.getScriptProperties().getProperty(WEBHOOK_SECRET_PROPERTY),
      event: 'manual_test',
      name: 'Test User',
      email: 'test@example.com',
      interest: 'Testing Google Sheets webhook',
      message: 'If this row appears, Apps Script can write to the sheet.',
      visitorId: 'apps-script-test',
      page: 'Apps Script editor',
      referrer: '',
      source: 'manual',
      medium: 'test',
      campaign: '',
      userAgent: 'Apps Script',
      language: '',
      timezone: Session.getScriptTimeZone(),
      screen: '',
      viewport: ''
    }
  });

  Logger.log(result.getContent());
}

function getOrCreateSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp',
      'Event',
      'Name',
      'Email',
      'Interest',
      'Message',
      'Visitor ID',
      'Page',
      'Referrer',
      'UTM Source',
      'UTM Medium',
      'UTM Campaign',
      'User Agent',
      'Language',
      'Timezone',
      'Screen',
      'Viewport'
    ]);
  }

  return sheet;
}

function parsePayload_(event) {
  if (event && event.parameter && Object.keys(event.parameter).length > 0) {
    return event.parameter;
  }

  if (!event || !event.postData || !event.postData.contents) {
    return {};
  }

  try {
    return JSON.parse(event.postData.contents);
  } catch (error) {
    return event.parameter || {};
  }
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
