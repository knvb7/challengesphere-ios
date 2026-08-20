export const INTEGRATION_HANDLE_LOCK_DAYS = 7;
export const INTEGRATION_HANDLE_LOCK_MS = INTEGRATION_HANDLE_LOCK_DAYS * 24 * 60 * 60 * 1000;

export const getIntegrationUnlockDate = (lockedAt?: string | null): Date | null => {
  if (!lockedAt) return null;
  const lockedDate = new Date(lockedAt);
  const lockedTime = lockedDate.getTime();
  if (Number.isNaN(lockedTime)) return null;
  return new Date(lockedTime + INTEGRATION_HANDLE_LOCK_MS);
};

export const isIntegrationLockedUntil = (
  lockedAt?: string | null,
  nowValue: string | Date = new Date(),
): boolean => {
  const unlockDate = getIntegrationUnlockDate(lockedAt);
  if (!unlockDate) return false;
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
  return now.getTime() < unlockDate.getTime();
};

export const formatIntegrationUnlockDate = (lockedAt?: string | null): string => {
  const unlockDate = getIntegrationUnlockDate(lockedAt);
  if (!unlockDate) return '';
  return unlockDate.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};
