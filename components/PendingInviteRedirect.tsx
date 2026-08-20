import { useAuthContext } from '@/providers/AuthProvider';
import { pendingInviteService } from '@/services/pendingInviteService';
import { type Href, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

export default function PendingInviteRedirect() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuthContext();
  const routePath = segments.join('/');
  const isInviteRoute = routePath === 'challenge-invitation' || routePath.startsWith('invite/');

  useEffect(() => {
    if (isLoading || !isAuthenticated || isInviteRoute) return;

    let active = true;
    void pendingInviteService.get().then((inviteCode) => {
      if (!active || !inviteCode) return;

      router.replace(`/invite/${inviteCode}` as Href);
    });

    return () => {
      active = false;
    };
  }, [isAuthenticated, isInviteRoute, isLoading, router]);

  return null;
}
