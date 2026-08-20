const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const MINIMUM_ACCOUNT_AGE = 13;
export const MAXIMUM_ACCOUNT_AGE = 120;

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

function getUtcCalendarDate(value: Date): CalendarDate {
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth(),
    day: value.getUTCDate(),
  };
}

function subtractYearsClamped(value: CalendarDate, years: number): CalendarDate {
  const targetYear = value.year - years;
  const targetMonth = value.month;
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  return {
    year: targetYear,
    month: targetMonth,
    day: Math.min(value.day, lastDayOfTargetMonth),
  };
}

function toLocalPickerDate(value: CalendarDate): Date {
  return new Date(value.year, value.month, value.day);
}

export function parseDateOfBirth(value: string): Date | null {
  const match = value.match(DATE_PATTERN);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatDateOfBirth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateAge(value: string, today = new Date()): number | null {
  const birthDate = parseDateOfBirth(value);
  if (!birthDate) return null;

  const policyDate = getUtcCalendarDate(today);
  const birthYear = birthDate.getFullYear();
  const birthMonth = birthDate.getMonth();
  const birthDay = birthDate.getDate();
  const birthDateIsInFuture = birthYear > policyDate.year
    || (birthYear === policyDate.year && birthMonth > policyDate.month)
    || (birthYear === policyDate.year && birthMonth === policyDate.month && birthDay > policyDate.day);
  if (birthDateIsInFuture) return null;

  let age = policyDate.year - birthYear;
  const birthdayHasPassed = policyDate.month > birthMonth
    || (policyDate.month === birthMonth && policyDate.day >= birthDay);
  if (!birthdayHasPassed) age -= 1;
  return age >= 0 && age <= MAXIMUM_ACCOUNT_AGE ? age : null;
}

export function isSelectableDate(value: string, today = new Date()): boolean {
  const age = calculateAge(value, today);
  return age != null && age >= MINIMUM_ACCOUNT_AGE;
}

export function hasVerifiedMinimumAge(
  value: string | null | undefined,
  minimumAge = MINIMUM_ACCOUNT_AGE,
  today = new Date(),
): boolean {
  if (!value) return false;
  const age = calculateAge(value, today);
  return age != null && age >= minimumAge;
}

export function getMaximumSelectableDateOfBirth(today = new Date()): Date {
  return toLocalPickerDate(
    subtractYearsClamped(getUtcCalendarDate(today), MINIMUM_ACCOUNT_AGE),
  );
}

export function getMinimumSelectableDateOfBirth(today = new Date()): Date {
  const minimum = toLocalPickerDate(
    subtractYearsClamped(getUtcCalendarDate(today), MAXIMUM_ACCOUNT_AGE + 1),
  );
  minimum.setDate(minimum.getDate() + 1);
  return minimum;
}
