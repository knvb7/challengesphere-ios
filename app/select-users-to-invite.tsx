import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSearchUsers, useUserFollowing } from '../hooks/useUsers';
import { useAuthContext } from '../providers/AuthProvider';
import { User } from '../types/api';
import { SkeletonUserRow, useSkeletonShimmer } from '../components/common/Skeleton';
import { getUserDisplayName } from '../utils/userDisplay';
import AvatarImage from '../components/common/AvatarImage';

const InviteUsersSkeleton = () => {
  const shimmer = useSkeletonShimmer();
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#E7E3EF' }}>
          <SkeletonUserRow translateX={shimmer} avatarSize={44} style={{ flex: 1 }} />
          <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#FFFFFF' }} />
        </View>
      ))}
    </View>
  );
};

export default function SelectUsersToInviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUserId } = useAuthContext();
  const CURRENT_USER_ID = currentUserId;

  // Parse parameters
  const currentInvited: string[] = params.currentInvited
    ? JSON.parse(params.currentInvited as string)
    : [];

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set(currentInvited));
  const [searchQuery, setSearchQuery] = useState('');

  // Load user's following list as default pool
  const { data: followingData, isLoading: followingLoading } = useUserFollowing(CURRENT_USER_ID, 1, 100);
  // Search users from API when there's a search query
  const { data: searchData, isLoading: searchLoading } = useSearchUsers(searchQuery, 1, 20);

  const displayUsers: User[] = useMemo(() => {
    if (searchQuery.length > 0 && searchData) {
      return searchData.users.filter((u: User) => u.id !== CURRENT_USER_ID);
    }
    if (followingData) {
      return followingData.users;
    }
    return [];
  }, [searchQuery, searchData, followingData, CURRENT_USER_ID]);

  const isLoading = searchQuery.length > 0 ? searchLoading : followingLoading;

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSave = () => {
    router.back();
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.has(String(item.id));
    const displayName = getUserDisplayName(item);

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.selectedUserItem]}
        onPress={() => toggleUserSelection(String(item.id))}
        activeOpacity={0.7}
      >
        <View style={styles.userContent}>
          <AvatarImage uri={item.profilePicUrl} size={50} style={styles.userImage} />
          <View style={styles.userInfo}>
            <Text style={styles.realName}>{displayName || item.username}</Text>
            {displayName ? <Text style={styles.username}>@{item.username}</Text> : null}
          </View>
        </View>

        <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
          {isSelected && (
            <Ionicons name="checkmark" size={16} color="#ffffff" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#18142F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Users</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#666666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            maxLength={100}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Selected Count */}
      {selectedUsers.size > 0 && (
        <View style={styles.selectedCountContainer}>
          <Text style={styles.selectedCountText}>
            {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
          </Text>
        </View>
      )}

      {/* Users List */}
      {isLoading ? (
        <InviteUsersSkeleton />
      ) : (
      <FlatList
        data={displayUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#666666" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No users found' : 'No users available'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Follow more users to invite them to challenges'
              }
            </Text>
          </View>
        }
      />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#18142F',
  },
  saveButton: {
    padding: 4,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4700ecff',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#18142F',
  },
  selectedCountContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  selectedCountText: {
    fontSize: 13,
    color: '#4700ecff',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  selectedUserItem: {
    backgroundColor: '#4700ecff20',
    borderWidth: 1,
    borderColor: '#4700ecff',
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  realName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18142F',
    marginBottom: 2,
  },
  username: {
    fontSize: 13,
    color: '#777389',
    marginBottom: 4,
  },
  relationshipText: {
    fontSize: 11,
    color: '#4700ecff',
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#4700ecff',
    borderColor: '#4700ecff',
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
  emptyText: {
    fontSize: 13,
    color: '#777389',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#777389',
    marginTop: 8,
  },
  userImagePlaceholder: {
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
