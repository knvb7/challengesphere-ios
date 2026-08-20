import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import { useSubscription } from '../providers/SubscriptionContext';

export const UNREAD_COUNT_STALE_TIME_MS = 10 * 1000;
export const UNREAD_COUNT_REFETCH_INTERVAL_MS = 15 * 1000;

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: number) => [...notificationKeys.all, 'list', userId] as const,
  unread: (userId: number) => [...notificationKeys.all, 'unread', userId] as const,
  inviteDetails: (notificationId: number) => (
    [...notificationKeys.all, 'invite-details', notificationId] as const
  ),
};

export const useNotifications = (userId: number, limit = 50) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...notificationKeys.list(userId), limit],
    queryFn: async () => {
      const response = await notificationService.getNotifications(userId, limit);
      queryClient.setQueryData(notificationKeys.unread(userId), response.unreadCount ?? 0);
      return response;
    },
    enabled: userId > 0,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useUnreadNotificationCount = (userId: number) => {
  return useQuery({
    queryKey: notificationKeys.unread(userId),
    queryFn: () => notificationService.getUnreadCount(userId),
    enabled: userId > 0,
    staleTime: UNREAD_COUNT_STALE_TIME_MS,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    refetchInterval: UNREAD_COUNT_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
};

export const useChallengeInviteDetails = (notificationId: number) => {
  return useQuery({
    queryKey: notificationKeys.inviteDetails(notificationId),
    queryFn: () => notificationService.getChallengeInviteDetails(notificationId),
    enabled: Number.isInteger(notificationId) && notificationId > 0,
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => notificationService.markAllAsRead(userId),
    onSuccess: (_, userId) => {
      queryClient.setQueryData(notificationKeys.unread(userId), 0);
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) });
    },
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, notificationId }: { userId: number; notificationId: number }) =>
      notificationService.markAsRead(userId, notificationId),
    onSuccess: (_, { userId }) => {
      queryClient.setQueryData<number>(notificationKeys.unread(userId), (previous = 0) => Math.max(0, previous - 1));
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) });
    },
  });
};

export const useAcceptChallengeInvite = () => {
  const queryClient = useQueryClient();
  const { refreshStatus } = useSubscription();

  return useMutation({
    mutationFn: async ({ notificationId, userId }: { notificationId: number; userId: number }) => {
      try {
        return await notificationService.acceptChallengeInvite(notificationId);
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['myActiveChallenges', userId] });
      void refreshStatus().catch(() => undefined);
    },
  });
};

export const useIgnoreChallengeInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) => notificationService.ignoreChallengeInvite(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

export const useClearNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => notificationService.clearNotifications(userId),
    onSuccess: (_, userId) => {
      queryClient.setQueryData(notificationKeys.unread(userId), 0);
      queryClient.setQueryData([...notificationKeys.list(userId), 50], {
        notifications: [],
        total: 0,
        unreadCount: 0,
      });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

export const useClearActivityNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => notificationService.clearActivity(userId),
    onSuccess: (response, userId) => {
      queryClient.setQueryData(notificationKeys.unread(userId), response.unreadCount);
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) });
    },
  });
};
