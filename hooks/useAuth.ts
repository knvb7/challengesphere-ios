import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import {
    AppleAuthRequest,
    AuthResponse,
} from '../types/api';

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  isAuthenticated: () => [...authKeys.all, 'isAuthenticated'] as const,
};

// Get current user
export const useCurrentUser = () => {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: () => authService.getCurrentUser(),
    enabled: false, // Will be enabled by auth context when needed
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Check if authenticated
export const useIsAuthenticated = () => {
  return useQuery({
    queryKey: authKeys.isAuthenticated(),
    queryFn: () => authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Apple login mutation
export const useAppleLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appleData: AppleAuthRequest) => authService.loginWithApple(appleData),
    onSuccess: (data: AuthResponse) => {
      // Update auth queries
      queryClient.setQueryData(authKeys.isAuthenticated(), true);

      // Invalidate all queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });

      // Fetch current user profile
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
    },
    onError: (error) => {

    },
  });
};

// Logout mutation
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      
      // Update auth queries
      queryClient.setQueryData(authKeys.user(), null);
      queryClient.setQueryData(authKeys.isAuthenticated(), false);
    },
    onError: (error) => {

      // Clear data anyway on logout error
      queryClient.clear();
      queryClient.setQueryData(authKeys.user(), null);
      queryClient.setQueryData(authKeys.isAuthenticated(), false);
    },
  });
};

// Refresh token mutation
export const useRefreshToken = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.refreshToken(),
    onSuccess: () => {
      // Invalidate user query to refetch with new token
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
    },
    onError: (error) => {

      // Clear auth data on refresh failure
      queryClient.setQueryData(authKeys.user(), null);
      queryClient.setQueryData(authKeys.isAuthenticated(), false);
    },
  });
};

// Get stored user (for initial load)
export const useStoredUser = () => {
  return useQuery({
    queryKey: [...authKeys.user(), 'stored'],
    queryFn: () => authService.getStoredUser(),
    staleTime: Infinity, // Never goes stale, only used for initial load
  });
};
