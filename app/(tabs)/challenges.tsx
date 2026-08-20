import { AppAlert as Alert } from "@/utils/appAlert";
import hapticFeedback from "@/utils/haptics";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  View,
} from "react-native";
import { AppTouchableOpacity as TouchableOpacity } from "@/components/common/AppPressable";
import { SafeAreaView } from "react-native-safe-area-context";
import ChallengeVisibilityDropdown from "../../components/challenges/ChallengeVisibilityDropdown";
import DailyCompletionBanner from "../../components/challenges/DailyCompletionBanner";
import MyChallengeGalleryCard from "../../components/challenges/MyChallengeGalleryCard";
import PendingChallengeStack from "../../components/challenges/PendingChallengeStack";
import {
  MappedChallenge,
  getChallengeDayFromStartDate,
  mapChallenge,
  mapMyChallenge,
} from "../../components/common/ChallengeCard";
import {
  SkeletonBlock,
  useSkeletonShimmer,
} from "../../components/common/Skeleton";
import SubmissionComposer from "../../components/common/SubmissionComposer";
import SubmissionUploadHeader from "../../components/common/SubmissionUploadHeader";
import {
  useCreateSubmission,
  useFavoriteChallenges,
  useInactiveChallenges,
  useInfiniteChallengesByCreator,
  useMyActiveChallenges,
  useSetChallengeFavorite,
  useUserChallengeSubmissionStatuses,
} from "../../hooks/useChallenges";
import {
  useChallengeCrewStatuses,
  useStartChallengeCrew,
} from "../../hooks/useChallengeCrew";
import {
  useSubmissionMediaUpload,
  type ImagePickerAsset,
} from "../../hooks/useMedia";
import { useUnreadNotificationCount } from "../../hooks/useNotifications";
import { useUser } from "../../hooks/useUsers";
import { useAuthContext } from "../../providers/AuthProvider";
import { normalizeInviteCode } from "../../services/pendingInviteService";
import { Challenge } from "../../types/api";
import { getDisplayDescription } from "../../utils/challengeDisplayText";
import { getApiErrorMessage } from "../../utils/apiError";
import { parseCalendarDate, toLocalCalendarDate } from "../../utils/deviceTime";
import {
  filterChallengesByVisibility,
  getChallengeVisibilityFilterLabel,
  type ChallengeVisibilityFilter,
} from "../../utils/challengeVisibilityFilter";
import { isOneOffChallengeMode } from "../../utils/challengeMode";
import {
  buildPendingSummary,
  dedupeChallenges,
  excludeDeletedChallenges,
  filterMyChallenges,
  partitionChallenges,
  summarizeDailyCompletion,
  type MyChallengeFilter,
} from "../../utils/myChallengesPresentation";

const getRouteParamValue = (value?: string | string[]): string =>
  Array.isArray(value) ? value[0] || "" : value || "";

const getCurrentDate = () => toLocalCalendarDate(new Date());

const titleCaseCategory = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getChallengeCategories = (challenge: MappedChallenge): string[] => {
  const categories = (challenge.category || "General")
    .split(",")
    .map((category) => titleCaseCategory(category))
    .filter(Boolean);
  return categories.length > 0 ? categories : ["General"];
};

const ChallengeGallerySkeleton = () => {
  const shimmer = useSkeletonShimmer();

  return (
    <View style={styles.skeletonContainer}>
      <SkeletonBlock translateX={shimmer} height={112} borderRadius={20} />
      <View style={styles.skeletonHeading}>
        <SkeletonBlock
          translateX={shimmer}
          width="36%"
          height={14}
          borderRadius={7}
        />
        <SkeletonBlock
          translateX={shimmer}
          width={68}
          height={10}
          borderRadius={5}
        />
      </View>
      <View style={styles.skeletonGrid}>
        {[0, 1, 2, 3].map((item) => (
          <SkeletonBlock
            key={item}
            translateX={shimmer}
            width="100%"
            height={318}
            borderRadius={18}
          />
        ))}
      </View>
    </View>
  );
};

const Challenges = () => {
  const router = useRouter();
  const routeParams = useLocalSearchParams<{
    focusChallengeId?: string | string[];
    openChallengeId?: string | string[];
    notificationRouteNonce?: string | string[];
    uploadChallengeId?: string | string[];
  }>();
  const { currentUserId, user: authUser } = useAuthContext();
  const CURRENT_USER_ID = currentUserId;
  const { data: currentUser } = useUser(CURRENT_USER_ID);
  const greetingName =
    currentUser?.firstName?.trim() ||
    authUser?.firstName?.trim() ||
    currentUser?.username?.trim() ||
    authUser?.username?.trim() ||
    "there";
  const { data: unreadNotifications = 0 } =
    useUnreadNotificationCount(CURRENT_USER_ID);
  const [activeTab, setActiveTab] = useState<MyChallengeFilter>("all");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [visibilityFilter, setVisibilityFilter] =
    useState<ChallengeVisibilityFilter>("all");
  const [favoritePendingIds, setFavoritePendingIds] = useState<Set<string>>(
    new Set(),
  );
  const [optimisticFavoriteById, setOptimisticFavoriteById] = useState<
    Record<string, boolean>
  >({});
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteCodeError, setInviteCodeError] = useState("");

  const switchTab = (tab: MyChallengeFilter) => {
    setActiveTab(tab);
    setSelectedCategory("All");
    hapticFeedback.selection();
  };
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] =
    useState<MappedChallenge | null>(null);
  const [selectedMediaAssets, setSelectedMediaAssets] = useState<
    ImagePickerAsset[]
  >([]);
  const [uploadCaption, setUploadCaption] = useState("");
  const [authenticityConfirmed, setAuthenticityConfirmed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [, setSubmissionRevision] = useState(0);
  const handledRouteActionRef = useRef("");
  const challengeListRef = useRef<FlatList<MappedChallenge>>(null);

  const { uploadSubmissionMedia } = useSubmissionMediaUpload();
  const createSubmissionMutation = useCreateSubmission();
  const { mutate: setChallengeFavorite } = useSetChallengeFavorite(CURRENT_USER_ID);

  // Fetch user's joined challenges with progress from new endpoint
  const {
    data: myActiveChallengesData,
    isLoading: loadingMyActive,
    error: myActiveError,
    refetch: refetchMyActive,
  } = useMyActiveChallenges(CURRENT_USER_ID);
  const {
    data: favoriteChallengesData,
    isLoading: loadingFavoriteChallenges,
    error: favoriteChallengesError,
    refetch: refetchFavoriteChallenges,
  } = useFavoriteChallenges(CURRENT_USER_ID);
  const {
    data: inactiveChallengesData,
    isLoading: loadingInactiveChallenges,
    error: inactiveChallengesError,
    refetch: refetchInactiveChallenges,
  } = useInactiveChallenges(CURRENT_USER_ID);
  // Fetch challenges created by user from API
  const {
    data: createdChallengesPages,
    isLoading: loadingCreatedChallenges,
    error: createdChallengesError,
    refetch: refetchCreatedChallenges,
    fetchNextPage: fetchNextCreatedChallengesPage,
    hasNextPage: hasNextCreatedChallengesPage,
    isFetchingNextPage: isFetchingNextCreatedChallengesPage,
  } = useInfiniteChallengesByCreator(CURRENT_USER_ID, CURRENT_USER_ID, 20);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const allChallenges = useMemo(() => {
    const membershipChallenges = [
      ...(myActiveChallengesData?.challenges || []),
      ...(favoriteChallengesData?.challenges || []),
      ...(inactiveChallengesData?.challenges || []),
    ];
    const myChallengeById = new Map(
      membershipChallenges.map((challenge) => [
        challenge.id,
        challenge,
      ]),
    );
    const myChallenges = (myActiveChallengesData?.challenges || []).map(
      (challenge) => mapMyChallenge(challenge, CURRENT_USER_ID),
    );
    const favoriteChallenges = (favoriteChallengesData?.challenges || []).map(
      (challenge) => mapMyChallenge(challenge, CURRENT_USER_ID),
    );
    const inactiveChallenges = (inactiveChallengesData?.challenges || []).map(
      (challenge) => mapMyChallenge(challenge, CURRENT_USER_ID),
    );
    const createdChallenges = (
      createdChallengesPages?.pages?.flatMap((page) => page.challenges) || []
    ).map((challenge: Challenge) => {
      const progressChallenge = myChallengeById.get(challenge.id);
      return progressChallenge
        ? mapMyChallenge(
            {
              ...progressChallenge,
              description: getDisplayDescription({
                description: progressChallenge.description,
                challengeDescription: challenge.description,
              }),
            },
            CURRENT_USER_ID,
          )
        : mapChallenge(challenge, CURRENT_USER_ID);
    });

    return excludeDeletedChallenges(dedupeChallenges([
      ...createdChallenges,
      ...myChallenges,
      ...favoriteChallenges,
      ...inactiveChallenges,
    ])).map((challenge) => (
      Object.prototype.hasOwnProperty.call(optimisticFavoriteById, challenge.id)
        ? {
            ...challenge,
            isFavorite: optimisticFavoriteById[challenge.id],
          }
        : challenge
    ));
  }, [
    CURRENT_USER_ID,
    createdChallengesPages,
    favoriteChallengesData,
    inactiveChallengesData,
    myActiveChallengesData,
    optimisticFavoriteById,
  ]);

  const { active: activeChallenges, past: pastChallenges } = useMemo(
    () => partitionChallenges(allChallenges),
    [allChallenges],
  );

  const showingPast = activeTab === "past";
  const showingFavorites = activeTab === "favorites";
  const showingCreated = activeTab === "created";
  const isLoading = showingFavorites
    ? loadingFavoriteChallenges
    : showingPast
      ? loadingMyActive || loadingFavoriteChallenges || loadingInactiveChallenges
      : showingCreated
        ? loadingCreatedChallenges
        : loadingMyActive;
  const userChallengesError = showingFavorites
    ? favoriteChallengesError
    : showingPast
      ? myActiveError || favoriteChallengesError || inactiveChallengesError
      : showingCreated
        ? createdChallengesError
        : myActiveError;
  const searchPlaceholder = activeTab === "created"
    ? "Search created challenges"
    : showingFavorites
      ? "Search favourite challenges"
      : showingPast
        ? "Search past challenges"
        : "Search active challenges";
  const visibleChallenges = showingFavorites
    ? allChallenges
    : showingPast
      ? pastChallenges
      : showingCreated
        ? allChallenges
        : activeChallenges;
  const activeCount = activeChallenges.length;
  const createdCount = useMemo(
    () => allChallenges.filter((challenge) => challenge.isCreator).length,
    [allChallenges],
  );
  const favoriteCount = useMemo(
    () => allChallenges.filter((challenge) => challenge.isFavorite).length,
    [allChallenges],
  );
  const pastCount = pastChallenges.length;
  const tabChallenges = useMemo(
    () => filterMyChallenges(visibleChallenges, activeTab, ""),
    [activeTab, visibleChallenges],
  );
  const visibilityFilteredChallenges = useMemo(
    () => filterChallengesByVisibility(tabChallenges, visibilityFilter),
    [tabChallenges, visibilityFilter],
  );
  const categoryOptions = useMemo(() => {
    const categories = new Set<string>(["Fun"]);
    visibilityFilteredChallenges.forEach((challenge) => {
      getChallengeCategories(challenge).forEach((category) =>
        categories.add(category),
      );
    });
    return [
      "All",
      ...Array.from(categories).sort((left, right) =>
        left.localeCompare(right),
      ),
    ];
  }, [visibilityFilteredChallenges]);

  useEffect(() => {
    if (!categoryOptions.includes(selectedCategory)) {
      setSelectedCategory("All");
    }
  }, [categoryOptions, selectedCategory]);

  const filteredChallenges = useMemo(() => {
    const categoryFiltered =
      selectedCategory === "All"
        ? visibilityFilteredChallenges
        : visibilityFilteredChallenges.filter((challenge) =>
            getChallengeCategories(challenge).includes(selectedCategory),
          );
    return filterMyChallenges(categoryFiltered, "all", searchQuery);
  }, [searchQuery, selectedCategory, visibilityFilteredChallenges]);
  const visibilityFilterLabel =
    getChallengeVisibilityFilterLabel(visibilityFilter);
  const activeChallengeIds = useMemo(
    () =>
      activeChallenges
        .map((challenge) => Number(challenge.id))
        .filter((id) => Number.isInteger(id) && id > 0),
    [activeChallenges],
  );
  const privateCrewChallengeIds = useMemo(
    () => activeChallenges
      .filter((challenge) => challenge.isPrivate && challenge.status !== "deleted")
      .map((challenge) => Number(challenge.id))
      .filter((challengeId) => Number.isInteger(challengeId) && challengeId > 0),
    [activeChallenges],
  );
  const crewStatusResults = useChallengeCrewStatuses(
    privateCrewChallengeIds,
    CURRENT_USER_ID > 0 && privateCrewChallengeIds.length > 0,
  );
  const crewStatusByChallengeId = useMemo(
    () => new Map(crewStatusResults.map((result) => [result.challengeId, result])),
    [crewStatusResults],
  );
  const lobbyCrewChallenge = useMemo(
    () => activeChallenges.find((challenge) =>
      challenge.currentOwnerId === CURRENT_USER_ID
      && challenge.isPrivate
      && crewStatusByChallengeId.get(Number(challenge.id))?.data?.state === "LOBBY"
    ),
    [CURRENT_USER_ID, activeChallenges, crewStatusByChallengeId],
  );
  const lobbyCrewChallengeId = Number(lobbyCrewChallenge?.id) || 0;
  const startLobbyMutation = useStartChallengeCrew(lobbyCrewChallengeId);
  const lobbyStartsLater = Boolean(
    lobbyCrewChallenge?.startDate
    && lobbyCrewChallenge.startDate.slice(0, 10) > getCurrentDate(),
  );
  const lobbyStartDateLabel = lobbyStartsLater
    ? new Date(`${lobbyCrewChallenge!.startDate.slice(0, 10)}T00:00:00`).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  useEffect(() => {
    setFavoritePendingIds(new Set());
    setOptimisticFavoriteById({});
  }, [CURRENT_USER_ID]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchMyActive(),
        refetchFavoriteChallenges(),
        refetchInactiveChallenges(),
        refetchCreatedChallenges(),
        ...crewStatusResults.map((result) => result.refetch()),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    crewStatusResults,
    refetchCreatedChallenges,
    refetchFavoriteChallenges,
    refetchInactiveChallenges,
    refetchMyActive,
  ]);

  const handleChallengePress = useCallback((challenge: MappedChallenge) => {
    hapticFeedback.buttonPress();

    router.push({
      pathname: "/challenge-details",
      params: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        duration: challenge.duration,
        numberOfDays: challenge.numberOfDays.toString(),
        challengeMode: challenge.challengeMode || "DAILY",
        proofMode: challenge.proofMode || "PHOTO_REQUIRED",
        status: challenge.status,
        isCreator: challenge.isCreator.toString(),
        isPrivate: challenge.isPrivate ? "true" : "false",
        progress: (
          challenge.completionPercentage ??
          challenge.progress ??
          0
        ).toString(),
        startDate: challenge.startDate,
        createdAt: challenge.createdAt,
        endDate: challenge.endDate || "",
        image: challenge.image || "",
        coverPhotoUrls: JSON.stringify(
          challenge.coverPhotoUrls ||
            (challenge.image ? [challenge.image] : []),
        ),
      },
    });
  }, [router]);

  const handleChallengeRecapPress = useCallback((challenge: MappedChallenge) => {
    hapticFeedback.buttonPress();

    router.push({
      pathname: "/challenge-recap",
      params: {
        challengeId: challenge.id,
        title: challenge.title,
        numberOfDays: challenge.numberOfDays.toString(),
        startDate: challenge.startDate || challenge.createdAt || "",
        challengeMode: challenge.challengeMode || "DAILY",
        readOnly: challenge.participationActive === false ? "true" : "false",
      },
    });
  }, [router]);

  const handleToggleFavorite = useCallback((challenge: MappedChallenge) => {
    const challengeId = Number(challenge.id);
    if (
      !Number.isInteger(challengeId)
      || challengeId <= 0
      || favoritePendingIds.has(challenge.id)
    ) {
      return;
    }

    const previousFavorite = Boolean(challenge.isFavorite);
    const nextFavorite = !previousFavorite;
    hapticFeedback.like();
    setOptimisticFavoriteById((current) => ({
      ...current,
      [challenge.id]: nextFavorite,
    }));
    setFavoritePendingIds((current) => {
      const next = new Set(current);
      next.add(challenge.id);
      return next;
    });

    setChallengeFavorite(
      { challengeId, favorite: nextFavorite },
      {
        onError: (error) => {
          hapticFeedback.actionError();
          Alert.alert(
            "Couldn’t update favourites",
            getApiErrorMessage(error, "Please try again."),
          );
        },
        onSettled: () => {
          setOptimisticFavoriteById((current) => {
            const next = { ...current };
            delete next[challenge.id];
            return next;
          });
          setFavoritePendingIds((current) => {
            const next = new Set(current);
            next.delete(challenge.id);
            return next;
          });
        },
      },
    );
  }, [favoritePendingIds, setChallengeFavorite]);

  const handleNotificationsPress = () => {
    hapticFeedback.buttonPress();
    router.push("/notifications");
  };

  const getChallengeDay = (challenge: MappedChallenge) => {
    if (isOneOffChallengeMode(challenge.challengeMode)) return 1;
    return getChallengeDayFromStartDate(challenge.startDate);
  };

  const submissionStatusResults = useUserChallengeSubmissionStatuses(
    CURRENT_USER_ID,
    activeChallengeIds,
    CURRENT_USER_ID,
    activeChallengeIds.length > 0,
  );

  const submissionStatusByChallengeId = useMemo(() => {
    const statuses = new Map<
      string,
      {
        submittedDays: Set<number>;
        hasData: boolean;
        hasError: boolean;
        isFetching: boolean;
        isLoading: boolean;
      }
    >();

    submissionStatusResults.forEach((result) => {
      const days = new Set<number>();
      (result.data?.submissions || []).forEach((submission) => {
        if (
          typeof submission.dayNumber === "number" &&
          submission.dayNumber > 0
        ) {
          days.add(submission.dayNumber);
        }
      });
      statuses.set(result.challengeId.toString(), {
        submittedDays: days,
        hasData: Boolean(result.data),
        hasError: Boolean(result.error),
        isFetching: result.isFetching,
        isLoading: result.isLoading && !result.data,
      });
    });

    return statuses;
  }, [submissionStatusResults]);

  const isSubmissionStatusLoading = (challenge: MappedChallenge) =>
    !showingPast &&
    (!submissionStatusByChallengeId.has(challenge.id) ||
      submissionStatusByChallengeId.get(challenge.id)?.isLoading);

  const hasUploadedToday = (challenge: MappedChallenge) => {
    const challengeDay = getChallengeDay(challenge);
    return (
      submissionStatusByChallengeId
        .get(challenge.id)
        ?.submittedDays.has(challengeDay) ?? false
    );
  };

  const dailyCompletionSummary = useMemo(() => {
    const activeToday = activeChallenges.filter(
      (challenge) => challenge.status === "active",
    );

    const candidates = activeToday.map((challenge) => {
      const crewStatus = crewStatusByChallengeId.get(Number(challenge.id));
      const crewStatusReady = !challenge.isPrivate || Boolean(
        crewStatus?.data
        && !crewStatus.isLoading
        && !crewStatus.isFetching
        && !crewStatus.error,
      );
      const isDueToday = !challenge.isPrivate || crewStatus?.data?.state === "ACTIVE";
      const submissionStatus = submissionStatusByChallengeId.get(challenge.id);
      const submissionStatusReady = Boolean(
        submissionStatus?.hasData
        && !submissionStatus.isLoading
        && !submissionStatus.isFetching
        && !submissionStatus.hasError,
      );
      const challengeDay = isOneOffChallengeMode(challenge.challengeMode)
        ? 1
        : getChallengeDayFromStartDate(challenge.startDate);

      return {
        isDueToday,
        statusReady: crewStatusReady && (!isDueToday || submissionStatusReady),
        submittedToday: submissionStatus?.submittedDays.has(challengeDay) ?? false,
      };
    });

    return summarizeDailyCompletion(candidates);
  }, [activeChallenges, crewStatusByChallengeId, submissionStatusByChallengeId]);

  const canUploadToday = (challenge: MappedChallenge) => {
    if (challenge.status === "deleted") return false;
    if (challenge.status === "upcoming") return false;
    if (challenge.status === "completed") return false;
    if (challenge.participationActive !== true) return false;
    if (challenge.isPrivate) {
      const crewStatus = crewStatusByChallengeId.get(Number(challenge.id));
      if (!crewStatus?.data || crewStatus.data.state === "LOBBY") return false;
    }
    if (isSubmissionStatusLoading(challenge)) return false;

    return !hasUploadedToday(challenge);
  };
  const pendingSummary = showingPast || showingFavorites
    ? null
    : buildPendingSummary(filteredChallenges, canUploadToday);

  const resetUploadDraft = () => {
    setSelectedMediaAssets([]);
    setUploadCaption("");
    setAuthenticityConfirmed(false);
    setUploadProgress(0);
    setUploadError(null);
  };

  const closeUploadModal = () => {
    resetUploadDraft();
    setSelectedChallenge(null);
    setShowUploadModal(false);
  };

  const handleUploadMedia = (challenge: MappedChallenge) => {
    hapticFeedback.buttonPress();
    if (challenge.isPrivate) {
      const crewStatus = crewStatusByChallengeId.get(Number(challenge.id));
      if (!crewStatus?.data) {
        hapticFeedback.warning();
        Alert.alert(
          "Checking your crew",
          "Open the challenge to confirm whether the creator has started it.",
        );
        return;
      }
      if (crewStatus.data.state === "LOBBY") {
        hapticFeedback.warning();
        Alert.alert(
          challenge.isCreator ? "Start this challenge first" : "Challenge not started yet",
          challenge.isCreator
            ? "Start whenever you are ready—even on your own. You can invite people anytime."
            : "The creator can start this private challenge at any time.",
        );
        return;
      }
    }
    if (challenge.status === "upcoming") {
      hapticFeedback.warning();
      Alert.alert(
        "Not Available",
        "You cannot upload media to upcoming challenges.",
      );
      return;
    }

    if (challenge.status === "deleted") {
      hapticFeedback.warning();
      Alert.alert(
        "Challenge Deleted",
        "This challenge has been deleted and is no longer accepting uploads.",
      );
      return;
    }

    if (challenge.status === "completed") {
      hapticFeedback.warning();
      Alert.alert(
        "Challenge Completed",
        "This challenge has already been completed.",
      );
      return;
    }

    if (isSubmissionStatusLoading(challenge)) {
      hapticFeedback.warning();
      Alert.alert(
        "Please Wait",
        "Checking your latest submission status. Try again in a moment.",
      );
      return;
    }

    if (!canUploadToday(challenge)) {
      if (hasUploadedToday(challenge)) {
        Alert.alert(
          "Already Uploaded",
          "You have already uploaded your submission for today. Come back tomorrow!",
          [{ text: "OK" }],
        );
      } else {
        const currentDate = new Date();
        const startDate = parseCalendarDate(challenge.startDate);
        const endDate = challenge.endDate ? parseCalendarDate(challenge.endDate) : null;

        if (currentDate < startDate) {
          Alert.alert(
            "Challenge Not Started",
            `This challenge starts on ${startDate.toLocaleDateString()}. Please wait until then to upload.`,
            [{ text: "OK" }],
          );
        } else if (endDate && currentDate > endDate) {
          Alert.alert(
            "Challenge Ended",
            `This challenge ended on ${endDate.toLocaleDateString()}.`,
            [{ text: "OK" }],
          );
        }
      }
      return;
    }

    const challengeDay = getChallengeDay(challenge);
    setSelectedChallenge({ ...challenge, currentDay: challengeDay } as any);
    resetUploadDraft();
    hapticFeedback.modalPresent();
    setShowUploadModal(true);
  };

  useEffect(() => {
    if (isLoading || allChallenges.length === 0) {
      return;
    }

    const uploadChallengeId = getRouteParamValue(routeParams.uploadChallengeId);
    const openChallengeId = getRouteParamValue(routeParams.openChallengeId);
    const focusChallengeId = getRouteParamValue(routeParams.focusChallengeId);
    const notificationRouteNonce = getRouteParamValue(routeParams.notificationRouteNonce);
    const targetChallengeId = uploadChallengeId || openChallengeId || focusChallengeId;
    const routeActionKey = `${uploadChallengeId}:${openChallengeId}:${focusChallengeId}:${notificationRouteNonce}`;

    if (
      !targetChallengeId ||
      handledRouteActionRef.current === routeActionKey
    ) {
      return;
    }

    const targetChallenge = allChallenges.find(
      (challenge) => challenge.id === targetChallengeId,
    );
    if (!targetChallenge) {
      return;
    }

    const targetIsPast =
      !uploadChallengeId &&
      pastChallenges.some((challenge) => challenge.id === targetChallengeId);
    const targetList = targetIsPast ? pastChallenges : activeChallenges;
    const targetIndex = targetList.findIndex(
      (challenge) => challenge.id === targetChallengeId,
    );

    handledRouteActionRef.current = routeActionKey;
    setActiveTab(targetIsPast ? "past" : "all");
    setSearchQuery("");

    if (targetIndex >= 0) {
      requestAnimationFrame(() => {
        challengeListRef.current?.scrollToIndex({
          index: targetIndex,
          animated: true,
          viewPosition: 0.18,
        });
      });
    }

    if (uploadChallengeId) {
      requestAnimationFrame(() => handleUploadMedia(targetChallenge));
    } else if (openChallengeId) {
      requestAnimationFrame(() => handleChallengePress(targetChallenge));
    }
  }, [
    activeChallenges,
    allChallenges,
    handleChallengePress,
    handleUploadMedia,
    isLoading,
    pastChallenges,
    routeParams.focusChallengeId,
    routeParams.notificationRouteNonce,
    routeParams.openChallengeId,
    routeParams.uploadChallengeId,
  ]);

  const submitUpload = async () => {
    if (
      selectedMediaAssets.length === 0 ||
      !uploadCaption.trim() ||
      !selectedChallenge
    ) {
      hapticFeedback.warning();
      setUploadError("Please select at least one photo and add a short check-in.");
      return;
    }

    if (!authenticityConfirmed) {
      hapticFeedback.warning();
      setUploadError("Please confirm this reflects today's real effort before uploading.");
      return;
    }

    const challengeDay = (selectedChallenge as any).currentDay ?? 1;

    try {
      hapticFeedback.buttonPress();
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      // 1. Upload media to S3 via presigned URL
      const mediaUrls = selectedMediaAssets.length > 0
        ? await uploadSubmissionMedia(
            CURRENT_USER_ID,
            selectedMediaAssets,
            setUploadProgress,
          )
        : [];
      // 2. Create submission record in backend
      await createSubmissionMutation.mutateAsync({
        userId: CURRENT_USER_ID,
        challengeId: Number(selectedChallenge.id),
        dayNumber: challengeDay,
        description: uploadCaption.trim(),
        mediaUrls,
      });

      const refreshedChallenges = await refetchMyActive().catch(() => undefined);
      const refreshedChallenge = refreshedChallenges?.data?.challenges.find(
        (challenge) => challenge.id === Number(selectedChallenge.id),
      );
      const refreshedRank = selectedChallenge.isPrivate
        ? refreshedChallenge?.privateRank
        : undefined;
      const rankUpdate = refreshedRank?.rank
        && refreshedRank.totalParticipants >= 2
        ? `\n\nYou’re now #${refreshedRank.rank}.`
        : '';

      setSubmissionRevision((revision) => revision + 1);

      hapticFeedback.uploadComplete();
      Alert.alert(
        "Success",
        isOneOffChallengeMode(selectedChallenge.challengeMode)
          ? `Submission uploaded to "${selectedChallenge.title}".`
          : `Day ${challengeDay} submission uploaded to "${selectedChallenge.title}"!${rankUpdate}\n\nCome back tomorrow for your next upload.`,
      );

      // Reset states
      closeUploadModal();
    } catch (err: any) {
      hapticFeedback.actionError();
      setUploadError(
        getApiErrorMessage(err, "Failed to upload your submission. Please try again."),
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const goToGlobal = () => {
    hapticFeedback.buttonPress();
    router.push("/(tabs)/global");
  };

  const goToCreateChallenge = () => {
    hapticFeedback.buttonPress();
    router.push("/(tabs)/create");
  };

  const openInviteCodeModal = () => {
    hapticFeedback.buttonPress();
    setInviteCode("");
    setInviteCodeError("");
    setShowInviteCodeModal(true);
  };

  const joinWithInviteCode = () => {
    const normalizedCode = normalizeInviteCode(inviteCode);
    if (!normalizedCode) {
      hapticFeedback.warning();
      setInviteCodeError("Enter the 8–12 character code from your invitation.");
      return;
    }

    hapticFeedback.buttonPress();
    setShowInviteCodeModal(false);
    router.push(`/invite/${normalizedCode}` as Href);
  };

  const inviteCrewToChallenge = () => {
    if (!lobbyCrewChallenge) return;
    hapticFeedback.buttonPress();
    router.push({
      pathname: "/challenge-details",
      params: {
        id: lobbyCrewChallenge.id,
        title: lobbyCrewChallenge.title,
        isCreator: lobbyCrewChallenge.isCreator.toString(),
        isPrivate: "true",
        openInviteModal: "true",
      },
    });
  };

  const startLobbyChallenge = () => {
    if (!lobbyCrewChallenge || lobbyCrewChallengeId <= 0 || startLobbyMutation.isPending) return;
    hapticFeedback.buttonPress();
    startLobbyMutation.mutate(undefined, {
      onError: (error) => {
        hapticFeedback.actionError();
        Alert.alert(
          "Could not start challenge",
          getApiErrorMessage(error, "Please try again."),
        );
      },
    });
  };

  const renderChallengeItem = ({ item }: { item: MappedChallenge }) => (
    <View style={styles.galleryCell}>
      <MyChallengeGalleryCard
        challenge={item}
        crewState={crewStatusByChallengeId.get(Number(item.id))?.data?.state}
        crewAcceptedCount={crewStatusByChallengeId.get(Number(item.id))?.data?.acceptedCount}
        crewStateManaged={Boolean(item.isPrivate)}
        onPress={() => handleChallengePress(item)}
        onRecapPress={handleChallengeRecapPress}
        onToggleFavorite={handleToggleFavorite}
        favoritePending={favoritePendingIds.has(item.id)}
      />
    </View>
  );

  const renderTabButton = (tab: MyChallengeFilter, label: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => switchTab(tab)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: activeTab === tab }}
    >
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Hey {greetingName} !
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Welcome
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, styles.notificationButton]}
            onPress={handleNotificationsPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
          >
            <Ionicons name="notifications-outline" size={20} color="#18142F" />
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>
                  {unreadNotifications > 9
                    ? "9+"
                    : unreadNotifications.toString()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.joinCodeHeaderButton}
            onPress={openInviteCodeModal}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Join a challenge with an invite code"
          >
            <Ionicons name="key-outline" size={15} color="#4700EC" />
            <Text style={styles.joinCodeHeaderText} numberOfLines={1}>
              Join code
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, styles.createButton]}
            onPress={goToCreateChallenge}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Create a challenge"
          >
            <Ionicons name="add" size={21} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#737373" />
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor="#9A9A9A"
            value={searchQuery}
            onChangeText={setSearchQuery}
            maxLength={100}
            accessibilityLabel={searchPlaceholder}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery("")}
              accessibilityRole="button"
              accessibilityLabel="Clear challenge search"
            >
              <Ionicons name="close-circle" size={18} color="#8A8A8A" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabFilterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabGroupScroll}
          contentContainerStyle={styles.tabGroup}
        >
          {renderTabButton("all", `Active ${activeCount}`)}
          {renderTabButton("created", `Created ${createdCount}`)}
          {renderTabButton("favorites", `Favourites ${favoriteCount}`)}
          {renderTabButton("past", `Past ${pastCount}`)}
        </ScrollView>
        <ChallengeVisibilityDropdown
          value={visibilityFilter}
          onChange={(nextFilter) => {
            hapticFeedback.selection();
            setVisibilityFilter(nextFilter);
          }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFilterContent}
        style={styles.categoryFilterScroll}
      >
        {categoryOptions.map((category) => {
          const active = selectedCategory === category;
          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryFilterChip,
                active && styles.categoryFilterChipActive,
              ]}
              onPress={() => {
                hapticFeedback.selection();
                setSelectedCategory(category);
              }}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.categoryFilterText,
                  active && styles.categoryFilterTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading && !refreshing ? (
        <ChallengeGallerySkeleton />
      ) : userChallengesError ? (
        <View style={styles.stateContainer}>
          <View style={styles.stateIcon}>
            <Ionicons name="cloud-offline-outline" size={28} color="#4700EC" />
          </View>
          <Text style={styles.stateTitle}>Couldn’t load challenges</Text>
          <Text style={styles.stateText}>
            {getApiErrorMessage(
              userChallengesError,
              "Pull to refresh or try again.",
            )}
          </Text>
          <TouchableOpacity
            style={styles.primaryStateAction}
            onPress={onRefresh}
            accessibilityRole="button"
          >
            <Text style={styles.primaryStateActionText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={challengeListRef}
          key={`${activeTab}-${selectedCategory}-feed`}
          extraData={`${visibilityFilter}:${Array.from(favoritePendingIds).sort().join(",")}`}
          data={filteredChallenges}
          renderItem={renderChallengeItem}
          keyExtractor={(item) => item.id}
          numColumns={1}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          updateCellsBatchingPeriod={50}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8F6BFF"
              colors={["#4700EC"]}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {!showingPast && !showingFavorites && dailyCompletionSummary ? (
                <DailyCompletionBanner
                  completedCount={dailyCompletionSummary.completedCount}
                />
              ) : pendingSummary ? (
                <PendingChallengeStack
                  summary={pendingSummary}
                  onUpload={handleUploadMedia}
                  onOpenChallenge={handleChallengePress}
                />
              ) : null}
              {!showingPast && !showingFavorites && lobbyCrewChallenge && (
                <View style={styles.crewBanner}>
                  <View style={styles.crewBannerIcon}>
                    <Ionicons
                      name={lobbyStartsLater ? "calendar-outline" : "play-circle-outline"}
                      size={20}
                      color="#4700EC"
                    />
                  </View>
                  <View style={styles.crewBannerCopy}>
                    <Text style={styles.crewBannerTitle}>
                      {lobbyStartsLater ? "Scheduled" : "Ready to begin"}
                    </Text>
                    <Text style={styles.crewBannerText} numberOfLines={2}>
                      {lobbyStartsLater
                        ? `${lobbyCrewChallenge.title} starts ${lobbyStartDateLabel}. Invite people now or open it to review.`
                        : `Start ${lobbyCrewChallenge.title} now. Invite people whenever you want.`}
                    </Text>
                  </View>
                  <View style={styles.crewBannerActions}>
                    <TouchableOpacity
                      style={styles.crewBannerButton}
                      onPress={lobbyStartsLater
                        ? () => handleChallengePress(lobbyCrewChallenge)
                        : startLobbyChallenge}
                      feedbackTiming="after-paint"
                      disabled={!lobbyStartsLater && startLobbyMutation.isPending}
                      activeOpacity={0.84}
                      accessibilityRole="button"
                      accessibilityLabel={`${lobbyStartsLater ? "Open" : "Start"} ${lobbyCrewChallenge.title}`}
                    >
                      {!lobbyStartsLater && startLobbyMutation.isPending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.crewBannerButtonText}>
                          {lobbyStartsLater ? "Open" : "Start"}
                        </Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.crewBannerButton, styles.crewBannerInviteButton]}
                      onPress={inviteCrewToChallenge}
                      activeOpacity={0.84}
                      accessibilityRole="button"
                      accessibilityLabel={`Bring people into ${lobbyCrewChallenge.title}`}
                    >
                      <Text style={styles.crewBannerInviteButtonText}>Invite</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <View style={styles.galleryHeading}>
                <Text style={styles.galleryHeadingText}>
                  {showingFavorites
                    ? "Favourite challenges"
                    : showingPast
                      ? "Challenge archive"
                      : showingCreated
                        ? "Created challenges"
                        : "Your challenges"}
                </Text>
                <Text style={styles.galleryCount}>
                  {showingFavorites
                    ? `${favoriteCount} saved`
                    : showingPast
                      ? `${pastChallenges.length} past`
                      : showingCreated
                        ? `${createdCount} created`
                        : `${activeChallenges.length} of 10 active`}
                </Text>
              </View>
            </View>
          }
          ListFooterComponent={
            <View>
              {isFetchingNextCreatedChallengesPage && (
                <ActivityIndicator
                  color="#8F6BFF"
                  style={styles.footerLoader}
                />
              )}
            </View>
          }
          onEndReached={() => {
            if (
              hasNextCreatedChallengesPage &&
              !isFetchingNextCreatedChallengesPage
            ) {
              fetchNextCreatedChallengesPage();
            }
          }}
          onEndReachedThreshold={0.4}
          onScrollToIndexFailed={({ averageItemLength, index }) => {
            challengeListRef.current?.scrollToOffset({
              offset: Math.max(0, averageItemLength * index),
              animated: true,
            });
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.stateIcon}>
                <Ionicons
                  name={showingFavorites
                    ? "heart-outline"
                    : showingPast
                      ? "archive-outline"
                      : "sparkles-outline"}
                  size={28}
                  color="#4700EC"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery.trim()
                  ? "No matching challenges"
                  : visibilityFilter !== "all"
                    ? `No ${visibilityFilterLabel.toLowerCase()} challenges`
                    : showingFavorites
                      ? favoriteCount === 0
                        ? "No favourite challenges"
                        : selectedCategory !== "All"
                          ? `No saved ${selectedCategory} challenges`
                          : "No favourite challenges"
                      : showingPast
                        ? "No past challenges"
                        : activeTab === "created"
                          ? "Nothing created yet"
                          : selectedCategory !== "All"
                            ? `No ${selectedCategory} challenges`
                            : "Start your first challenge"}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery.trim()
                  ? "Try a different name, category, or visibility."
                  : visibilityFilter !== "all"
                    ? "Switch the visibility filter back to All."
                    : showingFavorites
                      ? favoriteCount === 0
                        ? "Tap the heart on any challenge to keep it handy here."
                        : selectedCategory !== "All"
                          ? "Try another category or switch back to All."
                          : "Tap the heart on a challenge to keep it handy here."
                      : showingPast
                        ? "Completed and left challenges will appear here."
                        : showingCreated
                          ? "Challenges you create will stay here, even after you stop participating."
                          : selectedCategory !== "All"
                            ? "Try another category or switch back to All."
                            : "Begin on your own, or invite people to keep each other going."}
              </Text>
              {searchQuery.trim() ? (
                <TouchableOpacity
                  style={styles.secondaryStateAction}
                  onPress={() => setSearchQuery("")}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryStateActionText}>
                    Clear search
                  </Text>
                </TouchableOpacity>
              ) : !showingPast && !showingFavorites ? (
                <View style={styles.emptyActions}>
                  <TouchableOpacity
                    style={styles.primaryStateAction}
                    onPress={goToCreateChallenge}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="play-circle-outline"
                      size={17}
                      color="#FFFFFF"
                    />
                    <Text style={styles.primaryStateActionText}>Create challenge</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryStateAction}
                    onPress={openInviteCodeModal}
                    accessibilityRole="button"
                  >
                    <Ionicons name="key-outline" size={16} color="#4700EC" />
                    <Text style={styles.secondaryStateActionText}>
                      Join with a code
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.exploreStateAction}
                    onPress={goToGlobal}
                    accessibilityRole="button"
                  >
                    <Text style={styles.exploreStateActionText}>Explore global challenges</Text>
                    <Ionicons name="arrow-forward" size={14} color="#737373" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          }
        />
      )}

      <Modal
        visible={showInviteCodeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteCodeModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.inviteCodeOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.inviteCodeCard}>
            <View style={styles.inviteCodeIcon}>
              <Ionicons name="key-outline" size={22} color="#4700EC" />
            </View>
            <Text style={styles.inviteCodeTitle}>Join a challenge</Text>
            <Text style={styles.inviteCodeSubtitle}>
              Enter the code from any challenge invitation. Codes are case-sensitive.
            </Text>
            <TextInput
              style={[styles.inviteCodeInput, inviteCodeError && styles.inviteCodeInputError]}
              value={inviteCode}
              onChangeText={(value) => {
                setInviteCode(value);
                if (inviteCodeError) setInviteCodeError("");
              }}
              placeholder="Invite code"
              placeholderTextColor="#9A9A9A"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={12}
              returnKeyType="join"
              onSubmitEditing={joinWithInviteCode}
              autoFocus
              accessibilityLabel="Challenge invite code"
            />
            {inviteCodeError ? (
              <Text style={styles.inviteCodeError}>{inviteCodeError}</Text>
            ) : null}
            <View style={styles.inviteCodeActions}>
              <TouchableOpacity
                style={styles.inviteCodeCancel}
                onPress={() => setShowInviteCodeModal(false)}
              >
                <Text style={styles.inviteCodeCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.inviteCodeJoin} onPress={joinWithInviteCode}>
                <Text style={styles.inviteCodeJoinText}>Open invite</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Upload Media Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeUploadModal}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          enabled={Platform.OS === "ios"}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
            <SubmissionUploadHeader
              challengeName={selectedChallenge?.title || "Challenge"}
              dayLabel={
                isOneOffChallengeMode(selectedChallenge?.challengeMode)
                  ? "One-off"
                  : `Day ${(selectedChallenge as any)?.currentDay ?? 1}`
              }
              dateLabel={getCurrentDate()}
              onClose={() => {
                hapticFeedback.modalDismiss();
                closeUploadModal();
              }}
              closeDisabled={isUploading}
            />

            <SubmissionComposer
              challengeName={selectedChallenge?.title || "Challenge"}
              dayLabel={
                isOneOffChallengeMode(selectedChallenge?.challengeMode)
                  ? "One-off challenge"
                  : `Day ${(selectedChallenge as any)?.currentDay ?? 1}`
              }
              assets={selectedMediaAssets}
              onAssetsChange={setSelectedMediaAssets}
              caption={uploadCaption}
              onCaptionChange={setUploadCaption}
              onSubmit={submitUpload}
              isSubmitting={isUploading}
              uploadProgress={uploadProgress}
              confirmed={authenticityConfirmed}
              onConfirmedChange={setAuthenticityConfirmed}
              requireConfirmation
              proofMode={selectedChallenge?.proofMode}
              errorMessage={uploadError}
              onErrorChange={setUploadError}
            />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  skeletonHeading: {
    marginTop: 22,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skeletonGrid: {
    gap: 12,
  },
  header: {
    minHeight: 66,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  titleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginRight: 8,
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: "#171717",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  headerSubtitle: {
    color: "#737373",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexShrink: 0,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7e7e7",
  },
  notificationButton: {
    position: "relative",
  },
  joinCodeHeaderButton: {
    height: 42,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 11,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#DDD4FF",
  },
  joinCodeHeaderText: {
    color: "#4700EC",
    fontSize: 10,
    fontWeight: "700",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4700EC",
    borderWidth: 2,
    borderColor: "#f7f7f7",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },
  createButton: {
    backgroundColor: "#4700EC",
    borderColor: "#8F6BFF",
    shadowColor: "#4700EC",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 5,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  searchBar: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e3e3e3",
  },
  searchInput: {
    flex: 1,
    color: "#171717",
    fontSize: 13,
    padding: 0,
  },
  clearSearchButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  tabFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 7,
    paddingBottom: 9,
    zIndex: 10,
    elevation: 10,
  },
  tabGroupScroll: {
    flex: 1,
    minWidth: 0,
  },
  tabGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingRight: 4,
  },
  tabButton: {
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTabButton: {
    backgroundColor: "#F0ECFF",
  },
  tabText: {
    color: "#737373",
    fontSize: 11,
    fontWeight: "700",
  },
  activeTabText: {
    color: "#4700EC",
  },
  categoryFilterScroll: {
    flexGrow: 0,
    minHeight: 48,
    marginTop: -2,
    marginBottom: 6,
    paddingTop: 2,
    paddingBottom: 2,
    overflow: "visible",
  },
  categoryFilterContent: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 1,
    paddingBottom: 10,
    gap: 8,
  },
  categoryFilterChip: {
    minHeight: 34,
    paddingHorizontal: 13,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e3e3e3",
  },
  categoryFilterChipActive: {
    backgroundColor: "#F0ECFF",
    borderColor: "#4700EC",
  },
  categoryFilterText: {
    color: "#737373",
    fontSize: 11,
    fontWeight: "700",
  },
  categoryFilterTextActive: {
    color: "#4700EC",
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 3,
    paddingBottom: 36,
  },
  listHeader: {
    marginBottom: 10,
  },
  crewBanner: {
    minHeight: 82,
    marginBottom: 3,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 20,
    backgroundColor: "#F0ECFF",
    borderWidth: 1,
    borderColor: "#DDD4FF",
  },
  crewBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  crewBannerCopy: {
    flex: 1,
    minWidth: 0,
  },
  crewBannerTitle: {
    color: "#171717",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
  },
  crewBannerText: {
    marginTop: 3,
    color: "#696969",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "600",
  },
  crewBannerActions: {
    gap: 6,
  },
  crewBannerButton: {
    minHeight: 36,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#4700EC",
  },
  crewBannerButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  crewBannerInviteButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#DDD4FF",
  },
  crewBannerInviteButtonText: {
    color: "#4700EC",
    fontSize: 10,
    fontWeight: "700",
  },
  galleryHeading: {
    minHeight: 42,
    marginTop: 13,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  galleryHeadingText: {
    color: "#171717",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  galleryCount: {
    color: "#737373",
    fontSize: 10,
    fontWeight: "600",
  },
  galleryCell: {
    width: "100%",
    marginBottom: 12,
  },
  footerLoader: {
    marginVertical: 16,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 54,
    paddingHorizontal: 20,
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0ECFF",
    borderWidth: 1,
    borderColor: "#DDD4FF",
    marginBottom: 15,
  },
  stateTitle: {
    color: "#171717",
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "700",
    textAlign: "center",
  },
  stateText: {
    color: "#737373",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 7,
  },
  primaryStateAction: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#4700EC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 18,
  },
  primaryStateActionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "700",
    color: "#171717",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 12,
    color: "#737373",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 7,
  },
  emptyActions: {
    width: "100%",
    alignItems: "center",
    gap: 0,
  },
  secondaryStateAction: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2deea",
    marginTop: 18,
    flexDirection: "row",
    gap: 7,
  },
  secondaryStateActionText: {
    color: "#4700EC",
    fontSize: 12,
    fontWeight: "700",
  },
  exploreStateAction: {
    minHeight: 38,
    marginTop: 5,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  exploreStateActionText: {
    color: "#737373",
    fontSize: 11,
    fontWeight: "700",
  },
  inviteCodeOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    backgroundColor: "rgba(0, 0, 0, 0.44)",
  },
  inviteCodeCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e3e3e3",
  },
  inviteCodeIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ededed",
  },
  inviteCodeTitle: {
    marginTop: 14,
    color: "#171717",
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "700",
  },
  inviteCodeSubtitle: {
    marginTop: 5,
    color: "#737373",
    fontSize: 12,
    lineHeight: 18,
  },
  inviteCodeInput: {
    height: 50,
    marginTop: 17,
    paddingHorizontal: 15,
    borderRadius: 16,
    color: "#171717",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1.2,
    backgroundColor: "#f8f7fc",
    borderWidth: 1,
    borderColor: "#dadada",
  },
  inviteCodeInputError: {
    borderColor: "#5a5a5a",
  },
  inviteCodeError: {
    marginTop: 7,
    color: "#333333",
    fontSize: 11,
    lineHeight: 15,
  },
  inviteCodeActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 9,
    marginTop: 18,
  },
  inviteCodeCancel: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#efefef",
  },
  inviteCodeCancelText: {
    color: "#606060",
    fontSize: 12,
    fontWeight: "700",
  },
  inviteCodeJoin: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#4700EC",
  },
  inviteCodeJoinText: {
    color: "#ffffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8F7FC",
  },
  uploadModalScroll: {
    flex: 1,
  },
  uploadModalContent: {
    padding: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#171717",
    marginBottom: 12,
  },
  mediaOptionsContainer: {
    marginBottom: 24,
  },
  mediaButtonsRow: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-around",
  },
  mediaOptionButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e3e3e3",
    gap: 8,
  },
  mediaOptionText: {
    fontSize: 13,
    color: "#171717",
    fontWeight: "500",
  },
  mediaPreviewContainer: {
    marginBottom: 24,
  },
  mediaPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mediaPreviewActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  changeMediaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#4700EC18",
  },
  changeMediaText: {
    color: "#4700EC",
    fontSize: 11,
    fontWeight: "700",
  },
  clearMediaButton: {
    padding: 4,
  },
  selectedMediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  selectedMediaBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.66)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  selectedMediaBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  mediaPreview: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    backgroundColor: "#ececec",
  },
  captionContainer: {
    marginBottom: 24,
  },
  captionInput: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    color: "#171717",
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#e3e3e3",
  },
  captionCounter: {
    color: "#737373",
    fontSize: 11,
    textAlign: "right",
    marginTop: 6,
  },
  authenticityCard: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#f4f4f4",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.12)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 3,
  },
  authenticityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  authenticityIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6DEFF",
  },
  authenticityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333333",
    letterSpacing: 0.2,
  },
  authenticityText: {
    fontSize: 12,
    lineHeight: 20,
    color: "#5c5c5c",
  },
  authenticityCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  authenticityCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#8a8a8a",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  authenticityCheckboxChecked: {
    backgroundColor: "#4700EC",
    borderColor: "#4700EC",
  },
  authenticityCheckboxLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#444444",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4700EC",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
});

export default Challenges;
