import { Ionicons } from '@expo/vector-icons';
import { AppAlert as Alert } from '@/utils/appAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity as NativeTouchableOpacity,
    View,
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ChallengeDetailsOverview from '../components/common/ChallengeDetailsOverview';
import ChallengeCrewPanel from '../components/challenges/ChallengeCrewPanel';
import ChallengeInviteCodeMenuItem from '../components/challenges/ChallengeInviteCodeMenuItem';
import AvatarImage from '../components/common/AvatarImage';
import OfficialAccountBadge from '../components/common/OfficialAccountBadge';
import PremiumBadge from '../components/common/PremiumBadge';
import SubmissionComposer from '../components/common/SubmissionComposer';
import SubmissionUploadHeader from '../components/common/SubmissionUploadHeader';
import IntegrationLogo from '../components/integrations/IntegrationLogo';
import MotivationalTransition from '../components/common/MotivationalTransition';
import { useChallenge, useChallengeParticipants, useCreateSubmission, useDeleteChallenge, useJoinChallenge, useLeaveChallenge, useMyChallengeProgress, useRemoveParticipant, useSubmissionPreviews, useUserChallengeSubmissions } from '../hooks/useChallenges';
import { useChallengeCrewStatus } from '../hooks/useChallengeCrew';
import { useInviteChallengeUsers } from '../hooks/useInvites';
import { useCodeforcesIntegration } from '../hooks/useCodeforcesIntegration';
import { useLeetCodeIntegration } from '../hooks/useLeetCodeIntegration';
import { useSubmissionMediaUpload, type ImagePickerAsset } from '../hooks/useMedia';
import { useChallengeLeaderboard, useInfiniteUserFollowers, useInfiniteUserFollowing, useUser } from '../hooks/useUsers';
import {
  CODING_INTEGRATIONS_ENABLED,
  INTEGRATION_PROVIDERS,
} from '../constants/integrationProviders';
import { useAuthContext } from '../providers/AuthProvider';
import { LeaderboardType, User } from '../types/api';
import { getChallengeDayFromStartDate, getChallengeStatusFromDates, MappedChallenge } from '../components/common/ChallengeCard';
import { getDurationLabel } from '../utils/challengeDuration';
import { resolveChallengeIntegrationProvider } from '../utils/challengeIntegrations';
import { isOneOffChallengeMode } from '../utils/challengeMode';
import { isViewerChallengeCompleted } from '../utils/challengeCompletion';
import { canDeleteChallenge } from '../utils/challengeDeletion';
import { getMinimumVisibleChallengerCount } from '../utils/challengeParticipantCounts';
import { parseCoverPhotoUrls } from '../utils/challengePhotos';
import { getRandomMotivationalMessage } from '../utils/motivationalMessages';
import type { ResolvedMotivationalMessage } from '../utils/motivationalMessages';
import { getDisplayBenefits, getDisplayDescription, getDisplayRules } from '../utils/challengeDisplayText';
import { buildSubmissionPreviewDetailRouteParams } from '../utils/submissionDetail';
import { getUserDisplayName } from '../utils/userDisplay';
import { getApiErrorMessage } from '../utils/apiError';
import { showChallengeLimitUpgrade } from '../utils/challengeLimitUpgrade';
import { showContentReportReasons } from '../utils/contentReporting';
import { toLocalCalendarDate } from '../utils/deviceTime';
import { challengeRecapService } from '../services/challengeRecapService';
import {
  getGlobalCreatorDisplayUsername,
  isOfficialGlobalCreator,
  OFFICIAL_ACCOUNT_AVATAR_SOURCE,
} from '../utils/globalChallenges';

type ParticipantRow = User & { isCreator?: boolean };
type InvitableUser = {
  id: string;
  username: string;
  realName: string;
  profileImage?: string | null;
  isFollowing: boolean;
  isFollowedBy: boolean;
};

const MAX_IN_APP_INVITES = 20;

const getDerivedEndDate = (startDateValue: string, numberOfDays: number): string => {
  if (!startDateValue || numberOfDays <= 0) return '';
  const start = new Date(startDateValue);
  const end = new Date(start.getTime() + numberOfDays * 24 * 60 * 60 * 1000);
  return end.toISOString();
};

const formatIntegrationSyncedAt = (value?: string) => {
  if (!value) return 'Never synced';
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function ChallengeDetailsScreen() {
  const router = useRouter();
  const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { user: currentUser } = useAuthContext();
  const CURRENT_USER_ID = currentUser?.id ?? 0;
  const {
    connection: codeforcesConnection,
    latestSnapshot: codeforcesLatestSnapshot,
    isConnected: isCodeforcesConnected,
    isLoading: isLoadingCodeforcesIntegration,
    isSyncing: isSyncingCodeforces,
    error: codeforcesIntegrationError,
    sync: syncCodeforcesIntegration,
  } = useCodeforcesIntegration(CURRENT_USER_ID, CODING_INTEGRATIONS_ENABLED);
  const {
    connection: leetCodeConnection,
    latestSnapshot: leetCodeLatestSnapshot,
    isConnected: isLeetCodeConnected,
    isLoading: isLoadingLeetCodeIntegration,
    isSyncing: isSyncingLeetCode,
    error: leetCodeIntegrationError,
    sync: syncLeetCodeIntegration,
  } = useLeetCodeIntegration(CURRENT_USER_ID, CODING_INTEGRATIONS_ENABLED);
  const [showParticipants, setShowParticipants] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [appliedParticipantSearch, setAppliedParticipantSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreatorActions, setShowCreatorActions] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [selectedInviteUserIds, setSelectedInviteUserIds] = useState<Set<number>>(new Set());
  const selectedInviteUserIdsRef = useRef<Set<number>>(new Set());
  const autoOpenedInviteChallengeRef = useRef<number | null>(null);
  const autoOpenedRecapChallengeRef = useRef<number | null>(null);
  const [participantPendingRemoval, setParticipantPendingRemoval] = useState<ParticipantRow | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [showMotivationalScreen, setShowMotivationalScreen] = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState<ResolvedMotivationalMessage | null>(null);
  const motivationalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (motivationalTimerRef.current) {
        clearTimeout(motivationalTimerRef.current);
        motivationalTimerRef.current = null;
      }
    };
  }, []);

  const challengeId = parseInt(params.id as string) || 0;
  const previewUserId = Number(params.previewUserId) || undefined;
  const previewUsername = (params.previewUsername as string | undefined)?.replace(/^@/, '');
  const [submissionPreviewScope, setSubmissionPreviewScope] = useState<'all' | 'mine'>('all');
  const {
    data: allPreviewRows = [],
    isLoading: allPreviewLoading,
    isFetching: allPreviewFetching,
    isPlaceholderData: allPreviewIsPlaceholder,
    refetch: refetchAllPreviews,
  } = useSubmissionPreviews(
    [challengeId],
    previewUserId,
    challengeId > 0 && CURRENT_USER_ID > 0,
  );
  const {
    data: myPreviewRows = [],
    isLoading: myPreviewLoading,
    isFetching: myPreviewFetching,
    isPlaceholderData: myPreviewIsPlaceholder,
    refetch: refetchMyPreviews,
  } = useSubmissionPreviews(
    [challengeId],
    CURRENT_USER_ID,
    !previewUserId && challengeId > 0 && CURRENT_USER_ID > 0,
  );
  const showingMySubmissionPreview = !previewUserId && submissionPreviewScope === 'mine';
  const allSubmissionPreview = allPreviewIsPlaceholder ? undefined : allPreviewRows[0];
  const mySubmissionPreview = myPreviewIsPlaceholder ? undefined : myPreviewRows[0];
  const submissionPreview = showingMySubmissionPreview
    ? mySubmissionPreview
    : allSubmissionPreview;
  const submissionPreviewPreload = showingMySubmissionPreview
    ? allSubmissionPreview
    : mySubmissionPreview;
  const submissionPreviewChanging = showingMySubmissionPreview
    ? myPreviewLoading || (myPreviewFetching && myPreviewIsPlaceholder)
    : allPreviewLoading || (allPreviewFetching && allPreviewIsPlaceholder);
  const refetchPreviews = useCallback(async () => {
    const refreshes = [refetchAllPreviews()];
    if (!previewUserId) {
      refreshes.push(refetchMyPreviews());
    }
    await Promise.all(refreshes);
  }, [previewUserId, refetchAllPreviews, refetchMyPreviews]);

  useEffect(() => {
    setSubmissionPreviewScope('all');
  }, [challengeId, previewUserId]);

  // Fetch challenge details from API so participation and lifecycle rules don't depend on route params alone.
  const { data: challengeData, refetch: refetchChallenge } = useChallenge(challengeId, CURRENT_USER_ID);
  const privateCrewEnabled = challengeId > 0 && CURRENT_USER_ID > 0 && (
    challengeData?.isPrivate ?? params.isPrivate === 'true'
  );
  const {
    data: crewStatus,
    isLoading: crewStatusLoading,
    isError: crewStatusError,
    refetch: refetchCrewStatus,
  } = useChallengeCrewStatus(challengeId, privateCrewEnabled);
  const challengeCreatorId = challengeData?.creatorId ?? (parseInt(params.creatorId as string) || 0);
  const challengeOwnerId = challengeData
    ? challengeData.currentOwnerId ?? challengeData.creatorId
    : challengeCreatorId;
  const isOriginalCreator = CURRENT_USER_ID > 0
    && challengeCreatorId > 0
    && challengeCreatorId === CURRENT_USER_ID;
  const isChallengeInviteOwner = CURRENT_USER_ID > 0
    && challengeOwnerId > 0
    && challengeOwnerId === CURRENT_USER_ID;
  const canManageChallenge = isOriginalCreator
    || isChallengeInviteOwner
    || (!challengeData && params.isCreator === 'true');
  const { data: creatorData } = useUser(challengeCreatorId, CURRENT_USER_ID);

  // Fetch real participants from API
  const { data: participantsData, refetch: refetchParticipants } = useChallengeParticipants(challengeId);
  const canInviteFromSocialGraph = CURRENT_USER_ID > 0 && (
    isChallengeInviteOwner ||
    (!privateCrewEnabled && (participantsData?.participants || []).some((participant) => participant.id === CURRENT_USER_ID))
  );

  // Current user's friend graph for quick invites
  const {
    data: followersData,
    isLoading: followersLoading,
    error: followersError,
    refetch: refetchMyFollowers,
    fetchNextPage: fetchNextFollowersPage,
    hasNextPage: hasNextFollowersPage,
    isFetchingNextPage: fetchingNextFollowersPage,
  } = useInfiniteUserFollowers(CURRENT_USER_ID, 100, CURRENT_USER_ID, canInviteFromSocialGraph);
  const {
    data: followingData,
    isLoading: followingLoading,
    error: followingError,
    refetch: refetchMyFollowing,
    fetchNextPage: fetchNextFollowingPage,
    hasNextPage: hasNextFollowingPage,
    isFetchingNextPage: fetchingNextFollowingPage,
  } = useInfiniteUserFollowing(CURRENT_USER_ID, 100, CURRENT_USER_ID, canInviteFromSocialGraph);

  // Mutations
  const joinChallengeMutation = useJoinChallenge();
  const leaveChallengeMutation = useLeaveChallenge();
  const removeParticipantMutation = useRemoveParticipant();
  const inviteChallengeUsersMutation = useInviteChallengeUsers();
  const deleteChallengeMutation = useDeleteChallenge();
  const { uploadSubmissionMedia } = useSubmissionMediaUpload();
  const createSubmissionMutation = useCreateSubmission();
  const normalizedRemoveReason = removeReason.trim();
  const canConfirmParticipantRemoval =
    normalizedRemoveReason.length > 0 &&
    normalizedRemoveReason.length <= 500 &&
    !removeParticipantMutation.isPending;

  const [refreshing, setRefreshing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMediaAssets, setUploadMediaAssets] = useState<ImagePickerAsset[]>([]);
  const [uploadCaption, setUploadCaption] = useState('');
  const [authenticityConfirmed, setAuthenticityConfirmed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/challenges');
  }, [router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchChallenge(),
        refetchParticipants(),
        refetchMyFollowers(),
        refetchMyFollowing(),
        refetchPreviews(),
        ...(privateCrewEnabled ? [refetchCrewStatus()] : []),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    privateCrewEnabled,
    refetchChallenge,
    refetchCrewStatus,
    refetchMyFollowers,
    refetchMyFollowing,
    refetchParticipants,
    refetchPreviews,
  ]);

  // Real participants list
  const participants = useMemo<User[]>(
    () => participantsData?.participants || [],
    [participantsData?.participants]
  );
  const realParticipantsCount = participantsData?.totalParticipants !== undefined
    ? getMinimumVisibleChallengerCount(participantsData.totalParticipants)
    : getMinimumVisibleChallengerCount(parseInt(params.participantsCount as string));

  const coverPhotoUrls: string[] = (() => {
    const fromChallenge = parseCoverPhotoUrls(challengeData?.coverPhotoUrls);
    if (fromChallenge.length > 0) return fromChallenge;
    const raw = params.coverPhotoUrls as string | undefined;
    const parsed = parseCoverPhotoUrls(raw);
    if (parsed.length > 0) return parsed;
    const img = params.image as string;
    return img ? [img] : [];
  })();

  const startDateValue = challengeData?.startDate
    || (params.startDate as string)
    || (privateCrewEnabled ? crewStatus?.startedAt : undefined)
    || challengeData?.createdAt
    || (params.createdAt as string)
    || '';
  const createdAtValue = challengeData?.createdAt || (params.createdAt as string) || startDateValue;
  const numberOfDays = challengeData?.numberOfDays ?? (parseInt(params.numberOfDays as string) || 0);
  const challengeMode = challengeData?.challengeMode || (params.challengeMode as string) || 'DAILY';
  const isOneOff = isOneOffChallengeMode(challengeMode);
  const endDateValue = isOneOff ? '' : getDerivedEndDate(startDateValue, numberOfDays) || (params.endDate as string) || '';
  const isCreator = canManageChallenge;
  const routeStatus = params.status as MappedChallenge['status'] | undefined;
  const challengeMarkedCompleted = Boolean((challengeData as { completed?: boolean } | undefined)?.completed);
  const status: MappedChallenge['status'] = routeStatus === 'deleted'
    ? 'deleted'
    : challengeData?.active === false
      ? 'deleted'
      : routeStatus === 'completed' || challengeMarkedCompleted
        ? 'completed'
        : isOneOff
          ? 'active'
          : getChallengeStatusFromDates(startDateValue, numberOfDays, challengeData?.active);

  const detailMembership = challengeData?.isJoined ?? challengeData?.joined;
  const membershipResolved = typeof detailMembership === 'boolean'
    || participantsData !== undefined;
  const viewerIsParticipant = detailMembership
    ?? (participantsData !== undefined
      && participants.some((participant) => participant.id === CURRENT_USER_ID));
  const {
    data: personalProgress,
    refetch: refetchPersonalProgress,
  } = useMyChallengeProgress(
    challengeId,
    challengeId > 0 && CURRENT_USER_ID > 0 && viewerIsParticipant && !isOneOff,
  );
  // React Query retains the previous result when a query becomes disabled. Do not
  // surface that cached participant-only progress after the viewer leaves.
  const visiblePersonalProgress = viewerIsParticipant ? personalProgress : undefined;

  // Leaderboard preview
  const {
    data: leaderboardData,
    refetch: refetchLeaderboard,
  } = useChallengeLeaderboard(challengeId, LeaderboardType.OVERALL, 5, CURRENT_USER_ID, !isOneOff);
  const leaderboardEntries = isOneOff ? [] : (leaderboardData?.entries ?? []).slice(0, 5);

  const challengeDetails = useMemo(() => ({
    id: String(challengeId || params.id || ''),
    title: challengeData?.title || (params.title as string) || '',
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
    category: challengeData?.categories || (params.category as string) || '',
    duration: isOneOff ? 'One-off' : getDurationLabel(numberOfDays) || (params.duration as string) || '',
    numberOfDays: isOneOff ? 1 : numberOfDays,
    challengeMode,
    proofMode: challengeData?.proofMode || (params.proofMode as string) || 'PHOTO_REQUIRED',
    status,
    participantsCount: realParticipantsCount,
    isCreator,
    progress: visiblePersonalProgress?.completionPercentage ?? (parseInt(params.progress as string) || 0),
    startDate: startDateValue,
    createdAt: createdAtValue,
    endDate: endDateValue,
    image: coverPhotoUrls[0] || (params.image as string) || '',
    isPrivate: challengeData?.isPrivate ?? params.isPrivate === 'true',
    hashtags: challengeData?.hashtags || (params.hashtags as string) || '',
    integrationProvider: challengeData?.integrationProvider || (params.integrationProvider as string) || '',
    verificationProvider: challengeData?.verificationProvider || (params.verificationProvider as string) || '',
    appIntegrationProvider: challengeData?.appIntegrationProvider || (params.appIntegrationProvider as string) || '',
  }), [
    challengeId,
    params.id,
    params.title,
    params.description,
    params.rules,
    params.benefits,
    params.category,
    params.duration,
    params.proofMode,
    params.progress,
    params.image,
    params.isPrivate,
    params.hashtags,
    params.integrationProvider,
    params.verificationProvider,
    params.appIntegrationProvider,
    visiblePersonalProgress?.completionPercentage,
    challengeData?.title,
    challengeData?.description,
    challengeData?.rules,
    challengeData?.categories,
    challengeData?.proofMode,
    challengeData?.benefits,
    challengeData?.isPrivate,
    challengeData?.hashtags,
    challengeData?.integrationProvider,
    challengeData?.verificationProvider,
    challengeData?.appIntegrationProvider,
    challengeMode,
    isOneOff,
    numberOfDays,
    status,
    realParticipantsCount,
    isCreator,
    startDateValue,
    createdAtValue,
    endDateValue,
    coverPhotoUrls,
  ]);

  const challengeIntegrationProvider = useMemo(
    () => resolveChallengeIntegrationProvider({
      title: challengeDetails.title,
      description: challengeDetails.description,
      category: challengeDetails.category,
      categories: challengeDetails.category,
      hashtags: challengeDetails.hashtags,
      integrationProvider: challengeDetails.integrationProvider,
      verificationProvider: challengeDetails.verificationProvider,
      appIntegrationProvider: challengeDetails.appIntegrationProvider,
    }),
    [
      challengeDetails.title,
      challengeDetails.description,
      challengeDetails.category,
      challengeDetails.hashtags,
      challengeDetails.integrationProvider,
      challengeDetails.verificationProvider,
      challengeDetails.appIntegrationProvider,
    ]
  );
  // Keep the completed challenge-sync implementation below for later reactivation.
  const showCodeforcesSyncCard =
    CODING_INTEGRATIONS_ENABLED && challengeIntegrationProvider === 'CODEFORCES';
  const showLeetCodeSyncCard =
    CODING_INTEGRATIONS_ENABLED && challengeIntegrationProvider === 'LEETCODE';
  const showIntegrationSyncCard = showCodeforcesSyncCard || showLeetCodeSyncCard;
  const activeIntegrationProvider = showLeetCodeSyncCard
    ? INTEGRATION_PROVIDERS.LEETCODE
    : INTEGRATION_PROVIDERS.CODEFORCES;
  const activeIntegrationConnection = showLeetCodeSyncCard ? leetCodeConnection : codeforcesConnection;
  const activeIntegrationSnapshot = (showLeetCodeSyncCard ? leetCodeLatestSnapshot : codeforcesLatestSnapshot) as any;
  const isActiveIntegrationConnected = showLeetCodeSyncCard ? isLeetCodeConnected : isCodeforcesConnected;
  const isLoadingActiveIntegration = showLeetCodeSyncCard ? isLoadingLeetCodeIntegration : isLoadingCodeforcesIntegration;
  const isSyncingActiveIntegration = showLeetCodeSyncCard ? isSyncingLeetCode : isSyncingCodeforces;
  const activeIntegrationError = showLeetCodeSyncCard ? leetCodeIntegrationError : codeforcesIntegrationError;
  const activeIntegrationSyncLabel = showLeetCodeSyncCard ? 'Sync LeetCode' : 'Sync Codeforces';
  const activeIntegrationConnectLabel = showLeetCodeSyncCard ? 'Connect LeetCode' : 'Connect Codeforces';

  // Ownership and active participation are separate. A creator may leave and rejoin.
  const isParticipant = viewerIsParticipant;

  const creatorParticipant = useMemo<ParticipantRow | null>(() => {
    const creatorUsernameParam = (
      challengeData?.creatorUsername ||
      (params.creatorUsername as string) ||
      ''
    ).replace(/^@/, '');
    const creatorAvatarParam =
      challengeData?.creatorProfilePicUrl ||
      (params.creatorAvatar as string) ||
      '';
    const username = creatorData?.username || creatorUsernameParam;

    if (!challengeCreatorId && !username) {
      return null;
    }

    return {
      id: challengeCreatorId || -1,
      emailId: creatorData?.emailId || '',
      username: username || 'creator',
      createdAt: creatorData?.createdAt || '',
      genuinenessScore: creatorData?.genuinityScore ?? creatorData?.genuinenessScore ?? 0,
      active: creatorData?.active ?? true,
      challengesCreated: creatorData?.challengesCreated ?? 0,
      challengesAccepted: creatorData?.challengesAccepted ?? 0,
      followers: creatorData?.followers ?? 0,
      following: creatorData?.following ?? 0,
      profilePicUrl: creatorData?.profilePicUrl || creatorAvatarParam || null,
      premiumUser: creatorData?.premiumUser ?? 0,
      notifications: creatorData?.notifications ?? 0,
      bio: creatorData?.bio || null,
      isCreator: true,
    };
  }, [
    challengeCreatorId,
    challengeData?.creatorProfilePicUrl,
    challengeData?.creatorUsername,
    creatorData,
    params.creatorAvatar,
    params.creatorUsername,
  ]);

  const orderedParticipants = useMemo<ParticipantRow[]>(() => {
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
  const appliedParticipantSearchTerm = appliedParticipantSearch.trim().replace(/^@/, '').toLowerCase();
  const inviteUsersLoading = followersLoading || followingLoading;
  const inviteUsersLoadingMore = fetchingNextFollowersPage || fetchingNextFollowingPage;
  const participantIds = useMemo(() => new Set(orderedParticipants.map((participant) => participant.id)), [orderedParticipants]);
  const inviteUsers = useMemo<InvitableUser[]>(() => {
    const usersById = new Map<number, { user: User; isFollowing: boolean; isFollowedBy: boolean }>();

    followersData?.pages.flatMap((page) => page.users || []).forEach((user) => {
      usersById.set(user.id, {
        user,
        isFollowing: false,
        isFollowedBy: true,
      });
    });

    followingData?.pages.flatMap((page) => page.users || []).forEach((user) => {
      const existing = usersById.get(user.id);
      usersById.set(user.id, {
        user,
        isFollowing: true,
        isFollowedBy: existing?.isFollowedBy || false,
      });
    });

    return Array.from(usersById.values())
      .filter(({ user }) => user.id !== CURRENT_USER_ID && !participantIds.has(user.id))
      .map(({ user, isFollowing, isFollowedBy }) => {
        const displayName = getUserDisplayName(user);
        return {
          id: user.id.toString(),
          username: user.username ? `@${user.username.replace(/^@/, '')}` : `#${user.id}`,
          realName: displayName || user.username || `User ${user.id}`,
          profileImage: user.profilePicUrl,
          isFollowing,
          isFollowedBy,
        };
      });
  }, [CURRENT_USER_ID, followersData?.pages, followingData?.pages, participantIds]);
  const inviteUsersError = inviteUsers.length === 0 ? followersError || followingError : null;

  const filteredInviteUsers = useMemo(() => {
    const normalizedQuery = inviteSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) return inviteUsers;

    return inviteUsers.filter((user) =>
      user.realName.toLowerCase().includes(normalizedQuery) ||
      user.username.toLowerCase().includes(normalizedQuery)
    );
  }, [inviteSearchQuery, inviteUsers]);

  const loadMoreInviteUsers = useCallback(() => {
    if (hasNextFollowersPage && !fetchingNextFollowersPage) {
      void fetchNextFollowersPage();
    }
    if (hasNextFollowingPage && !fetchingNextFollowingPage) {
      void fetchNextFollowingPage();
    }
  }, [
    fetchNextFollowersPage,
    fetchNextFollowingPage,
    fetchingNextFollowersPage,
    fetchingNextFollowingPage,
    hasNextFollowersPage,
    hasNextFollowingPage,
  ]);

  const startDateStr = challengeDetails.startDate || challengeDetails.createdAt || '';
  const currentDay = useMemo(() => {
    return getChallengeDayFromStartDate(startDateStr);
  }, [startDateStr]);

  const {
    data: ownSubmissionsData,
    isLoading: loadingOwnSubmissions,
    refetch: refetchOwnSubmissions,
  } = useUserChallengeSubmissions(
    CURRENT_USER_ID,
    challengeId,
    CURRENT_USER_ID,
  );
  const submissionDay = isOneOff ? 1 : currentDay;
  const hasSubmittedCurrentDay = submissionDay > 0
    && (ownSubmissionsData?.submissions || []).some((submission) => submission.dayNumber === submissionDay);
  const challengeHasElapsed = !isOneOff
    && challengeDetails.numberOfDays > 0
    && currentDay > challengeDetails.numberOfDays;
  const privateCrewIsInLobby = challengeDetails.isPrivate && crewStatus?.state === 'LOBBY';
  const viewerChallengeIsCompleted = isViewerChallengeCompleted({
    status: challengeDetails.status,
    challengeMode: challengeDetails.challengeMode,
    hasSubmittedCurrentDay,
    challengeHasElapsed,
    crewState: crewStatus?.state,
  });
  const challengeLifecycleIsCompleted = isOneOff
    ? crewStatus?.state === 'COMPLETED'
    : challengeDetails.status === 'completed'
      || challengeHasElapsed
      || crewStatus?.state === 'COMPLETED';
  const challengeIsDeleted = challengeDetails.status === 'deleted';
  const canAcceptNewSubmission = challengeDetails.status === 'active'
    && !viewerChallengeIsCompleted
    && !privateCrewIsInLobby;
  const canInviteFriends = !challengeIsDeleted && !challengeLifecycleIsCompleted;
  const canManageChallengeInvites = canInviteFriends
    && (!challengeDetails.isPrivate || isChallengeInviteOwner);
  const canShareChallengeInvite = canInviteFriends && !challengeDetails.isPrivate;
  const canExitChallenge = membershipResolved && isParticipant && !challengeIsDeleted;
  const canDeleteThisChallenge = canDeleteChallenge({
    isCreator: challengeDetails.isCreator,
    memberCount: participantsData?.totalParticipants,
    createdAt: challengeData?.createdAt,
  });
  const canJoinChallenge = membershipResolved && !isParticipant && !challengeIsDeleted && !challengeLifecycleIsCompleted;
  const canViewPersonalHistory = isParticipant || challengeDetails.isCreator;
  const privateRankSummary = challengeDetails.isPrivate && isParticipant && leaderboardData?.currentUserRank?.rank
    ? {
        rank: leaderboardData.currentUserRank.rank,
        totalParticipants: leaderboardData.currentUserRank.totalParticipants,
      }
    : undefined;
  const leaderboardMotivationEligible = Boolean(
    challengeDetails.isPrivate
    && isParticipant
    && !isOneOff
    && challengeDetails.status === 'active'
    && !challengeLifecycleIsCompleted
    && crewStatus?.state === 'ACTIVE'
  );

  useEffect(() => {
    if (
      params.openInviteModal !== 'true'
      || !challengeData
      || (!isParticipant && !isChallengeInviteOwner)
      || !canManageChallengeInvites
      || autoOpenedInviteChallengeRef.current === challengeId
    ) {
      return;
    }

    autoOpenedInviteChallengeRef.current = challengeId;
    setShowInviteModal(true);
  }, [
    canManageChallengeInvites,
    challengeData,
    challengeId,
    isChallengeInviteOwner,
    isParticipant,
    params.openInviteModal,
  ]);

  const ensureLoggedIn = useCallback(() => {
    if (CURRENT_USER_ID > 0) return true;
    Alert.alert('Sign In Required', 'Please sign in to join challenges and upload submissions.');
    return false;
  }, [CURRENT_USER_ID]);

  const ensureCanUpload = useCallback((onError?: (message: string) => void) => {
    const reportUnavailable = (title: string, message: string) => {
      if (onError) {
        onError(message);
      } else {
        Alert.alert(title, message);
      }
    };

    if (CURRENT_USER_ID <= 0) {
      reportUnavailable('Sign In Required', 'Please sign in to join challenges and upload submissions.');
      return false;
    }
    if (!isParticipant) {
      reportUnavailable('Join Required', 'You must join this challenge before you can upload a submission.');
      return false;
    }
    if (challengeDetails.status === 'deleted') {
      reportUnavailable('Challenge Deleted', 'This challenge has been deleted and is no longer accepting submissions.');
      return false;
    }
    if (challengeDetails.status === 'upcoming') {
      reportUnavailable('Challenge Not Started', 'This challenge has not started yet. You can upload once it becomes active.');
      return false;
    }
    if (privateCrewIsInLobby) {
      reportUnavailable(
        challengeDetails.isCreator ? 'Start this challenge first' : 'Challenge not started yet',
        challengeDetails.isCreator
          ? 'Start whenever you are ready—even on your own. You can invite people anytime.'
          : 'The creator can start this private challenge at any time.',
      );
      return false;
    }
    if (challengeDetails.status === 'completed' || challengeHasElapsed) {
      reportUnavailable('Challenge Completed', 'This challenge is no longer accepting new submissions.');
      return false;
    }
    return true;
  }, [CURRENT_USER_ID, isParticipant, challengeDetails.isCreator, challengeDetails.status, challengeHasElapsed, privateCrewIsInLobby]);

  const openMySubmissions = useCallback((uploadDay?: number) => {
    if (!ensureLoggedIn()) return;
    if (!canViewPersonalHistory) {
      Alert.alert('Join Required', 'Join this challenge before you can access its submission timeline.');
      return;
    }

    router.push({
      pathname: '/challenge-submissions',
      params: {
        challengeId: challengeDetails.id,
        title: challengeDetails.title,
        numberOfDays: challengeDetails.numberOfDays.toString(),
        progress: challengeDetails.progress.toString(),
        startDate: challengeDetails.startDate || challengeDetails.createdAt || '',
        challengeMode: challengeDetails.challengeMode,
        proofMode: challengeDetails.proofMode,
        isCreator: challengeDetails.isCreator.toString(),
        readOnly: isParticipant ? 'false' : 'true',
        ...(uploadDay && isParticipant ? { autoUploadDay: uploadDay.toString() } : {}),
      },
    });
  }, [canViewPersonalHistory, ensureLoggedIn, isParticipant, router, challengeDetails]);

  const openChallengeRecap = useCallback(() => {
    if (!ensureLoggedIn() || !canViewPersonalHistory || challengeId <= 0) return;

    router.push({
      pathname: '/challenge-recap',
      params: {
        challengeId: challengeDetails.id,
        title: challengeDetails.title,
        numberOfDays: challengeDetails.numberOfDays.toString(),
        startDate: challengeDetails.startDate || challengeDetails.createdAt || '',
        challengeMode: challengeDetails.challengeMode,
        readOnly: isParticipant ? 'false' : 'true',
      },
    });
  }, [canViewPersonalHistory, challengeDetails, challengeId, ensureLoggedIn, isParticipant, router]);

  useEffect(() => {
    if (
      !viewerChallengeIsCompleted
      || challengeIsDeleted
      || !isParticipant
      || previewUserId
      || CURRENT_USER_ID <= 0
      || loadingOwnSubmissions
      || autoOpenedRecapChallengeRef.current === challengeId
    ) {
      return;
    }

    autoOpenedRecapChallengeRef.current = challengeId;
    let cancelled = false;
    let finished = false;
    void (async () => {
      const hasSeenRecap = await challengeRecapService.hasSeen(
        CURRENT_USER_ID,
        challengeId,
      );
      if (cancelled) return;
      if (hasSeenRecap) {
        finished = true;
        return;
      }

      await challengeRecapService.markSeen(CURRENT_USER_ID, challengeId);
      if (!cancelled) {
        finished = true;
        openChallengeRecap();
      }
    })();

    return () => {
      cancelled = true;
      if (!finished && autoOpenedRecapChallengeRef.current === challengeId) {
        autoOpenedRecapChallengeRef.current = null;
      }
    };
  }, [
    CURRENT_USER_ID,
    challengeId,
    viewerChallengeIsCompleted,
    challengeIsDeleted,
    isParticipant,
    loadingOwnSubmissions,
    openChallengeRecap,
    previewUserId,
  ]);

  const openGlobalSubmissions = useCallback(() => {
    if (!ensureLoggedIn()) return;

    router.push({
      pathname: '/global-submissions',
      params: {
        challengeId: challengeDetails.id,
        title: challengeDetails.title,
        numberOfDays: challengeDetails.numberOfDays.toString(),
        startDate: challengeDetails.startDate || challengeDetails.createdAt || '',
        challengeMode: challengeDetails.challengeMode,
        dayNumber: isOneOff ? '1' : (currentDay > 0 ? Math.min(currentDay, challengeDetails.numberOfDays || currentDay) : 1).toString(),
      },
    });
  }, [ensureLoggedIn, router, challengeDetails, currentDay, isOneOff]);

  const handleQuickUpload = () => {
    if (loadingOwnSubmissions) return;
    if (hasSubmittedCurrentDay) {
      Alert.alert(
        isOneOff ? 'Challenge Complete' : 'Today Is Complete',
        isOneOff ? 'Your submission is already captured.' : 'Your progress for today is already captured.'
      );
      return;
    }
    if (!ensureCanUpload()) return;
    openMySubmissions(isOneOff ? 1 : currentDay);
  };

  const handleCodeforcesChallengeSync = async () => {
    if (!ensureLoggedIn()) return;

    if (!isCodeforcesConnected) {
      router.push({ pathname: '/connected-apps' } as any);
      return;
    }

    try {
      const syncedConnection = await syncCodeforcesIntegration();
      Alert.alert(
        'Codeforces synced',
        `Pulled the latest public Codeforces activity for @${syncedConnection.handle}.`
      );
    } catch {
      Alert.alert('Sync failed', 'Could not sync Codeforces right now. Please try again in a minute.');
    }
  };

  const handleLeetCodeChallengeSync = async () => {
    if (!ensureLoggedIn()) return;

    if (!isLeetCodeConnected) {
      router.push({ pathname: '/connected-apps' } as any);
      return;
    }

    try {
      const syncedConnection = await syncLeetCodeIntegration();
      Alert.alert(
        'LeetCode synced',
        `Pulled the latest public LeetCode activity for @${syncedConnection.username}.`
      );
    } catch {
      Alert.alert('Sync failed', 'Could not sync LeetCode right now. Please try again in a minute.');
    }
  };

  const handleIntegrationChallengeSync = showLeetCodeSyncCard
    ? handleLeetCodeChallengeSync
    : handleCodeforcesChallengeSync;

  const handleSubmitUpload = async () => {
    if (!ensureCanUpload(setUploadError)) return;
    if (uploadMediaAssets.length === 0 || !uploadCaption.trim()) {
      setUploadError('Please select at least one photo and add a short check-in before posting.');
      return;
    }
    if (!authenticityConfirmed) {
      setUploadError('Please confirm this is genuinely today\'s progress before posting.');
      return;
    }
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      const mediaUrls = uploadMediaAssets.length > 0
        ? await uploadSubmissionMedia(
            CURRENT_USER_ID,
            uploadMediaAssets,
            setUploadProgress
          )
        : [];
      await createSubmissionMutation.mutateAsync({
        userId: CURRENT_USER_ID,
        challengeId,
        dayNumber: isOneOff ? 1 : currentDay,
        description: uploadCaption.trim(),
        mediaUrls,
      });
      const refreshedLeaderboard = !isOneOff
        ? await refetchLeaderboard().catch(() => undefined)
        : undefined;
      await Promise.allSettled([
        ...(!isOneOff ? [refetchPersonalProgress()] : []),
        refetchOwnSubmissions(),
        refetchPreviews(),
      ]);
      const refreshedRank = challengeDetails.isPrivate
        ? refreshedLeaderboard?.data?.currentUserRank
        : undefined;
      const rankUpdate = refreshedRank?.rank
        && refreshedRank.totalParticipants >= 2
        ? `\n\nYou’re now #${refreshedRank.rank}.`
        : '';
      Alert.alert(
        'Posted',
        `${isOneOff ? 'Submission posted!' : `Day ${currentDay} submission posted!`}${rankUpdate}`
      );
      setShowUploadModal(false);
      setUploadMediaAssets([]);
      setUploadCaption('');
      setAuthenticityConfirmed(false);
      setUploadError(null);
    } catch (error: any) {
      setUploadError(getApiErrorMessage(error, 'Failed to upload. Please try again.'));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEditChallenge = () => {
    if (!challengeDetails.isCreator) {
      Alert.alert('Not Allowed', 'You can only edit challenges you created.');
      return;
    }

    router.push({
      pathname: '/edit-challenge',
      params: {
        id: challengeDetails.id,
        title: challengeDetails.title,
        description: challengeDetails.description,
        category: challengeDetails.category,
        duration: challengeDetails.duration,
        benefits: challengeDetails.benefits,
        numberOfDays: challengeDetails.numberOfDays.toString(),
        challengeMode: challengeDetails.challengeMode,
        isPrivate: challengeDetails.isPrivate ? 'true' : 'false',
        image: challengeDetails.image,
        coverPhotoUrls: JSON.stringify(coverPhotoUrls),
      }
    });
  };

  const handleDeleteChallenge = () => {
    if (!canDeleteThisChallenge) {
      Alert.alert(
        'Cannot delete',
        'You can delete a challenge only in its first 3 days and while it has 3 members or fewer.',
      );
      return;
    }

    Alert.alert(
      'Delete challenge?',
      'This is a new option. The challenge will be removed for everyone. You cannot undo this.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteChallengeMutation.mutate(challengeId, {
              onSuccess: () => {
                Alert.alert('Challenge deleted', 'The challenge is gone.');
                handleBack();
              },
              onError: (err: any) => {
                const message = getApiErrorMessage(
                  err,
                  'Could not delete the challenge. Try again.',
                );
                Alert.alert('Could not delete', message);
              },
            });
          },
        },
      ]
    );
  };

  const showJoinMotivation = useCallback(() => {
    const message = getRandomMotivationalMessage(currentUser?.username || '');
    setMotivationalMessage(message);
    setShowMotivationalScreen(true);

    if (motivationalTimerRef.current) {
      clearTimeout(motivationalTimerRef.current);
    }
    motivationalTimerRef.current = setTimeout(() => {
      motivationalTimerRef.current = null;
      setShowMotivationalScreen(false);
    }, 1400);
  }, [currentUser?.username]);

  const handleJoinOrExit = useCallback(() => {
    if (!ensureLoggedIn()) return;

    if (isParticipant) {
      if (!canExitChallenge) {
        Alert.alert('Cannot exit', 'You cannot exit this challenge.');
        return;
      }

      const exitMessage = challengeDetails.isCreator
        ? challengeLifecycleIsCompleted
          ? "You'll stop participating. This challenge has ended, so you won't be able to rejoin. You'll keep your creator/admin access and can still view your existing submissions."
          : challengeDetails.status === 'upcoming'
            ? "You'll stop participating, and it will move out of Active. The challenge will remain scheduled for its participants, and you'll keep your creator/admin access."
            : challengeDetails.isPrivate
              ? "You'll stop participating, and it will move out of Active. The challenge will remain available to its members, and you'll keep your creator/admin access."
              : "You'll stop participating, and it will move out of Active. The challenge will remain available to other participants, and you'll keep your creator/admin access."
        : challengeLifecycleIsCompleted
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
                    if (challengeDetails.isCreator) {
                      await Promise.allSettled([refetchParticipants()]);
                    }
                    Alert.alert(
                      'Challenge exited',
                      challengeDetails.isCreator
                        ? 'You stopped participating and kept your creator/admin access.'
                        : 'You left the challenge.',
                    );
                    if (!challengeDetails.isCreator) {
                      handleBack();
                    }
                  },
                  onError: (error) => {
                    Alert.alert(
                      'Could not exit',
                      getApiErrorMessage(error, 'Could not exit the challenge. Try again.'),
                    );
                  },
                }
              );
            },
          },
        ]
      );
    } else {
      if (!canJoinChallenge) {
        Alert.alert('Challenge ended', 'You cannot join this challenge now.');
        return;
      }

      Alert.alert(
        challengeDetails.isCreator ? 'Rejoin challenge?' : 'Join challenge?',
        challengeDetails.isCreator
          ? 'Rejoin as an active participant? You will keep your creator/admin access either way.'
          : 'Do you want to join this challenge?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: challengeDetails.isCreator ? 'Rejoin' : 'Join',
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
    }
  }, [ensureLoggedIn, challengeDetails.isCreator, challengeDetails.isPrivate, challengeDetails.status, challengeLifecycleIsCompleted, isParticipant, canExitChallenge, canJoinChallenge, challengeId, CURRENT_USER_ID, leaveChallengeMutation, joinChallengeMutation, refetchParticipants, showJoinMotivation, handleBack, router]);

  const handleOpenChallengeOptions = useCallback(() => {
    Alert.alert(
      'Challenge options',
      'Choose an action.',
      canExitChallenge
        ? [
            { text: 'Report challenge', onPress: () => showContentReportReasons({ targetType: 'CHALLENGE', targetId: challengeId, label: 'challenge', onReported: handleBack }) },
            { text: 'Exit challenge', style: 'destructive', onPress: handleJoinOrExit },
            { text: 'Cancel', style: 'cancel' },
          ]
        : [
            { text: 'Report challenge', onPress: () => showContentReportReasons({ targetType: 'CHALLENGE', targetId: challengeId, label: 'challenge', onReported: handleBack }) },
            { text: 'Cancel', style: 'cancel' },
          ]
    );
  }, [canExitChallenge, challengeId, handleBack, handleJoinOrExit]);

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteSearchQuery('');
    const emptySelection = new Set<number>();
    selectedInviteUserIdsRef.current = emptySelection;
    setSelectedInviteUserIds(emptySelection);
  };

  const handleOpenInviteModal = () => {
    if (!ensureLoggedIn()) return;
    if (!isParticipant && !isChallengeInviteOwner) {
      Alert.alert('Join Required', 'Join this challenge before inviting friends from the app.');
      return;
    }
    if (!canInviteFriends) {
      Alert.alert('Challenge Completed', 'Completed challenges can no longer send invites.');
      return;
    }
    if (challengeDetails.isPrivate && !isChallengeInviteOwner) {
      Alert.alert('Owner Only', 'Only the private challenge owner can send invitations.');
      return;
    }

    setShowInviteModal(true);
  };

  const handleShareChallengeInvite = () => {
    if (!ensureLoggedIn()) return;
    if (challengeDetails.isPrivate) {
      Alert.alert('Private Invitation', 'Private challenge invitations are sent directly to app friends by the owner.');
      return;
    }
    if (!canInviteFriends) {
      Alert.alert('Challenge Completed', 'Completed challenges can no longer send invites.');
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

  const toggleInviteUser = (userId: number) => {
    const next = new Set(selectedInviteUserIdsRef.current);
    if (!next.has(userId) && next.size >= MAX_IN_APP_INVITES) {
      Alert.alert('Invite Limit Reached', `You can invite up to ${MAX_IN_APP_INVITES} friends at once.`);
      return;
    }

    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    selectedInviteUserIdsRef.current = next;
    setSelectedInviteUserIds(next);
  };

  const handleSendInvites = () => {
    if (!canManageChallengeInvites) {
      closeInviteModal();
      Alert.alert('Invites Unavailable', 'You can no longer send invitations for this challenge.');
      return;
    }

    const invitedUserIds = Array.from(selectedInviteUserIdsRef.current)
      .filter((id) => Number.isFinite(id) && id > 0);

    if (invitedUserIds.length === 0) {
      Alert.alert('No Friends Selected', 'Select at least one friend to invite.');
      return;
    }

    inviteChallengeUsersMutation.mutate(
      { challengeId, invitedUserIds },
      {
        onSuccess: () => {
          closeInviteModal();
          refetchChallenge();
          refetchParticipants();
          Alert.alert(
            invitedUserIds.length === 1 ? 'Invite Request Sent' : 'Invite Requests Sent',
            'Eligible friends will receive an in-app invitation.'
          );
        },
        onError: (error) => {
          Alert.alert(
            'Invite Failed',
            getApiErrorMessage(error, 'Could not send invites. Please try again.'),
          );
        },
      }
    );
  };

  const runCreatorAction = (action: () => void) => {
    setShowCreatorActions(false);
    requestAnimationFrame(action);
  };

  const handleRemoveParticipant = (participant: ParticipantRow) => {
    if (!isOriginalCreator) {
      Alert.alert('Not Allowed', 'Only the challenge creator can remove participants.');
      return;
    }
    if (challengeLifecycleIsCompleted || challengeIsDeleted) {
      Alert.alert('Challenge Closed', 'Participants cannot be removed from completed or deleted challenges.');
      return;
    }
    if (participant.isCreator || participant.id === challengeCreatorId) {
      Alert.alert('Not Allowed', 'The challenge creator cannot be removed.');
      return;
    }
    if (participant.id <= 0) {
      return;
    }

    setRemoveReason('');
    setParticipantPendingRemoval(participant);
  };

  const closeRemoveParticipantDialog = () => {
    if (removeParticipantMutation.isPending) return;
    setParticipantPendingRemoval(null);
    setRemoveReason('');
  };

  const confirmRemoveParticipant = () => {
    if (!participantPendingRemoval || !canConfirmParticipantRemoval) return;
    if (challengeLifecycleIsCompleted || challengeIsDeleted) {
      setParticipantPendingRemoval(null);
      setRemoveReason('');
      Alert.alert('Challenge Closed', 'Participants cannot be removed from completed or deleted challenges.');
      return;
    }

    const participant = participantPendingRemoval;
    const username = participant.username ? `@${participant.username.replace(/^@/, '')}` : 'This participant';
    removeParticipantMutation.mutate(
      {
        challengeId,
        participantUserId: participant.id,
        reason: normalizedRemoveReason,
      },
      {
        onSuccess: () => {
          setParticipantPendingRemoval(null);
          setRemoveReason('');
          refetchChallenge();
          refetchParticipants();
          Alert.alert('Participant Removed', `${username} has been removed and cannot rejoin unless invited again.`);
        },
        onError: (err: any) => {
          const message = getApiErrorMessage(
            err,
            'Could not remove this participant. Please try again.',
          );
          Alert.alert('Remove Failed', message);
        },
      }
    );
  };

  const handleParticipantSubmissionsPress = (participant: ParticipantRow) => {
    if (participant.id <= 0) {
      return;
    }
    setShowParticipants(false);
    setParticipantSearch('');
    setAppliedParticipantSearch('');
    requestAnimationFrame(() => {
      router.push({
        pathname: '/challenge-submissions',
        params: {
          challengeId: challengeDetails.id,
          title: challengeDetails.title,
          userId: participant.id.toString(),
          username: participant.username,
          readOnly: participant.id === CURRENT_USER_ID && isParticipant ? 'false' : 'true',
          numberOfDays: challengeDetails.numberOfDays.toString(),
          progress: challengeDetails.progress.toString(),
          startDate: challengeDetails.startDate || challengeDetails.createdAt || '',
          challengeMode: challengeDetails.challengeMode,
          isCreator: (participant.id === challengeCreatorId).toString(),
        },
      });
    });
  };

  const handleParticipantProfilePress = (participant: ParticipantRow) => {
    if (participant.id <= 0) {
      return;
    }
    setShowParticipants(false);
    setParticipantSearch('');
    setAppliedParticipantSearch('');
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

  const handleLeaderboardSubmissionsPress = (row: { id: string; username: string }) => {
    const participantUserId = Number(row.id);
    if (!Number.isFinite(participantUserId) || participantUserId <= 0) {
      return;
    }

    router.push({
      pathname: '/challenge-submissions',
      params: {
        challengeId: challengeDetails.id,
        title: challengeDetails.title,
        userId: participantUserId.toString(),
        username: row.username,
        readOnly: participantUserId === CURRENT_USER_ID && isParticipant ? 'false' : 'true',
        numberOfDays: challengeDetails.numberOfDays.toString(),
        progress: challengeDetails.progress.toString(),
        startDate: challengeDetails.startDate || challengeDetails.createdAt || '',
        challengeMode: challengeDetails.challengeMode,
        isCreator: (participantUserId === challengeCreatorId).toString(),
      },
    });
  };

  const renderParticipant = (participant: ParticipantRow) => {
    const isOfficialParticipant = isOfficialGlobalCreator(participant.username);
    const participantDisplayUsername = getGlobalCreatorDisplayUsername(participant.username);
    const canRemoveParticipant =
      isOriginalCreator &&
      !challengeLifecycleIsCompleted &&
      !challengeIsDeleted &&
      !participant.isCreator &&
      participant.id !== challengeCreatorId &&
      participant.id !== CURRENT_USER_ID;

    return (
      <View
        key={participant.id.toString()}
        style={styles.participantItem}
      >
        <AvatarImage
          uri={participant.profilePicUrl}
          size={42}
          style={styles.participantAvatar}
          accessibilityLabel={`${participantDisplayUsername} profile picture`}
          fallbackSource={isOfficialParticipant ? OFFICIAL_ACCOUNT_AVATAR_SOURCE : undefined}
        />
        <View style={styles.participantInfo}>
          <View style={styles.participantNameRow}>
            <View style={styles.participantIdentityRow}>
              <TouchableOpacity
                style={styles.participantNameLink}
                onPress={() => handleParticipantProfilePress(participant)}
                accessibilityLabel={`View ${participantDisplayUsername}'s profile`}
                accessibilityRole="link"
                activeOpacity={0.72}
              >
                <Text style={styles.participantName} numberOfLines={1}>
                  {participantDisplayUsername}
                </Text>
              </TouchableOpacity>
              {isOfficialParticipant ? (
                <OfficialAccountBadge compact />
              ) : participant.premiumUser > 0 ? (
                <PremiumBadge />
              ) : null}
            </View>
            {participant.isCreator && (
              <View style={styles.participantCreatorBadge}>
                <Ionicons name="star" size={11} color="#7A5100" />
                <Text style={styles.participantCreatorBadgeText}>Creator</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.participantTrailingActions}>
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
          {canRemoveParticipant && (
            <TouchableOpacity
              style={styles.participantRemoveButton}
              onPress={(event) => {
                event.stopPropagation();
                handleRemoveParticipant(participant);
              }}
              accessibilityLabel={`Remove ${participant.username} from challenge`}
              accessibilityRole="button"
            >
              <Ionicons name="person-remove-outline" size={18} color="#FF6B6B" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderInviteUser = ({ item }: { item: InvitableUser }) => {
    const numericUserId = Number(item.id);
    const isSelected = selectedInviteUserIds.has(numericUserId);
    const relationshipLabel = item.isFollowing && item.isFollowedBy
      ? 'You follow each other'
      : item.isFollowedBy
        ? 'Follows you'
        : 'Following';

    return (
      <TouchableOpacity
        style={[styles.inviteCandidateItem, isSelected && styles.inviteCandidateSelected]}
        onPress={() => toggleInviteUser(numericUserId)}
        activeOpacity={0.78}
      >
        <AvatarImage uri={item.profileImage} size={46} style={styles.inviteCandidateAvatar} />
        <View style={styles.inviteCandidateInfo}>
          <Text style={styles.inviteCandidateName}>{item.realName}</Text>
          <Text style={styles.inviteCandidateUsername}>{item.username} · {relationshipLabel}</Text>
        </View>
        <View style={[styles.inviteCheckbox, isSelected && styles.inviteCheckboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#ffffff" />}
        </View>
      </TouchableOpacity>
    );
  };

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
          {challengeDetails.isCreator && challengeDetails.status !== 'deleted' ? (
            <TouchableOpacity
              onPress={() => setShowCreatorActions(true)}
              style={styles.editHeaderButton}
              accessibilityRole="button"
              accessibilityLabel="Challenge actions"
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="#18142F" />
            </TouchableOpacity>
          ) : challengeDetails.status !== 'deleted' ? (
            <TouchableOpacity
              onPress={handleOpenChallengeOptions}
              style={styles.editHeaderButton}
              accessibilityRole="button"
              accessibilityLabel="Challenge options"
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="#18142F" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerActionPlaceholder} />
          )}
        </View>
        <View style={styles.detailsContainer}>
          {canViewPersonalHistory && viewerChallengeIsCompleted && !challengeIsDeleted && (
            <TouchableOpacity
              style={styles.recapCallout}
              onPress={openChallengeRecap}
              feedbackTiming="after-paint"
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={`Play recap for ${challengeDetails.title}`}
            >
              <View style={styles.recapCalloutAccent} />
              <View style={styles.recapCalloutIcon}>
                <Ionicons name="play" size={18} color="#4D279F" />
              </View>
              <View style={styles.recapCalloutCopy}>
                <Text style={styles.recapCalloutEyebrow}>
                  COMPLETE · {isOneOff ? 'ONE-OFF' : `${challengeDetails.numberOfDays} DAYS`}
                </Text>
                <Text style={styles.recapCalloutTitle} numberOfLines={1}>
                  Replay {challengeDetails.title}
                </Text>
                <Text style={styles.recapCalloutText}>Your check-ins, from start to finish.</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color="#7B6A8E" />
            </TouchableOpacity>
          )}

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
            progress={challengeDetails.progress}
            challengeMode={challengeDetails.challengeMode}
            momentum={visiblePersonalProgress?.momentum}
            privateRank={privateRankSummary}
            privateCrewState={challengeDetails.isPrivate ? crewStatus?.state : undefined}
            createdAt={challengeDetails.createdAt}
            startDate={challengeDetails.startDate}
            endDate={challengeDetails.endDate}
            isPrivate={challengeDetails.isPrivate}
            isCreator={challengeDetails.isCreator}
            status={challengeDetails.status}
            tags={(challengeDetails.hashtags || '').split(',').filter(Boolean)}
            participantsCount={challengeDetails.participantsCount}
            creator={creatorParticipant ? {
              username: creatorParticipant.username,
              avatarUrl: creatorParticipant.profilePicUrl,
              isCreator: true,
              canFollow: false,
              premiumUser: creatorParticipant.premiumUser,
            } : null}
            participants={orderedParticipants.map((participant) => ({
              id: participant.id,
              username: participant.username,
              avatarUrl: participant.profilePicUrl,
            }))}
            leaderboardEntries={leaderboardEntries}
            onCreatorPress={creatorParticipant ? () => handleParticipantSubmissionsPress(creatorParticipant) : undefined}
            onParticipantsPress={orderedParticipants.length > 0 ? () => setShowParticipants(true) : undefined}
            onLeaderboardPress={() => router.push({
              pathname: '/leaderboard',
              params: {
                challengeId: challengeDetails.id,
                title: challengeDetails.title,
                isPrivate: challengeDetails.isPrivate ? 'true' : 'false',
                motivationEligible: leaderboardMotivationEligible ? 'true' : 'false',
              },
            })}
            onLeaderboardParticipantPress={handleLeaderboardSubmissionsPress}
            submissionPreview={submissionPreview}
            submissionPreviewPreload={submissionPreviewPreload}
            submissionPreviewLoading={submissionPreviewChanging}
            submissionPreviewProfileMode={Boolean(previewUserId)}
            submissionPreviewUsername={previewUsername}
            submissionPreviewScope={submissionPreviewScope}
            onSubmissionPreviewScopeChange={
              !previewUserId && canViewPersonalHistory ? setSubmissionPreviewScope : undefined
            }
            onSubmissionPreviewPress={(submission) => router.push({
              pathname: '/photo-details',
              params: {
                ...buildSubmissionPreviewDetailRouteParams({
                  submission,
                  challengeId,
                  challengeTitle: challengeDetails.title,
                  userName: previewUsername
                    || (submissionPreviewScope === 'mine' ? currentUser?.username : undefined),
                }),
                readOnly: isParticipant ? 'false' : 'true',
              },
            })}
            onSubmissionPreviewViewAll={
              !previewUserId && submissionPreviewScope === 'mine'
                ? () => openMySubmissions()
                : openGlobalSubmissions
            }
          />

          {challengeDetails.isPrivate
            && CURRENT_USER_ID > 0
            && (isParticipant || isChallengeInviteOwner)
            && !challengeLifecycleIsCompleted
            && !challengeIsDeleted ? (
            <ChallengeCrewPanel
              challengeId={challengeId}
              startDate={challengeDetails.startDate}
              status={crewStatus}
              isLoading={crewStatusLoading}
              hasError={crewStatusError}
              canManageInvites={isChallengeInviteOwner}
              viewerIsParticipant={isParticipant}
              onInvite={handleOpenInviteModal}
            />
          ) : null}

          {showIntegrationSyncCard && (
            <View style={styles.integrationSyncCard}>
              <View style={styles.integrationSyncHeader}>
                <IntegrationLogo provider={activeIntegrationProvider} size={50} />
                <View style={styles.integrationSyncTitleWrap}>
                  <Text style={styles.integrationSyncEyebrow}>Challenge integration</Text>
                  <Text style={styles.integrationSyncTitle}>{activeIntegrationProvider.name} submission sync</Text>
                  <Text style={styles.integrationSyncSubtitle}>
                    {isActiveIntegrationConnected
                      ? `@${showLeetCodeSyncCard ? leetCodeConnection?.username : codeforcesConnection?.handle} · ${formatIntegrationSyncedAt(activeIntegrationConnection?.lastSyncedAt)}`
                      : `Connect your ${showLeetCodeSyncCard ? 'username' : 'handle'} once, then sync from this challenge.`}
                  </Text>
                </View>
              </View>

              <Text style={styles.integrationSyncBody}>
                {showLeetCodeSyncCard
                  ? 'We only read public LeetCode profile and accepted submission data. Sync runs when you tap the button.'
                  : 'We only read public Codeforces profile and submission data. Sync runs when you tap the button.'}
              </Text>

              {activeIntegrationSnapshot ? (
                <View style={styles.integrationStatsRow}>
                  <View style={styles.integrationStatPill}>
                    <Text style={styles.integrationStatValue}>
                      {showLeetCodeSyncCard
                        ? activeIntegrationSnapshot.totalSolved?.toString()
                        : activeIntegrationSnapshot.acceptedCount?.toString()}
                    </Text>
                    <Text style={styles.integrationStatLabel}>{showLeetCodeSyncCard ? 'solved' : 'accepted'}</Text>
                  </View>
                  <View style={styles.integrationStatPill}>
                    <Text style={styles.integrationStatValue}>
                      {showLeetCodeSyncCard
                        ? activeIntegrationSnapshot.mediumSolved?.toString() || '--'
                        : activeIntegrationSnapshot.profile.rating?.toString() || '--'}
                    </Text>
                    <Text style={styles.integrationStatLabel}>{showLeetCodeSyncCard ? 'medium' : 'rating'}</Text>
                  </View>
                  <View style={styles.integrationStatPill}>
                    <Text style={styles.integrationStatValue}>
                      {activeIntegrationSnapshot.submissions.length.toString()}
                    </Text>
                    <Text style={styles.integrationStatLabel}>latest</Text>
                  </View>
                </View>
              ) : null}

              {activeIntegrationError ? (
                <View style={styles.integrationErrorBanner}>
                  <Ionicons name="warning-outline" size={16} color="#FFD3D3" />
                  <Text style={styles.integrationErrorText}>{activeIntegrationError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.integrationSyncButton,
                  isActiveIntegrationConnected ? styles.integrationSyncButtonPrimary : styles.integrationSyncButtonSecondary,
                  (isLoadingActiveIntegration || isSyncingActiveIntegration) && styles.integrationSyncButtonDisabled,
                ]}
                onPress={handleIntegrationChallengeSync}
                feedbackTiming="after-paint"
                disabled={isLoadingActiveIntegration || isSyncingActiveIntegration}
                activeOpacity={0.86}
              >
                {isSyncingActiveIntegration || isLoadingActiveIntegration ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons
                    name={isActiveIntegrationConnected ? 'sync-outline' : 'link-outline'}
                    size={18}
                    color="#ffffff"
                  />
                )}
                <Text style={styles.integrationSyncButtonText}>
                  {isSyncingActiveIntegration
                    ? 'Syncing...'
                    : isActiveIntegrationConnected
                      ? activeIntegrationSyncLabel
                      : activeIntegrationConnectLabel}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Progress Section */}
          {!challengeDetails.isCreator && challengeDetails.status !== 'deleted' && challengeDetails.progress > 0 && (
            <View style={styles.progressSection}>
              <Text style={styles.progressTitle}>Your Progress</Text>
              <View style={styles.progressContainer}>
                <Text style={styles.progressLabel}>{challengeDetails.progress}% Complete</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${challengeDetails.progress}%` }]} />
                </View>
              </View>
            </View>
          )}

          {/* Upload Today */}
          {isParticipant && canAcceptNewSubmission && !loadingOwnSubmissions && (
            hasSubmittedCurrentDay ? (
              <View style={styles.submissionCompleteCard}>
                <View style={styles.submissionCompleteIcon}>
                  <Ionicons name="checkmark-circle" size={25} color="#187A3D" />
                </View>
                <View style={styles.submissionCompleteCopy}>
                  {isOneOff ? (
                    <>
                      <Text style={styles.submissionCompleteTitle}>Challenge complete</Text>
                      <Text style={styles.submissionCompleteText}>Your effort is captured. Take pride in showing up and completing what you started.</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.submissionCompleteTitle}>{"Today's progress is complete"}</Text>
                      <Text style={styles.submissionCompleteText}>Your effort is captured for today. Take pride in showing up, then come back tomorrow and keep your streak alive.</Text>
                    </>
                  )}
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadTodayButton}
                onPress={handleQuickUpload}
                activeOpacity={0.8}
              >
                <View style={styles.uploadDayBadge}>
                  <Text style={styles.uploadDayBadgeText}>{isOneOff ? 'One-off' : `Day ${currentDay}`}</Text>
                </View>
                <Ionicons name="camera" size={22} color="#fff" />
                <Text style={styles.uploadTodayText}>{isOneOff ? 'Complete Challenge' : "Upload Today's Progress"}</Text>
              </TouchableOpacity>
            )
          )}

          {/* Action Buttons */}
          {(challengeDetails.status === 'deleted' || (membershipResolved && (
            (!challengeDetails.isCreator || !isParticipant)
            && !(challengeDetails.isPrivate && isParticipant && privateCrewIsInLobby)
          ))) && (
          <View style={styles.actionButtons}>
            {challengeDetails.status === 'deleted' ? (
              <View style={styles.deletedChallengeNotice}>
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                <Text style={styles.deletedChallengeNoticeText}>Deleted Challenge</Text>
                <Text style={styles.deletedChallengeNoticeSubtext}>Inactive</Text>
              </View>
            ) : isParticipant ? (
              <>
                {canInviteFriends ? (
                  <>
                    {canManageChallengeInvites ? (
                      <TouchableOpacity
                        style={styles.inviteFriendsButton}
                        onPress={handleOpenInviteModal}
                        disabled={inviteChallengeUsersMutation.isPending}
                        activeOpacity={0.84}
                        accessibilityRole="button"
                      >
                        <Ionicons name="person-add-outline" size={20} color="#D8C7FF" />
                        <Text style={styles.inviteFriendsButtonText}>Invite App Friends</Text>
                      </TouchableOpacity>
                    ) : null}
                    {canShareChallengeInvite ? (
                      <TouchableOpacity
                        style={[styles.inviteFriendsButton, styles.shareInviteButton]}
                        onPress={handleShareChallengeInvite}
                        activeOpacity={0.84}
                        accessibilityRole="button"
                      >
                        <Ionicons name="share-social-outline" size={20} color="#C2B8D8" />
                        <Text style={styles.shareInviteButtonText}>Contacts or WhatsApp</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                ) : (
                  <View style={styles.completedChallengeNotice}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#187A3D" />
                    <Text style={styles.completedChallengeNoticeText}>Challenge Completed</Text>
                    <Text style={styles.completedChallengeNoticeSubtext}>Invites are closed. You can still exit from the menu.</Text>
                  </View>
                )}
              </>
            ) : canJoinChallenge ? (
              <TouchableOpacity
                style={styles.joinButton}
                onPress={handleJoinOrExit}
                feedbackTiming="after-paint"
                activeOpacity={0.86}
              >
                <LinearGradient
                  colors={['#00B894', '#00A3FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.joinButtonGradient}
                >
                  <View style={styles.joinButtonIcon}>
                    <Ionicons name="rocket" size={18} color="#ffffff" />
                  </View>
                  <Text style={styles.joinButtonText}>
                    {challengeDetails.isCreator ? 'Rejoin Challenge' : 'Join Challenge'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.completedChallengeNotice}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#9BE7C4" />
                <Text style={styles.completedChallengeNoticeText}>Challenge Completed</Text>
                <Text style={styles.completedChallengeNoticeSubtext}>New joins are closed</Text>
              </View>
            )}
          </View>
          )}

        </View>
      </ScrollView>

      <Modal
        visible={showCreatorActions}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowCreatorActions(false)}
      >
        <View style={styles.creatorActionsOverlay}>
          <NativeTouchableOpacity
            style={styles.creatorActionsBackdrop}
            activeOpacity={1}
            onPress={() => setShowCreatorActions(false)}
            accessibilityRole="button"
            accessibilityLabel="Close challenge actions"
          />
          <View style={[styles.creatorActionsMenu, { top: topInset + 84 }]}>
            {canManageChallengeInvites && (
              <>
                <ChallengeInviteCodeMenuItem
                  challengeId={challengeId}
                  enabled={isChallengeInviteOwner}
                  onBeforeCopy={() => setShowCreatorActions(false)}
                />

                <TouchableOpacity
                  style={[
                    styles.creatorActionItem,
                    inviteChallengeUsersMutation.isPending && styles.actionButtonDisabled,
                  ]}
                  onPress={() => runCreatorAction(handleOpenInviteModal)}
                  disabled={inviteChallengeUsersMutation.isPending}
                  accessibilityRole="button"
                >
                  <Ionicons name="person-add-outline" size={20} color="#D8C7FF" />
                  <Text style={styles.creatorActionText}>
                    {inviteChallengeUsersMutation.isPending ? 'Sending Invites...' : 'Invite App Friends'}
                  </Text>
                </TouchableOpacity>

                {canShareChallengeInvite ? (
                  <TouchableOpacity
                    style={styles.creatorActionItem}
                    onPress={() => runCreatorAction(handleShareChallengeInvite)}
                    accessibilityRole="button"
                  >
                    <Ionicons name="share-social-outline" size={20} color="#D8C7FF" />
                    <Text style={styles.creatorActionText}>Share Invite</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}

            <TouchableOpacity
              style={[
                styles.creatorActionItem,
                !canExitChallenge && !canDeleteThisChallenge && styles.creatorActionItemLast,
              ]}
              onPress={() => runCreatorAction(handleEditChallenge)}
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={20} color="#A98BFF" />
              <Text style={styles.creatorActionText}>Edit Challenge</Text>
            </TouchableOpacity>

            {canExitChallenge && (
              <TouchableOpacity
                style={[
                  styles.creatorActionItem,
                  !canDeleteThisChallenge && styles.creatorActionItemLast,
                  leaveChallengeMutation.isPending && styles.actionButtonDisabled,
                ]}
                onPress={() => runCreatorAction(handleJoinOrExit)}
                disabled={leaveChallengeMutation.isPending}
                accessibilityRole="button"
              >
                <Ionicons name="log-out-outline" size={20} color="#FF8A8A" />
                <Text style={styles.creatorActionDeleteText}>
                  {leaveChallengeMutation.isPending ? 'Exiting...' : 'Exit challenge'}
                </Text>
              </TouchableOpacity>
            )}

            {canDeleteThisChallenge && (
              <TouchableOpacity
                style={[styles.creatorActionItem, styles.creatorActionItemLast]}
                onPress={() => runCreatorAction(handleDeleteChallenge)}
                accessibilityRole="button"
              >
                <Ionicons name="trash-outline" size={20} color="#FF6262" />
                <Text style={styles.creatorActionDeleteText}>Delete challenge</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Participants Modal */}
      <Modal
        visible={showParticipants}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (participantPendingRemoval) {
            closeRemoveParticipantDialog();
            return;
          }
          setShowParticipants(false);
          setParticipantSearch('');
          setAppliedParticipantSearch('');
        }}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Participants ({challengeDetails.participantsCount})
            </Text>
            <TouchableOpacity
              accessibilityLabel="Close participants"
              onPress={() => {
                setShowParticipants(false);
                setParticipantSearch('');
                setAppliedParticipantSearch('');
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#4700EC" />
            </TouchableOpacity>
          </View>
          <View style={styles.participantSearchContainer}>
            <Ionicons name="search" size={16} color="#666" />
            <TextInput
              style={styles.participantSearchInput}
              placeholder="Search participants..."
              placeholderTextColor="#555"
              value={participantSearch}
              onChangeText={setParticipantSearch}
              onSubmitEditing={() => setAppliedParticipantSearch(participantSearch.trim())}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              maxLength={100}
            />
            {participantSearch.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setParticipantSearch('');
                  setAppliedParticipantSearch('');
                }}
              >
                <Ionicons name="close-circle" size={16} color="#666" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.participantSearchAction}
              onPress={() => setAppliedParticipantSearch(participantSearch.trim())}
              activeOpacity={0.82}
            >
              <Text style={styles.participantSearchActionText}>Search</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {orderedParticipants
              .filter((participant) => {
                if (!appliedParticipantSearchTerm) return true;
                return [
                  participant.username,
                  participant.displayName,
                  participant.realName,
                  participant.fullName,
                  participant.firstName,
                  participant.lastName,
                  participant.name,
                ].some((value) =>
                  (value || '').replace(/^@/, '').toLowerCase().includes(appliedParticipantSearchTerm)
                );
              })
              .map(renderParticipant)}
          </ScrollView>
        </SafeAreaView>

        {participantPendingRemoval && !challengeLifecycleIsCompleted && !challengeIsDeleted && (
          <KeyboardAvoidingView
            style={styles.removeParticipantOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={-bottomInset}
          >
            <NativeTouchableOpacity
              style={styles.removeParticipantBackdrop}
              activeOpacity={1}
              onPress={closeRemoveParticipantDialog}
              accessibilityLabel="Cancel participant removal"
            />
            <View
              style={[
                styles.removeParticipantSheet,
                { paddingBottom: Math.max(bottomInset, 16) },
              ]}
            >
              <View style={styles.removeParticipantHandle} />
              <View style={styles.removeParticipantHeader}>
                <View style={styles.removeParticipantTitleRow}>
                  <Ionicons name="person-remove-outline" size={21} color="#FF6B6B" />
                  <Text style={styles.removeParticipantTitle}>Remove participant</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeParticipantCloseButton}
                  onPress={closeRemoveParticipantDialog}
                  disabled={removeParticipantMutation.isPending}
                  accessibilityLabel="Close removal reason"
                >
                  <Ionicons name="close" size={22} color="#18142F" />
                </TouchableOpacity>
              </View>

              <Text style={styles.removeParticipantDescription}>
                Tell {participantPendingRemoval.username
                  ? `@${participantPendingRemoval.username.replace(/^@/, '')}`
                  : 'this participant'} why they are being removed. They cannot post or rejoin unless you invite them again.
              </Text>

              <View style={styles.removeReasonInputContainer}>
                <TextInput
                  style={styles.removeReasonInput}
                  value={removeReason}
                  onChangeText={setRemoveReason}
                  placeholder="Reason for removal"
                  placeholderTextColor="#8E8798"
                  keyboardAppearance="light"
                  multiline
                  autoFocus
                  maxLength={500}
                  textAlignVertical="top"
                  editable={!removeParticipantMutation.isPending}
                  accessibilityLabel="Reason for removing participant"
                />
                <View style={styles.removeReasonMetaRow}>
                  <Text
                    style={[
                      styles.removeReasonRequirement,
                      normalizedRemoveReason.length > 0 && styles.removeReasonRequirementValid,
                    ]}
                  >
                    Required
                  </Text>
                  <Text style={styles.removeReasonCount}>{normalizedRemoveReason.length}/500</Text>
                </View>
              </View>

              <View style={styles.removeParticipantActions}>
                <TouchableOpacity
                  style={styles.removeParticipantCancelButton}
                  onPress={closeRemoveParticipantDialog}
                  disabled={removeParticipantMutation.isPending}
                  accessibilityRole="button"
                >
                  <Text style={styles.removeParticipantCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.removeParticipantConfirmButton,
                    !canConfirmParticipantRemoval && styles.removeParticipantConfirmButtonDisabled,
                  ]}
                  onPress={confirmRemoveParticipant}
                  feedbackTiming="after-paint"
                  disabled={!canConfirmParticipantRemoval}
                  accessibilityRole="button"
                >
                  {removeParticipantMutation.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.removeParticipantConfirmText}>Remove</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </Modal>

      <Modal
        visible={showInviteModal && canManageChallengeInvites}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeInviteModal}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={closeInviteModal}
              style={[styles.inviteHeaderButton, styles.inviteHeaderButtonStart]}
            >
              <Text style={styles.modalCancelText} numberOfLines={1}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.inviteModalTitle} numberOfLines={1}>Invite in App</Text>
            <TouchableOpacity
              onPress={handleSendInvites}
              feedbackTiming="after-paint"
              style={[styles.inviteHeaderButton, styles.inviteHeaderButtonEnd]}
              disabled={inviteChallengeUsersMutation.isPending}
            >
              <Text
                style={[styles.modalDoneText, inviteChallengeUsersMutation.isPending && styles.modalDoneTextDisabled]}
                numberOfLines={1}
              >
                {inviteChallengeUsersMutation.isPending ? 'Sending' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inviteSearchContainer}>
            <Ionicons name="search" size={18} color="#666666" style={styles.inviteSearchIcon} />
            <TextInput
              style={styles.inviteSearchInput}
              placeholder="Search followers and following..."
              placeholderTextColor="#666666"
              value={inviteSearchQuery}
              onChangeText={setInviteSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              maxLength={100}
            />
            {inviteSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setInviteSearchQuery('')}>
                <Ionicons name="close-circle" size={17} color="#666666" />
              </TouchableOpacity>
            )}
          </View>

          {inviteUsersLoading ? (
            <View style={styles.inviteStateContainer}>
              <ActivityIndicator color="#4700ecff" size="large" />
              <Text style={styles.inviteStateText}>Loading friends...</Text>
            </View>
          ) : inviteUsersError ? (
            <View style={styles.inviteStateContainer}>
              <Ionicons name="warning-outline" size={36} color="#FF6B6B" />
              <Text style={styles.inviteStateText}>Could not load followers and following.</Text>
            </View>
          ) : filteredInviteUsers.length === 0 ? (
            <View style={styles.inviteStateContainer}>
              <Ionicons name="people-outline" size={40} color="#777777" />
              <Text style={styles.inviteStateText}>
                {inviteSearchQuery.trim() ? 'No matching friends found.' : 'No friends available to invite right now.'}
              </Text>
              {(hasNextFollowersPage || hasNextFollowingPage) && (
                <TouchableOpacity
                  style={styles.loadMoreInviteButton}
                  onPress={loadMoreInviteUsers}
                  disabled={inviteUsersLoadingMore}
                >
                  {inviteUsersLoadingMore ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.loadMoreInviteButtonText}>Load more friends</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredInviteUsers}
              renderItem={renderInviteUser}
              keyExtractor={(item) => item.id}
              style={styles.inviteCandidatesList}
              showsVerticalScrollIndicator={false}
              onEndReached={loadMoreInviteUsers}
              onEndReachedThreshold={0.35}
              ListFooterComponent={inviteUsersLoadingMore ? (
                <View style={styles.inviteListFooter}>
                  <ActivityIndicator size="small" color="#8C6CFF" />
                </View>
              ) : null}
            />
          )}
        </SafeAreaView>
      </Modal>

      <MotivationalTransition
        visible={showMotivationalScreen}
        message={motivationalMessage}
        variant="join"
      />

      {/* Quick Upload Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (isUploading) return;
          setShowUploadModal(false);
          setUploadMediaAssets([]);
          setUploadCaption('');
          setAuthenticityConfirmed(false);
          setUploadProgress(0);
          setUploadError(null);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          enabled={Platform.OS === 'ios'}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <SafeAreaView
            style={styles.modalContainer}
            edges={['top', 'bottom']}
          >
            <SubmissionUploadHeader
              challengeName={challengeDetails.title}
              dayLabel={isOneOff ? 'One-off' : `Day ${currentDay}`}
              dateLabel={toLocalCalendarDate(new Date())}
              closeDisabled={isUploading}
              onClose={() => {
                setShowUploadModal(false);
                setUploadMediaAssets([]);
                setUploadCaption('');
                setAuthenticityConfirmed(false);
                setUploadProgress(0);
                setUploadError(null);
              }}
            />
            <SubmissionComposer
              challengeName={challengeDetails.title}
              dayLabel={isOneOff ? 'One-off challenge' : `Day ${currentDay}`}
              assets={uploadMediaAssets}
              onAssetsChange={setUploadMediaAssets}
              caption={uploadCaption}
              onCaptionChange={setUploadCaption}
              onSubmit={handleSubmitUpload}
              isSubmitting={isUploading}
              uploadProgress={uploadProgress}
              confirmed={authenticityConfirmed}
              onConfirmedChange={setAuthenticityConfirmed}
              requireConfirmation
              proofMode={challengeDetails.proofMode}
              errorMessage={uploadError}
              onErrorChange={setUploadError}
            />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
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
  editHeaderButton: {
    padding: 4,
  },
  headerActionPlaceholder: {
    width: 32,
    height: 32,
  },
  creatorActionsOverlay: {
    flex: 1,
  },
  creatorActionsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  creatorActionsMenu: {
    position: 'absolute',
    right: 16,
    width: 250,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.36,
    shadowRadius: 18,
    elevation: 14,
  },
  creatorActionItem: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E7E3EF',
  },
  creatorActionItemLast: {
    borderBottomWidth: 0,
  },
  creatorActionText: {
    flex: 1,
    color: '#18142F',
    fontSize: 14,
    fontWeight: '700',
  },
  creatorActionDeleteText: {
    flex: 1,
    color: '#ff6262',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    backgroundColor: '#111017',
  },
  challengeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  statusOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4caf50',
  },
  deletedStatusText: {
    color: '#ff6b6b',
  },
  detailsContainer: {
    padding: 20,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  challengeTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#18142F',
    flex: 1,
    marginRight: 16,
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#b8860b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#daa520',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  creatorText: {
    fontSize: 11,
    color: '#7A5100',
    fontWeight: '700',
  },
  challengeDescription: {
    fontSize: 15,
    color: '#777389',
    lineHeight: 23,
    marginBottom: 16,
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
  creatorDetailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 24,
  },
  creatorDetailsAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  creatorDetailsInfo: {
    flex: 1,
  },
  creatorDetailsLabel: {
    fontSize: 11,
    color: '#777389',
    marginBottom: 3,
  },
  creatorDetailsName: {
    fontSize: 15,
    color: '#18142F',
    fontWeight: '700',
  },
  creatorDetailsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(184, 134, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.65)',
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  creatorDetailsBadgeText: {
    fontSize: 11,
    color: '#7A5100',
    fontWeight: '700',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  metaItem: {
    flex: 1,
    minWidth: '45%',
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
  integrationSyncCard: {
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#DDD4FF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  integrationSyncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  integrationSyncTitleWrap: {
    flex: 1,
  },
  integrationSyncEyebrow: {
    fontSize: 11,
    color: '#86c7ff',
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  integrationSyncTitle: {
    fontSize: 18,
    color: '#18142F',
    fontWeight: '700',
  },
  integrationSyncSubtitle: {
    fontSize: 12,
    color: '#777389',
    marginTop: 4,
    lineHeight: 17,
  },
  integrationSyncBody: {
    fontSize: 13,
    color: '#4B4654',
    lineHeight: 19,
    marginTop: 14,
  },
  integrationStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  integrationStatPill: {
    flex: 1,
    backgroundColor: 'rgba(31, 138, 203, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(134, 199, 255, 0.24)',
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  integrationStatValue: {
    color: '#18142F',
    fontSize: 16,
    fontWeight: '700',
  },
  integrationStatLabel: {
    color: '#9fb8cf',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  integrationErrorBanner: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#F3B6BF',
    borderRadius: 16,
    padding: 10,
    marginTop: 14,
  },
  integrationErrorText: {
    flex: 1,
    color: '#B4233C',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  integrationSyncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 20,
    paddingVertical: 14,
    marginTop: 14,
  },
  integrationSyncButtonPrimary: {
    backgroundColor: '#1f8acb',
  },
  integrationSyncButtonSecondary: {
    backgroundColor: '#4700ecff',
  },
  integrationSyncButtonDisabled: {
    opacity: 0.62,
  },
  integrationSyncButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  progressSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  progressTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#18142F',
    marginBottom: 12,
  },
  progressContainer: {
    backgroundColor: '#F8F7FC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  progressLabel: {
    fontSize: 13,
    color: '#4700EC',
    marginBottom: 8,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E7E3EF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4700EC',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#18142F',
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
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  participantAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
  },
  participantInfo: {
    flex: 1,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  participantIdentityRow: {
    minWidth: 0,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantNameLink: {
    minWidth: 0,
    flexShrink: 1,
  },
  participantName: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#18142F',
  },
  participantCreatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff1a8',
    borderWidth: 1,
    borderColor: '#b8860b',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  participantCreatorBadgeText: {
    fontSize: 10,
    color: '#7a5100',
    fontWeight: '700',
  },
  participantTrailingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantSubmissionsButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 22,
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
  participantRemoveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  actionButtons: {
    gap: 12,
    marginTop: 12,
  },
  recapCallout: {
    marginBottom: 14,
    minHeight: 84,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD5EC',
    backgroundColor: '#F3EFFA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  recapCalloutAccent: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: '#6B45D6',
  },
  recapCalloutIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7DEFA',
    borderWidth: 1,
    borderColor: '#CCBCEC',
  },
  recapCalloutCopy: {
    flex: 1,
    minWidth: 0,
  },
  recapCalloutEyebrow: {
    color: '#6D5B85',
    fontSize: 8,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  recapCalloutTitle: {
    marginTop: 3,
    color: '#241B2E',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  recapCalloutText: {
    marginTop: 2,
    color: '#716A78',
    fontSize: 10,
    lineHeight: 14,
  },
  actionButtonDisabled: {
    opacity: 0.62,
  },
  deletedChallengeNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#5a2020',
    gap: 4,
  },
  deletedChallengeNoticeText: {
    fontSize: 15,
    color: '#ff6b6b',
    fontWeight: '700',
  },
  deletedChallengeNoticeSubtext: {
    fontSize: 11,
    color: '#b77',
    fontWeight: '600',
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
  joinButton: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(80, 230, 210, 0.56)',
    shadowColor: '#00A3FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
  },
  joinButtonGradient: {
    minHeight: 56,
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
  joinButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  inviteFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#6e4dff',
    gap: 8,
  },
  inviteFriendsButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4700EC',
  },
  shareInviteButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDD4FF',
  },
  shareInviteButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4700EC',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  removeParticipantOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  removeParticipantBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24, 20, 47, 0.42)',
  },
  removeParticipantSheet: {
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#E7E3EF',
    paddingTop: 8,
    paddingHorizontal: 18,
  },
  removeParticipantHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C8C2D2',
    alignSelf: 'center',
    marginBottom: 14,
  },
  removeParticipantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  removeParticipantTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  removeParticipantTitle: {
    color: '#18142F',
    fontSize: 18,
    fontWeight: '700',
  },
  removeParticipantCloseButton: {
    width: 40,
    height: 40,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeParticipantDescription: {
    color: '#655F70',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    marginBottom: 14,
  },
  removeReasonInputContainer: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8D2E2',
    backgroundColor: '#F8F7FC',
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 9,
  },
  removeReasonInput: {
    minHeight: 88,
    maxHeight: 152,
    color: '#18142F',
    fontSize: 15,
    lineHeight: 21,
    padding: 0,
  },
  removeReasonMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  removeReasonRequirement: {
    color: '#777389',
    fontSize: 11,
    fontWeight: '600',
  },
  removeReasonRequirementValid: {
    color: '#168A5B',
  },
  removeReasonCount: {
    color: '#777389',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  removeParticipantActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  removeParticipantCancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeParticipantCancelText: {
    color: '#18142F',
    fontSize: 14,
    fontWeight: '700',
  },
  removeParticipantConfirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#d94152',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeParticipantConfirmButtonDisabled: {
    backgroundColor: '#F4C8CD',
  },
  removeParticipantConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  participantSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  participantSearchInput: {
    flex: 1,
    color: '#18142F',
    fontSize: 13,
    padding: 0,
  },
  participantSearchAction: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4700ec',
  },
  participantSearchActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
  inviteHeaderButton: {
    width: 76,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteHeaderButtonStart: {
    alignItems: 'flex-start',
  },
  inviteHeaderButtonEnd: {
    alignItems: 'flex-end',
  },
  inviteModalTitle: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 8,
    color: '#18142F',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    color: '#777389',
    fontWeight: '700',
  },
  modalDoneText: {
    fontSize: 13,
    color: '#8c6cff',
    fontWeight: '700',
  },
  modalDoneTextDisabled: {
    color: '#555555',
  },
  inviteSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  inviteSearchIcon: {
    marginRight: 0,
  },
  inviteSearchInput: {
    flex: 1,
    color: '#18142F',
    fontSize: 13,
    padding: 0,
  },
  inviteCandidatesList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  inviteStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  inviteStateText: {
    color: '#777389',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  loadMoreInviteButton: {
    minHeight: 44,
    minWidth: 164,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#DDD4FF',
    paddingHorizontal: 16,
  },
  loadMoreInviteButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  inviteListFooter: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteCandidateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  inviteCandidateSelected: {
    backgroundColor: '#4700ec10',
  },
  inviteCandidateAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  inviteCandidateInfo: {
    flex: 1,
    minWidth: 0,
  },
  inviteCandidateName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#18142F',
    marginBottom: 2,
  },
  inviteCandidateUsername: {
    fontSize: 11,
    color: '#777777',
  },
  inviteCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteCheckboxSelected: {
    backgroundColor: '#4700ecff',
    borderColor: '#4700ecff',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  uploadHelperText: {
    color: '#655F70',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  uploadModalContent: {
    paddingBottom: 24,
  },
  leaderboardSection: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    overflow: 'hidden',
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  leaderboardHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  leaderboardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18142F',
  },
  leaderboardCurrentRank: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  leaderboardCurrentRankLabel: {
    fontSize: 10,
    color: '#777389',
  },
  leaderboardCurrentRankValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18142F',
    marginTop: 2,
  },
  leaderboardEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  leaderboardEmptyText: {
    fontSize: 13,
    color: '#777389',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  leaderboardRowMe: {
    backgroundColor: '#4700ec12',
  },
  leaderboardRank: {
    width: 34,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  leaderboardAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  leaderboardAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderboardUsername: {
    flex: 1,
    fontSize: 13,
    color: '#18142F',
    fontWeight: '500',
  },
  leaderboardScore: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4700ecff',
  },
  leaderboardViewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  leaderboardViewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4700ecff',
  },
  captionInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    color: '#18142F',
    fontSize: 14,
    padding: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  captionCounter: {
    color: '#777777',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
  },
  authenticityCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#17130a',
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 102, 0.28)',
    shadowColor: '#ffcc66',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 3,
  },
  authenticityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  authenticityIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffcc66',
  },
  authenticityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffe3a3',
    letterSpacing: 0.2,
  },
  authenticityText: {
    fontSize: 12,
    lineHeight: 20,
    color: '#f6e5bf',
  },
  uploadTodayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22A85A',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 8,
    marginTop: 16,
    shadowColor: '#168342',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#168342',
  },
  uploadDayBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  uploadDayBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  submissionCompleteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECF9F0',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#A8DEB9',
    shadowColor: '#187A3D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  submissionCompleteIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4F1DE',
    borderRadius: 21,
  },
  submissionCompleteCopy: {
    flex: 1,
    gap: 5,
  },
  submissionCompleteTitle: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  submissionCompleteText: {
    color: '#284B34',
    fontSize: 12,
    lineHeight: 18,
  },
  uploadTodayText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
