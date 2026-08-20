export const SIGNED_MEDIA_QUERY_ROOTS = [
  ['challenges'],
  ['myActiveChallenges'],
  ['feed'],
  ['users'],
  ['userChallengeSubmissions'],
] as const;

export function isPresignedS3MediaUrl(uri?: string | null): boolean {
  if (!uri) {
    return false;
  }

  try {
    const parsed = new URL(uri);
    const isAmazonS3Host = parsed.hostname.endsWith('.amazonaws.com')
      && (parsed.hostname === 's3.amazonaws.com'
        || parsed.hostname.startsWith('s3.')
        || parsed.hostname.startsWith('s3-')
        || parsed.hostname.includes('.s3.')
        || parsed.hostname.includes('.s3-'));

    return isAmazonS3Host && parsed.searchParams.has('X-Amz-Signature');
  } catch {
    return false;
  }
}

export function isSignedMediaQueryKey(queryKey: readonly unknown[]): boolean {
  return SIGNED_MEDIA_QUERY_ROOTS.some(([root]) => queryKey[0] === root);
}
