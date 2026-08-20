import { Ionicons } from '@expo/vector-icons';
import { AppAlert as Alert } from '@/utils/appAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChallengeDetailsOverview from '../components/common/ChallengeDetailsOverview';
import AvatarImage from '../components/common/AvatarImage';
import FollowActionSheet from '../components/common/FollowActionSheet';
import { getChallengeDayFromStartDate, getChallengeStatusFromDates } from '../components/common/ChallengeCard';
import MotivationalTransition from '../components/common/MotivationalTransition';
import { useChallenge, useChallengeParticipants, useJoinChallenge, useLeaveChallenge, useSubmissionPreviews } from '../hooks/useChallenges';
import { useChallengeLeaderboard, useFollowUser, useUnfollowUser, useUser, useUserFollowing } from '../hooks/useUsers';
import { useAuthContext } from '../providers/AuthProvider';
import { LeaderboardType } from '../types/api';
import { isOneOffChallengeMode } from '../utils/challengeMode';
import { getMinimumVisibleChallengerCount } from '../utils/challengeParticipantCounts';
import { parseCoverPhotoUrls } from '../utils/challengePhotos';
import type { ResolvedMotivationalMessage } from '../utils/motivationalMessages';
import { getRandomMotivationalMessage } from '../utils/motivationalMessages';
import { getDisplayBenefits, getDisplayDescription, getDisplayRules } from '../utils/challengeDisplayText';
import { getDurationLabel } from '../utils/challengeDuration';
import { showAppMessage } from '../utils/appMessage';
import { buildSubmissionPreviewDetailRouteParams } from '../utils/submissionDetail';
import { getApiErrorMessage } from '../utils/apiError';
import { showChallengeLimitUpgrade } from '../utils/challengeLimitUpgrade';
import { showContentReportReasons } from '../utils/contentReporting';

interface GlobalParticipant {
  id: number;
  username: string;
  emailId: string;
  profilePicUrl: string | null;
  genuinityScore?: number;
  genuinenessScore?: number;
  isFollowing: boolean;
  isCreator?: boolean;
}

const getDerivedEndDate = (startDateValue: string, numberOfDays: number): string => {
  if (!startDateValue || numberOfDays <= 0) return '';
  const start = new Date(startDateValue);
  const end = new Date(start.getTime() + numberOfDays * 24 * 60 * 60 * 1000);
  return end.toISOString();
};

export default function GlobalChallengeDetailsScreen() {
  const router = useRouter();
  const { currentUserId, user } = useAuthContext();
  const CURRENT_USER_ID = currentUserId;
  const params = useLocalSearchParams();
  const [showParticipants, setShowParticipants] = useState(false);
  const [followTarget, setFollowTarget] = useState<GlobalParticipant | null>(null);
  const [showMotivationalScreen, setShowMotivationalScreen] = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState<ResolvedMotivationalMessage | null>(null);
  const motivationalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/challenges');
  }, [router]);

  useEffect(() => {
    return () => {
      if (motivationalTimerRef.current) {
        clearTimeout(motivationalTimerRef.current);
        motivationalTimerRef.current = null;
      }
    };
  }, []);

  const challengeId = parseInt(params.id as string) || 0;
  const {
    data: previewRows = [],
    isLoading: previewLoading,
    refetch: refetchPreviews,
  } = useSubmissionPreviews(
    [challengeId],
    undefined,
    challengeId > 0 && CURRENT_USER_ID > 0,
  );
  const submissionPreview = previewRows[0];

  // Follow/unfollow mutations
  const followUserMutation = useFollowUser();
  const unfollowUserMutation = useUnfollowUser();

  // Fetch current user's following list to check follow status
  const { data: myFollowingData, refetch: refetchMyFollowing } = useUserFollowing(CURRENT_USER_ID, 1, 200);

  // Fetch challenge data from API — used when navigating from Feed (only id is passed)
  const { data: challengeData, refetch: refetchChallenge } = useChallenge(challengeId, CURRENT_USER_ID);
  const challengeCreatorId = challengeData?.creatorId ?? (parseInt(params.creatorId as string) || 0);
  const challengeOwnerId = challengeData
    ? challengeData.currentOwnerId ?? challengeData.creatorId
    : challengeCreatorId;
  const { data: creatorData } = useUser(challengeCreatorId, CURRENT_USER_ID);

  // Fetch real participants from API
  const { data: participantsData, refetch: refetchParticipants } = useChallengeParticipants(challengeId);

  // Join/leave mutations
  const joinChallengeMutation = useJoinChallenge();
  const leaveChallengeMutation = useLeaveChallenge();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchChallenge(), refetchMyFollowing(), refetchParticipants(), refetchPreviews()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchChallenge, refetchMyFollowing, refetchParticipants, refetchPreviews]);

  // Check if current user follows a given user
  const isFollowingUser = useCallback((targetId: number): boolean => {
    return (myFollowingData?.users || []).some(u => u.id === targetId);
  }, [myFollowingData?.users]);

  // Map API participants to display format
  const participants: GlobalParticipant[] = (participantsData?.participants || []).map(p => ({
    id: p.id,
    username: p.username,
    emailId: p.emailId || '',
    profilePicUrl: p.profilePicUrl,
    genuinenessScore: p.genuinityScore ?? p.genuinenessScore ?? 0,
    isFollowing: isFollowingUser(p.id),
  }));

  const creatorParticipant = useMemo<GlobalParticipant | null>(() => {
    const creatorUsernameParam = (
      challengeData?.creatorUsername ||
      (params.creatorUsername as string) ||
      ''
    ).replace(/^@/, '');
    const username = creatorData?.username || creatorUsernameParam;

    if (!challengeCreatorId && !username) {
      return null;
    }

    return {
      id: challengeCreatorId || -1,
      username: username || 'creator',
      emailId: creatorData?.emailId || '',
      profilePicUrl:
        challengeData?.creatorProfilePicUrl ||
        creatorData?.profilePicUrl ||
        (params.creatorAvatar as string) ||
        null,
      genuinenessScore: creatorData?.genuinityScore ?? creatorData?.genuinenessScore ?? 0,
      isFollowing: challengeCreatorId > 0 ? isFollowingUser(challengeCreatorId) : false,
      isCreator: true,
    };
  }, [
    challengeCreatorId,
    challengeData?.creatorProfilePicUrl,
    challengeData?.creatorUsername,
    creatorData,
    isFollowingUser,
    params.creatorAvatar,
    params.creatorUsername,
  ]);

  const orderedParticipants = useMemo<GlobalParticipant[]>(() => {
    const creatorFromParticipants = challengeCreatorId
      ? participants.find((participant) => participant.id === challengeCreatorId)
      : undefined;
    const creatorRow = creatorFromParticipants
      ? { ...creatorFromParticipants, isCreator: true }
      : undefined;
    const rest = participants
      .filter((participant) => !creatorRow || participant.id !== creatorRow.id)
      .map((participant) => ({ ...participant, isCreator: false }));

    return creatorRow ? [creatorRow, ...rest] : rest;
  }, [challengeCreatorId, participants]);

  const isOriginalCreator = challengeCreatorId > 0 && challengeCreatorId === CURRENT_USER_ID;
  const isCurrentOwner = challengeOwnerId > 0 && challengeOwnerId === CURRENT_USER_ID;
  const isCreator = isOriginalCreator || isCurrentOwner;
  const detailMembership = challengeData?.isJoined ?? challengeData?.joined;
  const membershipResolved = typeof detailMembership === 'boolean'
    || participantsData !== undefined;
  const isJoined = detailMembership
    ?? (participantsData !== undefined
      && participants.some((participant) => participant.id === CURRENT_USER_ID));
  const realParticipantsCount = participantsData?.totalParticipants !== undefined
    ? getMinimumVisibleChallengerCount(participantsData.totalParticipants)
    : getMinimumVisibleChallengerCount(parseInt(params.participantsCount as string));

  const coverPhotoUrls = useMemo(() => {
    const fromChallenge = parseCoverPhotoUrls(challengeData?.coverPhotoUrls);
    if (fromChallenge.length > 0) {
      return fromChallenge;
    }

    const fromParams = parseCoverPhotoUrls(params.coverPhotoUrls as string | undefined);
    if (fromParams.length > 0) {
      return fromParams;
    }

    const image = params.image as string;
    return image ? [image] : [];
  }, [challengeData?.coverPhotoUrls, params.coverPhotoUrls, params.image]);


  const challengeMode = challengeData?.challengeMode || (params.challengeMode as string) || 'DAILY';
  const isOneOff = isOneOffChallengeMode(challengeMode);
  const numberOfDays = isOneOff ? 1 : challengeData?.numberOfDays ?? (parseInt(params.numberOfDays as string) || 0);
  const startDateValue = challengeData?.startDate || challengeData?.createdAt || (params.startDate as string) || '';
  const createdAtValue = challengeData?.createdAt || (params.createdAt as string) || startDateValue;
  const currentDay = getChallengeDayFromStartDate(startDateValue);
  const endDateValue = isOneOff ? '' : getDerivedEndDate(startDateValue, numberOfDays) || (params.endDate as string) || '';
  const routeStatus = params.status as 'active' | 'completed' | 'upcoming' | 'deleted' | undefined;
  const challengeMarkedCompleted = Boolean((challengeData as { completed?: boolean } | undefined)?.completed);
  const challengeStatus = routeStatus === 'deleted'
    ? 'deleted'
    : challengeData?.active === false
      ? 'deleted'
      : routeStatus === 'completed' || challengeMarkedCompleted
        ? 'completed'
        : isOneOff
          ? 'active'
          : getChallengeStatusFromDates(startDateValue, numberOfDays, challengeData?.active);
  const { data: leaderboardData } = useChallengeLeaderboard(challengeId, LeaderboardType.OVERALL, 5, CURRENT_USER_ID, !isOneOff);
  const leaderboardEntries = isOneOff ? [] : (leaderboardData?.entries ?? []).slice(0, 5);

  const challengeDetails = {
    id: params.id as string,
    title: (params.title as string) || challengeData?.title || '',
    description: getDisplayDescription({
      description: challengeData?.description,
      challengeSummary: params.description as string,
    }),
    rules: getDisplayRules({
      rules: challengeData?.rules,
      challengeRules: params.rules as string,
      description: challengeData?.description,
      challengeSummary: params.description as string,
    }),
    benefits: getDisplayBenefits({
      benefits: challengeData?.benefits,
      challengeBenefits: params.benefits as string,
      description: challengeData?.description,
      challengeSummary: params.description as string,
    }),
    category: (params.category as string) || challengeData?.categories || '',
    duration: isOneOff ? 'One-off' : getDurationLabel(numberOfDays) || (params.duration as string) || '',
    numberOfDays,
    createdAt: createdAtValue,
    startDate: startDateValue,
    endDate: endDateValue,
    status: challengeStatus,
    isPrivate: challengeData?.isPrivate ?? params.isPrivate === 'true',
    participantsCount: realParticipantsCount,
    creatorId: challengeCreatorId,
    creatorName: creatorData?.username || (params.creatorName as string) || (creatorParticipant?.username ? `@${creatorParticipant.username}` : ''),
    creatorUsername: creatorParticipant?.username ? `@${creatorParticipant.username}` : ((params.creatorUsername as string) || ''),
    creatorAvatar: creatorParticipant?.profilePicUrl || '',
    isFollowing: creatorParticipant?.isFollowing ?? params.isFollowing === 'true',
    image: coverPhotoUrls[0] || (params.image as string) || '',
    location: (params.location as string) || '',
    tags: (params.tags as string)?.split(',').filter(Boolean) || (challengeData?.hashtags?.split(',').filter(Boolean)) || [],
    challengeMode,
  };
  const challengeIsCompleted = challengeDetails.status === 'completed';
  const challengeIsDeleted = challengeDetails.status === 'deleted';
  const canLeaveChallenge = membershipResolved && isJoined && !challengeIsDeleted;
  const canJoinChallenge = membershipResolved && !isJoined && !challengeIsCompleted && !challengeIsDeleted;

  const showJoinMotivation = useCallback(() => {
    setMotivationalMessage(getRandomMotivationalMessage(user?.username || ''));
    setShowMotivationalScreen(true);

    if (motivationalTimerRef.current) {
      clearTimeout(motivationalTimerRef.current);
    }
    motivationalTimerRef.current = setTimeout(() => {
      motivationalTimerRef.current = null;
      setShowMotivationalScreen(false);
    }, 1400);
  }, [user?.username]);

  const handleJoinChallenge = () => {
    if (CURRENT_USER_ID <= 0) {
      Alert.alert('Sign In Required', 'Please sign in to join or leave challenges.');
      return;
    }
    if (!canJoinChallenge) {
      Alert.alert(
        challengeIsCompleted ? 'Challenge Completed' : 'Challenge Unavailable',
        challengeIsCompleted
          ? 'This challenge has already been completed.'
          : 'This challenge is not accepting new participants.'
      );
      return;
    }

    Alert.alert(
      isCreator ? 'Rejoin Challenge' : 'Join Challenge',
      isCreator
        ? 'Rejoin as an active participant? You will keep your creator/admin access either way.'
        : 'Are you sure you want to join this global challenge?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isCreator ? 'Rejoin' : 'Join',
          onPress: () => {
            joinChallengeMutation.mutate(
              { challengeId, userIds: [CURRENT_USER_ID] },
              {
                onSuccess: () => {
                  refetchParticipants();
                  showJoinMotivation();
                },
                onError: (error) => {
                  if (showChallengeLimitUpgrade(
                    error,
                    'Failed to join the challenge. Please try again.',
                    () => router.push('/premium' as any),
                  )) return;
                  Alert.alert(
                    'Could Not Join',
                    getApiErrorMessage(error, 'Failed to join the challenge. Please try again.'),
                  );
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleLeaveChallenge = () => {
    if (!canLeaveChallenge) return;

    const exitMessage = isCreator
      ? challengeIsCompleted
        ? "You'll stop participating. This challenge has ended, so you won't be able to rejoin. You'll keep your creator/admin access and can still view your existing submissions."
        : challengeDetails.status === 'upcoming'
          ? "You'll stop participating, and it will move out of Active. The challenge will remain scheduled for its participants, and you'll keep your creator/admin access."
          : challengeDetails.isPrivate
            ? "You'll stop participating, and it will move out of Active. The challenge will remain available to its members, and you'll keep your creator/admin access."
            : "You'll stop participating, and it will move out of Active. The challenge will remain available to other participants, and you'll keep your creator/admin access."
      : challengeIsCompleted
        ? "You'll stop participating. This challenge has ended, so you won't be able to rejoin. Your existing submissions won't be deleted."
        : "You'll stop participating in this challenge. Your existing submissions won't be deleted.";

    Alert.alert(
      'Exit challenge?',
      exitMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit challenge',
          style: 'destructive',
          onPress: () => {
            leaveChallengeMutation.mutate(
              { challengeId, userIds: [CURRENT_USER_ID] },
              {
                onSuccess: async () => {
                  if (isCreator) {
                    await Promise.allSettled([refetchParticipants()]);
                  }
                  Alert.alert(
                    'Challenge exited',
                    isCreator
                      ? 'You stopped participating and kept your creator/admin access.'
                      : 'You left the challenge.',
                  );
                  if (!isCreator) {
                    handleBack();
                  }
                },
                onError: () => {
                  Alert.alert('Error', 'Failed to leave the challenge. Please try again.');
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleOpenChallengeOptions = () => {
    Alert.alert(
      'Challenge Options',
      '',
      canLeaveChallenge
        ? [
            { text: 'Report challenge', onPress: () => showContentReportReasons({ targetType: 'CHALLENGE', targetId: challengeId, label: 'challenge', onReported: handleBack }) },
            { text: 'Exit challenge', style: 'destructive', onPress: handleLeaveChallenge },
            { text: 'Cancel', style: 'cancel' },
          ]
        : [
            { text: 'Report challenge', onPress: () => showContentReportReasons({ targetType: 'CHALLENGE', targetId: challengeId, label: 'challenge', onReported: handleBack }) },
            { text: 'Cancel', style: 'cancel' },
          ]
    );
  };

  const handleFollowCreator = () => {
    const creatorId = challengeDetails.creatorId;
    const creatorUsername = challengeDetails.creatorUsername || 'this creator';
    if (creatorId <= 0) {
      router.push({
        pathname: '/user-profile',
        params: { username: creatorUsername.replace('@', '') }
      });
      return;
    }

    if (creatorId === CURRENT_USER_ID) {
      router.push('/(tabs)/profile');
      return;
    }

    const target = creatorParticipant || {
      id: creatorId,
      username: creatorUsername.replace(/^@/, ''),
      emailId: '',
      profilePicUrl: challengeDetails.creatorAvatar || null,
      isFollowing: challengeDetails.isFollowing,
      isCreator: true,
    };
    if (target.isFollowing) {
      setFollowTarget(target);
      return;
    }
    performFollowToggle(target, false);
  };

  const handleShareChallenge = () => {
    if (CURRENT_USER_ID <= 0) {
      Alert.alert('Sign In Required', 'Please sign in before inviting someone to a challenge.');
      return;
    }
    if (!isJoined) {
      Alert.alert('Join Required', 'Join this challenge before inviting someone else.');
      return;
    }
    if (challengeIsCompleted || challengeIsDeleted) {
      Alert.alert('Challenge Closed', 'Completed or inactive challenges can no longer send invitations.');
      return;
    }

    router.push({
      pathname: '/invite-contacts',
      params: {
        mode: 'challenge',
        challengeId: challengeDetails.id.toString(),
        challengeTitle: challengeDetails.title,
      },
    });
  };

  const openGlobalSubmissions = () => {
    if (CURRENT_USER_ID <= 0) {
      Alert.alert('Sign In Required', 'Please sign in to view challenge submissions.');
      return;
    }

    router.push({
      pathname: '/global-submissions',
      params: {
        challengeId: String(challengeId),
        title: challengeDetails.title,
        numberOfDays: String(challengeData?.numberOfDays || parseInt(params.numberOfDays as string) || 0),
        challengeMode: challengeDetails.challengeMode,
        startDate: challengeData?.startDate || challengeData?.createdAt || (params.startDate as string) || '',
        ...(isOneOff ? { dayNumber: '1' } : {}),
      },
    });
  };

  const handleFollowParticipant = (participant: GlobalParticipant) => {
    if (followUserMutation.isPending || unfollowUserMutation.isPending) return;
    if (participant.isFollowing) {
      setFollowTarget(participant);
      return;
    }
    performFollowToggle(participant, false);
  };

  const handleParticipantSubmissionsPress = (participant: GlobalParticipant) => {
    if (participant.id <= 0) {
      return;
    }
    setShowParticipants(false);
    requestAnimationFrame(() => {
      router.push({
        pathname: '/challenge-submissions',
        params: {
          challengeId: String(challengeId),
          title: challengeDetails.title,
          userId: participant.id.toString(),
          username: participant.username,
          readOnly: participant.id === CURRENT_USER_ID ? 'false' : 'true',
          numberOfDays: challengeDetails.numberOfDays.toString(),
          startDate: challengeDetails.startDate,
          challengeMode: challengeDetails.challengeMode,
          isCreator: Boolean(participant.isCreator).toString(),
        },
      });
    });
  };

  const handleParticipantProfilePress = (participant: GlobalParticipant) => {
    if (participant.id <= 0) {
      return;
    }
    setShowParticipants(false);
    requestAnimationFrame(() => {
      if (participant.id === CURRENT_USER_ID) {
        router.push('/(tabs)/profile');
        return;
      }
      router.push({
        pathname: '/user-profile',
        params: {
          id: participant.id.toString(),
          username: participant.username.replace(/^@/, ''),
        },
      });
    });
  };

  const performFollowToggle = (target: GlobalParticipant, wasFollowing: boolean) => {
    const mutation = wasFollowing ? unfollowUserMutation : followUserMutation;
    mutation.mutate(
      { followerId: CURRENT_USER_ID, followingId: target.id },
      {
        onSuccess: () => {
          setFollowTarget(null);
          void Promise.allSettled([refetchMyFollowing(), refetchParticipants()]);
          if (wasFollowing) {
            showAppMessage({
              type: 'success',
              title: 'Unfollowed',
              message: `@${target.username}`,
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



  const renderParticipant = (participant: GlobalParticipant) => (
    <View
      key={participant.id.toString()}
      style={styles.participantItem}
    >
      <AvatarImage uri={participant.profilePicUrl} size={48} style={styles.participantAvatar} />
      <View style={styles.participantInfo}>
        <View style={styles.participantNameRow}>
          <TouchableOpacity
            onPress={() => handleParticipantProfilePress(participant)}
            accessibilityLabel={`View ${participant.username}'s profile`}
            accessibilityRole="link"
            activeOpacity={0.72}
          >
            <Text style={styles.participantName}>@{participant.username.replace(/^@/, '')}</Text>
          </TouchableOpacity>
          {participant.isCreator && (
            <View style={styles.participantCreatorBadge}>
              <Ionicons name="star" size={11} color="#FFD700" />
              <Text style={styles.participantCreatorBadgeText}>Creator</Text>
            </View>
          )}
        </View>
        <View style={styles.participantActions}>
          {participant.id !== CURRENT_USER_ID && (
            <TouchableOpacity
              style={[styles.followParticipantButton, participant.isFollowing && styles.followingParticipantButton]}
              onPress={() => handleFollowParticipant(participant)}
            >
              <Text style={[styles.followParticipantText, participant.isFollowing && styles.followingParticipantText]}>
                {participant.isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.participantSubmissionsButton}
            onPress={() => handleParticipantSubmissionsPress(participant)}
            accessibilityLabel={`View ${participant.username}'s challenge submissions`}
            accessibilityRole="button"
            activeOpacity={0.78}
          >
            <Ionicons name="images-outline" size={15} color="#C4B5FD" />
            <Text style={styles.participantSubmissionsButtonText}>Submissions</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4700ecff" colors={['#4700ecff']} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#18142F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Challenge Details</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShareChallenge} style={styles.shareButton}>
              <Ionicons name="share-outline" size={24} color="#4700ecff" />
            </TouchableOpacity>
            {!isCreator && challengeDetails.status !== 'deleted' && (
              <TouchableOpacity
                onPress={handleOpenChallengeOptions}
                style={styles.headerActionButton}
                accessibilityRole="button"
                accessibilityLabel="Challenge options"
              >
                <Ionicons name="ellipsis-horizontal" size={24} color="#18142F" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.detailsContainer}>
          <ChallengeDetailsOverview
            title={challengeDetails.title}
            description={challengeDetails.description}
            rules={challengeDetails.rules}
            benefits={challengeDetails.benefits}
            category={challengeDetails.category}
            duration={challengeDetails.duration}
            image={challengeDetails.image}
            coverPhotoUrls={coverPhotoUrls}
            currentDay={isOneOff ? 1 : currentDay}
            numberOfDays={challengeDetails.numberOfDays || 1}
            daysLeft={isOneOff ? 0 : Math.max(0, (challengeDetails.numberOfDays || 0) - currentDay)}
            progress={challengeDetails.status === 'completed' ? 100 : challengeDetails.status === 'upcoming' || challengeDetails.status === 'deleted' ? 0 : challengeDetails.numberOfDays > 0 ? Math.min(100, Math.round(((Math.max(currentDay, 1) - 1) / challengeDetails.numberOfDays) * 100)) : 0}
            createdAt={challengeDetails.createdAt}
            startDate={challengeDetails.startDate}
            endDate={challengeDetails.endDate}
            isPrivate={challengeDetails.isPrivate}
            isCreator={isCreator}
            status={challengeDetails.status}
            tags={challengeDetails.tags}
            participantsCount={challengeDetails.participantsCount}
            creator={creatorParticipant ? {
              username: creatorParticipant.username,
              displayName: challengeDetails.creatorName || challengeDetails.creatorUsername,
              avatarUrl: creatorParticipant.profilePicUrl,
              isCreator: true,
              isFollowing: challengeDetails.isFollowing,
              canFollow: challengeDetails.creatorId !== CURRENT_USER_ID,
            } : null}
            participants={orderedParticipants.map((participant) => ({
              id: participant.id,
              username: participant.username,
              avatarUrl: participant.profilePicUrl,
            }))}
            leaderboardEntries={leaderboardEntries}
            onCreatorPress={() => {
              if (challengeDetails.creatorId > 0) {
                router.push({
                  pathname: '/user-profile',
                  params: { id: challengeDetails.creatorId.toString(), username: challengeDetails.creatorUsername.replace('@', '') },
                });
              }
            }}
            onFollowCreator={handleFollowCreator}
            onParticipantsPress={orderedParticipants.length > 0 ? () => setShowParticipants(true) : undefined}
            onLeaderboardPress={() => router.push({
              pathname: '/leaderboard',
              params: { challengeId: String(challengeId), title: challengeDetails.title },
            })}
            submissionPreview={submissionPreview}
            submissionPreviewLoading={previewLoading && !submissionPreview}
            onSubmissionPreviewPress={(submission) => router.push({
              pathname: '/photo-details',
              params: buildSubmissionPreviewDetailRouteParams({
                submission,
                challengeId,
                challengeTitle: challengeDetails.title,
              }),
            })}
            onSubmissionPreviewViewAll={openGlobalSubmissions}
          />

          {/* Action Buttons */}
          {(challengeIsDeleted || membershipResolved) && (
          <View style={styles.actionButtons}>
            {challengeIsCompleted || challengeIsDeleted ? (
              <View style={styles.completedChallengeNotice}>
                <Ionicons
                  name={challengeIsDeleted ? 'close-circle-outline' : 'checkmark-circle-outline'}
                  size={20}
                  color={challengeIsDeleted ? '#FF9A9A' : '#9BE7C4'}
                />
                <Text style={styles.completedChallengeNoticeText}>
                  {challengeIsDeleted ? 'Challenge Unavailable' : 'Challenge Completed'}
                </Text>
                <Text style={styles.completedChallengeNoticeSubtext}>
                  {challengeIsDeleted ? 'This challenge is inactive' : 'New joins are closed'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.joinButton, isJoined && styles.joinedButton]}
                onPress={canJoinChallenge ? handleJoinChallenge : undefined}
                disabled={!canJoinChallenge}
                activeOpacity={canJoinChallenge ? 0.86 : 1}
              >
                <LinearGradient
                  colors={isJoined ? ['#111d16', '#132d1d'] : ['#8F6BFF', '#4700EC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.joinButtonGradient}
                >
                  <View style={[styles.joinButtonIcon, isJoined && styles.joinButtonIconJoined]}>
                    <Ionicons
                      name={isJoined ? 'checkmark' : 'rocket'}
                      size={18}
                      color={isJoined ? '#4ade80' : '#ffffff'}
                    />
                  </View>
                  <Text style={[styles.joinButtonText, isJoined && styles.joinedButtonText]}>
                    {isJoined ? 'Joined' : isCreator ? 'Rejoin Challenge' : 'Join Challenge'}
                  </Text>
                  {!isJoined && <Ionicons name="arrow-forward" size={18} color="#ffffff" />}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
          )}

        </View>
      </ScrollView>

      {/* Participants Modal */}
      <Modal
        visible={showParticipants}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowParticipants(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Participants</Text>
            <TouchableOpacity
              accessibilityLabel="Close participants"
              onPress={() => setShowParticipants(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#4700EC" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={orderedParticipants}
            renderItem={({ item }) => renderParticipant(item)}
            keyExtractor={(item) => item.id.toString()}
            style={styles.modalContent}
            contentContainerStyle={styles.modalList}
          />
        </SafeAreaView>
      </Modal>

      <FollowActionSheet
        visible={Boolean(followTarget)}
        username={followTarget?.username || ''}
        profilePicUrl={followTarget?.profilePicUrl}
        isFollowing={followTarget?.isFollowing ?? false}
        pending={followUserMutation.isPending || unfollowUserMutation.isPending}
        onCancel={() => setFollowTarget(null)}
        onConfirm={() => followTarget && performFollowToggle(followTarget, true)}
      />

      <MotivationalTransition
        visible={showMotivationalScreen}
        message={motivationalMessage}
        variant="join"
      />

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
    borderBottomColor: '#E7E3EF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#18142F',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  shareButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerActionButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 250,
    backgroundColor: '#111017',
  },
  challengeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
  },
  statsOverlay: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  detailsContainer: {
    padding: 20,
  },
  creatorSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  creatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  creatorDetails: {
    flex: 1,
  },
  creatorLabel: {
    fontSize: 11,
    color: '#777389',
    marginBottom: 2,
  },
  creatorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18142F',
    marginBottom: 2,
  },
  creatorUsernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  creatorUsername: {
    fontSize: 13,
    color: '#777389',
  },
  creatorInlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(184, 134, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.65)',
    borderRadius: 14,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  creatorInlineBadgeText: {
    fontSize: 10,
    color: '#7A5100',
    fontWeight: '700',
  },
  followCreatorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: '#4700ecff',
  },
  followingCreatorButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4700ecff',
  },
  followCreatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  followingCreatorText: {
    color: '#4700ecff',
  },
  challengeTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#18142F',
    marginBottom: 12,
  },
  challengeDescription: {
    fontSize: 15,
    color: '#777389',
    lineHeight: 23,
    marginBottom: 24,
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  infoSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18142F',
    marginBottom: 6,
  },
  infoSectionBody: {
    fontSize: 13,
    color: '#777389',
    lineHeight: 19,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  metaItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  metaLabel: {
    fontSize: 11,
    color: '#777389',
    marginTop: 8,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 13,
    color: '#18142F',
    fontWeight: '600',
  },
  categoryPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  categoryPill: {
    borderRadius: 999,
    backgroundColor: '#4700ec22',
    borderWidth: 1,
    borderColor: '#DDD4FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  categoryPillText: {
    color: '#5B3FE5',
    fontSize: 11,
    fontWeight: '600',
  },
  tagsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#18142F',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#4700ecff20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    color: '#4700ecff',
    fontWeight: '500',
  },
  topParticipantsSection: {
    marginBottom: 24,
  },
  topParticipantsList: {
    flexDirection: 'row',
    gap: 16,
  },
  topParticipantItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#4700ecff',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topParticipantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
  },
  topParticipantName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#18142F',
    textAlign: 'center',
    marginBottom: 4,
  },
  topParticipantProgress: {
    backgroundColor: '#F0ECFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topParticipantProgressText: {
    fontSize: 11,
    fontWeight: '700',
  },
  participantsSection: {
    marginBottom: 24,
  },
  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    color: '#4700ecff',
    fontWeight: '500',
  },
  participantsList: {
    gap: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18142F',
  },
  participantCreatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(184, 134, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.65)',
    borderRadius: 14,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  participantCreatorBadgeText: {
    fontSize: 10,
    color: '#7A5100',
    fontWeight: '700',
  },
  participantLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantLocation: {
    fontSize: 11,
    color: '#777389',
  },
  followParticipantButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#4700ecff',
  },
  followingParticipantButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4700ecff',
  },
  followParticipantText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  followingParticipantText: {
    color: '#4700ecff',
  },
  participantSubmissionsButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 11,
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#DDD4FF',
  },
  participantSubmissionsButtonText: {
    color: '#4700EC',
    fontSize: 11,
    fontWeight: '700',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E7E3EF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4700EC',
  },
  leaderboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  leaderboardButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#18142F',
  },
  actionButtons: {
    marginTop: 12,
  },
  joinButton: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(71, 0, 236, 0.56)',
    shadowColor: '#4700ecff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
  },
  joinButtonGradient: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 15,
    gap: 12,
  },
  joinButtonIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
  },
  joinButtonIconJoined: {
    backgroundColor: 'rgba(74, 222, 128, 0.14)',
    borderColor: 'rgba(74, 222, 128, 0.35)',
  },
  joinedButton: {
    borderColor: 'rgba(74, 222, 128, 0.5)',
    shadowColor: '#0e2016',
    shadowOpacity: 0.18,
    elevation: 3,
  },
  joinButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  joinedButtonText: {
    color: '#bff8d4',
  },
  completedChallengeNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF3',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#255a44',
    gap: 4,
  },
  completedChallengeNoticeText: {
    fontSize: 15,
    color: '#187A3D',
    fontWeight: '700',
  },
  completedChallengeNoticeSubtext: {
    fontSize: 11,
    color: '#557060',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  modalTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    fontWeight: '700',
    color: '#18142F',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    marginRight: -8,
    borderRadius: 20,
    backgroundColor: '#EEEAF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalList: {
    padding: 20,
    gap: 12,
  },
});
