import type { Submission } from '../types/api';

export type MemoirPhotoItem = {
  key: string;
  uri: string;
  dateLabel: string;
  description: string;
  submissionTime: string;
};

export type MemoirSubmissionSummary = {
  key: string;
  dateLabel: string;
  description: string;
};

export type MemoirCaptureData = {
  challengeTitle: string;
  username: string;
  selectedDateRange: string;
  fileName: string;
  generatedDate: string;
  uploadCount: number;
  photos: MemoirPhotoItem[];
  summaries: MemoirSubmissionSummary[];
};

type CreateMemoirCaptureDataInput = {
  submissions: Submission[];
  challengeTitle: string;
  username: string;
  selectedDateRange: string;
  generatedAt?: Date;
};

export function parseMemoirMediaUrls(raw?: string | string[]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);

  const value = raw.trim();
  if (!value) return [];

  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      // Fall through to comma-separated parsing.
    }
  }

  return value.split(',').map((url) => url.trim()).filter(Boolean);
}

export function isMemoirPhotoUrl(url: string) {
  if (!url) return false;
  const path = url.split('?')[0].toLowerCase();
  return !(path.endsWith('.mp4')
    || path.endsWith('.mov')
    || path.endsWith('.m4v')
    || path.endsWith('.webm')
    || path.endsWith('.avi')
    || path.endsWith('.mkv'));
}

export function safeMemoirFileNamePart(value: string) {
  const cleaned = value.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '');
  return cleaned.slice(0, 42) || 'challenge';
}

export function normalizeCapturedFileUri(uri: string) {
  if (!uri || uri.startsWith('file://') || uri.startsWith('content://')) {
    return uri;
  }
  return `file://${uri}`;
}

export function createMemoirCaptureData({
  submissions,
  challengeTitle,
  username,
  selectedDateRange,
  generatedAt = new Date(),
}: CreateMemoirCaptureDataInput): MemoirCaptureData {
  const sortedSubmissions = [...submissions].sort(compareSubmissionsChronologically);
  const title = challengeTitle.trim() || 'Challenge';
  const allPhotos = getMemoirPhotos(sortedSubmissions);

  return {
    challengeTitle: title,
    username: formatMemoirUsername(username),
    selectedDateRange,
    fileName: `challengesphere-${safeMemoirFileNamePart(title)}-memoir-${generatedAt.getTime()}.jpg`,
    generatedDate: generatedAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
    uploadCount: submissions.length,
    photos: allPhotos,
    summaries: getMemoirSummaries(sortedSubmissions),
  };
}

export function formatMemoirUsername(username: string) {
  const normalized = username.trim().replace(/^@+/, '');
  return `@${normalized || 'challenger'}`;
}

function getMemoirPhotos(submissions: Submission[]) {
  const photos: MemoirPhotoItem[] = [];

  for (const submission of submissions) {
    for (const uri of parseMemoirMediaUrls(submission.mediaUrls as string | string[] | undefined)) {
      if (!isMemoirPhotoUrl(uri)) {
        continue;
      }
      photos.push({
        key: `${submission.id}-${photos.length}`,
        uri,
        dateLabel: formatMemoirSubmissionDate(submission.submissionTime),
        description: submission.description || '',
        submissionTime: submission.submissionTime,
      });
    }
  }

  return photos;
}

function getMemoirSummaries(submissions: Submission[]) {
  return submissions.slice(0, 6).map((submission) => ({
    key: String(submission.id),
    dateLabel: formatMemoirSubmissionDate(submission.submissionTime),
    description: submission.description || 'Submission uploaded',
  }));
}

function formatMemoirSubmissionDate(value?: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Check-in';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function compareSubmissionsChronologically(a: Submission, b: Submission) {
  const timeDiff = toTimestamp(a.submissionTime) - toTimestamp(b.submissionTime);
  if (timeDiff !== 0) return timeDiff;

  return (a.id ?? 0) - (b.id ?? 0);
}

function toTimestamp(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}
