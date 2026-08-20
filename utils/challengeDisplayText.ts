import { parseChallengeDescription } from './challengeDescription';

export type ChallengeDescriptionSource = {
  description?: string | null;
  challengeDescription?: string | null;
  challengeSummary?: string | null;
  summary?: string | null;
  rules?: string | null;
  challengeRules?: string | null;
  benefits?: string | null;
  challengeBenefits?: string | null;
};

const isPlaceholderDescription = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    /^[.\u2026]+$/.test(normalized) ||
    normalized === 'null' ||
    normalized === 'undefined' ||
    normalized === 'n/a'
  );
};

const getDisplayValue = (values: (string | null | undefined)[]): string => {
  const value = values.find(
    (candidate) => typeof candidate === 'string' && !isPlaceholderDescription(candidate),
  );
  return value?.trim() || '';
};

export const getDisplayDescription = (challenge: ChallengeDescriptionSource): string => {
  const description = [
    challenge.description,
    challenge.challengeDescription,
    challenge.challengeSummary,
    challenge.summary,
  ].find((value) => typeof value === 'string' && !isPlaceholderDescription(value));

  const mainDescription = parseChallengeDescription(description).mainDescription;
  return mainDescription || 'No description available.';
};

export const getDisplayRules = (challenge: ChallengeDescriptionSource): string => {
  const explicitRules = getDisplayValue([challenge.rules, challenge.challengeRules]);

  if (explicitRules) {
    return explicitRules;
  }

  const description = [
    challenge.description,
    challenge.challengeDescription,
    challenge.challengeSummary,
    challenge.summary,
  ].find((value) => typeof value === 'string' && !isPlaceholderDescription(value));

  return getDisplayValue([parseChallengeDescription(description).rules]);
};

export const getDisplayBenefits = (challenge: ChallengeDescriptionSource): string => {
  const explicitBenefits = getDisplayValue([challenge.benefits, challenge.challengeBenefits]);

  if (explicitBenefits) {
    return explicitBenefits;
  }

  const description = [
    challenge.description,
    challenge.challengeDescription,
    challenge.challengeSummary,
    challenge.summary,
  ].find((value) => typeof value === 'string' && !isPlaceholderDescription(value));

  return getDisplayValue([parseChallengeDescription(description).benefits]);
};

export const getMainChallengeDescription = getDisplayDescription;
