import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import OfficialAccountBadge from '@/components/common/OfficialAccountBadge';
import PremiumBadge from '@/components/common/PremiumBadge';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonBlock, SkeletonUserRow, useSkeletonShimmer } from '../components/common/Skeleton';
import { useChallengeParticipants, useMyChallengeProgress } from '../hooks/useChallenges';
import { useSignedMediaRecovery } from '../hooks/useSignedMediaRecovery';
import { useChallengeLeaderboard, useSearchUsers, useUserRank } from '../hooks/useUsers';
import { useAuthContext } from '../providers/AuthProvider';
import { LeaderboardEntry, LeaderboardType, User } from '../types/api';
import { createCachedRemoteImageSource } from '../utils/remoteImageCache';
import { getChallengeMotivation } from '../utils/challengeMomentum';
import { isOfficialGlobalCreator } from '../utils/globalChallenges';

type LeaderboardDisplayEntry = LeaderboardEntry & {
  isUnranked?: boolean;
};

function getLeaderboardMetric(entry: LeaderboardEntry) {
  return { value: Math.round(entry.score), unit: 'points', support: `${entry.submissionCount ?? 0} submissions` };
}

function getRankBadge(rank: number): { color: string; bg: string; accent: string } {
  if (rank === 1) return { color: '#7A4B00', bg: '#FFE8A3', accent: '#FFD84D' };
  if (rank === 2) return { color: '#4E5968', bg: '#E2E6EC', accent: '#DCE1E8' };
  if (rank === 3) return { color: '#7A3E12', bg: '#F2D0B5', accent: '#E5A06C' };
  return { color: '#655F70', bg: '#E7E3EF', accent: '#AAA3B2' };
}

function normalizeParticipantSearch(value: string) {
  return value.trim().replace(/^@/, '').toLowerCase();
}

function getUserDisplayName(user: User) {
  return user.displayName || user.realName || user.fullName || user.name || user.username;
}

function getUserProfilePicture(user: User) {
  return user.profilePictureUrl || user.profilePicUrl || user.userProfilePicUrl || undefined;
}

function participantMatchesSearch(user: User, searchTerm: string) {
  if (!searchTerm) return true;
  return [
    user.username,
    user.displayName,
    user.realName,
    user.fullName,
    user.firstName,
    user.lastName,
    user.name,
  ].some((value) => normalizeParticipantSearch(value || '').includes(searchTerm));
}

function entryMatchesSearch(entry: LeaderboardEntry, searchTerm: string) {
  if (!searchTerm) return true;
  return [
    entry.username,
    entry.displayName,
  ].some((value) => normalizeParticipantSearch(value || '').includes(searchTerm));
}

function hasRankedSubmission<T extends LeaderboardEntry>(entry?: T): entry is T {
  if (!entry || !entry.rank) return false;
  if (entry.submissionCount === 0) return false;
  return true;
}

const LeaderboardSkeleton = () => {
  const shimmer = useSkeletonShimmer();
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8, gap: 2 }}>
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#E7E3EF' }}>
          <SkeletonBlock translateX={shimmer} width={44} height={28} borderRadius={14} />
          <SkeletonUserRow translateX={shimmer} avatarSize={40} style={{ flex: 1 }} />
          <SkeletonBlock translateX={shimmer} width={44} height={20} borderRadius={6} />
        </View>
      ))}
    </View>
  );
};

const LeaderboardAvatar = ({ entry, size }: { entry: LeaderboardEntry; size: number }) => {
  const recoverSignedMedia = useSignedMediaRecovery();

  return entry.profilePictureUrl ? (
    <ExpoImage
      source={createCachedRemoteImageSource(entry.profilePictureUrl)}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
      cachePolicy="memory-disk"
      onError={() => recoverSignedMedia(entry.profilePictureUrl)}
    />
  ) : (
    <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name="person" size={Math.round(size * 0.5)} color="#888" />
    </View>
  );
};

const LeaderboardPodium = ({
  entries,
  onEntryPress,
}: {
  entries: LeaderboardDisplayEntry[];
  onEntryPress: (entry: LeaderboardDisplayEntry) => void;
}) => {
  if (entries.length === 0) return null;

  const visualEntries = entries.length >= 3
    ? [entries[1], entries[0], entries[2]]
    : entries.length === 2
      ? [entries[1], entries[0]]
      : entries;

  return (
    <View style={styles.podiumCard}>
      <View style={styles.podiumGlow} />
      {visualEntries.map((entry) => {
        const metric = getLeaderboardMetric(entry);
        const badge = getRankBadge(entry.rank);
        const isFirst = entry.rank === 1;
        return (
          <TouchableOpacity
            key={entry.userId}
            style={[styles.podiumPlace, isFirst && styles.podiumPlaceFirst]}
            onPress={() => onEntryPress(entry)}
            activeOpacity={0.78}
            accessibilityLabel={`${entry.rank === 1 ? 'First' : entry.rank === 2 ? 'Second' : 'Third'} place, ${entry.displayName || entry.username}, ${metric.value} ${metric.unit}`}
          >
            <View style={[styles.podiumAvatarRing, isFirst && styles.podiumAvatarRingFirst, { borderColor: badge.accent }]}>
              <LeaderboardAvatar entry={entry} size={isFirst ? 48 : 40} />
            </View>
            <View style={styles.podiumNameRow}>
              <Text style={styles.podiumName} numberOfLines={1}>{entry.displayName || entry.username}</Text>
              {isOfficialGlobalCreator(entry.username) ? (
                <OfficialAccountBadge compact />
              ) : Number(entry.premiumUser ?? 0) > 0 ? (
                <PremiumBadge />
              ) : null}
            </View>
            <Text style={styles.podiumScore}>{metric.value.toLocaleString()} {metric.unit}</Text>
            <LinearGradient
              colors={isFirst ? ['#7446ee', '#3a1b86'] : ['#282131', '#17131d']}
              style={[styles.podiumBlock, isFirst && styles.podiumBlockFirst, entry.rank === 3 && styles.podiumBlockThird]}
            >
              <Text style={[styles.podiumRank, { color: badge.accent }]}>{entry.rank}</Text>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default function LeaderboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUserId } = useAuthContext();

  const challengeId = Number(params.challengeId) || 0;
  const challengeTitle = (params.title as string) || 'Challenge';
  const motivationEligible = params.motivationEligible === 'true' && params.isPrivate === 'true';
  const userId = currentUserId;

  const [participantSearch, setParticipantSearch] = useState('');
  const [appliedParticipantSearch, setAppliedParticipantSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAppliedParticipantSearch(participantSearch.trim());
    }, 250);
    return () => clearTimeout(timeout);
  }, [participantSearch]);

  const {
    data: participantsData,
    isLoading: participantsLoading,
    refetch: refetchParticipants,
    isRefetching: isParticipantsRefetching,
  } = useChallengeParticipants(challengeId);
  const participants = useMemo(() => participantsData?.participants ?? [], [participantsData?.participants]);
  const leaderboardLimit = Math.max(100, participantsData?.totalParticipants ?? 100);
  const appliedSearchTerm = normalizeParticipantSearch(appliedParticipantSearch);

  const {
    data: participantSearchData,
    isFetching: isParticipantSearchFetching,
    refetch: refetchParticipantSearch,
  } = useSearchUsers(appliedParticipantSearch, 1, 25);

  const {
    data: leaderboardData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useChallengeLeaderboard(challengeId, LeaderboardType.OVERALL, leaderboardLimit, userId);

  const { data: rankData, refetch: refetchUserRank } = useUserRank(challengeId, userId);
  const {
    data: personalProgress,
    refetch: refetchPersonalProgress,
  } = useMyChallengeProgress(challengeId, motivationEligible && userId > 0);

  const entries = useMemo(() => leaderboardData?.entries ?? [], [leaderboardData?.entries]);
  const rankedEntries = useMemo<LeaderboardDisplayEntry[]>(
    () => entries.map((entry, index) => ({
      ...entry,
      rank: entry.rank || index + 1,
      isUnranked: !hasRankedSubmission(entry),
    })),
    [entries],
  );
  const rankedEntriesByUserId = useMemo(
    () => new Map(rankedEntries.map((entry) => [entry.userId, entry])),
    [rankedEntries],
  );
  const participantsByUserId = useMemo(
    () => new Map(participants.map((participant) => [participant.id, participant])),
    [participants],
  );
  const currentUserRank = leaderboardData?.currentUserRank ?? rankData;
  const currentUserEntry = useMemo(
    () => rankedEntries.find((entry) => entry.userId === userId),
    [rankedEntries, userId]
  );
  const displayedCurrentRank = currentUserRank?.rank ?? currentUserEntry?.rank;
  const displayedCurrentScore = currentUserRank?.score ?? currentUserEntry?.score ?? 0;
  const displayedTotalParticipants = currentUserRank?.totalParticipants ?? leaderboardData?.totalParticipants ?? entries.length;
  const rankMotivation = getChallengeMotivation({
    challengeMode: 'DAILY',
    status: motivationEligible ? 'active' : undefined,
    isPrivate: motivationEligible,
    privateCrewState: motivationEligible ? 'ACTIVE' : undefined,
    momentum: personalProgress?.momentum,
    privateRank: displayedCurrentRank && (
      (personalProgress?.daysCompleted ?? 0) > 0
      || hasRankedSubmission(currentUserEntry)
    )
      ? { rank: displayedCurrentRank, totalParticipants: displayedTotalParticipants }
      : undefined,
  });
  const currentUserMetric = getLeaderboardMetric({
    userId,
    username: '',
    rank: displayedCurrentRank ?? 0,
    score: displayedCurrentScore,
    submissionCount: currentUserEntry?.submissionCount,
    gloriesCount: currentUserEntry?.gloriesCount,
    currentStreak: currentUserEntry?.currentStreak,
  });

  const searchableParticipants = useMemo(() => {
    if (!appliedSearchTerm) return participants;

    const mergedParticipants = new Map(participantsByUserId);
    (participantSearchData?.users ?? []).forEach((user) => {
      if (participantsByUserId.has(user.id) || rankedEntriesByUserId.has(user.id)) {
        mergedParticipants.set(user.id, user);
      }
    });

    return Array.from(mergedParticipants.values());
  }, [
    appliedSearchTerm,
    participantSearchData?.users,
    participants,
    participantsByUserId,
    rankedEntriesByUserId,
  ]);

  const filteredEntries = useMemo(() => {
    if (!appliedSearchTerm) return rankedEntries.filter((entry) => !entry.isUnranked);

    const matchingParticipants = searchableParticipants.filter((participant) =>
      participantMatchesSearch(participant, appliedSearchTerm)
    );

    if (matchingParticipants.length === 0) {
      return rankedEntries.filter((entry) => entryMatchesSearch(entry, appliedSearchTerm));
    }

    return matchingParticipants
      .map<LeaderboardDisplayEntry>((participant) => {
        const rankedEntry = rankedEntriesByUserId.get(participant.id);

        if (hasRankedSubmission(rankedEntry)) {
          return rankedEntry;
        }

        return {
          userId: participant.id,
          username: participant.username,
          displayName: getUserDisplayName(participant),
          profilePictureUrl: getUserProfilePicture(participant),
          premiumUser: participant.premiumUser,
          rank: 0,
          score: 0,
          submissionCount: 0,
          isUnranked: true,
        };
      })
      .sort((left, right) => {
        if (left.isUnranked !== right.isUnranked) return left.isUnranked ? 1 : -1;
        if (!left.isUnranked && !right.isUnranked) return left.rank - right.rank;
        return (left.displayName || left.username).localeCompare(right.displayName || right.username);
      });
  }, [appliedSearchTerm, searchableParticipants, rankedEntries, rankedEntriesByUserId]);

  const podiumEntries = useMemo(
    () => appliedSearchTerm ? [] : filteredEntries.filter((entry) => !entry.isUnranked).slice(0, 3),
    [appliedSearchTerm, filteredEntries],
  );
  const standingEntries = filteredEntries;

  const applyParticipantSearch = () => {
    setAppliedParticipantSearch(participantSearch.trim());
  };

  const clearParticipantSearch = () => {
    setParticipantSearch('');
    setAppliedParticipantSearch('');
  };

  const refreshLeaderboard = () => {
    refetch();
    refetchUserRank();
    refetchParticipants();
    if (motivationEligible) {
      refetchPersonalProgress();
    }
    if (appliedSearchTerm) {
      refetchParticipantSearch();
    }
  };

  const openUserSubmissions = (item: LeaderboardDisplayEntry) => {
    router.push({
      pathname: '/challenge-submissions',
      params: {
        challengeId: challengeId.toString(),
        title: challengeTitle,
        userId: item.userId.toString(),
        username: item.username || item.displayName || '',
        readOnly: 'true',
      },
    });
  };

  const openUserProfile = (item: LeaderboardDisplayEntry) => {
    router.push({
      pathname: '/user-profile',
      params: { id: item.userId.toString(), username: item.username || item.displayName || '' },
    });
  };

  const renderRankItem = ({ item }: { item: LeaderboardDisplayEntry; index: number }) => {
    const rank = item.rank;
    const badge = getRankBadge(rank);
    const isCurrentUser = item.userId === userId;
    const metric = getLeaderboardMetric(item);
    const rankLabel = item.isUnranked
      ? 'Unranked'
      : rank <= 3
        ? ['', '1st', '2nd', '3rd'][rank]
        : `#${rank}`;

    return (
      <TouchableOpacity
        style={[styles.rankItem, isCurrentUser && styles.rankItemHighlighted]}
        onPress={() => openUserProfile(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.rankBadge,
            item.isUnranked ? styles.unrankedBadge : { backgroundColor: badge.bg },
          ]}
        >
          <Text
            style={[
              styles.rankNumber,
              item.isUnranked ? styles.unrankedRankText : { color: badge.color },
            ]}
          >
            {rankLabel}
          </Text>
        </View>

        <LeaderboardAvatar entry={item} size={38} />

        <View style={styles.userInfo}>
          <View style={styles.usernameRow}>
            <Text style={styles.username} numberOfLines={1}>
              {item.displayName || item.username}
              {isCurrentUser && ' · You'}
            </Text>
            {isOfficialGlobalCreator(item.username) ? (
              <OfficialAccountBadge compact />
            ) : Number(item.premiumUser ?? 0) > 0 ? (
              <PremiumBadge />
            ) : null}
          </View>
          {!item.isUnranked && <Text style={styles.supportingMetric}>{metric.support}</Text>}
        </View>

        <View style={styles.rankActions}>
          <View style={styles.scoreColumn}>
            <Text style={[styles.score, item.isUnranked && styles.scoreMuted]} numberOfLines={1}>
              {item.isUnranked ? '-' : metric.value.toLocaleString()}
            </Text>
            {!item.isUnranked && <Text style={styles.scoreUnit} numberOfLines={1}>{metric.unit}</Text>}
          </View>

          {item.isUnranked ? (
            <View style={styles.noSubmissionsPill}>
              <Text style={styles.noSubmissionsText} numberOfLines={1}>No submissions</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.submissionsButton}
              onPress={(event) => {
                event.stopPropagation();
                openUserSubmissions(item);
              }}
              activeOpacity={0.82}
            >
              <Ionicons name="images-outline" size={16} color="#ffffff" />
              <Text style={styles.submissionsButtonText} numberOfLines={1}>Submissions</Text>
            </TouchableOpacity>
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
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1} selectable>{challengeTitle}</Text>
        </View>
      </View>

      {/* Current User Rank Card */}
      {userId > 0 && (
        <LinearGradient
          colors={['#7445E7', '#4C24B5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.myRankCard}
        >
          <View style={styles.myRankMetric}>
            <Text style={styles.myRankLabel}>Your position</Text>
            <Text style={styles.myRankNumber}>
              {displayedCurrentRank ? `#${displayedCurrentRank}` : '-'}
            </Text>
          </View>

          <View style={styles.myRankDivider} />

          <View style={styles.myRankMetric}>
            <Text style={styles.myRankLabel}>Your score</Text>
            <Text style={styles.myRankScore}>{currentUserMetric.value.toLocaleString()} {currentUserMetric.unit}</Text>
            {currentUserRank?.percentile != null && (
              <Text style={styles.myRankPercentile}>
                Top {Math.round(100 - currentUserRank.percentile)}%
              </Text>
            )}
          </View>

          <Text style={styles.totalParticipants}>
            {displayedCurrentRank && displayedTotalParticipants > 0
              ? `Ranked ${displayedCurrentRank} of ${displayedTotalParticipants}`
              : 'No ranked submission yet'}
          </Text>
          {rankMotivation ? (
            <View
              style={styles.rankMotivation}
              accessible
              accessibilityLabel={rankMotivation.accessibilityLabel}
            >
              <Ionicons name="trending-up-outline" size={15} color="#D8CBFF" />
              <Text style={styles.rankMotivationText}>{rankMotivation.compactLabel}</Text>
            </View>
          ) : null}
        </LinearGradient>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search participants..."
          placeholderTextColor="#555"
          value={participantSearch}
          onChangeText={setParticipantSearch}
          onSubmitEditing={applyParticipantSearch}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          maxLength={100}
        />
        {participantSearch.length > 0 && (
          <TouchableOpacity onPress={clearParticipantSearch} accessibilityLabel="Clear participant search">
            <Ionicons name="close-circle" size={16} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {!isLoading && !error && podiumEntries.length > 0 && (
        <LeaderboardPodium
          entries={podiumEntries}
          onEntryPress={openUserProfile}
        />
      )}

      {/* Rankings List */}
      {isLoading || (
        appliedSearchTerm.length > 0 &&
        filteredEntries.length === 0 &&
        (participantsLoading || isParticipantSearchFetching)
      ) ? (
        <LeaderboardSkeleton />
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#666" />
          <Text style={styles.errorText}>Failed to load leaderboard</Text>
          <TouchableOpacity onPress={refreshLeaderboard} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredEntries.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons
            name={appliedSearchTerm ? 'search-outline' : entries.length === 0 ? 'trophy-outline' : 'search-outline'}
            size={48}
            color="#444"
          />
          <Text style={styles.emptyText}>
            {appliedSearchTerm
              ? 'No participant found'
              : entries.length === 0
                ? 'No rankings yet'
                : 'No results found'}
          </Text>
          <Text style={styles.emptySubtext}>
            {appliedSearchTerm
              ? 'Try a different participant name'
              : entries.length === 0
                ? 'Be the first to submit!'
                : 'Try a different participant name'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={standingEntries}
          keyExtractor={(item) => String(item.userId)}
          renderItem={renderRankItem}
          ListHeaderComponent={<Text style={styles.standingsTitle}>Standings</Text>}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || isParticipantsRefetching}
              onRefresh={refreshLeaderboard}
              tintColor="#4700ec"
            />
          }
          contentContainerStyle={styles.listContent}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#18142F',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#655F70',
    marginTop: 2,
  },
  myRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4700ec40',
  },
  myRankMetric: {
    flex: 1,
    minWidth: 100,
  },
  myRankDivider: {
    width: 1,
    height: 42,
    backgroundColor: '#4700ec40',
    marginHorizontal: 14,
  },
  myRankLabel: {
    fontSize: 11,
    color: '#E7DEFF',
    marginBottom: 2,
  },
  myRankNumber: {
    fontSize: 27,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  myRankScore: {
    fontSize: 23,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  myRankPercentile: {
    fontSize: 11,
    color: '#4caf50',
    marginTop: 2,
    fontWeight: '600',
  },
  totalParticipants: {
    width: '100%',
    marginTop: 8,
    fontSize: 11,
    color: '#E7DEFF',
  },
  rankMotivation: {
    width: '100%',
    minHeight: 34,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(101, 72, 164, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(183, 159, 255, 0.3)',
  },
  rankMotivationText: {
    flex: 1,
    minWidth: 0,
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#18142F',
    fontSize: 13,
    padding: 0,
  },
  searchAction: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4700ec',
  },
  searchActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  podiumCard: {
    height: 176,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#F0ECFF',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  podiumGlow: {
    position: 'absolute',
    top: -70,
    width: 220,
    height: 180,
    borderRadius: 110,
    backgroundColor: '#5f35b833',
  },
  podiumPlace: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  podiumPlaceFirst: {
    zIndex: 2,
  },
  podiumAvatarRing: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: '#F0ECFF',
  },
  podiumAvatarRingFirst: {
    shadowColor: '#FFD700',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  podiumName: {
    minWidth: 0,
    flexShrink: 1,
    color: '#18142F',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  podiumNameRow: {
    maxWidth: '92%',
    minWidth: 0,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  podiumScore: {
    color: '#91899b',
    fontSize: 8,
    lineHeight: 11,
    marginBottom: 6,
  },
  podiumBlock: {
    width: '92%',
    height: 38,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumBlockFirst: {
    height: 55,
  },
  podiumBlockThird: {
    height: 30,
  },
  podiumRank: {
    fontSize: 16,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#777389',
    fontSize: 14,
  },
  emptyText: {
    color: '#777389',
    fontSize: 15,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#444',
    fontSize: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4700ec',
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  standingsTitle: {
    color: '#18142F',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
    gap: 9,
  },
  rankItemHighlighted: {
    backgroundColor: '#4700ec10',
  },
  rankBadge: {
    width: 42,
    height: 28,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unrankedBadge: {
    width: 74,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  unrankedRankText: {
    color: '#8c8c8c',
    fontSize: 10,
    fontWeight: '700',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 2,
  },
  usernameRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18142F',
    flexShrink: 1,
  },
  supportingMetric: {
    color: '#777389',
    fontSize: 10,
    lineHeight: 13,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
    paddingRight: 8,
  },
  statText: {
    fontSize: 11,
    color: '#777389',
  },
  rankActions: {
    width: 156,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  scoreColumn: {
    width: 52,
    alignItems: 'flex-end',
  },
  score: {
    width: '100%',
    fontSize: 16,
    fontWeight: '700',
    color: '#4700ec',
    textAlign: 'right',
    flexShrink: 0,
  },
  scoreUnit: {
    color: '#66606e',
    fontSize: 8,
    lineHeight: 10,
    marginTop: 1,
  },
  scoreMuted: {
    color: '#777389',
  },
  submissionsButton: {
    width: 98,
    height: 34,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    backgroundColor: '#4700ec',
    flexShrink: 0,
  },
  submissionsButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 1,
  },
  noSubmissionsPill: {
    width: 98,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    flexShrink: 0,
  },
  noSubmissionsText: {
    color: '#8c8c8c',
    fontSize: 10,
    fontWeight: '700',
  },
});
