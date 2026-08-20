import type {
  ChallengeCrewRecap,
  ChallengeCrewStatus,
  ChallengeRematchResponse,
  PeerNudgeResponse,
} from '../types/challengeCrew';
import { apiClient } from './apiClient';

class ChallengeCrewService {
  async getStatus(challengeId: number): Promise<ChallengeCrewStatus> {
    const response = await apiClient.get<ChallengeCrewStatus>(`/challenges/${challengeId}/crew`);
    return response.data;
  }

  async startTogether(challengeId: number): Promise<ChallengeCrewStatus> {
    const response = await apiClient.post<ChallengeCrewStatus>(`/challenges/${challengeId}/crew/start`);
    return response.data;
  }

  async setPeerReminders(challengeId: number, enabled: boolean): Promise<ChallengeCrewStatus> {
    const response = await apiClient.put<ChallengeCrewStatus>(
      `/challenges/${challengeId}/crew/peer-reminders`,
      { enabled },
    );
    return response.data;
  }

  async sendPeerNudge(challengeId: number, recipientUserId: number): Promise<PeerNudgeResponse> {
    const response = await apiClient.post<PeerNudgeResponse>(
      `/challenges/${challengeId}/crew/nudges`,
      { recipientUserId },
    );
    return response.data;
  }

  async getRecap(challengeId: number): Promise<ChallengeCrewRecap> {
    const response = await apiClient.get<ChallengeCrewRecap>(`/challenges/${challengeId}/crew/recap`);
    return response.data;
  }

  async rematch(challengeId: number): Promise<ChallengeRematchResponse> {
    const response = await apiClient.post<ChallengeRematchResponse>(`/challenges/${challengeId}/crew/rematch`);
    return response.data;
  }
}

export const challengeCrewService = new ChallengeCrewService();
