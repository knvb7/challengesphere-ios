import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const challengeDetailsSource = read('app/challenge-details.tsx');
const crewPanelSource = read('components/challenges/ChallengeCrewPanel.tsx');
const inviteHookSource = read('hooks/useInvites.ts');
const inviteServiceSource = read('services/inviteService.ts');
const inviteFlowStart = challengeDetailsSource.indexOf('const handleSendInvites');
const inviteFlowEnd = challengeDetailsSource.indexOf('const handleRemoveParticipant', inviteFlowStart);
const crewErrorStart = crewPanelSource.indexOf('if (hasError || !status)');
const crewErrorEnd = crewPanelSource.indexOf("if (status.state !== 'LOBBY')", crewErrorStart);

assert.ok(inviteFlowStart >= 0 && inviteFlowEnd > inviteFlowStart, 'challenge details should define the in-app invite flow');

const inviteFlowSource = challengeDetailsSource.slice(inviteFlowStart, inviteFlowEnd);

assert.match(
  inviteFlowSource,
  /inviteChallengeUsersMutation\.mutate\(\s*\{\s*challengeId,\s*invitedUserIds\s*\}/,
  'in-app invites should use the dedicated invite-only mutation'
);
assert.doesNotMatch(
  inviteFlowSource,
  /updateChallengeMutation|coverPhotoUrls|stableCoverPhotoUrls|existingCoverPhotoUrls/,
  'in-app invites must not update challenge content or resubmit cover URLs'
);
assert.doesNotMatch(
  inviteFlowSource,
  /data:\s*\{[\s\S]*?(?:title|description|categories|hashtags|benefits|numberOfDays|challengeMode|active)\s*:/,
  'in-app invites must not rewrite unrelated challenge fields'
);

assert.match(
  challengeDetailsSource,
  /const canInviteFromSocialGraph = CURRENT_USER_ID > 0 && \([\s\S]*participantsData\?\.participants[\s\S]*participant\.id === CURRENT_USER_ID/,
  'active joined participants should be allowed to load their followers and following'
);
assert.match(
  challengeDetailsSource,
  /useInfiniteUserFollowers\(CURRENT_USER_ID, 100, CURRENT_USER_ID, canInviteFromSocialGraph\)/,
  'the follower picker should load and paginate for an eligible participant'
);
assert.match(
  challengeDetailsSource,
  /useInfiniteUserFollowing\(CURRENT_USER_ID, 100, CURRENT_USER_ID, canInviteFromSocialGraph\)/,
  'the following picker should load and paginate for an eligible participant'
);
assert.match(
  challengeDetailsSource,
  /new Map<number[\s\S]*followersData\?\.pages[\s\S]*followingData\?\.pages[\s\S]*user\.id !== CURRENT_USER_ID && !participantIds\.has\(user\.id\)/,
  'the picker should union both relationship directions, dedupe by id, and exclude self and participants'
);
assert.match(
  challengeDetailsSource,
  /onEndReached=\{loadMoreInviteUsers\}/,
  'the picker should load additional follower and following pages'
);
assert.match(
  challengeDetailsSource,
  /onInvite=\{handleOpenInviteModal\}[\s\S]*onShareInvite=\{handleShareChallengeInvite\}/,
  'private challenge participants should get both in-app and external invite options'
);
assert.match(
  challengeDetailsSource,
  /:\s*isParticipant\s*\?\s*\([\s\S]{0,1800}onPress=\{handleOpenInviteModal\}[\s\S]{0,1800}onPress=\{handleShareChallengeInvite\}/,
  'public challenge participants should get both in-app and external invite options'
);
assert.match(
  crewPanelSource,
  /label="Invite app friends"[\s\S]*label="Contacts or WhatsApp"/,
  'the private crew panel should expose both invitation paths'
);
assert.ok(crewErrorStart >= 0 && crewErrorEnd > crewErrorStart, 'crew panel should define an error fallback');
assert.match(
  crewPanelSource.slice(crewErrorStart, crewErrorEnd),
  /label="Invite app friends"[\s\S]*label="Contacts or WhatsApp"/,
  'private participants should retain both invitation paths when crew controls fail to load'
);
assert.match(
  challengeDetailsSource,
  /MAX_IN_APP_INVITES = 20[\s\S]*selectedInviteUserIdsRef\.current[\s\S]*Invite Limit Reached/,
  'the picker should enforce the backend per-request invitation limit'
);
assert.match(
  challengeDetailsSource,
  /inviteModalTitle:\s*\{[\s\S]*?fontSize: 15,[\s\S]*?lineHeight: 20,/,
  'the in-app invite modal should use a compact title'
);
assert.match(
  challengeDetailsSource,
  /inviteCandidateName:\s*\{[\s\S]*?fontSize: 13,/,
  'invite candidate names should use compact typography'
);
assert.match(
  challengeDetailsSource,
  /inviteCandidateUsername:\s*\{[\s\S]*?fontSize: 11,/,
  'invite candidate relationship text should use compact typography'
);
assert.match(
  inviteHookSource,
  /export const useInviteChallengeUsers/,
  'the frontend should expose a focused in-app invitation mutation'
);
assert.match(
  inviteServiceSource,
  /\/challenges\/\$\{request\.challengeId\}\/invites/,
  'the frontend should call the participant-safe invite endpoint'
);

console.log('Participant in-app challenge invite regression checks passed');
