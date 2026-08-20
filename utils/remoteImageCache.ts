export type CachedRemoteImageSource = {
  uri: string;
  cacheKey: string;
};

export function createCachedRemoteImageSource(uri: string): CachedRemoteImageSource {
  let cacheKey = uri;

  try {
    const parsed = new URL(uri);
    const isS3Object = parsed.hostname.endsWith('.amazonaws.com')
      && (parsed.hostname === 's3.amazonaws.com'
        || parsed.hostname.startsWith('s3.')
        || parsed.hostname.startsWith('s3-')
        || parsed.hostname.includes('.s3.')
        || parsed.hostname.includes('.s3-'));

    if (isS3Object && parsed.searchParams.has('X-Amz-Signature')) {
      parsed.search = '';
      cacheKey = parsed.toString();
    }
  } catch {
    // Keep the original value for local or otherwise non-standard image URIs.
  }

  return { uri, cacheKey };
}
