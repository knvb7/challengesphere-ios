export interface SubmissionDayLike {
  dayNumber?: number | string | null;
}

export const getSubmittedDayCount = (
  submissions: SubmissionDayLike[],
  numberOfDays = 0,
): number => {
  const totalDays = Math.max(0, Math.floor(Number(numberOfDays) || 0));
  const submittedDays = new Set<number>();

  for (const submission of submissions) {
    const day = Number(submission.dayNumber);
    if (!Number.isInteger(day) || day < 1) continue;
    if (totalDays > 0 && day > totalDays) continue;
    submittedDays.add(day);
  }

  return submittedDays.size;
};

export const formatSubmissionDaysValue = (
  submissions: SubmissionDayLike[],
  numberOfDays = 0,
): string => {
  const submittedDayCount = getSubmittedDayCount(submissions, numberOfDays);
  const totalDays = Math.max(0, Math.floor(Number(numberOfDays) || 0));
  return totalDays > 0 ? `${submittedDayCount}/${totalDays}` : String(submittedDayCount);
};
