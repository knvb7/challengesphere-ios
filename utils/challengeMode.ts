export const CHALLENGE_MODE_DAILY = 'DAILY';
export const CHALLENGE_MODE_ONE_OFF = 'ONE_OFF';

export const isOneOffChallengeMode = (challengeMode?: string | null): boolean =>
  challengeMode?.trim().toUpperCase().replace(/[\s-]+/g, '_') === CHALLENGE_MODE_ONE_OFF;

export const getChallengeModeLabel = (challengeMode?: string | null): string =>
  isOneOffChallengeMode(challengeMode) ? 'One-off' : 'Daily';
