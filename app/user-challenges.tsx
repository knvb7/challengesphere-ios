import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChallengeCard, { MappedChallenge, mapChallenge } from '../components/common/ChallengeCard';
import { useInfiniteUserChallenges } from '../hooks/useChallenges';
import { useAuthContext } from '../providers/AuthProvider';

export default function UserChallengesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUserId } = useAuthContext();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');

  const userId = parseInt(params.userId as string) || 0;
  const username = params.username as string;

  // Fetch real challenges from API
  const activeFilter = activeTab === 'active' ? true : activeTab === 'completed' ? false : undefined;
  const {
    data: challengesPages,
    isLoading,
    error: challengesError,
    refetch: refetchChallenges,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteUserChallenges(userId, currentUserId, 20, activeFilter);

  const challenges = challengesPages?.pages?.flatMap(page => page.challenges) || [];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchChallenges();
    } finally {
      setRefreshing(false);
    }
  }, [refetchChallenges]);

  const mappedChallenges: MappedChallenge[] = challenges.map((c) => mapChallenge(c, currentUserId));

  const handleChallengePress = (challenge: MappedChallenge) => {
    router.push({
      pathname: '/challenge-details',
      params: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        duration: challenge.duration,
        numberOfDays: challenge.numberOfDays.toString(),
        challengeMode: challenge.challengeMode || 'DAILY',
        status: challenge.status,
        isCreator: challenge.isCreator.toString(),
        progress: (challenge.completionPercentage ?? challenge.progress ?? 0).toString(),
        startDate: challenge.startDate,
        createdAt: challenge.createdAt,
        endDate: challenge.endDate || '',
        image: challenge.image || '',
        coverPhotoUrls: JSON.stringify(challenge.coverPhotoUrls || (challenge.image ? [challenge.image] : [])),
      }
    });
  };

  const renderChallengeItem = ({ item }: { item: MappedChallenge }) => (
    <ChallengeCard challenge={item} onPress={() => handleChallengePress(item)} />
  );

  const renderTabButton = (tab: 'all' | 'active' | 'completed', label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#18142F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{`${username}'s Challenges`}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('all', 'All')}
        {renderTabButton('active', 'Active')}
        {renderTabButton('completed', 'Completed')}
      </View>

      {/* Challenges List */}
      {challengesError && !refreshing ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff4444" />
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptyText}>Pull down to refresh or tap retry</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading && !refreshing ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#4700ecff" />
          <Text style={styles.emptyTitle}>Loading challenges...</Text>
        </View>
      ) : (
      <FlatList
        data={mappedChallenges}
        renderItem={renderChallengeItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4700ecff" colors={['#4700ecff']} />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color="#4700ecff" style={{ marginVertical: 16 }} /> : null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#666666" />
            <Text style={styles.emptyTitle}>No challenges found</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'active' 
                ? `${username} does not have any active challenges right now.`
                : activeTab === 'completed' 
                ? `${username} hasn't completed any challenges yet.`
                : `${username} hasn't joined any challenges yet.`}
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
    fontSize: 17,
    fontWeight: '600',
    color: '#18142F',
  },
  placeholder: {
    width: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    flex: 1,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#4700ecff',
  },
  tabText: {
    color: '#777389',
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 12,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#18142F',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#777389',
    textAlign: 'center',
    paddingHorizontal: 40,
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
