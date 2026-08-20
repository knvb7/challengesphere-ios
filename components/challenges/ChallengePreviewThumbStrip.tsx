import { Image } from "expo-image";
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  type ChallengeSubmissionPreview as ChallengeSubmissionPreviewType,
  type SubmissionPreviewItem,
} from "../../types/api";
import { useSignedMediaRecovery } from "../../hooks/useSignedMediaRecovery";
import { createCachedRemoteImageSource } from "../../utils/remoteImageCache";

interface ChallengePreviewThumbStripProps {
  preview?: ChallengeSubmissionPreviewType;
  loading?: boolean;
  maxSlots?: number;
  onSubmissionPress?: (submission: SubmissionPreviewItem) => void;
}

const SKELETON_ITEMS = [0, 1, 2, 3, 4, 5, 6];

const ChallengePreviewThumbStrip: React.FC<ChallengePreviewThumbStripProps> = ({
  preview,
  loading = false,
  maxSlots = 7,
  onSubmissionPress,
}) => {
  const recoverSignedMedia = useSignedMediaRecovery();
  const [failedSubmissionIds, setFailedSubmissionIds] = useState<number[]>([]);

  useEffect(() => {
    setFailedSubmissionIds([]);
  }, [preview?.challengeId, preview?.submissions]);

  const visibleSubmissions = useMemo(
    () =>
      (preview?.submissions || [])
        .filter(
          (submission) =>
            !failedSubmissionIds.includes(submission.submissionId),
        )
        .slice(0, maxSlots),
    [failedSubmissionIds, preview?.submissions, maxSlots],
  );

  const totalCount = Math.max(
    preview?.totalCount || 0,
    visibleSubmissions.length,
  );
  const hiddenCount = Math.max(0, totalCount - visibleSubmissions.length);
  const hasSubmissions = visibleSubmissions.length > 0;

  return (
    <View style={styles.track}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Submissions
        </Text>
      </View>

      {loading ? (
        <View style={styles.thumbnailRow}>
          {SKELETON_ITEMS.map((item) => (
            <View key={item} style={[styles.thumbnailButton, styles.skeleton]}>
              {item === 0 && <ActivityIndicator size="small" color="#7f68d2" />}
            </View>
          ))}
        </View>
      ) : hasSubmissions ? (
        <View style={styles.thumbnailRow}>
          {visibleSubmissions.map((submission, index) => {
            const showOverflow =
              hiddenCount > 0 && index === visibleSubmissions.length - 1;

            return (
              <TouchableOpacity
                key={submission.submissionId}
                style={styles.thumbnailButton}
                activeOpacity={onSubmissionPress ? 0.78 : 1}
                onPress={(event) => {
                  event.stopPropagation();
                  onSubmissionPress?.(submission);
                }}
                accessibilityRole={onSubmissionPress ? "button" : undefined}
                accessibilityLabel={`Open submission ${submission.submissionId}`}
                disabled={!onSubmissionPress}
              >
                <Image
                  source={createCachedRemoteImageSource(submission.mediaUrl)}
                  style={styles.thumbnail}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={120}
                  onError={() => {
                    recoverSignedMedia(submission.mediaUrl);
                    setFailedSubmissionIds((current) =>
                      current.includes(submission.submissionId)
                        ? current
                        : [...current, submission.submissionId],
                    );
                  }}
                />
                {showOverflow && (
                  <View style={styles.overflowOverlay}>
                    <View style={styles.overflowCount}>
                      <Text style={styles.overflowText}>+{hiddenCount}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No submissions yet. Be the first one to post!
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    gap: 7,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#afa7ba",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  thumbnailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  thumbnailButton: {
    width: 38,
    height: 38,
    overflow: "hidden",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "#17161d",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  overflowOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: 5,
    backgroundColor: "rgba(0, 0, 0, 0.28)",
  },
  overflowCount: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "rgba(8, 8, 11, 0.9)",
  },
  overflowText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  emptyState: {
    minHeight: 28,
    justifyContent: "center",
  },
  emptyText: {
    color: "#867d91",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  skeleton: {
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#2d2a35",
    backgroundColor: "#15141a",
  },
});

export default ChallengePreviewThumbStrip;
