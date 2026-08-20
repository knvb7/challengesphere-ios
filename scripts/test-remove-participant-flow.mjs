import assert from 'node:assert/strict';
import fs from 'node:fs';

const frontendScreen = fs.readFileSync(new URL('../app/challenge-details.tsx', import.meta.url), 'utf8');
const frontendHook = fs.readFileSync(new URL('../hooks/useChallenges.ts', import.meta.url), 'utf8');
const frontendService = fs.readFileSync(new URL('../services/challengeService.ts', import.meta.url), 'utf8');
const crewPanel = fs.readFileSync(
  new URL('../components/challenges/ChallengeCrewPanel.tsx', import.meta.url),
  'utf8',
);
const challengeGalleryCard = fs.readFileSync(
  new URL('../components/challenges/MyChallengeGalleryCard.tsx', import.meta.url),
  'utf8',
);
const backendController = fs.readFileSync(
  new URL('../../challengesphere/src/main/java/com/ironside/challengesphere/controller/ChallengeController.java', import.meta.url),
  'utf8',
);
const backendService = fs.readFileSync(
  new URL('../../challengesphere/src/main/java/com/ironside/challengesphere/service/impl/ChallengeServiceImpl.java', import.meta.url),
  'utf8',
);

assert.match(
  frontendScreen,
  /useRemoveParticipant/,
  'challenge details screen should use the creator-only remove participant mutation',
);

assert.doesNotMatch(
  frontendScreen,
  /leaveChallengeMutation\.mutate\(\s*\{\s*challengeId,\s*userIds:\s*\[participant\.id\]/,
  'participant removal must not use the current-user leave challenge endpoint',
);

assert.match(
  frontendHook,
  /export const useRemoveParticipant/,
  'useChallenges should expose a dedicated remove participant mutation',
);

assert.match(
  frontendService,
  /\/challenges\/\$\{challengeId\}\/participants\/\$\{participantUserId\}\/remove/,
  'frontend service should call the creator-only backend remove endpoint',
);

assert.match(
  frontendService,
  /\{ reason \}/,
  'frontend service should send the creator removal reason',
);

assert.match(
  frontendHook,
  /participantUserId: number; reason: string/,
  'remove participant mutation should require a reason',
);

assert.match(
  frontendScreen,
  /normalizedRemoveReason\.length > 0/,
  'creator should only need a non-empty removal reason',
);

assert.doesNotMatch(
  frontendScreen,
  /At least 10 characters|normalizedRemoveReason\.length >= 10/,
  'participant removal should not impose or advertise a minimum reason length',
);

assert.match(
  frontendScreen,
  /const canRemoveParticipant =\s*challengeDetails\.isCreator &&\s*!challengeIsCompleted &&\s*!challengeIsDeleted &&/,
  'completed and deleted challenges must not render participant removal controls',
);

assert.match(
  frontendScreen,
  /const challengeIsCompleted = isViewerChallengeCompleted\(\{[\s\S]*?crewState: crewStatus\?\.state/,
  'viewer-aware completion must close participant management when the applicable lifecycle completes',
);

assert.match(
  frontendScreen,
  /if \(challengeIsCompleted \|\| challengeIsDeleted\) \{[\s\S]*?Participants cannot be removed from completed or deleted challenges/,
  'the removal handler must reject stale actions after a challenge closes',
);

assert.match(
  frontendScreen,
  /participantPendingRemoval && !challengeIsCompleted && !challengeIsDeleted/,
  'the participant removal dialog must close visually when the challenge closes',
);

assert.match(
  crewPanel,
  /if \(status\.state !== 'LOBBY'\) \{\s*return null;/,
  'only pre-start lobby challenges should render a crew panel',
);

assert.doesNotMatch(
  crewPanel,
  /CREW RECAP|YOUR RECAP|recapGrid|useChallengeCrewRecap/,
  'crew recap copy, stats, and data fetching should be removed from the challenge screen',
);

assert.doesNotMatch(
  crewPanel,
  /CHALLENGE UNDERWAY|CREW CHECK-INS|You're underway|Starting solo counts|Allow peer check-ins/,
  'active challenges should not render the redundant underway panel',
);

assert.doesNotMatch(
  challengeGalleryCard,
  /Recap ready/,
  'completed challenge cards should not advertise a recap',
);

assert.match(
  frontendScreen,
  /keyboardVerticalOffset=\{-bottomInset\}/,
  'removal reason composer should account for keyboard and bottom safe area',
);

assert.match(
  backendController,
  /@PostMapping\("\/\{challengeId\}\/participants\/\{participantUserId\}\/remove"\)/,
  'backend should expose a dedicated creator-only remove participant endpoint',
);

assert.match(
  backendService,
  /Only the challenge creator can remove participants/,
  'backend should reject participant removal by non-creators',
);

assert.match(
  backendService,
  /The challenge creator cannot be removed/,
  'backend should reject attempts to remove the challenge creator',
);

assert.match(
  backendController,
  /@Valid @RequestBody RemoveParticipantRequest request/,
  'backend should validate a removal request body',
);

assert.match(
  backendService,
  /setRemovalReason\(normalizedReason\)/,
  'backend should persist the normalized removal reason',
);

assert.match(
  backendService,
  /notifyParticipantRemoved\([\s\S]*?normalizedReason\)/,
  'backend should notify the removed participant with the creator reason',
);

assert.match(
  backendService,
  /setBanned\(true\)/,
  'removed participants should be challenge-banned',
);

assert.match(
  backendService,
  /setBanned\(false\)/,
  'a targeted creator invite should clear the challenge ban',
);
