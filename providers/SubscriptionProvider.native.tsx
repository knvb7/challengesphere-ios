import Constants from 'expo-constants';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { useAuthContext } from '@/providers/AuthProvider';
import { SubscriptionContext } from '@/providers/SubscriptionContext';
import { SubscriptionStatus, subscriptionService } from '@/services/subscriptionService';
import { AppAlert as Alert } from '@/utils/appAlert';

const ENTITLEMENT_ID = 'premium';
const revenueCatIosApiKey = String(
  Constants.expoConfig?.extra?.revenueCatIosApiKey ?? '',
).trim();

let purchasesConfigured = false;
let configuredAppUserId: string | null = null;

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { currentUserId, isLoading: isAuthLoading, refreshUser } = useAuthContext();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasePending, setIsPurchasePending] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const operationRef = useRef(false);

  const appUserId = currentUserId > 0 ? `cs_user_${currentUserId}` : null;
  const purchasesAvailable = Platform.OS === 'ios' && revenueCatIosApiKey.length > 0;

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

  const syncEntitlement = useCallback(async () => {
    const nextStatus = await subscriptionService.sync();
    setStatus(nextStatus);
    await refreshUser();
    return nextStatus;
  }, [refreshUser]);

  useEffect(() => {
    setIsSdkReady(false);
    if (isAuthLoading || !appUserId || !purchasesAvailable) return;

    let cancelled = false;
    const configure = async () => {
      if (!purchasesConfigured) {
        Purchases.configure({ apiKey: revenueCatIosApiKey, appUserID: appUserId });
        purchasesConfigured = true;
        configuredAppUserId = appUserId;
        if (!cancelled) setIsSdkReady(true);
        return;
      }
      if (configuredAppUserId !== appUserId) {
        await Purchases.logIn(appUserId);
        if (!cancelled) {
          configuredAppUserId = appUserId;
          setIsSdkReady(true);
        }
        return;
      }
      if (!cancelled) setIsSdkReady(true);
    };
    void configure().catch(() => {
      if (!cancelled) setIsSdkReady(false);
    });
    return () => {
      cancelled = true;
    };
  }, [appUserId, isAuthLoading, purchasesAvailable]);

  useEffect(() => {
    if (isAuthLoading || appUserId || !purchasesConfigured) return;

    // ChallengeSphere only purchases under authenticated custom App User IDs.
    // Keep RevenueCat on the last identified customer while signed out so the SDK
    // never creates an anonymous ID that could later be aliased to another account.
    setIsSdkReady(false);
  }, [appUserId, isAuthLoading]);

  useEffect(() => {
    if (!isSdkReady || !currentUserId) return;

    const listener = () => {
      void syncEntitlement().catch(() => undefined);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [currentUserId, isSdkReady, syncEntitlement]);

  useEffect(() => {
    if (!isAuthLoading && currentUserId) {
      void refreshStatus().catch(() => undefined);
    } else if (!currentUserId) {
      setStatus(null);
    }
  }, [currentUserId, isAuthLoading, refreshStatus]);

  useEffect(() => {
    if (!currentUserId) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void Promise.all([refreshStatus(), refreshUser()]).catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [currentUserId, refreshStatus, refreshUser]);

  const ensureSdkAvailable = useCallback(() => {
    if (!purchasesAvailable || !purchasesConfigured || configuredAppUserId !== appUserId) {
      Alert.alert(
        'Premium plans are not ready',
        'Premium plans are not active in this App Store version yet.',
      );
      return false;
    }
    return true;
  }, [appUserId, purchasesAvailable]);

  const ensurePurchasesAvailable = useCallback(() => {
    if (!ensureSdkAvailable()) return false;
    if (!status?.purchasesEnabled) {
      Alert.alert('Premium plans are paused', 'Premium enrollment is temporarily paused. Please try again later.');
      return false;
    }
    return true;
  }, [ensureSdkAvailable, status]);

  const presentPaywall = useCallback(async () => {
    if (operationRef.current || !ensurePurchasesAvailable()) return;
    operationRef.current = true;
    setIsPurchasePending(true);
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
        displayCloseButton: true,
      });
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        const nextStatus = await syncEntitlement();
        if (nextStatus.premium) {
          Alert.alert('Premium unlocked', 'Your 20 public and 20 private challenge limits are active. Ads are now off.');
        }
      } else if (result === PAYWALL_RESULT.ERROR) {
        Alert.alert('Purchase not completed', 'The App Store could not complete the purchase. Please try again.');
      }
    } catch {
      Alert.alert('Purchase not completed', 'We could not verify the purchase. If you were charged, use Restore Purchases.');
    } finally {
      operationRef.current = false;
      setIsPurchasePending(false);
    }
  }, [ensurePurchasesAvailable, syncEntitlement]);

  const restorePurchases = useCallback(async () => {
    if (operationRef.current || !ensureSdkAvailable()) return;
    operationRef.current = true;
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Restore to this account?',
        'Restoring can move the App Store subscription from another ChallengeSphere account to the account currently signed in. Continue only if this is the account you want to use.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Restore', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (!confirmed) {
      operationRef.current = false;
      return;
    }
    setIsPurchasePending(true);
    try {
      await Purchases.restorePurchases();
      const nextStatus = await syncEntitlement();
      Alert.alert(
        nextStatus.premium ? 'Purchases restored' : 'No active subscription found',
        nextStatus.premium
          ? 'ChallengeSphere Premium is active on this account.'
          : 'The App Store did not return an active Premium subscription for this account.',
      );
    } catch {
      Alert.alert('Restore failed', 'We could not restore your purchases. Please try again.');
    } finally {
      operationRef.current = false;
      setIsPurchasePending(false);
    }
  }, [ensureSdkAvailable, syncEntitlement]);

  const manageSubscription = useCallback(async () => {
    if (operationRef.current || !ensureSdkAvailable()) return;
    operationRef.current = true;
    setIsPurchasePending(true);
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch {
      Alert.alert('Unable to open subscription', 'Please manage Premium from your App Store subscriptions.');
      operationRef.current = false;
      setIsPurchasePending(false);
      return;
    }
    try {
      await syncEntitlement();
    } catch {
      await refreshStatus().catch(() => undefined);
    } finally {
      operationRef.current = false;
      setIsPurchasePending(false);
    }
  }, [ensureSdkAvailable, refreshStatus, syncEntitlement]);

  const value = useMemo(() => ({
    status,
    isLoading,
    isPurchasePending,
    canPurchase: isSdkReady && status?.purchasesEnabled === true,
    canRestore: isSdkReady,
    refreshStatus,
    presentPaywall,
    restorePurchases,
    manageSubscription,
  }), [
    isLoading,
    isPurchasePending,
    isSdkReady,
    manageSubscription,
    presentPaywall,
    refreshStatus,
    restorePurchases,
    status,
  ]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export default SubscriptionProvider;
