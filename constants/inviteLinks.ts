import Constants from 'expo-constants';

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.challengesphere.app';
export const APP_STORE_URL = 'https://challengesphere.com/download';
export const CHALLENGE_INVITE_BASE_URL = 'https://challengesphere.com/invite';

const configuredScheme = Constants.expoConfig?.scheme;
export const CHALLENGE_INVITE_SCHEME = (
  Array.isArray(configuredScheme) ? configuredScheme[0] : configuredScheme
) || 'challengesphere';
export const CHALLENGE_INVITE_FALLBACK_BASE_URL = `${CHALLENGE_INVITE_SCHEME}://invite`;

const CS_LOGO_SYMBOL = '[CS]';
const BRANDED_HEADLINE = `${CS_LOGO_SYMBOL} ChallengeSphere \u00b7 Daily challenges, shared progress, friendly accountability`;

const buildStoreLinks = () => `Google Play: ${PLAY_STORE_URL}\niPhone: ${APP_STORE_URL}`;

export const buildChallengeInviteUrl = (inviteCode: string) =>
  `${CHALLENGE_INVITE_BASE_URL}/${encodeURIComponent(inviteCode.trim())}`;

export const buildAppInviteMessage = () =>
  `${BRANDED_HEADLINE}\n\nJoin my sphere on ChallengeSphere. Pick a challenge, post your progress, and let's keep each other showing up.\n\nDownload the app:\n${buildStoreLinks()}`;

export const buildChallengeInviteMessage = ({
  challengeTitle,
  inviteCode,
}: {
  challengeTitle?: string;
  inviteCode: string;
}) => {
  const normalizedInviteCode = inviteCode.trim();
  const title = challengeTitle?.trim();
  const challengeLine = title
    ? `Show up with me for "${title}" on ChallengeSphere.`
    : 'Show up with me for a ChallengeSphere challenge.';

  return `${BRANDED_HEADLINE}\n\n${challengeLine}\nBring your daily submission, I will bring the encouragement.\n\nOpen invite: ${buildChallengeInviteUrl(normalizedInviteCode)}\nInvite code: ${normalizedInviteCode}\n\nDownload ChallengeSphere:\n${buildStoreLinks()}`;
};
