import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { addAppleCredentialRevokeListener } from '../services/appleAuthService';
import { setAuthFailureHandler } from '../services/apiClient';
import { authService } from '../services/authService';
import {
  clearPendingPushNotificationResponses,
  disableRegisteredPushToken,
  isPushNotificationsOptedIn,
  registerForPushNotifications,
  setPushNotificationRoutingReady,
  setupPushNotificationResponseListener,
} from '../services/pushNotificationService';
import { userService } from '../services/userService';
import { AuthResponse, User } from '../types/api';
import { queryClient } from './QueryProvider';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  currentUserId: number;
  setUser: (user: User | null) => void;
  login: (authData: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const PUSH_REGISTRATION_MAX_ATTEMPTS = 3;
const PUSH_REGISTRATION_RETRY_DELAY_MS = 10_000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logoutInFlightRef = useRef<Promise<void> | null>(null);
  const pushRegistrationEnabledRef = useRef(false);

  const currentUserId = useMemo(() => user?.id ?? 0, [user?.id]);
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(() => {
    const subscription = setupPushNotificationResponseListener();
    return () => {
      setPushNotificationRoutingReady(false);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      setPushNotificationRoutingReady(false);
      return;
    }
    if (currentUserId > 0) {
      setPushNotificationRoutingReady(true, currentUserId);
      return;
    }
    clearPendingPushNotificationResponses();
  }, [currentUserId, isLoading]);

  useEffect(() => {
    if (isLoading || !user?.id) {
      pushRegistrationEnabledRef.current = false;
      return;
    }

    pushRegistrationEnabledRef.current = true;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const clearRetry = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const attemptRegistration = (attempt = 1) => {
      if (cancelled || !pushRegistrationEnabledRef.current) {
        return;
      }
      clearRetry();
      Promise.all([
        userService.getUserById(user.id, user.id),
        userService.getUserPreferences(user.id),
      ])
        .then(async ([freshUser, preferences]) => {
          if (cancelled || !pushRegistrationEnabledRef.current) {
            return null;
          }
          if (!isPushNotificationsOptedIn(
            freshUser.notifications ?? user.notifications,
            preferences.pushNotificationsEnabled,
          )) {
            await disableRegisteredPushToken(user.id);
            return null;
          }
          return registerForPushNotifications(user.id);
        })
        .catch(() => {
          if (cancelled || attempt >= PUSH_REGISTRATION_MAX_ATTEMPTS) {
            return;
          }
          retryTimer = setTimeout(
            () => attemptRegistration(attempt + 1),
            PUSH_REGISTRATION_RETRY_DELAY_MS,
          );
        });
    };

    attemptRegistration();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        attemptRegistration();
      }
    });

    return () => {
      cancelled = true;
      pushRegistrationEnabledRef.current = false;
      clearRetry();
      appStateSubscription.remove();
    };
  }, [isLoading, user?.id, user?.notifications]);

  const restoreSession = async () => {
    try {
      const restoredUser = await authService.restoreSession();
      if (restoredUser) {
        setUser(restoredUser as unknown as User);
      } else {
        setUser(null);
      }
    } catch (e) {
      
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (authData: AuthResponse) => {
    const userData = authData.user ?? (authData.userId && authData.username
      ? {
          id: parseInt(authData.userId),
          username: authData.username,
          emailId: authData.email ?? '',
        }
      : null);
    if (userData) {
      setUser(userData as unknown as User);
    }
  };

  const logout = useCallback(async () => {
    if (logoutInFlightRef.current) {
      return logoutInFlightRef.current;
    }

    pushRegistrationEnabledRef.current = false;
    clearPendingPushNotificationResponses();
    const logoutUserId = currentUserIdRef.current;
    const operation = (async () => {
      queryClient.clear();

      try {
        await disableRegisteredPushToken(logoutUserId);
      } catch {
        
      }

      setUser(null);

      try {
        await authService.logout();
      } catch (error) {
        
      }
    })();
    logoutInFlightRef.current = operation;

    try {
      await operation;
    } finally {
      logoutInFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    const subscription = addAppleCredentialRevokeListener(() => {
      void logout();
    });
    return () => subscription?.remove();
  }, [logout]);

  useEffect(() => {
    setAuthFailureHandler(() => {
      void logout();
    });
    return () => setAuthFailureHandler(null);
  }, [logout]);

  const refreshUser = async () => {
    try {
      const userId = user?.id ?? 0;
      if (userId > 0) {
        const freshUser = await userService.getUserById(userId);
        await authService.storeUser(freshUser);
        setUser(freshUser as unknown as User);
        return;
      }

      const storedUser = await authService.getStoredUser();
      if (storedUser?.id) {
        const freshUser = await userService.getUserById(storedUser.id);
        await authService.storeUser(freshUser);
        setUser(freshUser as unknown as User);
      }
    } catch (e) {
      
    }
  };

  const contextValue = useMemo(
    () => ({ user, isLoading, isAuthenticated: !!user, currentUserId, setUser, login, logout, refreshUser }),
    [user, isLoading, currentUserId, logout]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
};

export default AuthProvider;
