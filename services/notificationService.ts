import {
  ChallengeInviteDetailsResponse,
  ClearActivityNotificationsResponse,
  JoinChallengeResponse,
  MarkNotificationsReadResponse,
  NotificationsResponse,
  RegisterPushTokenRequest,
  UnreadNotificationsResponse,
} from '../types/api';
import { apiClient } from './apiClient';

class NotificationService {
  async getNotifications(userId: number, limit = 50): Promise<NotificationsResponse> {
    const response = await apiClient.get<NotificationsResponse>(
      `/notifications/${userId}?limit=${limit}`
    );
    return response.data;
  }

  async getUnreadCount(userId: number): Promise<number> {
    const response = await apiClient.get<UnreadNotificationsResponse>(
      `/notifications/${userId}/unread-count`
    );
    return response.data.unreadCount;
  }

  async markAllAsRead(userId: number): Promise<MarkNotificationsReadResponse> {
    const response = await apiClient.patch<MarkNotificationsReadResponse>(
      `/notifications/${userId}/read`
    );
    return response.data;
  }

  async markAsRead(userId: number, notificationId: number): Promise<MarkNotificationsReadResponse> {
    const response = await apiClient.patch<MarkNotificationsReadResponse>(
      `/notifications/${userId}/${notificationId}/read`
    );
    return response.data;
  }

  async acceptChallengeInvite(notificationId: number): Promise<JoinChallengeResponse> {
    const response = await apiClient.post<JoinChallengeResponse>(
      `/notifications/me/${notificationId}/challenge-invite/accept`
    );
    return response.data;
  }

  async getChallengeInviteDetails(notificationId: number): Promise<ChallengeInviteDetailsResponse> {
    const response = await apiClient.get<ChallengeInviteDetailsResponse>(
      `/notifications/me/${notificationId}/challenge-invite`
    );
    return response.data;
  }

  async ignoreChallengeInvite(notificationId: number): Promise<{ handled: boolean; notificationId: number }> {
    const response = await apiClient.post<{ handled: boolean; notificationId: number }>(
      `/notifications/me/${notificationId}/challenge-invite/ignore`
    );
    return response.data;
  }

  async clearNotifications(userId: number): Promise<void> {
    await apiClient.delete(`/notifications/${userId}`);
  }

  async clearActivity(userId: number): Promise<ClearActivityNotificationsResponse> {
    const response = await apiClient.delete<ClearActivityNotificationsResponse>(
      `/notifications/${userId}/activity`
    );
    return response.data;
  }

  async registerPushToken(request: RegisterPushTokenRequest): Promise<{ registered: boolean; tokenId: number }> {
    const response = await apiClient.post<{ registered: boolean; tokenId: number }>(
      '/notifications/me/push-token',
      request
    );
    return response.data;
  }

  async disablePushToken(expoPushToken: string): Promise<{ disabled: boolean }> {
    const response = await apiClient.delete<{ disabled: boolean }>('/notifications/me/push-token', {
      data: { expoPushToken },
    });
    return response.data;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
