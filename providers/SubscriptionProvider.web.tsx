import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { SubscriptionContext } from '@/providers/SubscriptionContext';
import { useAuthContext } from '@/providers/AuthProvider';
import { SubscriptionStatus, subscriptionService } from '@/services/subscriptionService';
import { AppAlert as Alert } from '@/utils/appAlert';

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { currentUserId, isLoading: isAuthLoading } = useAuthContext();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!currentUserId) {
      setStatus(null);
      return null;
    }
    setIsLoading(true);
    try {
      const nextStatus = await subscriptionService.getStatus();
      setStatus(nextStatus);
      return nextStatus;
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!isAuthLoading && currentUserId) {
      void refreshStatus().catch(() => undefined);
    } else if (!currentUserId) {
      setStatus(null);
    }
  }, [currentUserId, isAuthLoading, refreshStatus]);

  const unavailable = useCallback(async () => {
    Alert.alert('Available in the iOS app', 'Premium purchases are available through the App Store.');
  }, []);

  const value = useMemo(() => ({
    status,
    isLoading,
    isPurchasePending: false,
    canPurchase: false,
    canRestore: false,
    refreshStatus,
    presentPaywall: unavailable,
    restorePurchases: unavailable,
    manageSubscription: unavailable,
  }), [isLoading, refreshStatus, status, unavailable]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export default SubscriptionProvider;
