export type ChallengeCrewState = 'LOBBY' | 'ACTIVE' | 'COMPLETED';

export interface ChallengeCrewStatus {
  challengeId: number;
  state: ChallengeCrewState;
  privateChallenge: boolean;
  canManageCrew: boolean;
  canStart: boolean;
  acceptedCount: number;
  invitedCount: number;
  pendingInviteCount: number;
  minimumStartCount: number;
  recommendedReadyCount: number;
  startedAt?: string | null;
  startedByUserId?: number | null;
  peerRemindersEnabled: boolean;
  reminderOptedInUserIds: number[];
  recapAvailable: boolean;
  rematchAvailable: boolean;
  rematchChallengeId?: number | null;
}

export interface ChallengeCrewRecap {
  challengeId: number;
  challengeTitle: string;
  participantCount: number;
  contributorCount: number;
  checkInCount: number;
  totalPossibleCheckIns: number;
  collectiveCompletionPercent: number;
  recapReadyAt: string;
}

export interface PeerNudgeResponse {
  challengeId: number;
  recipientUserId: number;
  sentAt: string;
  nextAllowedAt: string;
  message: string;
}

export interface ChallengeRematchResponse {
  sourceChallengeId: number;
  challengeId: number;
  copiedInviteCount: number;
  message: string;
}
