import {
    ChallengeInvitesResponse,
    CreateInviteLinkRequest,
    InviteChallengeUsersRequest,
    InviteLinkResponse,
    RedeemInviteRequest,
    RedeemInviteResponse
} from '../types/api';
import { buildChallengeInviteUrl } from '../constants/inviteLinks';
import { apiClient } from './apiClient';

const withDirectInviteUrl = (invite: InviteLinkResponse): InviteLinkResponse => {
  const inviteCode = invite.inviteCode?.trim();
  return {
    ...invite,
    inviteUrl: inviteCode ? buildChallengeInviteUrl(inviteCode) : undefined,
  };
};

class InviteService {
  // Generate invite link — POST /api/v1/invites
  async generateInviteLink(request: CreateInviteLinkRequest): Promise<InviteLinkResponse> {
    const response = await apiClient.post<InviteLinkResponse>('/invites', request);
    return withDirectInviteUrl(response.data);
  }

  // Send an in-app challenge invite. Creators and active participants may use this endpoint.
  async inviteChallengeUsers(request: InviteChallengeUsersRequest): Promise<void> {
    await apiClient.post(`/challenges/${request.challengeId}/invites`, {
      invitedUserIds: request.invitedUserIds,
    });
  }

  // Redeem invite — POST /api/v1/invites/redeem
  async redeemInvite(request: RedeemInviteRequest): Promise<RedeemInviteResponse> {
    const response = await apiClient.post<RedeemInviteResponse>('/invites/redeem', request);
    return response.data;
  }

  // Get invite details — GET /api/v1/invites/{inviteCode}
  async getInviteDetails(inviteCode: string): Promise<InviteLinkResponse> {
    const encodedInviteCode = encodeURIComponent(inviteCode);
    const response = await apiClient.get<InviteLinkResponse>(`/invites/${encodedInviteCode}`);
    return withDirectInviteUrl(response.data);
  }

  // Get invites for a challenge — GET /api/v1/invites/challenge/{challengeId}
  async getInvitesForChallenge(challengeId: number): Promise<ChallengeInvitesResponse> {
    const response = await apiClient.get<ChallengeInvitesResponse>(`/invites/challenge/${challengeId}`);
    return {
      ...response.data,
      invites: response.data.invites.map(withDirectInviteUrl),
    };
  }

  // Deactivate invite — actor identity comes from the access token.
  async deactivateInvite(inviteId: number): Promise<void> {
    await apiClient.delete(`/invites/${inviteId}`);
  }
}

export const inviteService = new InviteService();
export default inviteService;
