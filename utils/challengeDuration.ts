const DURATION_TO_DAYS: Record<string, number> = {
  '1 day': 1,
  '3 days': 3,
  '1 week': 7,
  '2 weeks': 14,
  '3 weeks': 21,
  '1 month': 30,
  '2 months': 60,
  '3 months': 90,
  '6 months': 180,
  '1 year': 365,
};

export const parseDurationToDays = (duration: string): number | undefined => {
  const normalized = duration.trim().toLowerCase();
  if (!normalized) return undefined;

  const mapped = DURATION_TO_DAYS[normalized];
  if (mapped) return mapped;

  const match = normalized.match(/^(\d+)\s+(day|days|week|weeks|month|months|year|years)$/);
  if (!match) return undefined;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return undefined;

  const unit = match[2];
  if (unit.startsWith('day')) return value;
  if (unit.startsWith('week')) return value * 7;
  if (unit.startsWith('month')) return value * 30;
  if (unit.startsWith('year')) return value * 365;
  return undefined;
};

export const getDurationLabel = (days: number): string => {
  if (days <= 0) return '';
  if (days === 1) return '1 Day';
  if (days === 7) return '1 Week';
  if (days === 14) return '2 Weeks';
  if (days === 21) return '3 Weeks';
  if (days === 30) return '1 Month';
  if (days === 60) return '2 Months';
  if (days === 90) return '3 Months';
  if (days === 180) return '6 Months';
  if (days === 365) return '1 Year';
  return `${days} Days`;
};
