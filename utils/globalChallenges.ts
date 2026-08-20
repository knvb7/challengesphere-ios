export type GlobalChallengeFilter = 'all' | 'global' | 'following' | 'others';

export const OFFICIAL_GLOBAL_USERNAME = 'challengesphere_official';
export const OFFICIAL_ACCOUNT_AVATAR_SOURCE = require('../assets/images/Challengesphere-logo.png');
export const GLOBAL_CREATOR_DISPLAY_USERNAME = 'challengesphere';

type FilterableChallenge = {
  creatorUsername: string;
  isFollowing: boolean;
};

export const isOfficialGlobalCreator = (username: string): boolean => {
  return username.trim().replace(/^@/, '').toLowerCase() === OFFICIAL_GLOBAL_USERNAME;
};

export const getGlobalCreatorDisplayUsername = (username: string): string => {
  const cleanUsername = username.trim().replace(/^@/, '');
  return isOfficialGlobalCreator(cleanUsername)
    ? GLOBAL_CREATOR_DISPLAY_USERNAME
    : cleanUsername;
};

export const matchesGlobalChallengeFilter = (
  challenge: FilterableChallenge,
  filter: GlobalChallengeFilter,
): boolean => {
  if (filter === 'all') {
    return true;
  }

  const isOfficial = isOfficialGlobalCreator(challenge.creatorUsername);
  if (filter === 'global') {
    return isOfficial;
  }

  if (filter === 'following') {
    return !isOfficial && challenge.isFollowing;
  }

  return !isOfficial && !challenge.isFollowing;
};
