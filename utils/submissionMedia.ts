export type SubmissionMediaValue = string | string[] | null | undefined;

function cleanMediaUrls(urls: unknown[]): string[] {
  return urls
    .filter((url): url is string => typeof url === 'string')
    .map((url) => url.trim())
    .filter(Boolean);
}

export function parseSubmissionMediaUrls(raw: SubmissionMediaValue): string[] {
  if (Array.isArray(raw)) {
    return cleanMediaUrls(raw);
  }

  if (!raw || !raw.trim()) {
    return [];
  }

  const value = raw.trim();
  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return cleanMediaUrls(parsed);
      }
    } catch {
      // Handle malformed historical JSON values as comma-separated input below.
    }
  }

  return cleanMediaUrls(value.split(','));
}
