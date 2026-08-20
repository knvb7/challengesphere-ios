import { createContext, useContext } from 'react';

import { SubscriptionStatus } from '@/services/subscriptionService';

export interface SubscriptionContextValue {
  status: SubscriptionStatus | null;
  isLoading: boolean;
  isPurchasePending: boolean;
  canPurchase: boolean;
  canRestore: boolean;
  refreshStatus: () => Promise<SubscriptionStatus | null>;
  presentPaywall: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  manageSubscription: () => Promise<void>;
}

export const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used inside SubscriptionProvider');
  }
  return context;
}
