export const FEED_ENABLED = true;

export const FEED_COMING_SOON_MESSAGE =
  'Feed page will be coming soon after we have enough challengers.';

export const FEED_SETTINGS_SUBTITLE =
  'Followers, following, and shared challenge activity';

export const FEED_STATUS_MESSAGE =
  'Shows public check-ins from your followers and people you follow. Private check-ins only appear when you share that challenge.';

export const formatChallengerCount = (count?: number) => {
  if (typeof count !== 'number' || !Number.isFinite(count)) {
    return 'loading';
  }

  return Math.max(0, count).toLocaleString();
};
