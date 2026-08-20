import { Ionicons } from "@expo/vector-icons";
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { Image } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  type ChallengeSubmissionPreview as ChallengeSubmissionPreviewType,
} from "../../types/api";
import { useSignedMediaRecovery } from "../../hooks/useSignedMediaRecovery";
import { createCachedRemoteImageSource } from "../../utils/remoteImageCache";

interface ChallengeTileSubmissionBackProps {
  preview?: ChallengeSubmissionPreviewType;
  loading?: boolean;
  onFlipBack: (event: GestureResponderEvent) => void;
}

interface ChallengeTileFlipButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  accessibilityLabel?: string;
  direction?: "front" | "back";
}

const SKELETON_ITEMS = [0, 1, 2, 3];
const PREVIEW_SLOT_COUNT = 4;

export function ChallengeTileFlipButton({
  onPress,
  accessibilityLabel = "Flip challenge tile",
  direction = "front",
}: ChallengeTileFlipButtonProps) {
  return (
    <TouchableOpacity
      style={styles.flipButton}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
    >
      <View
        pointerEvents="none"
        style={[styles.flipButtonAura, styles.flipButtonAuraStatic]}
      />
      <View pointerEvents="none" style={styles.flipButtonRing} />
      <Ionicons
        name={direction === "back" ? "arrow-undo-outline" : "sync-outline"}
        size={21}
        color="#FFFFFF"
      />
    </TouchableOpacity>
  );
}

export default function ChallengeTileSubmissionBack({
  preview,
  loading = false,
  onFlipBack,
}: ChallengeTileSubmissionBackProps) {
  const recoverSignedMedia = useSignedMediaRecovery();
  const [failedSubmissionIds, setFailedSubmissionIds] = useState<number[]>([]);

  useEffect(() => {
    setFailedSubmissionIds([]);
  }, [preview?.challengeId, preview?.submissions]);

  const visibleSubmissions = useMemo(
    () =>
      (preview?.submissions || [])
        .filter((submission) => !failedSubmissionIds.includes(submission.submissionId))
        .slice(0, PREVIEW_SLOT_COUNT),
    [failedSubmissionIds, preview?.submissions],
  );
  const totalCount = Math.max(preview?.totalCount || 0, visibleSubmissions.length);
  const hiddenCount = Math.max(0, totalCount - visibleSubmissions.length);
  const missingSlotCount = Math.max(0, PREVIEW_SLOT_COUNT - visibleSubmissions.length);

  return (
    <View style={styles.back}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Recent</Text>
          <Text style={styles.title}>Submissions</Text>
        </View>
        <ChallengeTileFlipButton
          direction="back"
          onPress={onFlipBack}
          accessibilityLabel="Show challenge details"
        />
      </View>

      {loading ? (
        <View style={styles.grid}>
          {SKELETON_ITEMS.map((item) => (
            <View key={item} style={[styles.tile, styles.skeleton]}>
              {item === 0 ? <ActivityIndicator size="small" color="#8E61FF" /> : null}
            </View>
          ))}
        </View>
      ) : visibleSubmissions.length > 0 ? (
        <View style={styles.grid}>
          {visibleSubmissions.map((submission, index) => {
            const showOverflow = hiddenCount > 0 && index === visibleSubmissions.length - 1;

            return (
              <View key={submission.submissionId} style={styles.tile}>
                <Image
                  source={createCachedRemoteImageSource(submission.mediaUrl)}
                  style={styles.thumbnail}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={120}
                  onError={() => {
                    recoverSignedMedia(submission.mediaUrl);
                    setFailedSubmissionIds((current) => (
                      current.includes(submission.submissionId)
                        ? current
                        : [...current, submission.submissionId]
                    ));
                  }}
                />
                {showOverflow ? (
                  <View style={styles.overflowOverlay}>
                    <View style={styles.overflowCount}>
                      <Text style={styles.overflowText}>+{hiddenCount}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
          {Array.from({ length: missingSlotCount }, (_, index) => (
            <View
              key={`submission-preview-spacer-${index}`}
              style={styles.tileSpacer}
              pointerEvents="none"
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconShell}>
            <Ionicons name="images-outline" size={26} color="#BFAFFF" />
          </View>
          <Text style={styles.emptyTitle}>No submissions yet</Text>
          <Text style={styles.emptyText}>Be the first one to submit?</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    flex: 1,
    padding: 12,
    backgroundColor: "#121017",
  },
  header: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  eyebrow: {
    color: "#8F86A0",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
  },
  flipButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4700EC",
    borderWidth: 1,
    borderColor: "rgba(191, 175, 255, 0.68)",
    shadowColor: "#8E61FF",
    shadowOpacity: 0.44,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  flipButtonAura: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(142, 97, 255, 0.44)",
  },
  flipButtonAuraStatic: {
    opacity: 0.18,
    transform: [{ scale: 1.06 }],
  },
  flipButtonRing: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderLeftColor: "rgba(218, 209, 255, 0.96)",
    borderTopColor: "rgba(169, 140, 255, 0.24)",
    borderRightColor: "rgba(191, 175, 255, 0.68)",
    borderBottomColor: "rgba(169, 140, 255, 0.24)",
  },
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tile: {
    width: "48%",
    height: "48%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#17161D",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  tileSpacer: {
    width: "48%",
    height: "48%",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  overflowOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: 7,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
  },
  overflowCount: {
    minWidth: 30,
    height: 28,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(8, 8, 11, 0.9)",
  },
  overflowText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
  },
  skeleton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17141F",
    borderColor: "#2D2A35",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  emptyIconShell: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(142, 97, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(191, 175, 255, 0.26)",
    marginBottom: 10,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    color: "#AFA7BA",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
});
