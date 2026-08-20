import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { challengeCrewService } from '../services/challengeCrewService';
import type { ChallengeCrewStatus } from '../types/challengeCrew';
import { challengeKeys } from './useChallenges';

export const challengeCrewKeys = {
  all: ['challenge-crews'] as const,
  detail: (challengeId: number) => [...challengeCrewKeys.all, challengeId] as const,
  recap: (challengeId: number) => [...challengeCrewKeys.detail(challengeId), 'recap'] as const,
};

export const useChallengeCrewStatus = (challengeId: number, enabled: boolean) =>
  useQuery({
    queryKey: challengeCrewKeys.detail(challengeId),
    queryFn: () => challengeCrewService.getStatus(challengeId),
    enabled: enabled && challengeId > 0,
    staleTime: 30 * 1000,
  });

export const useChallengeCrewStatuses = (challengeIds: number[], enabled: boolean) => {
  const ids = [...new Set(challengeIds)]
    .filter((challengeId) => Number.isInteger(challengeId) && challengeId > 0)
    .sort((left, right) => left - right);
  const results = useQueries({
    queries: ids.map((challengeId) => ({
      queryKey: challengeCrewKeys.detail(challengeId),
      queryFn: () => challengeCrewService.getStatus(challengeId),
      enabled,
      staleTime: 30 * 1000,
    })),
  });

  return results.map((result, index) => ({ challengeId: ids[index], ...result }));
};

const useStoreCrewStatus = (challengeId: number) => {
  const queryClient = useQueryClient();
  return (status: ChallengeCrewStatus) => {
    queryClient.setQueryData(challengeCrewKeys.detail(challengeId), status);
    queryClient.invalidateQueries({ queryKey: challengeKeys.detail(challengeId) });
  };
};

export const useStartChallengeCrew = (challengeId: number) => {
  const storeStatus = useStoreCrewStatus(challengeId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => challengeCrewService.startTogether(challengeId),
    onSuccess: (status) => {
      storeStatus(status);
      queryClient.invalidateQueries({ queryKey: challengeKeys.lists() });
    },
  });
};

export const useSetPeerReminders = (challengeId: number) => {
  const storeStatus = useStoreCrewStatus(challengeId);
  return useMutation({
    mutationFn: (enabled: boolean) => challengeCrewService.setPeerReminders(challengeId, enabled),
    onSuccess: storeStatus,
  });
};

export const useSendPeerNudge = (challengeId: number) =>
  useMutation({
    mutationFn: (recipientUserId: number) => challengeCrewService.sendPeerNudge(challengeId, recipientUserId),
  });

export const useChallengeCrewRecap = (challengeId: number, enabled: boolean) =>
  useQuery({
    queryKey: challengeCrewKeys.recap(challengeId),
    queryFn: () => challengeCrewService.getRecap(challengeId),
    enabled: enabled && challengeId > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });

export const useChallengeRematch = (challengeId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => challengeCrewService.rematch(challengeId),
    onSuccess: (response) => {
      queryClient.setQueryData<ChallengeCrewStatus>(
        challengeCrewKeys.detail(challengeId),
        (status) => status ? { ...status, rematchChallengeId: response.challengeId } : status,
      );
      queryClient.invalidateQueries({ queryKey: challengeKeys.lists() });
    },
  });
};
