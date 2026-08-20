export type ApiErrorKind =
  | 'offline'
  | 'timeout'
  | 'rate-limit'
  | 'authentication'
  | 'permission'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'server'
  | 'cancelled'
  | 'unknown';

export type ApiErrorPresentation = {
  title: string;
  message: string;
  kind: ApiErrorKind;
  status?: number;
  retryable: boolean;
  retryAfterSeconds?: number;
};

export const DEFAULT_API_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const GENERIC_HTTP_ERROR = /^Request failed with status code \d+$/i;
const MAX_BACKEND_MESSAGE_LENGTH = 240;
const TECHNICAL_MESSAGE_PATTERNS = [
  /internal server error/i,
  /request failed with status/i,
  /status code\s*\d{3}/i,
  /\b(?:axios|fetch|http|jdbc|sql|database|redis|hibernate)\b.*(?:error|exception|failed)/i,
  /\b(?:error|exception|failed|failure)\b.*\b(?:axios|fetch|http|jdbc|sql|database|redis|hibernate)\b/i,
  /\b(?:s3|aws|amazonaws|presigned|signaturedoesnotmatch|accessdenied)\b/i,
  /\b(?:exception|nullpointer|stack trace|traceback|typeerror|referenceerror|syntaxerror)\b/i,
  /\b(?:econnrefused|econnreset|enotfound|enetunreach|eai_again|etimedout)\b/i,
  /\b(?:org\.springframework|java\.|kotlin\.|node_modules)\b/i,
  /\b(?:cannot read propert|cannot invoke|no static resource|handler dispatch failed|refresh response)\b/i,
  /\b(?:duplicate key value|unique constraint|foreign key constraint|sqlstate)\b/i,
  /\b(?:not configured|configuration missing|client id|client secret|environment variable)\b/i,
  /\b(?:database|redis|postgres(?:ql)?|mysql|datasource|upstream service)\s+(?:is\s+)?(?:unavailable|down|offline)\b/i,
  /\b(?:api[_ -]?key|client[_ -]?secret|authorization|bearer|access[_ -]?token|refresh[_ -]?token)\b\s*[:=]/i,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /\b(?:file|content):\/\//i,
  /\blocal (?:uri|path)\b/i,
  /\bwhitelabel error page\b/i,
  /<\/?(?:html|body|head|pre)\b/i,
  /^(?:\{[\s\S]*\}|\[[\s\S]*\])$/,
  /(?:\/Users\/|\/var\/|\/opt\/|[A-Z]:\\)/,
];

const GENERIC_BACKEND_MESSAGES = [
  /^(?:an? )?error(?: occurred)?[.!]?$/i,
  /^(?:an? )?(?:unknown|unexpected) error(?: occurred)?[.!]?$/i,
  /^(?:request )?failed[.!]?$/i,
  /^(?:bad request|forbidden|unauthorized|access denied|not found|conflict|unprocessable entity|method not allowed)[.!]?$/i,
  /^(?:validation failed|constraint violation|data integrity violation)[.!]?$/i,
  /^(?:malformed json request|missing required parameter|invalid parameter type|invalid argument|invalid operation state)[.!]?$/i,
  /^(?:payload|request entity) too large[.!]?$/i,
  /^unsupported media type[.!]?$/i,
  /^(?:internal )?server error[.!]?$/i,
  /^(?:service|server|api) unavailable[.!]?$/i,
];
const GENERIC_RATE_LIMIT_MESSAGE = /^(?:(?:the )?(?:request|user|client|account|you)\s+(?:has |have |is |are )?(?:been |being )?)?(?:rate limit(?:ing|ed| exceeded)?|(?:call|request) limit exceeded|too many requests)(?:[.!]?\s*(?:please\s+)?(?:wait|try again)(?:\s+(?:in|after|for))?(?:\s+\d+\s+(?:seconds?|minutes?|hours?|days?))?(?:\s+later)?[.!]?)?$/i;
const RATE_LIMIT_SIGNAL = /\b(?:rate limit(?:ing|ed)?|too many requests)\b/i;
const ACTIONABLE_INTEGRATION_MESSAGE = /\b(?:strava|hevy|leetcode|codeforces|reconnect|api key|subscription)\b/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asTrimmedMessage = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed || null;
};

const isSafeBackendMessage = (message: string): boolean =>
  message.length <= MAX_BACKEND_MESSAGE_LENGTH &&
  !GENERIC_HTTP_ERROR.test(message) &&
  !GENERIC_BACKEND_MESSAGES.some((pattern) => pattern.test(message)) &&
  !TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));

const getStatus = (error: unknown): number | undefined => {
  if (!isRecord(error)) return undefined;
  const response = isRecord(error.response) ? error.response : null;
  const responseData = response && isRecord(response.data) ? response.data : null;
  const status = response?.status
    ?? responseData?.status
    ?? responseData?.statusCode
    ?? responseData?.errorCode
    ?? error.status
    ?? error.statusCode;
  if (typeof status === 'number' && Number.isFinite(status)) return status;
  if (typeof status === 'string' && /^\d{3}$/.test(status.trim())) return Number(status);
  return undefined;
};

const getResponseData = (error: unknown): unknown => {
  if (!isRecord(error) || !isRecord(error.response)) return undefined;
  return error.response.data;
};

export const getApiErrorCode = (error: unknown): string | null => {
  if (!isRecord(error)) return null;
  const responseData = getResponseData(error);
  const data = isRecord(responseData) ? responseData : null;
  const code = data?.code ?? error.apiCode;
  return typeof code === 'string' && code.trim() ? code.trim().toUpperCase() : null;
};

const getHeader = (error: unknown, name: string): unknown => {
  if (!isRecord(error) || !isRecord(error.response)) return undefined;
  const headers = error.response.headers;
  if (!headers) return undefined;
  if (isRecord(headers)) {
    if (typeof headers.get === 'function') {
      const value = (headers.get as (headerName: string) => unknown)(name);
      if (value !== undefined && value !== null) return value;
    }
    const normalizedName = name.toLowerCase();
    const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === normalizedName);
    if (entry) return entry[1];
  }
  return undefined;
};

const getRetryAfterSeconds = (error: unknown): number | undefined => {
  const responseData = getResponseData(error);
  const data = isRecord(responseData) ? responseData : null;
  const raw = getHeader(error, 'retry-after')
    ?? data?.retryAfterSeconds
    ?? data?.retryAfter;

  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.ceil(raw);
  }
  if (typeof raw !== 'string' || !raw.trim()) return undefined;

  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);

  const retryAt = new Date(raw).getTime();
  if (!Number.isFinite(retryAt)) return undefined;
  return Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));
};

const getRawCandidates = (error: unknown): string[] => {
  if (!isRecord(error)) {
    const message = asTrimmedMessage(error);
    return message ? [message] : [];
  }

  const responseData = getResponseData(error);
  const data = isRecord(responseData) ? responseData : null;
  const nestedError = data && isRecord(data.error) ? data.error : null;
  const candidates = [
    typeof responseData === 'string' ? responseData : null,
    data?.userMessage,
    data?.responseMessage,
    data?.errorMessage,
    data?.message,
    typeof data?.error === 'string' ? data.error : null,
    data?.detail,
    nestedError?.userMessage,
    nestedError?.responseMessage,
    nestedError?.errorMessage,
    nestedError?.message,
    error.__apiErrorNormalized === true ? null : error.message,
  ];

  return candidates
    .map(asTrimmedMessage)
    .filter((message): message is string => message !== null);
};

const findSafeMessage = (error: unknown): string | null =>
  getRawCandidates(error).find(isSafeBackendMessage) ?? null;

const getTransportKind = (error: unknown): 'offline' | 'timeout' | 'cancelled' | null => {
  if (!isRecord(error)) return null;
  const code = asTrimmedMessage(error.code)?.toUpperCase();
  const message = getRawCandidates(error).join(' ').toLowerCase();

  if (
    code === 'ERR_CANCELED' ||
    (code === 'ECONNABORTED' && message.includes('cancel')) ||
    message === 'canceled' ||
    message === 'cancelled'
  ) return 'cancelled';

  if (
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    code === 'ERR_TIMED_OUT' ||
    /\b(?:timed out|timeout)\b/.test(message)
  ) return 'timeout';

  if (
    code === 'ERR_NETWORK' ||
    code === 'ERR_INTERNET_DISCONNECTED' ||
    code === 'ENETUNREACH' ||
    code === 'EAI_AGAIN' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    /^(?:network error|network request failed|failed to fetch|fetch failed|load failed|the network connection was lost)$/i.test(message) ||
    /internet connection appears to be offline/i.test(message) ||
    /could not connect to the server/i.test(message)
  ) return 'offline';

  return null;
};

const formatRetryDelay = (seconds: number): string => {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  if (seconds >= 24 * 60 * 60) {
    const days = Math.ceil(seconds / (24 * 60 * 60));
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  if (seconds >= 60 * 60) {
    const hours = Math.ceil(seconds / (60 * 60));
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};

const getRetryDelayFromMessage = (message: string): number | undefined => {
  const match = message.match(/\b(?:in|after|for|wait)\s+(\d+)\s*(seconds?|minutes?|hours?|days?)\b/i);
  if (!match) return undefined;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const unit = match[2].toLowerCase();
  if (unit.startsWith('day')) return amount * 24 * 60 * 60;
  if (unit.startsWith('hour')) return amount * 60 * 60;
  if (unit.startsWith('minute')) return amount * 60;
  return amount;
};

const presentation = (
  title: string,
  message: string,
  kind: ApiErrorKind,
  retryable: boolean,
  status?: number,
  retryAfterSeconds?: number,
): ApiErrorPresentation => ({
  title,
  message,
  kind,
  retryable,
  ...(status ? { status } : {}),
  ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
});

export const getApiErrorPresentation = (
  error: unknown,
  fallback = DEFAULT_API_ERROR_MESSAGE,
): ApiErrorPresentation => {
  const fallbackMessage = asTrimmedMessage(fallback) || DEFAULT_API_ERROR_MESSAGE;
  const status = getStatus(error);
  const transportKind = getTransportKind(error);
  const rawText = getRawCandidates(error).join(' ').toLowerCase();
  const safeMessage = findSafeMessage(error);
  const integrationMessage = safeMessage && ACTIONABLE_INTEGRATION_MESSAGE.test(safeMessage)
    ? safeMessage
    : null;

  if (transportKind === 'cancelled') {
    return presentation('Request cancelled', 'Nothing was changed.', 'cancelled', false, status);
  }
  if (transportKind === 'timeout') {
    return presentation(
      'Taking longer than expected',
      'The request took too long. Check your connection and try again.',
      'timeout',
      true,
      status,
    );
  }
  if (transportKind === 'offline' || (!status && /\b(?:offline|no internet)\b/.test(rawText))) {
    return presentation(
      "You're offline",
      'Check your internet connection and try again.',
      'offline',
      true,
      status,
    );
  }

  if (status === 429 || (!status && RATE_LIMIT_SIGNAL.test(rawText))) {
    const retryAfterSeconds = getRetryAfterSeconds(error) ?? getRetryDelayFromMessage(rawText);
    const isGenericRateLimit = !safeMessage || GENERIC_RATE_LIMIT_MESSAGE.test(safeMessage);
    const hasRetryGuidance = safeMessage
      ? /\b(?:wait|try again|seconds?|minutes?|hours?|days?|tomorrow|later)\b/i.test(safeMessage)
      : false;
    const message = !isGenericRateLimit
      ? retryAfterSeconds && !hasRetryGuidance
        ? `${safeMessage.replace(/[.!]?$/, '.')} Try again in ${formatRetryDelay(retryAfterSeconds)}.`
        : safeMessage
      : retryAfterSeconds
        ? `Please wait ${formatRetryDelay(retryAfterSeconds)} before trying again.`
        : 'Please wait a moment before trying again.';
    return presentation('Please slow down', message, 'rate-limit', true, status, retryAfterSeconds);
  }

  if (status === 401 || (!status && /\b(?:token expired|invalid token|jwt expired|unauthorized)\b/.test(rawText))) {
    return presentation(
      'Sign in again',
      "We couldn't verify your account. Please sign in again and retry.",
      'authentication',
      false,
      status,
    );
  }
  if (status === 403) {
    return presentation(
      'Action not available',
      safeMessage || "You don't have permission to do that.",
      'permission',
      false,
      status,
    );
  }
  if (status === 408) {
    return presentation(
      'Taking longer than expected',
      'The request took too long. Please try again.',
      'timeout',
      true,
      status,
    );
  }
  if (status === 413) {
    return presentation(
      'File is too large',
      safeMessage || 'Choose a smaller file and try again.',
      'validation',
      false,
      status,
    );
  }
  if (status === 415) {
    return presentation(
      'File type not supported',
      safeMessage || 'Choose a supported photo and try again.',
      'validation',
      false,
      status,
    );
  }
  if (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    (!status && /\b(?:service|server|api)\s+(?:is\s+)?(?:temporarily\s+)?unavailable\b/.test(rawText))
  ) {
    return presentation(
      integrationMessage && /\breconnect\b/i.test(integrationMessage)
        ? 'Reconnect required'
        : 'Temporarily unavailable',
      integrationMessage || 'ChallengeSphere is temporarily unavailable. Please try again in a few minutes.',
      'server',
      true,
      status,
    );
  }
  if ((status && status >= 500) || /\binternal server error\b/.test(rawText)) {
    return presentation(
      integrationMessage && /\breconnect\b/i.test(integrationMessage)
        ? 'Reconnect required'
        : "We're having trouble",
      integrationMessage || 'Something went wrong on our side. Please try again in a moment.',
      'server',
      true,
      status,
    );
  }

  if (status === 404) {
    return presentation(
      "Couldn't find that",
      safeMessage || fallbackMessage,
      'not-found',
      false,
      status,
    );
  }
  if (status === 409) {
    return presentation(
      'Unable to complete that',
      safeMessage || (
        fallbackMessage === DEFAULT_API_ERROR_MESSAGE
          ? 'That information changed. Refresh and try again.'
          : fallbackMessage
      ),
      'conflict',
      false,
      status,
    );
  }
  if (status === 400 || status === 422) {
    return presentation(
      'Check your information',
      safeMessage || fallbackMessage,
      'validation',
      false,
      status,
    );
  }
  if (status && status >= 400 && status < 500) {
    return presentation(
      "Couldn't complete that",
      safeMessage || fallbackMessage,
      'validation',
      false,
      status,
    );
  }

  return presentation(
    'Something went wrong',
    safeMessage || fallbackMessage,
    'unknown',
    true,
    status,
  );
};

export const getApiErrorMessage = (
  error: unknown,
  fallback = DEFAULT_API_ERROR_MESSAGE,
): string => getApiErrorPresentation(error, fallback).message;

export const getSafeErrorMessage = (
  message: unknown,
  fallback = DEFAULT_API_ERROR_MESSAGE,
): string => getApiErrorMessage({ message }, fallback);

export const getSafeErrorTitle = (title: unknown): string => {
  const originalTitle = asTrimmedMessage(title) || 'Something went wrong';
  const errorPresentation = getApiErrorPresentation({ message: originalTitle });
  return errorPresentation.message === originalTitle
    ? originalTitle
    : errorPresentation.title;
};

const createNormalizedError = (
  errorPresentation: ApiErrorPresentation,
  apiCode?: string | null,
): Error => Object.assign(
  new Error(errorPresentation.message),
  {
    userMessage: errorPresentation.message,
    userTitle: errorPresentation.title,
    errorKind: errorPresentation.kind,
    retryable: errorPresentation.retryable,
    ...(errorPresentation.status ? { status: errorPresentation.status } : {}),
    ...(errorPresentation.retryAfterSeconds
      ? { retryAfterSeconds: errorPresentation.retryAfterSeconds }
      : {}),
    ...(apiCode ? { apiCode } : {}),
    __apiErrorNormalized: true,
  },
);

export const normalizeApiError = <T>(
  error: T,
  fallback = DEFAULT_API_ERROR_MESSAGE,
): T | Error => {
  const errorPresentation = getApiErrorPresentation(error, fallback);
  const apiCode = getApiErrorCode(error);
  const userMessage = errorPresentation.message;
  if (!isRecord(error)) return createNormalizedError(errorPresentation, apiCode);
  const normalizedError = error as Record<string, unknown>;

  try {
    normalizedError.message = userMessage;
    normalizedError.userMessage = userMessage;
    normalizedError.userTitle = errorPresentation.title;
    normalizedError.errorKind = errorPresentation.kind;
    normalizedError.retryable = errorPresentation.retryable;
    if (errorPresentation.retryAfterSeconds) {
      normalizedError.retryAfterSeconds = errorPresentation.retryAfterSeconds;
    }
    if (apiCode) {
      normalizedError.apiCode = apiCode;
    }
    normalizedError.__apiErrorNormalized = true;
  } catch {
    return createNormalizedError(errorPresentation, apiCode);
  }
  return error;
};
