import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import AvatarImage from '../components/common/AvatarImage';
import FollowActionSheet from '../components/common/FollowActionSheet';
import { useFollowUser, useUnfollowUser, useUser, useUserFollowers, useUserFollowing } from '../hooks/useUsers';
import { useAuthContext } from '../providers/AuthProvider';
import { User } from '../types/api';
import { isOfficialGlobalCreator, OFFICIAL_ACCOUNT_AVATAR_SOURCE } from '../utils/globalChallenges';
import { getUserDisplayName, matchesUserSearch } from '../utils/userDisplay';
import { showAppMessage } from '../utils/appMessage';

export default function FollowersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string | string[] }>();
  const { user: currentUser } = useAuthContext();
  const CURRENT_USER_ID = currentUser?.id ?? 0;
  const requestedTab = useMemo(
    (): 'followers' | 'following' => {
      const type = Array.isArray(params.type) ? params.type[0] : params.type;
      return type === 'following' ? 'following' : 'followers';
    },
    [params.type],
  );
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(requestedTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [followTarget, setFollowTarget] = useState<User | null>(null);

  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab]);

  // Fetch current user profile to get counts
  const { data: currentUserProfile } = useUser(CURRENT_USER_ID);

  // Fetch followers and following lists
  const { data: followersData, isLoading: loadingFollowers, error: followersError, refetch: refetchFollowers } = useUserFollowers(CURRENT_USER_ID, 1, 100, CURRENT_USER_ID);
  const { data: followingData, isLoading: loadingFollowing, error: followingError, refetch: refetchFollowing } = useUserFollowing(CURRENT_USER_ID, 1, 100, CURRENT_USER_ID);

  const followUserMutation = useFollowUser();
  const unfollowUserMutation = useUnfollowUser();

  const activeUsers = activeTab === 'followers' 
    ? (followersData?.users || []) 
    : (followingData?.users || []);

  const filteredUsers = activeUsers.filter((user: User) => {
    return matchesUserSearch(user, searchQuery);
  });

  const isLoading = activeTab === 'followers' ? loadingFollowers : loadingFollowing;
  const activeError = activeTab === 'followers' ? followersError : followingError;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchFollowers(), refetchFollowing()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchFollowers, refetchFollowing]);

  // Check if a user is in the following list
  const isFollowingUser = (userId: number): boolean => {
    return (followingData?.users || []).some((u: User) => u.id === userId);
  };

  const toggleFollow = (targetUser: User) => {
    if (followUserMutation.isPending || unfollowUserMutation.isPending) return;
    if (isFollowingUser(targetUser.id)) {
      setFollowTarget(targetUser);
      return;
    }
    performFollowToggle(targetUser, false);
  };

  const performFollowToggle = (targetUser: User, following: boolean) => {
    const mutation = following ? unfollowUserMutation : followUserMutation;
    mutation.mutate(
      { followerId: CURRENT_USER_ID, followingId: targetUser.id },
      {
        onSuccess: () => {
          setFollowTarget(null);
          void Promise.allSettled([refetchFollowers(), refetchFollowing()]);
          if (following) {
            showAppMessage({
              type: 'success',
              title: 'Unfollowed',
              message: `@${targetUser.username}`,
            });
          }
        },
        onError: () => {
          setFollowTarget(null);
          showAppMessage({ type: 'error', title: 'Could not update follow', message: 'Please try again.' });
        },
      },
    );
  };

  const handleUserPress = (user: User) => {
    const following = isFollowingUser(user.id);
    // Check if user follows us (they're in our followers list)
    const followsUs = (followersData?.users || []).some((u: User) => u.id === user.id);
    
    router.push({
      pathname: '/user-profile',
      params: {
        id: user.id.toString(),
        username: user.username,
        realName: user.username,
        profileImage: user.profilePicUrl || '',
        bio: user.bio || '',
        isFollowing: following.toString(),
        isFollowedBy: followsUs.toString(),
        isMutualFollow: (following && followsUs).toString(),
        followersCount: (user.followers || 0).toString(),
        followingCount: (user.following || 0).toString(),
        challengesCount: ((user.challengesCreated || 0) + (user.challengesAccepted || 0)).toString(),
        postsCount: (user.submissionsCount || 0).toString(),
        genuinessScore: (user.genuinityScore ?? user.genuinenessScore ?? 0).toString(),
      }
    });
  };

  const UserItem: React.FC<{ user: User }> = ({ user }) => {
    const following = isFollowingUser(user.id);
    const displayName = getUserDisplayName(user);
    
    return (
      <View style={styles.userItem}>
        <TouchableOpacity 
          style={styles.userContent}
          onPress={() => handleUserPress(user)}
          activeOpacity={0.7}
        >
          <AvatarImage
            uri={user.profilePicUrl}
            fallbackSource={isOfficialGlobalCreator(user.username) ? OFFICIAL_ACCOUNT_AVATAR_SOURCE : undefined}
            size={42}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>@{user.username}</Text>
            {displayName ? <Text style={styles.userHandle}>{displayName}</Text> : null}
          </View>
        </TouchableOpacity>
        {activeTab === 'followers' && user.id !== CURRENT_USER_ID && (
          <TouchableOpacity
            style={[
              styles.followButton,
              following ? styles.followingButton : styles.followActionButton
            ]}
            onPress={() => toggleFollow(user)}
          >
            <Text
              style={[
                styles.followButtonText,
                following ? styles.followingButtonText : styles.followActionButtonText
              ]}
            >
              {following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const followersCount = followersData?.totalCount ?? currentUserProfile?.followers ?? currentUser?.followers ?? 0;
  const followingCount = followingData?.totalCount ?? currentUserProfile?.following ?? currentUser?.following ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.compactNavigation}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#18142F" />
        </TouchableOpacity>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
            onPress={() => setActiveTab('followers')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'followers' }}
          >
            <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
              Followers ({followersCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'following' && styles.activeTab]}
            onPress={() => setActiveTab('following')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'following' }}
          >
            <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
              Following ({followingCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#666666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab}...`}
          placeholderTextColor="#666666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          maxLength={100}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color="#666666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Users List */}
      {activeError && !refreshing ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff4444" />
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptySubtitle}>Pull down to refresh or tap retry</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading && !refreshing ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#4700ecff" />
          <Text style={styles.emptyTitle}>Loading...</Text>
        </View>
      ) : (
      <FlatList
        data={filteredUsers}
        renderItem={({ item }) => <UserItem user={item} />}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4700ecff" colors={['#4700ecff']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={activeTab === 'followers' ? 'people-outline' : 'person-add-outline'} 
              size={64} 
              color="#666666" 
            />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No users found' : `No ${activeTab} yet`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : `Start connecting with people to see your ${activeTab} here`
              }
            </Text>
          </View>
        }
      />
      )}
      <FollowActionSheet
        visible={Boolean(followTarget)}
        username={followTarget?.username || ''}
        profilePicUrl={followTarget?.profilePicUrl}
        isFollowing={followTarget ? isFollowingUser(followTarget.id) : false}
        pending={followUserMutation.isPending || unfollowUserMutation.isPending}
        onCancel={() => setFollowTarget(null)}
        onConfirm={() => followTarget && performFollowToggle(followTarget, true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  compactNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 4,
    gap: 4,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8F7FC',
    borderRadius: 14,
    padding: 3,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#4700ecff',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#777389',
  },
  activeTabText: {
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  searchIcon: {
    marginRight: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#18142F',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#18142F',
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 11,
    color: '#777389',
    marginBottom: 2,
  },
  followButton: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  followActionButton: {
    backgroundColor: '#4700ecff',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666666',
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  followActionButtonText: {
    color: '#ffffff',
  },
  followingButtonText: {
    color: '#777389',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#18142F',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#777389',
    textAlign: 'center',
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#4700ecff',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
