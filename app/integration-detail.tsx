import { Ionicons } from "@expo/vector-icons";
import { AppAlert as Alert } from "@/utils/appAlert";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppTouchableOpacity as TouchableOpacity } from "@/components/common/AppPressable";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import FloatingScreenControls from "../components/common/FloatingScreenControls";
import IntegrationLogo from "../components/integrations/IntegrationLogo";
import AvatarImage from "../components/common/AvatarImage";
import {
  CODING_INTEGRATIONS_ENABLED,
  INTEGRATION_PROVIDERS,
} from "../constants/integrationProviders";
import { useCodeforcesIntegration } from "../hooks/useCodeforcesIntegration";
import { useLeetCodeIntegration } from "../hooks/useLeetCodeIntegration";
import { useAuthContext } from "../providers/AuthProvider";
import {
  normalizeCodeforcesHandle,
  syncCodeforcesProfile,
} from "../services/codeforcesService";
import {
  normalizeLeetCodeUsername,
  syncLeetCodeProfile,
} from "../services/leetcodeService";
import {
  CodeforcesProfileSnapshot,
  CodeforcesSubmission,
  IntegrationProvider,
  LeetCodeProfileSnapshot,
  LeetCodeSubmission,
} from "../types/integrations";
import { getApiErrorMessage } from "../utils/apiError";

const formatSyncedAt = (value?: string) => {
  if (!value) return "Never synced";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatRank = (rank?: string) => {
  if (!rank) return "Unrated";
  return rank
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatVerdict = (verdict: string) => verdict.replace(/_/g, " ");

const IntegrationDetailScreen = () => {
  const router = useRouter();
  const { top: topInset } = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const providerKey = (params.provider as IntegrationProvider) || "CODEFORCES";
  const provider =
    INTEGRATION_PROVIDERS[providerKey] || INTEGRATION_PROVIDERS.CODEFORCES;
  const isCodeforcesProvider = provider.key === "CODEFORCES";
  const isLeetCodeProvider = provider.key === "LEETCODE";
  const { currentUserId } = useAuthContext();
  const [validationSummary, setValidationSummary] = useState("");
  const [validationError, setValidationError] = useState("");
  const [validatedHandle, setValidatedHandle] = useState("");
  const [validatedCodeforcesSnapshot, setValidatedCodeforcesSnapshot] =
    useState<CodeforcesProfileSnapshot | null>(null);
  const [validatedLeetCodeSnapshot, setValidatedLeetCodeSnapshot] =
    useState<LeetCodeProfileSnapshot | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const codeforcesIntegration = useCodeforcesIntegration(
    currentUserId,
    CODING_INTEGRATIONS_ENABLED
  );
  const leetCodeIntegration = useLeetCodeIntegration(
    currentUserId,
    CODING_INTEGRATIONS_ENABLED
  );
  const {
    connection,
    latestSnapshot,
    draftHandle,
    setDraftHandle,
    isConnected,
    isHandleLocked,
    unlocksAtLabel,
    isLoading,
    isSaving,
    isSyncing,
    error,
    saveHandle,
    disconnect,
  } = isLeetCodeProvider
    ? {
        connection: leetCodeIntegration.connection,
        latestSnapshot: leetCodeIntegration.latestSnapshot,
        draftHandle: leetCodeIntegration.draftUsername,
        setDraftHandle: leetCodeIntegration.setDraftUsername,
        isConnected: leetCodeIntegration.isConnected,
        isHandleLocked: leetCodeIntegration.isUsernameLocked,
        unlocksAtLabel: leetCodeIntegration.unlocksAtLabel,
        isLoading: leetCodeIntegration.isLoading,
        isSaving: leetCodeIntegration.isSaving,
        isSyncing: leetCodeIntegration.isSyncing,
        error: leetCodeIntegration.error,
        saveHandle: leetCodeIntegration.saveUsername,
        disconnect: leetCodeIntegration.disconnect,
      }
    : codeforcesIntegration;

  const snapshot: any = isLeetCodeProvider
    ? validatedLeetCodeSnapshot || latestSnapshot
    : validatedCodeforcesSnapshot || latestSnapshot;
  const profile: any = snapshot?.profile;
  const avatarUrl = profile?.titlePhoto || profile?.avatar;
  const hasDraftHandle = draftHandle.trim().length > 0;
  const handleEditingLocked = isConnected && isHandleLocked;
  const disconnectDisabled = handleEditingLocked || isSaving || isSyncing;
  const normalizedDraftHandle = isLeetCodeProvider
    ? normalizeLeetCodeUsername(draftHandle)
    : normalizeCodeforcesHandle(draftHandle);
  const credentialLabel = isLeetCodeProvider ? "username" : "handle";
  const credentialLabelTitle = isLeetCodeProvider ? "Username" : "Handle";
  const credentialPlaceholder = isLeetCodeProvider
    ? "leetcode_user"
    : "codeforces_user";
  const providerDisplayName = provider.name;
  const validateActionLabel = "Validate";
  const saveActionLabel = isLeetCodeProvider
    ? "Save LeetCode"
    : "Save Codeforces";
  const confirmTitle = isLeetCodeProvider
    ? "Is this your LeetCode username?"
    : "Is this your Codeforces handle?";
  const isHandleValidated =
    hasDraftHandle &&
    validatedHandle === normalizedDraftHandle &&
    !validationError;

  const handleDraftHandleChange = (value: string) => {
    setDraftHandle(value);
    setValidationSummary("");
    setValidationError("");
    setValidatedHandle("");
    setValidatedCodeforcesSnapshot(null);
    setValidatedLeetCodeSnapshot(null);
  };

  const handleValidateHandle = async () => {
    if (!normalizedDraftHandle || handleEditingLocked || isValidating) return;

    setValidationError("");
    setValidationSummary("");
    setValidatedCodeforcesSnapshot(null);
    setValidatedLeetCodeSnapshot(null);
    setIsValidating(true);
    try {
      if (isLeetCodeProvider) {
        const fetchedSnapshot = await syncLeetCodeProfile(
          normalizedDraftHandle,
        );
        setValidatedLeetCodeSnapshot(fetchedSnapshot);
        setValidationSummary(
          `Found @${fetchedSnapshot.username}. Confirm it is the right ${providerDisplayName} ${credentialLabel}, then save.`,
        );
      } else {
        const fetchedSnapshot = await syncCodeforcesProfile(
          normalizedDraftHandle,
        );
        setValidatedCodeforcesSnapshot(fetchedSnapshot);
        setValidationSummary(
          `Found @${fetchedSnapshot.handle}. Confirm it is the right ${providerDisplayName} ${credentialLabel}, then save.`,
        );
      }
      setValidatedHandle(normalizedDraftHandle);
      void Haptics.selectionAsync();
    } catch (validateError) {
      setValidationError(
        getApiErrorMessage(
          validateError,
          `Could not validate this ${providerDisplayName} profile. Please try again.`,
        ),
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmAndSave = () => {
    if (!isHandleValidated || isSaving || isSyncing || handleEditingLocked)
      return;
    const normalizedDraft = draftHandle.trim().replace(/^@+/, "");

    Alert.alert(
      confirmTitle,
      `@${normalizedDraft}\n\nConfirm carefully. After saving, you cannot change this ${credentialLabel} for 7 days.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, save it",
          onPress: async () => {
            void Haptics.selectionAsync();
            try {
              await saveHandle();
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch {
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error,
              );
            }
          },
        },
      ],
    );
  };

  const handleDisconnect = () => {
    if (disconnectDisabled) return;

    Alert.alert(
      `Disconnect ${providerDisplayName}?`,
      `This removes the saved ${credentialLabel} from this device.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            void Haptics.selectionAsync();
            void disconnect();
          },
        },
      ],
    );
  };

  const openProblem = (
    submission: CodeforcesSubmission | LeetCodeSubmission,
  ) => {
    if (!submission.problemUrl) return;
    Linking.openURL(submission.problemUrl);
  };

  if (!provider.available || (!isCodeforcesProvider && !isLeetCodeProvider)) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <FloatingScreenControls onBackPress={() => router.back()} />
        <View style={[styles.unavailableWrap, { paddingTop: topInset + 8 }]}>
          <IntegrationLogo provider={provider} size={62} disabled />
          <Text style={styles.emptyTitle} accessibilityRole="header">{provider.name}</Text>
          <Text style={styles.emptyText}>
            This integration is coming soon and is not available yet.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FloatingScreenControls onBackPress={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: topInset + 8 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.providerHeader}>
            <View style={styles.providerIdentity}>
              <IntegrationLogo provider={provider} size={52} />
              <View style={styles.providerTitleWrap}>
                <Text style={styles.providerName} accessibilityRole="header">
                  {providerDisplayName}
                </Text>
                <Text style={styles.providerSubtitle}>
                  Public {credentialLabel} only
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.statusPill,
                isConnected
                  ? styles.statusPillConnected
                  : styles.statusPillIdle,
              ]}
            >
              <Ionicons
                name={isConnected ? "checkmark-circle" : "ellipse-outline"}
                size={13}
                color={isConnected ? "#D5FFB5" : "#B6B6B6"}
              />
              <Text
                style={[
                  styles.statusText,
                  isConnected
                    ? styles.statusTextConnected
                    : styles.statusTextIdle,
                ]}
              >
                {isConnected ? "Saved" : "Not linked"}
              </Text>
            </View>
          </View>

          <View style={styles.privacyCard}>
            <Ionicons
              name="shield-checkmark-outline"
              size={19}
              color="#D5FFB5"
            />
            <Text style={styles.privacyText}>
              {isLeetCodeProvider
                ? "We use public LeetCode profile data only. No password, session cookie, token, or private account data is requested or stored."
                : "We use public Codeforces APIs only. No password, token, private message, or private account data is requested or stored."}
            </Text>
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>
              {providerDisplayName} {credentialLabel}
            </Text>
            <View
              style={[
                styles.inputRow,
                handleEditingLocked && styles.inputRowLocked,
              ]}
            >
              <TextInput
                style={styles.handleInput}
                placeholder={credentialPlaceholder}
                placeholderTextColor="#666666"
                value={draftHandle}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={handleDraftHandleChange}
                maxLength={64}
                editable={!isSaving && !isSyncing && !handleEditingLocked}
                returnKeyType="done"
              />
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#8F5CFF"
                  style={styles.inputLoader}
                />
              ) : null}
              <TouchableOpacity
                style={[
                  styles.inputValidateButton,
                  (!hasDraftHandle || handleEditingLocked || isValidating) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleValidateHandle}
                disabled={
                  !hasDraftHandle || handleEditingLocked || isValidating
                }
                activeOpacity={0.82}
              >
                {isValidating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons
                    name={
                      isLeetCodeProvider ? "search-outline" : "open-outline"
                    }
                    size={15}
                    color="#ffffff"
                  />
                )}
                <Text style={styles.inputValidateButtonText}>
                  {validateActionLabel}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              {handleEditingLocked
                ? `${credentialLabelTitle} locked for 7 days. You can edit it after ${unlocksAtLabel}.`
                : isLeetCodeProvider
                  ? `Tap Validate to fetch the public profile, then use Save ${providerDisplayName} to store this ${credentialLabel}.`
                  : `Tap Validate to open the public profile, then use Save ${providerDisplayName} to store this ${credentialLabel}.`}
            </Text>
          </View>

          {validationSummary ? (
            <View style={styles.validationBanner}>
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="#D5FFB5"
              />
              <Text style={styles.validationText}>{validationSummary}</Text>
            </View>
          ) : null}

          {validationError || error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={18} color="#FFD3D3" />
              <Text style={styles.errorText}>{validationError || error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!isHandleValidated ||
                isSaving ||
                isSyncing ||
                handleEditingLocked) &&
                styles.buttonDisabled,
            ]}
            onPress={handleConfirmAndSave}
            disabled={
              !isHandleValidated || isSaving || isSyncing || handleEditingLocked
            }
            activeOpacity={0.86}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#06140B" />
            ) : (
              <Ionicons name="save-outline" size={18} color="#06140B" />
            )}
            <Text style={styles.primaryButtonText}>{saveActionLabel}</Text>
          </TouchableOpacity>

          <View style={styles.syncMetaRow}>
            <Ionicons name="time-outline" size={15} color="#8E8E8E" />
            <Text style={styles.syncMetaText}>
              Last sync: {formatSyncedAt(connection?.lastSyncedAt)}
            </Text>
          </View>
        </View>

        {snapshot ? (
          <View style={styles.snapshotCard}>
            <View style={styles.snapshotHeader}>
              <AvatarImage uri={avatarUrl} size={56} style={styles.avatar} />
              <View style={styles.snapshotIdentity}>
                <Text style={styles.snapshotHandle}>
                  @{snapshot.handle || snapshot.username}
                </Text>
                <Text style={styles.snapshotRank}>
                  {isLeetCodeProvider
                    ? profile?.ranking
                      ? `Rank ${profile.ranking}`
                      : "Unranked"
                    : formatRank(profile?.rank)}
                </Text>
              </View>
              <View style={styles.liveChip}>
                <Ionicons name="radio-button-on" size={11} color="#7DFF9A" />
                <Text style={styles.liveChipText}>Synced</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              {isLeetCodeProvider ? (
                <>
                  <StatTile
                    label="Solved"
                    value={snapshot.totalSolved?.toString() || "--"}
                    icon="checkmark-done-outline"
                  />
                  <StatTile
                    label="Medium"
                    value={snapshot.mediumSolved?.toString() || "--"}
                    icon="pulse-outline"
                  />
                  <StatTile
                    label="Hard"
                    value={snapshot.hardSolved?.toString() || "--"}
                    icon="flame-outline"
                  />
                </>
              ) : (
                <>
                  <StatTile
                    label="Rating"
                    value={profile?.rating?.toString() || "--"}
                    icon="pulse-outline"
                  />
                  <StatTile
                    label="Max"
                    value={profile?.maxRating?.toString() || "--"}
                    icon="trending-up-outline"
                  />
                  <StatTile
                    label="Accepted"
                    value={snapshot.acceptedCount.toString()}
                    icon="checkmark-done-outline"
                  />
                </>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="terminal-outline" size={26} color="#8F5CFF" />
            <Text style={styles.emptyTitle}>
              Connect your {credentialLabel}.
            </Text>
            <Text style={styles.emptyText}>
              Once saved, tap Sync {providerDisplayName} whenever you want a
              fresh public snapshot.
            </Text>
          </View>
        )}

        {snapshot?.submissions?.length ? (
          <View style={styles.submissionsCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Solved Problems</Text>
              <Text style={styles.sectionCaption}>
                Top {Math.min(snapshot.submissions.length, 20)} solved
              </Text>
            </View>

            {snapshot.submissions.map((submission: any) => (
              <TouchableOpacity
                key={submission.id}
                style={styles.submissionRow}
                onPress={() => openProblem(submission)}
                disabled={!submission.problemUrl}
                activeOpacity={0.78}
              >
                <View
                  style={[
                    styles.verdictDot,
                    submission.accepted
                      ? styles.verdictOk
                      : styles.verdictOther,
                  ]}
                />
                <View style={styles.submissionBody}>
                  <Text style={styles.submissionTitle} numberOfLines={1}>
                    {submission.problemName || submission.title}
                  </Text>
                  <Text style={styles.submissionMeta} numberOfLines={1}>
                    {"verdict" in submission
                      ? `${formatVerdict(submission.verdict)} · ${submission.programmingLanguage}`
                      : "Accepted"}
                  </Text>
                </View>
                {"problemRating" in submission && submission.problemRating ? (
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingBadgeText}>
                      {submission.problemRating}
                    </Text>
                  </View>
                ) : null}
                {submission.problemUrl ? (
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color="#777777"
                    style={styles.openIcon}
                  />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {isConnected ? (
          <TouchableOpacity
            style={[styles.disconnectButton, disconnectDisabled && styles.disconnectButtonDisabled]}
            onPress={handleDisconnect}
            disabled={disconnectDisabled}
            activeOpacity={0.82}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={disconnectDisabled ? "#755858" : "#FF6B6B"}
            />
            <Text style={[styles.disconnectText, disconnectDisabled && styles.disconnectTextDisabled]}>
              Disconnect {providerDisplayName}
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const StatTile = ({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) => (
  <View style={styles.statTile}>
    <Ionicons name={icon} size={18} color="#D7C6FF" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7FC",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E7E3EF",
    padding: 14,
    marginBottom: 12,
  },
  providerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingLeft: 52,
  },
  providerIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  providerTitleWrap: {
    flex: 1,
  },
  providerName: {
    color: "#18142F",
    fontSize: 16,
    fontWeight: "600",
  },
  providerSubtitle: {
    color: "#8e8e8e",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillConnected: {
    backgroundColor: "#ECFDF3",
    borderColor: "#3d7c3e",
  },
  statusPillIdle: {
    backgroundColor: "#F8F7FC",
    borderColor: "#E7E3EF",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextConnected: {
    color: "#187A3D",
  },
  statusTextIdle: {
    color: "#b6b6b6",
  },
  privacyCard: {
    flexDirection: "row",
    gap: 9,
    backgroundColor: "#ECFDF3",
    borderWidth: 1,
    borderColor: "#254b29",
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
  },
  privacyText: {
    flex: 1,
    color: "#187A3D",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
  inputBlock: {
    marginTop: 14,
  },
  inputLabel: {
    color: "#18142F",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputRow: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333333",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  inputRowLocked: {
    opacity: 0.72,
  },
  handleInput: {
    flex: 1,
    color: "#18142F",
    fontSize: 16,
    fontWeight: "400",
    paddingVertical: 12,
  },
  inputLoader: {
    marginLeft: 4,
  },
  inputValidateButton: {
    minHeight: 34,
    borderRadius: 13,
    backgroundColor: "#22c55e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 9,
    flexShrink: 0,
  },
  inputValidateButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  helperText: {
    color: "#8e8e8e",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  errorBanner: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#7a2c2c",
    marginTop: 14,
  },
  errorText: {
    flex: 1,
    color: "#B4233C",
    fontSize: 13,
    lineHeight: 18,
  },
  validationBanner: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#ECFDF3",
    borderWidth: 1,
    borderColor: "#254b29",
    marginTop: 14,
  },
  validationText: {
    flex: 1,
    color: "#187A3D",
    fontSize: 13,
    lineHeight: 18,
  },
  stepsCard: {
    backgroundColor: "#F0ECFF",
    borderWidth: 1,
    borderColor: "#DDD4FF",
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
  },
  stepsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  stepsTitle: {
    color: "#18142F",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  stepIntro: {
    color: "#777389",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    marginTop: 8,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumberText: {
    color: "#06140b",
    fontSize: 12,
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    color: "#18142F",
    fontSize: 12,
    lineHeight: 17,
  },
  stepsLinkButton: {
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: "#22c55e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 12,
  },
  stepsLinkButtonText: {
    color: "#06140b",
    fontSize: 13,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: "#F0ECFF",
    borderWidth: 1,
    borderColor: "#DDD4FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  secondaryFullButton: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: "#F0ECFF",
    borderWidth: 1,
    borderColor: "#DDD4FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: "#22c55e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  secondaryButtonText: {
    color: "#4700EC",
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "center",
  },
  primaryButtonText: {
    color: "#06140b",
    fontSize: 14,
    fontWeight: "700",
  },
  syncMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  syncMetaText: {
    color: "#8e8e8e",
    fontSize: 12,
  },
  snapshotCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E7E3EF",
    padding: 14,
    marginBottom: 12,
  },
  snapshotHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 24,
    backgroundColor: "#222222",
  },
  snapshotIdentity: {
    flex: 1,
  },
  snapshotHandle: {
    color: "#18142F",
    fontSize: 17,
    fontWeight: "600",
  },
  snapshotRank: {
    color: "#c6ffb8",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 3,
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ECFDF3",
  },
  liveChipText: {
    color: "#187A3D",
    fontSize: 11,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  statTile: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#F8F7FC",
    borderWidth: 1,
    borderColor: "#E7E3EF",
    paddingVertical: 14,
    alignItems: "center",
  },
  statValue: {
    color: "#18142F",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 6,
  },
  statLabel: {
    color: "#8e8e8e",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  emptyCard: {
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E3EF",
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#18142F",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
  },
  emptyText: {
    color: "#8e8e8e",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  unavailableWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  submissionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E7E3EF",
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#18142F",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionCaption: {
    color: "#8f5cff",
    fontSize: 12,
    fontWeight: "600",
  },
  submissionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E3EF",
  },
  verdictDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 11,
  },
  verdictOk: {
    backgroundColor: "#7dff9a",
  },
  verdictOther: {
    backgroundColor: "#ffb84d",
  },
  submissionBody: {
    flex: 1,
  },
  submissionTitle: {
    color: "#18142F",
    fontSize: 14,
    fontWeight: "500",
  },
  submissionMeta: {
    color: "#8e8e8e",
    fontSize: 12,
    marginTop: 3,
  },
  ratingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F0ECFF",
    marginLeft: 8,
  },
  ratingBadgeText: {
    color: "#4700EC",
    fontSize: 11,
    fontWeight: "600",
  },
  openIcon: {
    marginLeft: 8,
  },
  disconnectButton: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#663030",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disconnectButtonDisabled: {
    borderColor: "#392828",
    opacity: 0.58,
  },
  disconnectText: {
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "600",
  },
  disconnectTextDisabled: {
    color: "#755858",
  },
});

export default IntegrationDetailScreen;
