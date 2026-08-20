import { apiClient } from './apiClient';

export interface SubscriptionStatus {
  tier: 'FREE' | 'PREMIUM';
  premium: boolean;
  purchasesEnabled: boolean;
  appUserId: string;
  productId: string | null;
  status: string;
  expiresAt: string | null;
  willRenew: boolean;
  activePublicChallenges: number;
  publicChallengeLimit: number;
  activePrivateChallenges: number;
  privateChallengeLimit: number;
}

class SubscriptionService {
  async getStatus(): Promise<SubscriptionStatus> {
    const response = await apiClient.get<SubscriptionStatus>('/subscriptions/me');
    return response.data;
  }

  async sync(): Promise<SubscriptionStatus> {
    const response = await apiClient.post<SubscriptionStatus>('/subscriptions/me/sync');
    return response.data;
  }

}

export const subscriptionService = new SubscriptionService();
