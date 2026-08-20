import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { SIGNED_MEDIA_QUERY_ROOTS } from '../utils/signedMediaRefresh';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // The API client already refreshes expired sessions. Retrying a rejected
        // auth/validation request here only delays the useful message.
        if (error?.retryable === false) {
          return false;
        }
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

SIGNED_MEDIA_QUERY_ROOTS.forEach((queryKey) => {
  queryClient.setQueryDefaults(queryKey, {
    refetchOnWindowFocus: 'always',
  });
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  useEffect(() => {
    const updateFocus = (state: AppStateStatus) => {
      focusManager.setFocused(state === 'active');
    };

    updateFocus(AppState.currentState);
    const subscription = AppState.addEventListener('change', updateFocus);

    return () => {
      subscription.remove();
      focusManager.setFocused(undefined);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export { queryClient };
export default QueryProvider;
