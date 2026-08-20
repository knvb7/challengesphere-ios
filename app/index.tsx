import StartupIntro from '@/components/StartupIntro';
import { useAuthContext } from '@/providers/AuthProvider';
import { onboardingService } from '@/services/onboardingService';
import { Redirect, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

type StartupRoute = '/login' | '/onboarding' | '/profile-setup' | '/(tabs)/challenges';

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuthContext();
  const [targetRoute, setTargetRoute] = useState<StartupRoute | null>(null);
  const [minimumIntroElapsed, setMinimumIntroElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinimumIntroElapsed(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function resolveStartupRoute() {
      if (isLoading) return;

      if (!isAuthenticated) {
        setTargetRoute('/login');
        return;
      }

      setTargetRoute(null);
      const nextRoute = await onboardingService.getStartupRouteForUser(
        user?.id ?? null,
        user?.profileComplete,
      );
      if (!isActive) return;

      setTargetRoute(nextRoute);
    }

    resolveStartupRoute();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isLoading, user?.id, user?.profileComplete]);

  if (isLoading || !targetRoute || !minimumIntroElapsed) {
    return <StartupIntro />;
  }

  return <Redirect href={targetRoute as Href} />;
}
