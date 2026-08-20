const FETCH_FALLBACK_UPLOAD_ERRORS = [
  'NSPOSIXErrorDomain Code=40',
  'Message too long',
  'NSURLErrorDomain Code=-1001',
  'The request timed out',
  'NSURLErrorDomain Code=-1003',
  'A server with the specified hostname could not be found',
  'NSURLErrorDomain Code=-1004',
  'Could not connect to the server',
  'NSURLErrorDomain Code=-1009',
  'The Internet connection appears to be offline',
  'NSURLErrorDomain Code=-1005',
  'The network connection was lost',
  'Failed to fetch',
  'Load failed',
  'Network request failed',
];

const NON_RETRYABLE_DIRECT_UPLOAD_ERRORS = [
  'S3 upload failed (400)',
  'S3 upload failed (401)',
  'S3 upload failed (403)',
  'S3 upload failed (404)',
  'SignatureDoesNotMatch',
  'AccessDenied',
];

function getUploadErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function shouldUseFetchFallbackForUploadError(error: unknown): boolean {
  const message = getUploadErrorMessage(error);

  if (NON_RETRYABLE_DIRECT_UPLOAD_ERRORS.some((needle) => message.includes(needle))) {
    return false;
  }

  return FETCH_FALLBACK_UPLOAD_ERRORS.some((needle) => message.includes(needle));
}

export function shouldRetryDirectUploadError(error: unknown): boolean {
  const message = getUploadErrorMessage(error);

  if (NON_RETRYABLE_DIRECT_UPLOAD_ERRORS.some((needle) => message.includes(needle))) {
    return false;
  }

  if (message.includes('S3 upload failed (5')
    || message.includes('S3 upload failed (408)')
    || message.includes('S3 upload failed (429)')) {
    return true;
  }

  return FETCH_FALLBACK_UPLOAD_ERRORS.some((needle) => message.includes(needle));
}
