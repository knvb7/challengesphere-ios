import { isOneOffChallengeMode } from './challengeMode';

type ChallengeStatus = 'active' | 'completed' | 'upcoming' | 'deleted';

interface ViewerChallengeCompletionInput {
  status: ChallengeStatus;
  challengeMode?: string;
  hasSubmittedCurrentDay?: boolean;
  challengeHasElapsed?: boolean;
  crewState?: string;
}

export const isViewerChallengeCompleted = ({
  status,
  challengeMode,
  hasSubmittedCurrentDay = false,
  challengeHasElapsed = false,
  crewState,
}: ViewerChallengeCompletionInput): boolean => {
  if (status === 'completed' || challengeHasElapsed) return true;

  // A one-off completion belongs to one participant. The shared crew can be
  // complete while another participant still needs to make their submission.
  if (isOneOffChallengeMode(challengeMode)) return hasSubmittedCurrentDay;

  return crewState === 'COMPLETED';
};
