import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import AppDataPreloader from '@/components/AppDataPreloader';
import AppDialogHost from '@/components/AppDialogHost';
import AppMessageHost from '@/components/AppMessageHost';
import PendingInviteRedirect from '@/components/PendingInviteRedirect';
import { AppOverlayPortalProvider } from '@/components/common/AppOverlayPortal';
import { PinchZoomOverlayProvider } from '@/components/common/PinchZoomOverlay';
import { AdsProvider } from '@/providers/AdsProvider';
import { AuthProvider, useAuthContext } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { SubscriptionProvider } from '@/providers/SubscriptionProvider';

const ChallengeSphereTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4700EC',
    background: '#F8F7FC',
    card: '#FFFFFF',
    text: '#18142F',
    border: '#E7E3EF',
    notification: '#4700EC',
  },
};

function RootNavigator() {
  const { isAuthenticated } = useAuthContext();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#f8f7fc' },
        animation: 'none',
        freezeOnBlur: true,
        navigationBarColor: '#FFFFFF',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="invite/[inviteCode]" />
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="profile-setup" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="premium" />
        <Stack.Screen name="privacy-security" />
        <Stack.Screen name="community-rules" />
        <Stack.Screen name="delete-account" />
        <Stack.Screen name="app-support" />
        <Stack.Screen name="feature-request" />
        <Stack.Screen name="whats-next" />
        <Stack.Screen name="challenge-invite-details" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="leaderboard" />
        <Stack.Screen
          name="challenge-recap"
          options={{
            animation: 'fade',
            contentStyle: { backgroundColor: '#06050A' },
            navigationBarColor: '#06050A',
          }}
        />
        <Stack.Screen name="global-submissions" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Screen name="+not-found" options={{ headerShown: true }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#f8f7fc' }}>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <AdsProvider>
                <AppDataPreloader />
                <ThemeProvider value={ChallengeSphereTheme}>
                  <PinchZoomOverlayProvider>
                    <AppOverlayPortalProvider>
                      <RootNavigator />
                      <PendingInviteRedirect />
                      <StatusBar style="dark" backgroundColor="#F8F7FC" />
                      <AppDialogHost />
                      <AppMessageHost />
                    </AppOverlayPortalProvider>
                  </PinchZoomOverlayProvider>
                </ThemeProvider>
              </AdsProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
