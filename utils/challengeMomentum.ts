import type {
  ChallengeMomentumSnapshot,
  PrivateChallengeRankSummary,
} from '../types/api';

export interface ChallengeMotivationInput {
  challengeMode?: string;
  status?: string;
  isPrivate?: boolean;
  privateCrewState?: string;
  momentum?: ChallengeMomentumSnapshot | null;
  privateRank?: PrivateChallengeRankSummary | null;
}

export interface ChallengeMotivationCopy {
  title: string;
  message: string;
  compactLabel: string;
  accessibilityLabel: string;
  showsRank: boolean;
}

const pluralizeCheckIns = (count: number): string =>
  `${count} check-in${count === 1 ? '' : 's'}`;

const getGoalCopy = (
  momentum: ChallengeMomentumSnapshot,
): { title: string; compactLabel: string } | null => {
  if (momentum.state === 'FINAL_STRETCH') {
    const count = Math.max(0, momentum.remainingRequiredCheckIns);
    if (count <= 0) return null;
    const remaining = `${pluralizeCheckIns(count)} to go`;
    return {
      title: `Final stretch · ${remaining}`,
      compactLabel: `Final stretch · ${remaining}`,
    };
  }

  if (momentum.state === 'FINISH_STRONG') {
    const count = Math.max(0, momentum.remainingAvailableCheckIns);
    if (count <= 0) return null;
    const remaining = `${pluralizeCheckIns(count)} left`;
    return {
      title: `Finish strong · ${remaining}`,
      compactLabel: `Finish strong · ${remaining}`,
    };
  }

  return null;
};

/**
 * Builds the single motivational surface shared by cards, details and the
 * private leaderboard. The backend owns progress calculations; this helper
 * only enforces presentation eligibility and copy.
 */
export const getChallengeMotivation = ({
  challengeMode,
  status,
  isPrivate = false,
  privateCrewState,
  momentum,
  privateRank,
}: ChallengeMotivationInput): ChallengeMotivationCopy | null => {
  if (
    !momentum
    || String(challengeMode || 'DAILY').toUpperCase() === 'ONE_OFF'
    || status !== 'active'
    || momentum.totalDays <= 0
    || momentum.completedDays >= momentum.totalDays
  ) {
    return null;
  }

  if (isPrivate && privateCrewState !== 'ACTIVE') {
    return null;
  }

  const goalCopy = getGoalCopy(momentum);

  if (!isPrivate) {
    if (!goalCopy) return null;
    return {
      title: goalCopy.title.split(' · ')[0],
      message: goalCopy.title.split(' · ').slice(1).join(' · '),
      compactLabel: goalCopy.compactLabel,
      accessibilityLabel: goalCopy.title,
      showsRank: false,
    };
  }

  const rank = Number(privateRank?.rank);
  const totalParticipants = Number(privateRank?.totalParticipants);
  const hasComparativeRank = Number.isInteger(rank)
    && rank > 0
    && Number.isInteger(totalParticipants)
    && totalParticipants >= 2;

  if (momentum.completedDays === 0) {
    const message = 'Upload your first check-in to join the leaderboard';
    return {
      title: goalCopy?.title || 'Join the standings',
      message,
      compactLabel: message,
      accessibilityLabel: `${goalCopy?.title || 'Join the standings'}. ${message}`,
      showsRank: false,
    };
  }

  if (hasComparativeRank) {
    const rankLabel = rank === 1 ? 'You’re #1' : `#${rank} in your crew`;
    const message = momentum.submittedToday
      ? 'Today’s check-in is done—keep the momentum going'
      : rank === 1
        ? 'Upload today to hold the lead'
        : 'Upload today and keep climbing';
    return {
      title: goalCopy?.title || 'Group momentum',
      message: rank === 1
        ? `${rankLabel}. ${message}`
        : `You’re #${rank} of ${totalParticipants}. ${message}`,
      compactLabel: `${rankLabel} · ${message}`,
      accessibilityLabel: `${goalCopy?.title || 'Group momentum'}. ${rankLabel}. ${message}`,
      showsRank: true,
    };
  }

  if (!goalCopy) return null;
  return {
    title: goalCopy.title.split(' · ')[0],
    message: goalCopy.title.split(' · ').slice(1).join(' · '),
    compactLabel: goalCopy.compactLabel,
    accessibilityLabel: goalCopy.title,
    showsRank: false,
  };
};
