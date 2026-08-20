import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import React, { useEffect, useState } from "react";
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useChallengeCrewStatus } from "../../hooks/useChallengeCrew";
import { useSignedMediaRecovery } from "../../hooks/useSignedMediaRecovery";
import { useAuthContext } from "../../providers/AuthProvider";
import { parseChallengeCategories } from "../../utils/challengeCategories";
import { isViewerChallengeCompleted } from "../../utils/challengeCompletion";
import { getChallengeFallbackPhotoSource } from "../../utils/challengeFallbackPhotos";
import { isOneOffChallengeMode } from "../../utils/challengeMode";
import { getMinimumVisibleChallengerCount } from "../../utils/challengeParticipantCounts";
import {
  MappedChallenge,
  getChallengeDayFromStartDate,
} from "../common/ChallengeCard";

interface MyChallengeGalleryCardProps {
  challenge: MappedChallenge;
  onPress: () => void;
  crewState?: string;
  crewAcceptedCount?: number;
  crewStateManaged?: boolean;
  onRecapPress?: (challenge: MappedChallenge) => void;
  onToggleFavorite?: (challenge: MappedChallenge) => void;
  favoritePending?: boolean;
}

const getBadgeLabel = (challenge: MappedChallenge, crewState?: string): string => {
  if (challenge.status === "deleted") return "Inactive";
  if (challenge.participationActive === false) {
    return challenge.isCreator ? "Exited" : challenge.isFavorite ? "Saved" : "Left";
  }
  if (isViewerChallengeCompleted({
    status: challenge.status,
    challengeMode: challenge.challengeMode,
    crewState,
  })) return "Completed";
  if (crewState === "LOBBY") return challenge.isCreator ? "Ready to start" : "Starts soon";
  if (challenge.status === "upcoming") return "Upcoming";
  if (challenge.isPrivate) return "Private";
  return challenge.isCreator ? "Created" : "Joined";
};

const getJoinedCount = (challenge: MappedChallenge): number => {
  if (typeof challenge.participantCount === "number") {
    return getMinimumVisibleChallengerCount(challenge.participantCount);
  }

  return getMinimumVisibleChallengerCount(undefined);
};

const MyChallengeGalleryCard: React.FC<MyChallengeGalleryCardProps> = ({
  challenge,
  onPress,
  crewState,
  crewAcceptedCount,
  crewStateManaged = false,
  onRecapPress,
  onToggleFavorite,
  favoritePending = false,
}) => {
  const { currentUserId } = useAuthContext();
  const recoverSignedMedia = useSignedMediaRecovery();
  const [imageFailed, setImageFailed] = useState(false);
  const currentDay = getChallengeDayFromStartDate(challenge.startDate);
  const oneOff = isOneOffChallengeMode(challenge.challengeMode);
  const percent = Math.max(
    0,
    Math.min(100, challenge.completionPercentage ?? challenge.progress ?? 0),
  );
  const { data: crewStatus } = useChallengeCrewStatus(
    Number(challenge.id),
    Boolean(
      challenge.isPrivate
      && challenge.status !== "completed"
      && challenge.status !== "deleted"
      && currentUserId
      && Number(challenge.id) > 0
      && !crewStateManaged
    ),
  );
  const resolvedCrewState = crewState ?? crewStatus?.state;
  const resolvedCrewAcceptedCount = crewAcceptedCount ?? crewStatus?.acceptedCount;
  const challengeFinished = isViewerChallengeCompleted({
    status: challenge.status,
    challengeMode: challenge.challengeMode,
    crewState: resolvedCrewState,
  });
  const badgeLabel = getBadgeLabel(challenge, resolvedCrewState);
  const categories = parseChallengeCategories(challenge.category);
  const visibleCategories = categories.slice(0, 2);
  const extraCategoryCount = Math.max(0, categories.length - visibleCategories.length);
  const joinedCount = getJoinedCount(challenge);
  const imageSource =
    challenge.image && !imageFailed
      ? { uri: challenge.image }
      : getChallengeFallbackPhotoSource(challenge);

  useEffect(() => {
    setImageFailed(false);
  }, [challenge.id, challenge.image]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={`Open ${challenge.title}, ${badgeLabel}`}
    >
      <ImageBackground
        source={imageSource}
        style={styles.image}
        imageStyle={styles.imageRadius}
        resizeMode="cover"
        onError={() => {
          recoverSignedMedia(challenge.image);
          setImageFailed(true);
        }}
      >
        <LinearGradient
          colors={[
            "transparent",
            "rgba(7, 6, 10, 0.16)",
            "rgba(7, 6, 10, 0.97)",
          ]}
          locations={[0.2, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </View>
          <View style={styles.topActions}>
            {challengeFinished && onRecapPress ? (
              <TouchableOpacity
                style={styles.recapButton}
                onPress={(event) => {
                  event.stopPropagation();
                  onRecapPress(challenge);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Play recap for ${challenge.title}`}
              >
                <Ionicons name="play" size={17} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
            {onToggleFavorite ? (
              <TouchableOpacity
                style={[
                  styles.favoriteButton,
                  challenge.isFavorite && styles.favoriteButtonActive,
                ]}
                onPress={(event) => {
                  event.stopPropagation();
                  onToggleFavorite(challenge);
                }}
                busy={favoritePending}
                accessibilityRole="button"
                accessibilityLabel={`${challenge.isFavorite ? "Remove" : "Add"} ${challenge.title} ${challenge.isFavorite ? "from" : "to"} favourites`}
                accessibilityState={{ selected: Boolean(challenge.isFavorite) }}
              >
                <Ionicons
                  name={challenge.isFavorite ? "heart" : "heart-outline"}
                  size={18}
                  color={challenge.isFavorite ? "#3F149A" : "#5525CE"}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={2} selectable>
            {challenge.title}
          </Text>
          <View style={styles.infoRow}>
            <View style={styles.categoryRow}>
              {visibleCategories.map((category) => (
                <View key={category} style={styles.categoryPill}>
                  <Text style={styles.categoryText} numberOfLines={1}>
                    {category}
                  </Text>
                </View>
              ))}
              {extraCategoryCount > 0 ? (
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryText}>+{extraCategoryCount}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.joinedRow}>
              <Ionicons name="people-outline" size={11} color="#D8D2DF" />
              <Text style={styles.joinedText} numberOfLines={1}>
                {resolvedCrewState === "LOBBY" && typeof resolvedCrewAcceptedCount === "number"
                  ? `${resolvedCrewAcceptedCount} participant${resolvedCrewAcceptedCount === 1 ? "" : "s"}`
                  : `${joinedCount.toLocaleString()} joined`}
              </Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {oneOff
                ? resolvedCrewState === "LOBBY"
                  ? "Not started"
                  : "One-off"
                : resolvedCrewState === "LOBBY"
                  ? "Not started"
                : challenge.status === "completed"
                  ? `${challenge.numberOfDays} days`
                  : `Day ${Math.min(currentDay, challenge.numberOfDays || currentDay)} of ${challenge.numberOfDays}`}
            </Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>{percent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={["#8E61FF", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${percent}%` as any }]}
            />
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    height: 228,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#1A1820",
    borderWidth: 1,
    borderColor: "#292630",
  },
  image: {
    height: 228,
    justifyContent: "space-between",
    backgroundColor: "#0F1110",
  },
  imageRadius: {
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
  },
  topRow: {
    paddingTop: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(12, 10, 17, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  badgeText: {
    color: "#F5F2F8",
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  recapButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5B2BC4",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.52)",
    shadowColor: "#28105F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 7,
    elevation: 4,
  },
  favoriteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(231, 224, 255, 0.94)",
    borderWidth: 1,
    borderColor: "#C6B6FF",
    shadowColor: "#3F149A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 7,
    elevation: 3,
  },
  favoriteButtonActive: {
    backgroundColor: "#CDBDFF",
    borderColor: "#A98FFF",
  },
  copy: {
    padding: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 0,
    marginBottom: 6,
  },
  infoRow: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 7,
  },
  categoryRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  categoryPill: {
    maxWidth: 68,
    minHeight: 20,
    justifyContent: "center",
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "700",
  },
  joinedRow: {
    maxWidth: 86,
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  joinedText: {
    color: "#D8D2DF",
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "#C0BAC6",
    fontSize: 10,
    fontWeight: "600",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#766F7E",
  },
  progressTrack: {
    height: 3,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
});

export default MyChallengeGalleryCard;
