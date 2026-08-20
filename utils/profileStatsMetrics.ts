type ProfileStatsSubmission = {
  id?: number;
  submissionId?: number;
  challengeId: number;
  dayNumber: number;
  submissionTime?: string;
  createdAt?: string;
  active?: boolean;
  gloriesCount?: number;
  commentsCount?: number;
};

type ProfileStatsChallenge = {
  id: string | number;
  numberOfDays: number;
  challengeMode?: string;
  status: 'active' | 'completed' | 'upcoming' | 'deleted';
  startDate?: string;
  createdAt?: string;
  joinedAt?: string;
  daysCompleted?: number;
  completionPercentage?: number;
  progress?: number;
  progressBasis?: 'participation' | 'timeline';
};

export type ProfileActivityDay = {
  key: string;
  count: number;
};

export type ProfileStatsMetrics = {
  totalSubmissions: number;
  uniqueSubmissionDays: number;
  currentStreak: number;
  longestStreak: number;
  activeDaysPerWeek: number;
  totalGlories: number;
  totalComments: number;
  consistencyPercentage: number | null;
  completedDueDays: number;
  totalDueDays: number;
  challengeCompletionPercentage: number | null;
  completedChallenges: number;
  endedChallenges: number;
  mostActiveChallengeId: number | null;
  mostActiveChallengeCount: number;
  rhythmDays: ProfileActivityDay[];
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const STREAK_WINDOW_DAYS = 7;

const clampPercentage = (value: number): number =>
  Math.max(0, Math.min(100, value));

const toNonNegativeInteger = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;

const startOfLocalDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getDayKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCalendarDayNumber = (date: Date): number =>
  Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / ONE_DAY_MS);

const shiftLocalDays = (date: Date, amount: number): Date => {
  const shifted = startOfLocalDay(date);
  shifted.setDate(shifted.getDate() + amount);
  return shifted;
};

const parseDate = (value?: string): Date | null => {
  if (!value) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (dateOnly && value.length <= 10) {
    const parsed = new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    );
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const getSubmissionDate = (submission: ProfileStatsSubmission): Date | null =>
  parseDate(submission.submissionTime || submission.createdAt);

const getSubmissionIdentity = (
  submission: ProfileStatsSubmission,
  index: number,
): string => {
  const id = toNonNegativeInteger(submission.id) || toNonNegativeInteger(submission.submissionId);
  if (id > 0) return `id:${id}`;

  return [
    'fallback',
    submission.challengeId,
    submission.dayNumber,
    submission.submissionTime || submission.createdAt || 'undated',
    index,
  ].join(':');
};

const getUniqueSubmissions = (
  submissions: ProfileStatsSubmission[],
): ProfileStatsSubmission[] => {
  const unique = new Map<string, ProfileStatsSubmission>();

  submissions.forEach((submission, index) => {
    if (submission.active === false) return;
    const key = getSubmissionIdentity(submission, index);
    if (!unique.has(key)) unique.set(key, submission);
  });

  return Array.from(unique.values());
};

const getActivityCounts = (
  submissions: ProfileStatsSubmission[],
  now: Date,
): Map<string, number> => {
  const counts = new Map<string, number>();
  const latestValidDay = startOfLocalDay(now).getTime();

  submissions.forEach((submission) => {
    const date = getSubmissionDate(submission);
    if (!date || startOfLocalDay(date).getTime() > latestValidDay) return;
    const key = getDayKey(startOfLocalDay(date));
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return counts;
};

const calculateActivityStreaks = (
  activityDays: Iterable<string>,
  throughDayNumber?: number,
): { current: number; longest: number } => {
  const dayNumbers = Array.from(activityDays)
    .map((key) => parseDate(key))
    .filter((date): date is Date => date !== null)
    .map(getCalendarDayNumber)
    .filter((dayNumber) => throughDayNumber === undefined || dayNumber <= throughDayNumber);
  const completedDays = new Set(dayNumbers);
  if (completedDays.size === 0) return { current: 0, longest: 0 };

  const firstDay = Math.min(...completedDays);
  const lastDay = throughDayNumber ?? Math.max(...completedDays);
  let longest = 0;
  let running = 0;
  let protectedRestDay: number | null = null;

  for (let dayNumber = firstDay; dayNumber <= lastDay; dayNumber += 1) {
    if (
      protectedRestDay !== null &&
      dayNumber - protectedRestDay >= STREAK_WINDOW_DAYS
    ) {
      protectedRestDay = null;
    }

    if (completedDays.has(dayNumber)) {
      running += 1;
      longest = Math.max(longest, running);
    } else if (running > 0) {
      if (protectedRestDay === null) {
        protectedRestDay = dayNumber;
      } else {
        running = 0;
        protectedRestDay = null;
      }
    }
  }

  return { current: running, longest };
};

export const getCurrentActivityStreak = (
  activityDays: Iterable<string>,
  now = new Date(),
): number => {
  const days = new Set(activityDays);
  const today = startOfLocalDay(now);
  const throughDay = days.has(getDayKey(today)) ? today : shiftLocalDays(today, -1);
  return calculateActivityStreaks(days, getCalendarDayNumber(throughDay)).current;
};

const getLongestActivityStreak = (activityDays: Iterable<string>): number =>
  calculateActivityStreaks(activityDays).longest;

const isOneOff = (challengeMode?: string): boolean =>
  challengeMode?.trim().toUpperCase().replace(/[\s-]+/g, '_') === 'ONE_OFF';

const getChallengeId = (challenge: ProfileStatsChallenge): number => {
  const id = Number(challenge.id);
  return Number.isInteger(id) && id > 0 ? id : 0;
};

const getChallengeStartDate = (challenge: ProfileStatsChallenge): Date | null => {
  const startDate = parseDate(challenge.startDate || challenge.createdAt);
  return startDate ? startOfLocalDay(startDate) : null;
};

const getEligibleChallengeStartDate = (
  challenge: ProfileStatsChallenge,
  challengeStart: Date | null,
): Date | null => {
  const joinedAt = parseDate(challenge.joinedAt);
  if (!challengeStart) return joinedAt ? startOfLocalDay(joinedAt) : null;
  if (!joinedAt) return challengeStart;
  const joinedDay = startOfLocalDay(joinedAt);
  return joinedDay.getTime() > challengeStart.getTime() ? joinedDay : challengeStart;
};

const getSubmissionDaysByChallenge = (
  submissions: ProfileStatsSubmission[],
): Map<number, Set<number>> => {
  const daysByChallenge = new Map<number, Set<number>>();

  submissions.forEach((submission) => {
    const challengeId = toNonNegativeInteger(submission.challengeId);
    const dayNumber = toNonNegativeInteger(submission.dayNumber);
    if (challengeId === 0 || dayNumber === 0) return;
    const days = daysByChallenge.get(challengeId) || new Set<number>();
    days.add(dayNumber);
    daysByChallenge.set(challengeId, days);
  });

  return daysByChallenge;
};

const getFulfilledChallengeDayKeys = (
  submissions: ProfileStatsSubmission[],
  challenges: ProfileStatsChallenge[],
  now: Date,
): Set<string> => {
  const challengeById = new Map<number, ProfileStatsChallenge>();
  challenges.forEach((challenge) => {
    const challengeId = getChallengeId(challenge);
    if (challengeId > 0 && !challengeById.has(challengeId)) {
      challengeById.set(challengeId, challenge);
    }
  });
  const fulfilledDays = new Set<string>();

  submissions.forEach((submission) => {
    const challenge = challengeById.get(toNonNegativeInteger(submission.challengeId));
    if (challenge?.status === 'deleted' || challenge?.status === 'upcoming') return;
    const challengeStart = challenge ? getChallengeStartDate(challenge) : null;
    const commitmentDays = challenge
      ? isOneOff(challenge.challengeMode) ? 1 : toNonNegativeInteger(challenge.numberOfDays)
      : 0;
    const dayNumber = toNonNegativeInteger(submission.dayNumber);
    if (challengeStart && dayNumber > 0 && dayNumber <= commitmentDays) {
      const fulfilledDay = shiftLocalDays(challengeStart, dayNumber - 1);
      const eligibleStart = challenge
        ? getEligibleChallengeStartDate(challenge, challengeStart)
        : challengeStart;
      const challengeEnd = shiftLocalDays(challengeStart, commitmentDays - 1);
      if (
        (!eligibleStart || fulfilledDay.getTime() >= eligibleStart.getTime()) &&
        fulfilledDay.getTime() <= challengeEnd.getTime() &&
        fulfilledDay.getTime() <= startOfLocalDay(now).getTime()
      ) {
        fulfilledDays.add(getDayKey(fulfilledDay));
      }
      return;
    }

    const submissionDate = getSubmissionDate(submission);
    if (submissionDate && startOfLocalDay(submissionDate).getTime() <= startOfLocalDay(now).getTime()) {
      fulfilledDays.add(getDayKey(startOfLocalDay(submissionDate)));
    }
  });

  return fulfilledDays;
};

const getRecordedChallengeDays = (
  challenge: ProfileStatsChallenge,
  submissionDays: number,
  commitmentDays: number,
): number => {
  const explicitDays = typeof challenge.daysCompleted === 'number' && Number.isFinite(challenge.daysCompleted)
    ? toNonNegativeInteger(challenge.daysCompleted)
    : null;
  const participantPercentage = challenge.progressBasis === 'participation'
    ? challenge.completionPercentage ?? challenge.progress
    : undefined;
  const inferredDays = explicitDays === null && typeof participantPercentage === 'number'
    ? Math.round((clampPercentage(participantPercentage) / 100) * commitmentDays)
    : 0;

  // Submission history protects the metric from a stale challenge summary.
  return Math.min(commitmentDays, Math.max(explicitDays ?? inferredDays, submissionDays));
};

const calculateChallengeProgress = (
  challenges: ProfileStatsChallenge[],
  submissions: ProfileStatsSubmission[],
  now: Date,
) => {
  const submissionDaysByChallenge = getSubmissionDaysByChallenge(submissions);
  let totalDueDays = 0;
  let completedDueDays = 0;
  let endedChallenges = 0;
  let completedChallenges = 0;

  const uniqueChallenges = new Map<number, ProfileStatsChallenge>();
  challenges.forEach((challenge) => {
    const challengeId = getChallengeId(challenge);
    if (challengeId > 0 && !uniqueChallenges.has(challengeId)) {
      uniqueChallenges.set(challengeId, challenge);
    }
  });

  uniqueChallenges.forEach((challenge, challengeId) => {
    if (challenge.status === 'deleted' || challenge.status === 'upcoming') return;

    const commitmentDays = isOneOff(challenge.challengeMode)
      ? 1
      : toNonNegativeInteger(challenge.numberOfDays);
    if (commitmentDays === 0) return;

    const challengeStart = getChallengeStartDate(challenge);
    const eligibleStart = getEligibleChallengeStartDate(challenge, challengeStart);
    const challengeEnd = challengeStart
      ? shiftLocalDays(challengeStart, commitmentDays - 1)
      : null;
    const today = startOfLocalDay(now);
    const dueThrough = challengeEnd && challengeEnd.getTime() < today.getTime()
      ? challengeEnd
      : today;
    const dueDays = eligibleStart
      ? Math.min(
          commitmentDays,
          Math.max(
            0,
            getCalendarDayNumber(dueThrough) - getCalendarDayNumber(eligibleStart) + 1,
          ),
        )
      : challenge.status === 'completed'
        ? commitmentDays
        : 0;
    const firstEligibleDayNumber = challengeStart && eligibleStart
      ? getCalendarDayNumber(eligibleStart) - getCalendarDayNumber(challengeStart) + 1
      : 1;
    const lastDueDayNumber = firstEligibleDayNumber + dueDays - 1;
    const submissionDays = Array.from(submissionDaysByChallenge.get(challengeId) || [])
      .filter((dayNumber) =>
        dayNumber >= firstEligibleDayNumber &&
        dayNumber <= lastDueDayNumber &&
        dayNumber <= commitmentDays
      )
      .length;
    const recordedDays = getRecordedChallengeDays(
      challenge,
      submissionDays,
      commitmentDays,
    );

    totalDueDays += dueDays;
    completedDueDays += Math.min(recordedDays, dueDays);

    if (challenge.status === 'completed' && dueDays > 0) {
      endedChallenges += 1;
      if (recordedDays >= dueDays) completedChallenges += 1;
    }
  });

  return {
    totalDueDays,
    completedDueDays,
    consistencyPercentage: totalDueDays > 0
      ? Math.round((completedDueDays / totalDueDays) * 100)
      : null,
    endedChallenges,
    completedChallenges,
    challengeCompletionPercentage: endedChallenges > 0
      ? Math.round((completedChallenges / endedChallenges) * 100)
      : null,
  };
};

/**
 * Profile metrics intentionally separate three ideas:
 * - consistency: distinct fulfilled challenge days / eligible days due;
 * - completion: fully fulfilled ended commitments / eligible ended commitments;
 * - pace: unique posting days in the trailing 28 calendar days / four.
 *
 * This keeps post volume, elapsed calendar time, and successful participation
 * from being mistaken for one another.
 */
export const calculateProfileStats = ({
  submissions,
  challenges,
  now = new Date(),
}: {
  submissions: ProfileStatsSubmission[];
  challenges: ProfileStatsChallenge[];
  now?: Date;
}): ProfileStatsMetrics => {
  const uniqueSubmissions = getUniqueSubmissions(submissions);
  const activityCounts = getActivityCounts(uniqueSubmissions, now);
  const fulfilledChallengeDayKeys = getFulfilledChallengeDayKeys(uniqueSubmissions, challenges, now);
  const today = startOfLocalDay(now);
  const recentDayKeys = new Set(
    Array.from({ length: 28 }, (_, index) => getDayKey(shiftLocalDays(today, -index))),
  );
  const recentActiveDayCount = Array.from(activityCounts.keys())
    .filter((dayKey) => recentDayKeys.has(dayKey))
    .length;
  const challengeCounts = new Map<number, { days: Set<number | string>; latest: number }>();
  const challengeById = new Map(
    challenges.map((challenge) => [getChallengeId(challenge), challenge] as const),
  );

  uniqueSubmissions.forEach((submission) => {
    const challengeId = toNonNegativeInteger(submission.challengeId);
    if (challengeId === 0) return;
    const challenge = challengeById.get(challengeId);
    if (challenge?.status === 'deleted' || challenge?.status === 'upcoming') return;
    const submissionTime = getSubmissionDate(submission)?.getTime() ?? 0;
    const current = challengeCounts.get(challengeId) || { days: new Set<number | string>(), latest: 0 };
    const dayNumber = toNonNegativeInteger(submission.dayNumber);
    const submissionDate = getSubmissionDate(submission);
    if (submissionDate && startOfLocalDay(submissionDate).getTime() > today.getTime()) return;
    if (challenge) {
      const commitmentDays = isOneOff(challenge.challengeMode)
        ? 1
        : toNonNegativeInteger(challenge.numberOfDays);
      const challengeStart = getChallengeStartDate(challenge);
      const eligibleStart = getEligibleChallengeStartDate(challenge, challengeStart);
      const firstEligibleDayNumber = challengeStart && eligibleStart
        ? getCalendarDayNumber(eligibleStart) - getCalendarDayNumber(challengeStart) + 1
        : 1;
      const fulfilledDate = challengeStart && dayNumber > 0
        ? shiftLocalDays(challengeStart, dayNumber - 1)
        : null;
      if (
        dayNumber < firstEligibleDayNumber ||
        dayNumber > commitmentDays ||
        (fulfilledDate && fulfilledDate.getTime() > today.getTime())
      ) return;
    }
    current.days.add(dayNumber > 0
      ? dayNumber
      : submissionDate ? getDayKey(startOfLocalDay(submissionDate)) : `submission:${submission.id}`);
    challengeCounts.set(challengeId, {
      days: current.days,
      latest: Math.max(current.latest, submissionTime),
    });
  });

  const mostActive = Array.from(challengeCounts.entries()).sort((left, right) =>
    right[1].days.size - left[1].days.size ||
    right[1].latest - left[1].latest ||
    left[0] - right[0]
  )[0];
  const rhythmDays = Array.from({ length: 7 }, (_, index) => {
    const date = shiftLocalDays(today, index - 6);
    const key = getDayKey(date);
    return { key, count: activityCounts.get(key) || 0 };
  });
  const challengeProgress = calculateChallengeProgress(challenges, uniqueSubmissions, now);

  return {
    totalSubmissions: uniqueSubmissions.length,
    uniqueSubmissionDays: activityCounts.size,
    currentStreak: getCurrentActivityStreak(fulfilledChallengeDayKeys, now),
    longestStreak: getLongestActivityStreak(fulfilledChallengeDayKeys),
    activeDaysPerWeek: Math.round((recentActiveDayCount / 4) * 10) / 10,
    totalGlories: uniqueSubmissions.reduce(
      (sum, submission) => sum + toNonNegativeInteger(submission.gloriesCount),
      0,
    ),
    totalComments: uniqueSubmissions.reduce(
      (sum, submission) => sum + toNonNegativeInteger(submission.commentsCount),
      0,
    ),
    mostActiveChallengeId: mostActive?.[0] ?? null,
    mostActiveChallengeCount: mostActive?.[1].days.size ?? 0,
    rhythmDays,
    ...challengeProgress,
  };
};
