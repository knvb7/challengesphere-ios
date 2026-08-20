export const parseCoverPhotoUrls = (raw?: string | string[] | null): string[] => {
  if (Array.isArray(raw)) {
    return raw.map(url => url.trim()).filter(Boolean);
  }

  if (typeof raw !== 'string') {
    return [];
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((value): value is string => typeof value === 'string')
          .map(url => url.trim())
          .filter(Boolean);
      }
    } catch {
      // Fall back to comma-splitting below.
    }
  }

  return trimmed
    .split(',')
    .map(url => url.trim())
    .filter(Boolean);
};
