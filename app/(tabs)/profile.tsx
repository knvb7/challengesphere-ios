import Profile from '@/screens/Profile';
import { useProfileFollowPreload } from '@/components/AppDataPreloader';
import { useAuthContext } from '@/providers/AuthProvider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';

const ProfileTab = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialTab?: string }>();
  const { currentUserId } = useAuthContext();
  const initialTab = useMemo(
    (): 'stats' | undefined => params.initialTab === 'stats' ? 'stats' : undefined,
    [params.initialTab],
  );

  useProfileFollowPreload(currentUserId);

  return (
    <Profile
      userId={currentUserId}
      initialTab={initialTab}
      onFollowersPress={() => router.push({ pathname: '/followers', params: { type: 'followers' } })}
      onFollowingPress={() => router.push({ pathname: '/followers', params: { type: 'following' } })}
      onSettingsPress={() => router.push('/settings')}
    />
  );
};

export default ProfileTab;
