import { AppAlert as Alert } from "@/utils/appAlert";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system/legacy";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppTouchableOpacity as TouchableOpacity } from "@/components/common/AppPressable";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import {
  getChallengeDayFromStartDate,
  getChallengeStatusFromDates,
  getDateOnly,
} from "../components/common/ChallengeCard";
import {
  SkeletonBlock,
  useSkeletonShimmer,
} from "../components/common/Skeleton";
import SubmissionComposer from "../components/common/SubmissionComposer";
import SubmissionUploadHeader from "../components/common/SubmissionUploadHeader";
import {
  useChallenge,
  useChallengeParticipants,
  useCreateSubmission,
  useUserChallengeSubmissions,
} from "../hooks/useChallenges";
import {
  useSubmissionMediaUpload,
  type ImagePickerAsset,
} from "../hooks/useMedia";
import { useSignedMediaRecovery } from "../hooks/useSignedMediaRecovery";
import { useAuthContext } from "../providers/AuthProvider";
import { Submission } from "../types/api";
import { isOneOffChallengeMode } from "../utils/challengeMode";
import { formatSubmissionDaysValue } from "../utils/challengeSubmissionStats";
import {
  createMemoirCaptureData,
  isMemoirPhotoUrl,
  normalizeCapturedFileUri,
  parseMemoirMediaUrls,
  type MemoirCaptureData,
} from "../utils/memoirCollage";
import { challengeService } from "../services/challengeService";
import { createCachedRemoteImageSource } from "../utils/remoteImageCache";
import { buildSubmissionDetailRouteParams } from "../utils/submissionDetail";
import { getApiErrorMessage } from "../utils/apiError";
import { toLocalCalendarDate } from "../utils/deviceTime";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MEMOIR_RENDER_WIDTH = 360;
const MEMOIR_OUTPUT_WIDTH = 1080;
const MEMOIR_STAGE_WIDTH = 332;
const MEMOIR_GRID_TOP = 144;
const MEMOIR_FOOTER_SPACE = 86;
const MEMOIR_PAGE_SIZE = 100;

type MemoirDateField = "start" | "end";

type MemoirGridMetrics = {
  columns: number;
  gap: number;
  tileWidth: number;
  tileHeight: number;
  gridHeight: number;
};

function getMemoirGridMetrics(photoCount: number): MemoirGridMetrics {
  if (photoCount <= 1) {
    return {
      columns: 1,
      gap: 0,
      tileWidth: MEMOIR_STAGE_WIDTH,
      tileHeight: 220,
      gridHeight: 220,
    };
  }

  const columns = photoCount <= 6 ? 2 : 3;
  const gap = 4;
  const tileWidth = (MEMOIR_STAGE_WIDTH - gap * (columns - 1)) / columns;
  const tileHeight = columns === 2 ? 142 : 100;
  const rows = Math.ceil(photoCount / columns);

  return {
    columns,
    gap,
    tileWidth,
    tileHeight,
    gridHeight: rows * tileHeight + Math.max(0, rows - 1) * gap,
  };
}

function getMemoirRenderHeight(photoCount: number) {
  const contentHeight = photoCount > 0
    ? getMemoirGridMetrics(photoCount).gridHeight
    : 190;
  return Math.max(450, MEMOIR_GRID_TOP + contentHeight + MEMOIR_FOOTER_SPACE);
}

function formatDate(dateInput: string | Date) {
  if (!dateInput) return "";
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCompactDate(date: Date) {
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getMemoirSubmissionDate(submission: Submission) {
  const date = new Date(submission.submissionTime || submission.createdAt || "");
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMemoirDateBounds(submissions: Submission[]) {
  const dates = submissions
    .map(getMemoirSubmissionDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) {
    const today = new Date();
    return { start: today, end: today };
  }

  return { start: dates[0], end: dates[dates.length - 1] };
}

function startOfMemoirDate(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfMemoirDate(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function filterMemoirSubmissionsByDate(
  submissions: Submission[],
  startDate: Date,
  endDate: Date,
) {
  const startTime = startOfMemoirDate(startDate).getTime();
  const endTime = endOfMemoirDate(endDate).getTime();

  return submissions.filter((submission) => {
    const date = getMemoirSubmissionDate(submission);
    if (!date) return false;
    const time = date.getTime();
    return time >= startTime && time <= endTime;
  });
}

function formatMemoirDateRange(startDate: Date, endDate: Date) {
  const start = formatCompactDate(startDate);
  const end = formatCompactDate(endDate);
  return start === end ? start : `${start} – ${end}`;
}

function countMemoirPhotos(submissions: Submission[]) {
  return submissions.reduce((count, submission) => (
    count + parseMemoirMediaUrls(submission.mediaUrls as string | string[] | undefined)
      .filter(isMemoirPhotoUrl)
      .length
  ), 0);
}

function getChallengeDayDate(startDateStr: string, day: number) {
  if (!startDateStr || day <= 0) return "";
  const date = getDateOnly(startDateStr);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + day - 1);
  return formatCompactDate(date);
}

function getChallengeDayCalendarDate(startDateStr: string, day: number) {
  if (!startDateStr || day <= 0) return toLocalCalendarDate(new Date());
  const date = getDateOnly(startDateStr);
  if (Number.isNaN(date.getTime())) return toLocalCalendarDate(new Date());
  date.setDate(date.getDate() + day - 1);
  return toLocalCalendarDate(date);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ChallengeSubmissionsScreen() {
  const recoverSignedMedia = useSignedMediaRecovery();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUserId, user } = useAuthContext();
  const challengeId = Number(params.challengeId) || 0;
  const targetUserId =
    Number(params.userId || params.targetUserId) || currentUserId;
  const targetUsername = ((params.username as string) || "").replace(/^@/, "");
  const isOwnTimeline = targetUserId === currentUserId;
  const isReadOnly = params.readOnly === "true" || !isOwnTimeline;
  const autoUploadDay = Number(params.autoUploadDay) || null;
  const autoUploadStartedRef = useRef(false);
  const autoMemoirOpenedRef = useRef(false);
  const { data: challengeData, refetch: refetchChallenge } = useChallenge(
    challengeId,
    currentUserId,
  );
  const {
    data: participantsData,
    isLoading: loadingParticipants,
    refetch: refetchParticipants,
  } = useChallengeParticipants(challengeId);
  const challengeTitle =
    challengeData?.title || (params.title as string) || "Challenge";
  const challengeMode =
    challengeData?.challengeMode || (params.challengeMode as string) || "DAILY";
  const proofMode =
    challengeData?.proofMode || (params.proofMode as string) || "PHOTO_REQUIRED";
  const isOneOff = isOneOffChallengeMode(challengeMode);
  const numberOfDays = isOneOff
    ? 1
    : challengeData?.numberOfDays || Number(params.numberOfDays) || 0;
  const startDateStr =
    challengeData?.startDate ||
    (params.startDate as string) ||
    challengeData?.createdAt ||
    "";
  const detailMembership = challengeData?.isJoined ?? challengeData?.joined;
  const isParticipant = detailMembership
    ?? (participantsData !== undefined
      && (participantsData.participants || []).some(
        (participant) => participant.id === currentUserId,
      ));
  const challengeStatus = useMemo(
    () =>
      isOneOff
        ? challengeData?.active === false
          ? "deleted"
          : "active"
        : getChallengeStatusFromDates(
            startDateStr,
            numberOfDays,
            challengeData?.active,
          ),
    [startDateStr, numberOfDays, challengeData?.active, isOneOff],
  );
  const challengeDateRange = useMemo(() => {
    if (isOneOff) return "One-off";
    if (!startDateStr) return "";
    const start = new Date(startDateStr);
    if (Number.isNaN(start.getTime())) return "";
    if (numberOfDays > 1) {
      const end = new Date(start);
      end.setDate(end.getDate() + numberOfDays - 1);
      return `${formatDate(start)} - ${formatDate(end)}`;
    }
    return formatDate(start);
  }, [startDateStr, numberOfDays, isOneOff]);

  // Current challenge day (1-based)
  const currentDay = useMemo(() => {
    return startDateStr ? getChallengeDayFromStartDate(startDateStr) : 0;
  }, [startDateStr]);

  const { data, isLoading, error, refetch } = useUserChallengeSubmissions(
    targetUserId,
    challengeId,
    currentUserId,
    1,
    MEMOIR_PAGE_SIZE,
  );

  // Upload state
  const { uploadSubmissionMedia } = useSubmissionMediaUpload();
  const createSubmissionMutation = useCreateSubmission();
  const [uploadingDay, setUploadingDay] = useState<number | null>(null);
  const [uploadMediaAssets, setUploadMediaAssets] = useState<
    ImagePickerAsset[]
  >([]);
  const [uploadCaption, setUploadCaption] = useState("");
  const [authenticityConfirmed, setAuthenticityConfirmed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isUploadModalVisible = uploadingDay !== null;
  const [isGeneratingCollage, setIsGeneratingCollage] = useState(false);
  const [isPreparingMemoirRange, setIsPreparingMemoirRange] = useState(false);
  const [showMemoirRangeModal, setShowMemoirRangeModal] = useState(false);
  const [memoirRangeSubmissions, setMemoirRangeSubmissions] = useState<Submission[]>([]);
  const [memoirRangeStart, setMemoirRangeStart] = useState<Date | null>(null);
  const [memoirRangeEnd, setMemoirRangeEnd] = useState<Date | null>(null);
  const [activeMemoirDateField, setActiveMemoirDateField] =
    useState<MemoirDateField | null>(null);
  const memoirCaptureRef = useRef<View>(null);
  const memoirCapturePromiseRef = useRef<{
    resolve: (uri: string) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const [memoirCaptureData, setMemoirCaptureData] =
    useState<MemoirCaptureData | null>(null);
  const [memoirLoadedImages, setMemoirLoadedImages] = useState(0);

  const memoirUsername = useMemo(() => {
    const username = (isOwnTimeline ? user?.username : targetUsername)
      || targetUsername
      || user?.username
      || "challenger";
    return `@${username.replace(/^@+/, "")}`;
  }, [isOwnTimeline, targetUsername, user?.username]);

  // Group submissions by dayNumber
  const submissionMap = useMemo(() => {
    const submissions: Submission[] = data?.submissions || [];
    const map = new Map<number, Submission[]>();
    for (const s of submissions) {
      const day = s.dayNumber ?? 0;
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(s);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          new Date(b.submissionTime).getTime() -
          new Date(a.submissionTime).getTime(),
      );
    }
    return map;
  }, [data]);

  const collageSubmissionCount = useMemo(() => {
    const submissions: Submission[] = data?.submissions || [];
    return data?.totalCount ?? submissions.length;
  }, [data]);

  const hasCollageSubmissions = isOwnTimeline && collageSubmissionCount > 0;
  const summaryDaysValue = useMemo(
    () => formatSubmissionDaysValue(data?.submissions || [], numberOfDays),
    [data?.submissions, numberOfDays],
  );
  const memoirDateBounds = useMemo(
    () => getMemoirDateBounds(memoirRangeSubmissions),
    [memoirRangeSubmissions],
  );
  const selectedMemoirSubmissions = useMemo(() => {
    if (!memoirRangeStart || !memoirRangeEnd) return [];
    return filterMemoirSubmissionsByDate(
      memoirRangeSubmissions,
      memoirRangeStart,
      memoirRangeEnd,
    );
  }, [memoirRangeEnd, memoirRangeStart, memoirRangeSubmissions]);
  const selectedMemoirPhotoCount = useMemo(
    () => countMemoirPhotos(selectedMemoirSubmissions),
    [selectedMemoirSubmissions],
  );

  const canUploadAtAll =
    !isReadOnly &&
    isOwnTimeline &&
    currentUserId > 0 &&
    isParticipant &&
    challengeStatus !== "upcoming" &&
    challengeData?.active !== false;

  const canUploadForDay = useCallback(
    (day: number) => {
      if (!canUploadAtAll) return false;
      if (day < 1) return false;
      if (isOneOff) return day === 1 && !submissionMap.has(1);
      if (numberOfDays > 0 && day > numberOfDays) return false;
      if (currentDay <= 0) return false;
      if (day < Math.max(1, currentDay - 1) || day > currentDay) return false;
      return !submissionMap.has(day);
    },
    [canUploadAtAll, isOneOff, numberOfDays, currentDay, submissionMap],
  );

  const ensureCanUpload = useCallback(
    (day?: number, onError?: (message: string) => void) => {
      const reportUnavailable = (title: string, message: string) => {
        if (onError) {
          onError(message);
        } else {
          Alert.alert(title, message);
        }
      };

      if (currentUserId <= 0) {
        reportUnavailable(
          "Sign In Required",
          "Please sign in to upload submissions.",
        );
        return false;
      }
      if (!isParticipant) {
        reportUnavailable(
          "Join Required",
          "You must join this challenge before you can upload a submission.",
        );
        return false;
      }
      if (challengeStatus === "upcoming") {
        reportUnavailable(
          "Challenge Not Started",
          "This challenge has not started yet.",
        );
        return false;
      }
      if (challengeData?.active === false) {
        reportUnavailable(
          "Challenge Completed",
          "This challenge is no longer accepting new submissions.",
        );
        return false;
      }
      if (typeof day === "number" && !canUploadForDay(day)) {
        reportUnavailable(
          "Upload Not Available",
          isOneOff
            ? "This one-off challenge already has an active submission."
            : "You can upload for a challenge day only on that day or the following day, and only when it does not already have an active submission.",
        );
        return false;
      }
      return true;
    },
    [
      currentUserId,
      isParticipant,
      challengeStatus,
      challengeData?.active,
      canUploadForDay,
      isOneOff,
    ],
  );

  const resetUploadDraft = useCallback(() => {
    setUploadingDay(null);
    setUploadMediaAssets([]);
    setUploadCaption("");
    setAuthenticityConfirmed(false);
    setUploadProgress(0);
    setUploadError(null);
  }, []);

  const handlePickMedia = useCallback(
    async (day: number) => {
      if (!ensureCanUpload(day)) {
        return;
      }
      setUploadingDay(day);
      setUploadCaption("");
      setUploadMediaAssets([]);
      setAuthenticityConfirmed(false);
      setUploadProgress(0);
      setUploadError(null);
    },
    [ensureCanUpload],
  );

  useEffect(() => {
    if (
      isReadOnly ||
      !autoUploadDay ||
      autoUploadStartedRef.current ||
      loadingParticipants ||
      currentDay <= 0
    ) {
      return;
    }

    autoUploadStartedRef.current = true;
    handlePickMedia(autoUploadDay);
  }, [
    autoUploadDay,
    currentDay,
    handlePickMedia,
    isReadOnly,
    loadingParticipants,
  ]);

  const handleSubmitUpload = async () => {
    if (uploadingDay === null) {
      setUploadError("Choose a challenge day before uploading.");
      return;
    }
    if (!ensureCanUpload(uploadingDay, setUploadError)) return;
    if (uploadMediaAssets.length === 0 || !uploadCaption.trim()) {
      setUploadError("Please select at least one photo and add a short check-in.");
      return;
    }
    if (!authenticityConfirmed) {
      setUploadError("Please confirm this reflects today's real effort before uploading.");
      return;
    }
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      const mediaUrls = uploadMediaAssets.length > 0
        ? await uploadSubmissionMedia(
            currentUserId,
            uploadMediaAssets,
            setUploadProgress,
          )
        : [];
      const submissionData = {
        userId: currentUserId,
        challengeId,
        dayNumber: uploadingDay,
        description: uploadCaption.trim(),
        mediaUrls,
      };
      await createSubmissionMutation.mutateAsync(submissionData);
      await refetch();
      Alert.alert("Posted", "Submission posted!");
      resetUploadDraft();
    } catch (error: any) {
      setUploadError(
        getApiErrorMessage(error, "Failed to upload. Please try again."),
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchParticipants(), refetchChallenge()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchParticipants, refetchChallenge]);

  const shareDownloadedCollage = useCallback(
    async (fileUri: string, fileName: string) => {
      await Share.share({
        title: "Memoir",
        message: `ChallengeSphere memoir: ${fileName}`,
        url: fileUri,
      });
    },
    [],
  );

  const saveCollageWithAndroidPicker = useCallback(
    async (fileUri: string, fileName: string) => {
      const storageAccess = FileSystem.StorageAccessFramework;
      const permission = await storageAccess.requestDirectoryPermissionsAsync();
      if (!permission.granted) {
        return false;
      }

      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const destinationUri = await storageAccess.createFileAsync(
        permission.directoryUri,
        fileName,
        "image/jpeg",
      );
      await FileSystem.writeAsStringAsync(destinationUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return true;
    },
    [],
  );

  const captureRenderedMemoir = useCallback(
    (captureData: MemoirCaptureData) => {
      return new Promise<string>((resolve, reject) => {
        if (memoirCapturePromiseRef.current) {
          reject(new Error("A memoir is already being generated."));
          return;
        }

        memoirCapturePromiseRef.current = { resolve, reject };
        setMemoirLoadedImages(0);
        setMemoirCaptureData(captureData);
      });
    },
    [],
  );

  useEffect(() => {
    if (!memoirCaptureData) {
      return;
    }
    if (memoirLoadedImages < memoirCaptureData.photos.length) {
      return;
    }

    let cancelled = false;
    const capture = async () => {
      try {
        await wait(250);
        if (cancelled) return;
        if (!memoirCaptureRef.current) {
          throw new Error("Memoir canvas is not ready.");
        }

        const capturedUri = await captureRef(memoirCaptureRef, {
          format: "jpg",
          quality: 0.92,
          result: "tmpfile",
          width: MEMOIR_OUTPUT_WIDTH,
          height: getMemoirRenderHeight(memoirCaptureData.photos.length) * 3,
        });
        memoirCapturePromiseRef.current?.resolve(
          normalizeCapturedFileUri(capturedUri),
        );
      } catch (error: any) {
        memoirCapturePromiseRef.current?.reject(
          error instanceof Error ? error : new Error(String(error)),
        );
      } finally {
        if (!cancelled) {
          memoirCapturePromiseRef.current = null;
          setMemoirCaptureData(null);
        }
      }
    };

    capture();
    return () => {
      cancelled = true;
    };
  }, [memoirCaptureData, memoirLoadedImages]);

  useEffect(() => {
    if (
      !memoirCaptureData ||
      memoirLoadedImages >= memoirCaptureData.photos.length
    ) {
      return;
    }

    const timeout = setTimeout(() => {
      setMemoirLoadedImages(memoirCaptureData.photos.length);
    }, Math.min(20000, 7000 + memoirCaptureData.photos.length * 300));

    return () => clearTimeout(timeout);
  }, [memoirCaptureData, memoirLoadedImages]);

  useEffect(() => {
    return () => {
      memoirCapturePromiseRef.current?.reject(
        new Error("Memoir generation was cancelled."),
      );
      memoirCapturePromiseRef.current = null;
    };
  }, []);

  const loadAllMemoirSubmissions = useCallback(async () => {
    const firstPageSubmissions = data?.submissions || [];
    const expectedPageCount = Math.max(
      data?.totalPages || 1,
      Math.ceil((data?.totalCount || firstPageSubmissions.length) / MEMOIR_PAGE_SIZE),
    );

    if (expectedPageCount <= 1) return firstPageSubmissions;

    const remainingPages = await Promise.all(
      Array.from({ length: expectedPageCount - 1 }, (_, index) => (
        challengeService.getUserChallengeSubmissions(
          targetUserId,
          challengeId,
          currentUserId,
          index + 2,
          MEMOIR_PAGE_SIZE,
        )
      )),
    );
    const uniqueSubmissions = new Map<number, Submission>();
    [firstPageSubmissions, ...remainingPages.map((page) => page.submissions)]
      .flat()
      .forEach((submission) => uniqueSubmissions.set(submission.id, submission));
    return Array.from(uniqueSubmissions.values());
  }, [challengeId, currentUserId, data, targetUserId]);

  const openMemoirRangeSelector = useCallback(async () => {
    if (!hasCollageSubmissions) {
      Alert.alert(
        "No Submissions Yet",
        "Add at least one submission before generating a memoir.",
      );
      return;
    }
    if (currentUserId <= 0) {
      Alert.alert("Sign In Required", "Please sign in to create your memoir.");
      return;
    }
    if (!challengeId) {
      Alert.alert("Challenge Missing", "Could not identify this challenge.");
      return;
    }

    try {
      setIsPreparingMemoirRange(true);
      const submissions = await loadAllMemoirSubmissions();
      if (submissions.length === 0) {
        Alert.alert(
          "No Submissions Yet",
          "Add at least one submission before generating a memoir.",
        );
        return;
      }

      const bounds = getMemoirDateBounds(submissions);
      setMemoirRangeSubmissions(submissions);
      setMemoirRangeStart(bounds.start);
      setMemoirRangeEnd(bounds.end);
      setActiveMemoirDateField(null);
      setShowMemoirRangeModal(true);
    } catch (error: any) {
      Alert.alert(
        "Memoir Unavailable",
        getApiErrorMessage(error, "Could not load the complete memoir history."),
      );
    } finally {
      setIsPreparingMemoirRange(false);
    }
  }, [
    challengeId,
    currentUserId,
    hasCollageSubmissions,
    loadAllMemoirSubmissions,
  ]);

  useEffect(() => {
    if (
      params.openMemoir !== "true"
      || autoMemoirOpenedRef.current
      || isLoading
      || !hasCollageSubmissions
    ) {
      return;
    }

    autoMemoirOpenedRef.current = true;
    void openMemoirRangeSelector();
  }, [
    hasCollageSubmissions,
    isLoading,
    openMemoirRangeSelector,
    params.openMemoir,
  ]);

  const handleMemoirDateChange = useCallback(
    (event: any, selectedDate?: Date) => {
      const field = activeMemoirDateField;
      if (Platform.OS === "android") {
        setActiveMemoirDateField(null);
      }
      if (!field || event?.type === "dismissed" || !selectedDate) return;

      if (field === "start") {
        setMemoirRangeStart(selectedDate);
        if (memoirRangeEnd && selectedDate.getTime() > memoirRangeEnd.getTime()) {
          setMemoirRangeEnd(selectedDate);
        }
        return;
      }

      setMemoirRangeEnd(selectedDate);
      if (memoirRangeStart && selectedDate.getTime() < memoirRangeStart.getTime()) {
        setMemoirRangeStart(selectedDate);
      }
    },
    [activeMemoirDateField, memoirRangeEnd, memoirRangeStart],
  );

  const handleGenerateMemoir = useCallback(async () => {
    if (!memoirRangeStart || !memoirRangeEnd) return;
    if (selectedMemoirSubmissions.length === 0) {
      Alert.alert(
        "No Check-ins in This Range",
        "Choose a date range that contains at least one check-in.",
      );
      return;
    }

    try {
      setShowMemoirRangeModal(false);
      setActiveMemoirDateField(null);
      setIsGeneratingCollage(true);
      const captureData = createMemoirCaptureData({
        submissions: selectedMemoirSubmissions,
        challengeTitle,
        username: memoirUsername,
        selectedDateRange: formatMemoirDateRange(memoirRangeStart, memoirRangeEnd),
      });
      const memoirUri = await captureRenderedMemoir(captureData);

      if (Platform.OS === "android") {
        const saved = await saveCollageWithAndroidPicker(
          memoirUri,
          captureData.fileName,
        );
        if (saved) {
          Alert.alert(
            "Memoir Saved",
            "Your memoir was saved to the folder you selected.",
          );
          return;
        }
      }

      await shareDownloadedCollage(memoirUri, captureData.fileName);
    } catch (error: any) {
      console.error("Generate memoir error:", error);
      Alert.alert(
        "Memoir Failed",
        getApiErrorMessage(error, "Could not create the memoir. Please try again."),
      );
    } finally {
      setIsGeneratingCollage(false);
    }
  }, [
    challengeTitle,
    captureRenderedMemoir,
    memoirRangeEnd,
    memoirRangeStart,
    memoirUsername,
    saveCollageWithAndroidPicker,
    selectedMemoirSubmissions,
    shareDownloadedCollage,
  ]);

  // Days from current day down to 1 (only up to today, not future days)
  const allDays = useMemo(() => {
    if (isOneOff) return [1];
    const maxDay =
      currentDay > 0
        ? Math.min(currentDay, numberOfDays || currentDay)
        : numberOfDays;
    if (maxDay > 0) {
      return Array.from({ length: maxDay }, (_, i) => maxDay - i);
    }
    // Fallback: only days that have submissions
    return Array.from(submissionMap.keys()).sort((a, b) => b - a);
  }, [currentDay, numberOfDays, submissionMap, isOneOff]);

  const shimmer = useSkeletonShimmer();

  const openSubmission = (s: Submission) => {
    const author =
      user?.id === s.userId
        ? user
        : (participantsData?.participants || []).find(
            (participant) => participant.id === s.userId,
          );
    const authorName =
      author?.username ||
      (s.userId === targetUserId ? targetUsername : "") ||
      `User ${s.userId}`;
    const authorPhoto = author?.profilePicUrl || "";

    router.push({
      pathname: "/photo-details",
      params: {
        ...buildSubmissionDetailRouteParams({
          submission: s,
          userName: authorName,
          userPhoto: authorPhoto,
          challengeTitle,
          participantCount: participantsData?.totalParticipants ?? 0,
        }),
        readOnly: isReadOnly ? "true" : "false",
      },
    });
  };

  const renderSubmission = (s: Submission) => {
    const urls = parseMemoirMediaUrls(s.mediaUrls as any);
    const thumb = urls[0];
    return (
      <View key={s.id} style={styles.card}>
        <TouchableOpacity onPress={() => openSubmission(s)} activeOpacity={0.8}>
          {thumb ? (
            <ExpoImage
              source={createCachedRemoteImageSource(thumb)}
              style={styles.cardImage}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={120}
              onError={() => recoverSignedMedia(thumb)}
            />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <Ionicons name="image-outline" size={32} color="#444" />
            </View>
          )}
          {/* multi-photo indicator */}
          {urls.length > 1 && (
            <View style={styles.multiPhotoBadge}>
              <Ionicons name="copy-outline" size={12} color="#fff" />
              <Text style={styles.multiPhotoBadgeText}>{urls.length}</Text>
            </View>
          )}
          <View style={styles.cardBody}>
            {s.description ? (
              <Text style={styles.cardDescription} numberOfLines={3}>
                {s.description}
              </Text>
            ) : null}
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="sparkles" size={14} color="#FFD700" />
                <Text style={styles.metaText}>{s.gloriesCount ?? 0}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="chatbubble-outline" size={14} color="#888" />
                <Text style={styles.metaText}>{s.commentsCount ?? 0}</Text>
              </View>
              <Text style={styles.dateText}>
                {formatDate(s.submissionTime)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#18142F" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isOwnTimeline ? "My Submissions" : "Submissions"}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1} selectable>
            {challengeTitle}
          </Text>
          {!isOwnTimeline && targetUsername ? (
            <Text style={styles.headerDate} numberOfLines={1}>
              @{targetUsername}
            </Text>
          ) : null}
          {challengeDateRange ? (
            <Text style={styles.headerDate} numberOfLines={1}>
              {challengeDateRange}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {(isLoading || loadingParticipants) && !refreshing ? (
        <View style={{ flex: 1, padding: 16, gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "#E7E3EF",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 12,
                }}
              >
                <SkeletonBlock
                  translateX={shimmer}
                  width={70}
                  height={18}
                  borderRadius={9}
                />
                <SkeletonBlock
                  translateX={shimmer}
                  width={50}
                  height={18}
                  borderRadius={9}
                />
              </View>
              <SkeletonBlock
                translateX={shimmer}
                width="100%"
                height={180}
                borderRadius={0}
              />
              <View style={{ padding: 12, gap: 8 }}>
                <SkeletonBlock translateX={shimmer} width="80%" height={12} />
                <SkeletonBlock
                  translateX={shimmer}
                  width="55%"
                  height={10}
                  borderRadius={5}
                />
              </View>
            </View>
          ))}
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={56} color="#666" />
          <Text style={styles.emptyTitle}>Failed to load</Text>
          <Text style={styles.helperText}>
            {getApiErrorMessage(error, "Could not load submissions. Please try again.")}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : currentUserId <= 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>Sign in required</Text>
          <Text style={styles.helperText}>
            Please sign in to view challenge submissions.
          </Text>
        </View>
      ) : !isReadOnly && !isParticipant ? (
        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>Join required</Text>
          <Text style={styles.helperText}>
            You must join this challenge before you can upload or access your
            submission timeline.
          </Text>
        </View>
      ) : allDays.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4700ecff"
              colors={["#4700ecff"]}
            />
          }
        >
          <Ionicons name="images-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>No submissions yet</Text>
          <Text style={styles.helperText}>
            {isOwnTimeline
              ? isOneOff
                ? "Your completion upload for this challenge will appear here."
                : "Your daily uploads for this challenge will appear here."
              : "This participant has no visible submissions for this challenge."}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4700ecff"
              colors={["#4700ecff"]}
            />
          }
        >
          {/* Summary bar */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data?.totalCount ?? 0}</Text>
              <Text style={styles.summaryLabel}>Uploads</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summaryDaysValue}</Text>
              <Text style={styles.summaryLabel}>Days</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {(data?.submissions || []).reduce(
                  (acc, s) => acc + (s.gloriesCount ?? 0),
                  0,
                )}
              </Text>
              <Text style={styles.summaryLabel}>Glories</Text>
            </View>
          </View>

          {hasCollageSubmissions && (
            <View style={styles.collageCard}>
              <View style={styles.collageIconWrap}>
                <Ionicons name="images" size={22} color="#ffffff" />
              </View>
              <View style={styles.collageCopy}>
                <Text style={styles.collageTitle}>Your memoir</Text>
                <Text style={styles.collageSubtitle}>
                  {`Choose a date range and turn all ${collageSubmissionCount} check-ins into one visual story.`}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.collageButton,
                  (isGeneratingCollage || isPreparingMemoirRange) && styles.collageButtonDisabled,
                ]}
                onPress={openMemoirRangeSelector}
                feedbackTiming="after-paint"
                disabled={isGeneratingCollage || isPreparingMemoirRange}
                activeOpacity={0.85}
              >
                {isGeneratingCollage || isPreparingMemoirRange ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons name="calendar-outline" size={16} color="#ffffff" />
                    <Text
                      style={styles.collageButtonText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                      maxFontSizeMultiplier={1.15}
                    >
                      Choose dates
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {allDays.map((day) => {
            const items = submissionMap.get(day) || [];
            const isEmpty = items.length === 0;
            const dayDate = getChallengeDayDate(startDateStr, day);
            return (
              <View
                key={day}
                style={isEmpty ? styles.daySectionEmpty : styles.daySection}
              >
                <View style={styles.daySectionHeader}>
                  <View style={styles.dayPill}>
                    <Ionicons name="calendar" size={14} color="#4700ecff" />
                    <Text style={styles.dayPillText}>
                      {isOneOff ? "One-off" : `Day ${day}`}
                    </Text>
                    {dayDate ? (
                      <Text style={styles.dayPillDate}>• {dayDate}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.daySectionCount}>
                    {isEmpty
                      ? "No upload"
                      : `${items.length} upload${items.length > 1 ? "s" : ""}`}
                  </Text>
                </View>
                {isEmpty ? (
                  <View style={styles.emptyDayRow}>
                    <Text style={styles.emptyDayText}>No submission</Text>
                    {canUploadForDay(day) && (
                      <TouchableOpacity
                        style={styles.uploadMissedButton}
                        onPress={() => handlePickMedia(day)}
                      >
                        <Ionicons
                          name="cloud-upload-outline"
                          size={14}
                          color="#4700ecff"
                        />
                        <Text style={styles.uploadMissedText}>Upload</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  items.map(renderSubmission)
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal
        visible={showMemoirRangeModal}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => {
          setActiveMemoirDateField(null);
          setShowMemoirRangeModal(false);
        }}
      >
        <View style={styles.memoirRangeOverlay}>
          <ScrollView
            style={styles.memoirRangeSheet}
            contentContainerStyle={styles.memoirRangeSheetContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.memoirRangeHeader}>
              <View style={styles.memoirRangeHeaderIcon}>
                <Ionicons name="book-outline" size={21} color="#FFFFFF" />
              </View>
              <View style={styles.memoirRangeHeaderCopy}>
                <Text style={styles.memoirRangeTitle}>Create your memoir</Text>
                <Text style={styles.memoirRangeSubtitle}>
                  Choose the part of your journey you want to remember.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.memoirRangeClose}
                onPress={() => {
                  setActiveMemoirDateField(null);
                  setShowMemoirRangeModal(false);
                }}
                accessibilityLabel="Close memoir date selector"
              >
                <Ionicons name="close" size={20} color="#655F70" />
              </TouchableOpacity>
            </View>

            <View style={styles.memoirRangeIdentityCard}>
              <Text style={styles.memoirRangeChallengeLabel}>CHALLENGE</Text>
              <Text style={styles.memoirRangeChallengeName} numberOfLines={2}>
                {challengeTitle}
              </Text>
              <Text style={styles.memoirRangeUsername}>{memoirUsername}</Text>
            </View>

            <Text style={styles.memoirRangeSectionLabel}>DATE RANGE</Text>
            <View style={styles.memoirRangeFields}>
              <TouchableOpacity
                style={[
                  styles.memoirRangeField,
                  activeMemoirDateField === "start" && styles.memoirRangeFieldActive,
                ]}
                onPress={() => setActiveMemoirDateField("start")}
              >
                <Text style={styles.memoirRangeFieldLabel}>FROM</Text>
                <Text style={styles.memoirRangeFieldValue} numberOfLines={1}>
                  {memoirRangeStart ? formatCompactDate(memoirRangeStart) : "Select date"}
                </Text>
              </TouchableOpacity>
              <Ionicons name="arrow-forward" size={17} color="#8E8798" />
              <TouchableOpacity
                style={[
                  styles.memoirRangeField,
                  activeMemoirDateField === "end" && styles.memoirRangeFieldActive,
                ]}
                onPress={() => setActiveMemoirDateField("end")}
              >
                <Text style={styles.memoirRangeFieldLabel}>TO</Text>
                <Text style={styles.memoirRangeFieldValue} numberOfLines={1}>
                  {memoirRangeEnd ? formatCompactDate(memoirRangeEnd) : "Select date"}
                </Text>
              </TouchableOpacity>
            </View>

            {activeMemoirDateField ? (
              <View style={styles.memoirDatePickerWrap}>
                <DateTimePicker
                  value={
                    activeMemoirDateField === "start"
                      ? memoirRangeStart || memoirDateBounds.start
                      : memoirRangeEnd || memoirDateBounds.end
                  }
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minimumDate={
                    activeMemoirDateField === "end"
                      ? memoirRangeStart || memoirDateBounds.start
                      : memoirDateBounds.start
                  }
                  maximumDate={
                    activeMemoirDateField === "start"
                      ? memoirRangeEnd || memoirDateBounds.end
                      : memoirDateBounds.end
                  }
                  onChange={handleMemoirDateChange}
                  themeVariant="light"
                  style={styles.memoirDatePicker}
                />
                {Platform.OS === "ios" ? (
                  <TouchableOpacity
                    style={styles.memoirDatePickerDone}
                    onPress={() => setActiveMemoirDateField(null)}
                  >
                    <Text style={styles.memoirDatePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            <View style={styles.memoirRangeSummary}>
              <View style={styles.memoirRangeSummaryIcon}>
                <Ionicons name="images-outline" size={19} color="#5B3FE5" />
              </View>
              <View style={styles.memoirRangeSummaryCopy}>
                <Text style={styles.memoirRangeSummaryTitle}>
                  {selectedMemoirPhotoCount} photo{selectedMemoirPhotoCount === 1 ? "" : "s"}
                  {` · ${selectedMemoirSubmissions.length} check-in${selectedMemoirSubmissions.length === 1 ? "" : "s"}`}
                </Text>
                <Text style={styles.memoirRangeSummaryText}>
                  Every photo in this range will be included in the memoir.
                </Text>
              </View>
            </View>

            <View style={styles.memoirRangeActions}>
              <TouchableOpacity
                style={styles.memoirRangeCancelButton}
                onPress={() => {
                  setActiveMemoirDateField(null);
                  setShowMemoirRangeModal(false);
                }}
              >
                <Text style={styles.memoirRangeCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.memoirRangeGenerateButton,
                  selectedMemoirSubmissions.length === 0 && styles.memoirRangeGenerateButtonDisabled,
                ]}
                onPress={handleGenerateMemoir}
                disabled={selectedMemoirSubmissions.length === 0}
                feedbackTiming="after-paint"
              >
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                <Text style={styles.memoirRangeGenerateText}>Create memoir</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {!isReadOnly && (
        /* Upload Modal */
        <Modal
          visible={isUploadModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={resetUploadDraft}
        >
          <KeyboardAvoidingView
            style={styles.modalContainer}
            enabled={Platform.OS === "ios"}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={0}
          >
            <SafeAreaView
              style={styles.modalContainer}
              edges={["top", "bottom"]}
            >
              <SubmissionUploadHeader
                challengeName={challengeTitle}
                dayLabel={isOneOff ? "One-off" : `Day ${uploadingDay ?? 1}`}
                dateLabel={getChallengeDayCalendarDate(
                  startDateStr,
                  uploadingDay ?? 1,
                )}
                onClose={resetUploadDraft}
                closeDisabled={isUploading}
              />
              <SubmissionComposer
                challengeName={challengeTitle}
                dayLabel={
                  isOneOff ? "One-off challenge" : `Day ${uploadingDay ?? ""}`
                }
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
                proofMode={proofMode}
                errorMessage={uploadError}
                onErrorChange={setUploadError}
              />
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>
      )}
      {memoirCaptureData && (
        <View
          pointerEvents="none"
          style={[
            styles.memoirCaptureHost,
            { height: getMemoirRenderHeight(memoirCaptureData.photos.length) },
          ]}
        >
          <MemoirCaptureView
            data={memoirCaptureData}
            captureRef={memoirCaptureRef}
            onImageLoadEnd={() => setMemoirLoadedImages((count) => count + 1)}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function MemoirCaptureView({
  data,
  captureRef: viewRef,
  onImageLoadEnd,
}: {
  data: MemoirCaptureData;
  captureRef: React.RefObject<View | null>;
  onImageLoadEnd: () => void;
}) {
  const gridMetrics = getMemoirGridMetrics(data.photos.length);
  const renderHeight = getMemoirRenderHeight(data.photos.length);

  return (
    <View
      ref={viewRef}
      collapsable={false}
      style={[styles.memoirCanvas, { height: renderHeight }]}
    >
      <View style={styles.memoirGlowTop} />
      <View style={styles.memoirGlowEdge} />
      <View style={styles.memoirBrandRow}>
        <View style={styles.memoirBrandSignature}>
          <Image
            source={require("../assets/images/logo-mark-clean.png")}
            style={styles.memoirLogo}
            resizeMode="contain"
          />
          <View style={styles.memoirBrandCopy}>
            <Text style={styles.memoirWordmark}>challengesphere</Text>
            <Text style={styles.memoirStoreLine}>
              CHALLENGESPHERE APP · GET IT ON GOOGLE PLAY
            </Text>
          </View>
        </View>
        <View style={styles.memoirEditionPill}>
          <Text style={styles.memoirEdition}>CHALLENGE MEMOIR</Text>
        </View>
      </View>

      <Text
        style={styles.memoirTitle}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.68}
      >
        {data.challengeTitle}
      </Text>
      <Text style={styles.memoirUsername} numberOfLines={1}>
        {data.username}
      </Text>
      <View style={styles.memoirMetaRow}>
        <Text style={styles.memoirMetaLabel}>SELECTED RANGE</Text>
        <Text style={styles.memoirMetaDate} numberOfLines={1}>
          {data.selectedDateRange}
        </Text>
      </View>

      {data.photos.length > 0 ? (
        <View
          style={[
            styles.memoirCollageStage,
            {
              height: gridMetrics.gridHeight,
              gap: gridMetrics.gap,
            },
          ]}
        >
          {data.photos.map((photo) => (
            <View
              key={photo.key}
              style={[
                styles.memoirPhotoTile,
                {
                  width: gridMetrics.tileWidth,
                  height: gridMetrics.tileHeight,
                },
              ]}
            >
              <ExpoImage
                source={createCachedRemoteImageSource(photo.uri)}
                style={styles.memoirPhoto}
                contentFit="cover"
                cachePolicy="memory-disk"
                onLoad={onImageLoadEnd}
                onError={onImageLoadEnd}
              />
              <View style={styles.memoirPhotoDateBar}>
                <Text style={styles.memoirPhotoDate} numberOfLines={1}>
                  {photo.dateLabel}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.memoirTextPanel}>
          <Text style={styles.memoirJournalEyebrow}>NOTES FROM THE JOURNEY</Text>
          <View style={styles.memoirTimelineLine} />
          {data.summaries.slice(0, 4).map((summary) => (
            <View key={summary.key} style={styles.memoirSummaryRow}>
              <View style={styles.memoirSummaryDatePill}>
                <Text style={styles.memoirSummaryDate} numberOfLines={1}>
                  {summary.dateLabel}
                </Text>
              </View>
              <Text style={styles.memoirSummaryText} numberOfLines={2}>
                {summary.description}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.memoirStats}>
        <View style={styles.memoirStat}>
          <Text style={styles.memoirStatValue}>{data.photos.length}</Text>
          <Text style={styles.memoirStatLabel}>Photos</Text>
        </View>
        <View style={styles.memoirStatDivider} />
        <View style={styles.memoirStat}>
          <Text style={styles.memoirStatValue}>{data.uploadCount}</Text>
          <Text style={styles.memoirStatLabel}>Check-ins</Text>
        </View>
        <View style={styles.memoirStatDivider} />
        <View style={[styles.memoirStat, styles.memoirCreatedStat]}>
          <Text
            style={styles.memoirCreatedDate}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {data.generatedDate.toUpperCase()}
          </Text>
          <Text style={styles.memoirStatLabel}>Created</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7FC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E3EF",
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#18142F",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#777389",
    marginTop: 2,
    maxWidth: SCREEN_WIDTH - 120,
  },
  headerDate: {
    fontSize: 11,
    color: "#777389",
    marginTop: 2,
    maxWidth: SCREEN_WIDTH - 120,
  },
  headerSpacer: {
    width: 36,
  },
  // Summary bar
  summaryBar: {
    flexDirection: "row",
    backgroundColor: "#F0ECFF",
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#DDD4FF",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 21,
    fontWeight: "700",
    color: "#18142F",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#777389",
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#DDD4FF",
    marginVertical: 4,
  },
  collageCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 14,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDD4FF",
    gap: 12,
  },
  collageIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4700ecff",
  },
  collageCopy: {
    flex: 1,
    minWidth: 0,
  },
  collageTitle: {
    color: "#18142F",
    fontSize: 14,
    fontWeight: "700",
  },
  collageSubtitle: {
    color: "#655F70",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  collageButton: {
    width: 110,
    height: 44,
    flexShrink: 0,
    paddingHorizontal: 10,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6f43ff",
    gap: 6,
  },
  collageButtonText: {
    flexShrink: 1,
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  collageButtonDisabled: {
    opacity: 0.55,
  },
  memoirRangeOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: "rgba(24, 20, 47, 0.52)",
  },
  memoirRangeSheet: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "92%",
    alignSelf: "center",
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E3EF",
    shadowColor: "#18142F",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
    overflow: "hidden",
  },
  memoirRangeSheetContent: {
    padding: 18,
  },
  memoirRangeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  memoirRangeHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5B3FE5",
  },
  memoirRangeHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  memoirRangeTitle: {
    color: "#18142F",
    fontSize: 17,
    fontWeight: "700",
  },
  memoirRangeSubtitle: {
    marginTop: 2,
    color: "#655F70",
    fontSize: 11,
    lineHeight: 16,
  },
  memoirRangeClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F4FA",
  },
  memoirRangeIdentityCard: {
    marginTop: 16,
    padding: 15,
    borderRadius: 20,
    backgroundColor: "#F0ECFF",
    borderWidth: 1,
    borderColor: "#DDD4FF",
  },
  memoirRangeChallengeLabel: {
    color: "#6C42E8",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  memoirRangeChallengeName: {
    marginTop: 5,
    color: "#18142F",
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "700",
  },
  memoirRangeUsername: {
    marginTop: 4,
    color: "#5B3FE5",
    fontSize: 13,
    fontWeight: "700",
  },
  memoirRangeSectionLabel: {
    marginTop: 17,
    marginBottom: 8,
    color: "#655F70",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.9,
  },
  memoirRangeFields: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memoirRangeField: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: "#F8F7FC",
    borderWidth: 1,
    borderColor: "#D8D2E2",
  },
  memoirRangeFieldActive: {
    backgroundColor: "#F0ECFF",
    borderColor: "#6C42E8",
  },
  memoirRangeFieldLabel: {
    color: "#8E8798",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  memoirRangeFieldValue: {
    marginTop: 4,
    color: "#18142F",
    fontSize: 12,
    fontWeight: "700",
  },
  memoirDatePickerWrap: {
    marginTop: 10,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#F8F7FC",
    borderWidth: 1,
    borderColor: "#E7E3EF",
  },
  memoirDatePicker: {
    backgroundColor: "#F8F7FC",
  },
  memoirDatePickerDone: {
    alignSelf: "flex-end",
    marginRight: 10,
    marginBottom: 9,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#5B3FE5",
  },
  memoirDatePickerDoneText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  memoirRangeSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderRadius: 17,
    backgroundColor: "#F8F7FC",
  },
  memoirRangeSummaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE9FF",
  },
  memoirRangeSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  memoirRangeSummaryTitle: {
    color: "#18142F",
    fontSize: 12,
    fontWeight: "700",
  },
  memoirRangeSummaryText: {
    marginTop: 2,
    color: "#655F70",
    fontSize: 10,
    lineHeight: 14,
  },
  memoirRangeActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },
  memoirRangeCancelButton: {
    minWidth: 92,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8D2E2",
  },
  memoirRangeCancelText: {
    color: "#5F5968",
    fontSize: 13,
    fontWeight: "700",
  },
  memoirRangeGenerateButton: {
    flex: 1,
    height: 48,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#5B3FE5",
  },
  memoirRangeGenerateButtonDisabled: {
    opacity: 0.4,
  },
  memoirRangeGenerateText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  memoirCaptureHost: {
    position: "absolute",
    left: -MEMOIR_RENDER_WIDTH - 40,
    top: 0,
    width: MEMOIR_RENDER_WIDTH,
  },
  memoirCanvas: {
    width: MEMOIR_RENDER_WIDTH,
    backgroundColor: "#F7F4FF",
    overflow: "hidden",
  },
  memoirGlowTop: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -58,
    top: -112,
    backgroundColor: "rgba(111, 67, 255, 0.15)",
  },
  memoirGlowEdge: {
    position: "absolute",
    width: 126,
    height: 126,
    borderRadius: 63,
    right: -88,
    top: 78,
    backgroundColor: "rgba(143, 107, 255, 0.10)",
  },
  memoirBrandRow: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 20,
  },
  memoirBrandSignature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  memoirLogo: {
    width: 28,
    height: 28,
  },
  memoirBrandCopy: {
    justifyContent: "center",
  },
  memoirWordmark: {
    color: "#18142F",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.15,
  },
  memoirStoreLine: {
    marginTop: 1,
    color: "#777389",
    fontSize: 5,
    fontWeight: "700",
    letterSpacing: 0.42,
  },
  memoirEditionPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#EAE3FF",
    borderWidth: 1,
    borderColor: "#D4C7FF",
  },
  memoirEdition: {
    color: "#5B3FE5",
    fontSize: 6.5,
    fontWeight: "700",
    letterSpacing: 1.15,
  },
  memoirTitle: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 44,
    color: "#18142F",
    fontSize: 22,
    lineHeight: 25,
    fontWeight: "700",
    letterSpacing: -0.45,
  },
  memoirUsername: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 98,
    color: "#5B3FE5",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
  },
  memoirMetaRow: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 116,
    height: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderRadius: 9,
    backgroundColor: "#EDE7FF",
    alignSelf: "flex-start",
  },
  memoirMetaLabel: {
    color: "#6C42E8",
    fontSize: 6,
    fontWeight: "700",
    letterSpacing: 0.7,
    marginRight: 7,
  },
  memoirMetaDate: {
    flex: 1,
    color: "#40384C",
    fontSize: 7,
    fontWeight: "700",
  },
  memoirCollageStage: {
    position: "absolute",
    left: 14,
    top: MEMOIR_GRID_TOP,
    width: MEMOIR_STAGE_WIDTH,
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "flex-start",
  },
  memoirPhotoTile: {
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#DED6EE",
  },
  memoirPhoto: {
    width: "100%",
    flex: 1,
    backgroundColor: "#EEEAF5",
  },
  memoirPhotoDateBar: {
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    backgroundColor: "#FFFFFF",
  },
  memoirPhotoDate: {
    color: "#655F70",
    fontSize: 6,
    fontWeight: "700",
  },
  memoirTextPanel: {
    position: "absolute",
    left: 14,
    top: MEMOIR_GRID_TOP,
    width: MEMOIR_STAGE_WIDTH,
    height: 190,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDD4FF",
    overflow: "hidden",
  },
  memoirJournalEyebrow: {
    color: "#6C42E8",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginBottom: 13,
  },
  memoirTimelineLine: {
    position: "absolute",
    left: 40,
    top: 49,
    bottom: 18,
    width: 1,
    backgroundColor: "#DDD4FF",
  },
  memoirSummaryRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    minHeight: 43,
  },
  memoirSummaryDatePill: {
    width: 72,
    height: 21,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0ECFF",
    borderWidth: 1,
    borderColor: "#DDD4FF",
    zIndex: 2,
  },
  memoirSummaryDate: {
    color: "#5B3FE5",
    fontSize: 6,
    fontWeight: "700",
    letterSpacing: 0.35,
  },
  memoirSummaryText: {
    flex: 1,
    color: "#40384C",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
  },
  memoirStats: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 13,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDD4FF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    zIndex: 20,
  },
  memoirStat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  memoirStatValue: {
    color: "#18142F",
    fontSize: 15,
    lineHeight: 17,
    fontWeight: "700",
  },
  memoirStatLabel: {
    color: "#978ba9",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.7,
    marginTop: 3,
    textTransform: "uppercase",
  },
  memoirStatDivider: {
    width: 1,
    height: 31,
    backgroundColor: "#E7E3EF",
  },
  memoirCreatedStat: {
    flex: 1.25,
    paddingHorizontal: 5,
  },
  memoirCreatedDate: {
    color: "#18142F",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  // Day section
  scrollContent: {
    paddingBottom: 32,
  },
  daySection: {
    marginTop: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  daySectionEmpty: {
    marginTop: 4,
    paddingHorizontal: 16,
    gap: 2,
  },
  daySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },
  dayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#F0ECFF",
    borderWidth: 1,
    borderColor: "#DDD4FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24,
  },
  dayPillText: {
    color: "#5B3FE5",
    fontSize: 12,
    fontWeight: "700",
  },
  dayPillDate: {
    color: "#6C42E8",
    fontSize: 11,
    fontWeight: "600",
  },
  daySectionCount: {
    fontSize: 11,
    color: "#777389",
  },
  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E7E3EF",
  },
  cardImage: {
    width: "100%",
    height: 220,
    resizeMode: "contain",
    backgroundColor: "#F2F0F7",
  },
  cardImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    height: 140,
  },
  multiPhotoBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  multiPhotoBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  cardBody: {
    padding: 14,
    gap: 10,
  },
  cardDescription: {
    color: "#000000",
    fontSize: 13,
    lineHeight: 19,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    color: "#777389",
    fontSize: 12,
    fontWeight: "500",
  },
  dateText: {
    marginLeft: "auto",
    color: "#777389",
    fontSize: 11,
  },
  // States
  centerContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    color: "#18142F",
    fontSize: 17,
    fontWeight: "700",
  },
  helperText: {
    color: "#777389",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: "#4700ecff",
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  emptyDayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 4,
  },
  emptyDayText: {
    color: "#444",
    fontSize: 12,
    fontStyle: "italic",
  },
  uploadMissedButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#4700ec18",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  uploadMissedText: {
    color: "#4700ecff",
    fontSize: 11,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8F7FC",
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalBodyContent: {
    paddingBottom: 24,
  },
  selectedMediaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  selectedMediaTitle: {
    color: "#18142F",
    fontSize: 14,
    fontWeight: "700",
  },
  changePhotosButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#4700ec18",
  },
  changePhotosText: {
    color: "#4700ecff",
    fontSize: 11,
    fontWeight: "700",
  },
  selectedMediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  selectedMediaTile: {
    position: "relative",
    width: "48%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  selectedMediaImage: {
    width: "100%",
    height: "100%",
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
  modalInput: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7E3EF",
    padding: 14,
    color: "#18142F",
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  captionCounter: {
    color: "#777777",
    fontSize: 11,
    textAlign: "right",
    marginTop: 6,
  },
  authenticityCard: {
    marginBottom: 18,
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#17130a",
    borderWidth: 1,
    borderColor: "rgba(255, 204, 102, 0.28)",
    shadowColor: "#ffcc66",
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
    backgroundColor: "#ffcc66",
  },
  authenticityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffe3a3",
    letterSpacing: 0.2,
  },
  authenticityText: {
    fontSize: 12,
    lineHeight: 20,
    color: "#f6e5bf",
  },
  modalSubmitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4700ecff",
    paddingVertical: 14,
    borderRadius: 16,
  },
  modalSubmitButtonDisabled: {
    opacity: 0.4,
  },
  modalSubmitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
