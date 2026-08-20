import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inviteService } from '../services/inviteService';
import { CreateInviteLinkRequest, InviteChallengeUsersRequest, RedeemInviteRequest } from '../types/api';
import { getApiErrorMessage } from '../utils/apiError';
import { challengeKeys } from './useChallenges';
import { useSubscription } from '../providers/SubscriptionContext';

const INVITE_CODE_PATTERN = /^[A-Za-z0-9]{8,12}$/;

// Query keys
export const inviteKeys = {
  all: ['invites'] as const,
  details: (inviteCode: string) => [...inviteKeys.all, 'details', inviteCode] as const,
  forChallenge: (challengeId: number) => [...inviteKeys.all, 'challenge', challengeId] as const,
};

// Get invite details by code
export const useInviteDetails = (inviteCode: string) => {
  return useQuery({
    queryKey: inviteKeys.details(inviteCode),
    queryFn: () => inviteService.getInviteDetails(inviteCode),
    enabled: INVITE_CODE_PATTERN.test(inviteCode),
  });
};

// Get invites for a challenge
export const useInvitesForChallenge = (challengeId: number, enabled = true) => {
  return useQuery({
    queryKey: inviteKeys.forChallenge(challengeId),
    queryFn: () => inviteService.getInvitesForChallenge(challengeId),
    enabled: enabled && !!challengeId && challengeId > 0,
  });
};

// Generate invite link
export const useGenerateInviteLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateInviteLinkRequest) => inviteService.generateInviteLink(request),
    onSuccess: (_, request) => {
      queryClient.invalidateQueries({ queryKey: inviteKeys.forChallenge(request.challengeId) });
    },
  });
};

// Invite followers/following from inside the app without granting challenge edit access.
export const useInviteChallengeUsers = () => {
  return useMutation({
    mutationFn: async (request: InviteChallengeUsersRequest) => {
      try {
        await inviteService.inviteChallengeUsers(request);
      } catch (error) {
        throw new Error(getApiErrorMessage(error, 'Failed to send challenge invites.'));
      }
    },
  });
};

// Redeem invite
export const useRedeemInvite = () => {
  const queryClient = useQueryClient();
  const { refreshStatus } = useSubscription();

  return useMutation({
    mutationFn: async (request: RedeemInviteRequest) => {
      try {
        return await inviteService.redeemInvite(request);
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (response, request) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['myActiveChallenges', request.userId] });
      queryClient.invalidateQueries({ queryKey: challengeKeys.detail(response.challengeId) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.participants(response.challengeId) });
      void refreshStatus().catch(() => undefined);
    },
  });
};

// Deactivate invite
export const useDeactivateInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ inviteId }: { inviteId: number }) =>
      inviteService.deactivateInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inviteKeys.all });
    },
  });
};
