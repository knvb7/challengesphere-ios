const DEVICE_ONBOARDING_SEEN_KEY = 'onboarding_intro_seen_device';
const USER_ONBOARDING_SEEN_PREFIX = 'onboarding_intro_seen_user_';
const DEVICE_PROFILE_SETUP_PENDING_KEY = 'profile_setup_pending_device';
const USER_PROFILE_SETUP_PENDING_PREFIX = 'profile_setup_pending_user_';

type UserLike = {
  id?: number | string | null;
};

type AuthResponseLike = {
  user?: UserLike | null;
  userId?: number | string | null;
};

export function normalizeOnboardingUserId(userId: number | string | null | undefined): number | null {
  if (typeof userId === 'number') {
    return Number.isFinite(userId) && userId > 0 ? userId : null;
  }

  if (typeof userId === 'string' && userId.trim()) {
    const parsed = Number.parseInt(userId, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

export function getOnboardingSeenKey(userId: number | string | null | undefined): string {
  const normalizedUserId = normalizeOnboardingUserId(userId);
  return normalizedUserId
    ? `${USER_ONBOARDING_SEEN_PREFIX}${normalizedUserId}`
    : DEVICE_ONBOARDING_SEEN_KEY;
}

export function getProfileSetupPendingKey(userId: number | string | null | undefined): string {
  const normalizedUserId = normalizeOnboardingUserId(userId);
  return normalizedUserId
    ? `${USER_PROFILE_SETUP_PENDING_PREFIX}${normalizedUserId}`
    : DEVICE_PROFILE_SETUP_PENDING_KEY;
}

export function getAuthResponseUserId(authData: AuthResponseLike): number | null {
  return normalizeOnboardingUserId(authData.user?.id ?? authData.userId);
}
