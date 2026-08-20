import { calculateAge } from './dateOfBirth';

export interface AdsEligibilityInput {
  currentUserId: number;
  dateOfBirth?: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  premiumUser: unknown;
}

export function isAdsEligible(
  {
    currentUserId,
    dateOfBirth,
    isAuthenticated,
    isLoading,
    premiumUser,
  }: AdsEligibilityInput,
  today = new Date(),
): boolean {
  const normalizedDateOfBirth = typeof dateOfBirth === 'string' ? dateOfBirth.trim() : '';
  const age = normalizedDateOfBirth ? calculateAge(normalizedDateOfBirth, today) : null;
  const isKnownNonPremium = premiumUser === 0 || premiumUser === false;

  return !isLoading
    && isAuthenticated
    && currentUserId > 0
    && age !== null
    && age >= 18
    && isKnownNonPremium;
}
