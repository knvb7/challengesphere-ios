import { LinearGradient } from "expo-linear-gradient";
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import React, { useEffect, useState } from "react";
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSignedMediaRecovery } from "../../hooks/useSignedMediaRecovery";
import { getChallengeFallbackPhotoSource } from "../../utils/challengeFallbackPhotos";
import { isOneOffChallengeMode } from "../../utils/challengeMode";
import {
  MappedChallenge,
  getChallengeDayFromStartDate,
} from "../common/ChallengeCard";

interface ProfileChallengeGalleryCardProps {
  challenge: MappedChallenge;
  onPress: () => void;
}

const getBadgeLabel = (challenge: MappedChallenge): string => {
  if (challenge.status === "completed") return "Completed";
  if (challenge.status === "upcoming") return "Upcoming";
  if (challenge.status === "deleted") return "Inactive";
  if (challenge.isPrivate) return "Private";
  return challenge.isCreator ? "Created" : "Joined";
};

const ProfileChallengeGalleryCard: React.FC<ProfileChallengeGalleryCardProps> = ({
  challenge,
  onPress,
}) => {
  const recoverSignedMedia = useSignedMediaRecovery();
  const [imageFailed, setImageFailed] = useState(false);
  const currentDay = getChallengeDayFromStartDate(challenge.startDate);
  const oneOff = isOneOffChallengeMode(challenge.challengeMode);
  const percent = Math.max(
    0,
    Math.min(100, challenge.completionPercentage ?? challenge.progress ?? 0),
  );
  const badgeLabel = getBadgeLabel(challenge);
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
              "rgba(8, 7, 12, 0.06)",
              "rgba(8, 7, 12, 0.24)",
              "rgba(8, 7, 12, 0.96)",
            ]}
            locations={[0.14, 0.48, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.topRow}>
            <View style={[styles.badge, challenge.isPrivate && styles.privateBadge]}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
          </View>

          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={2} selectable>
              {challenge.title}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText} numberOfLines={1}>
                {challenge.category}
              </Text>
              <View style={styles.metaDot} />
              <Text style={styles.metaText} numberOfLines={1}>
                {oneOff
                  ? "One-off"
                  : challenge.status === "completed"
                    ? `${challenge.numberOfDays} days`
                    : `Day ${Math.min(currentDay, challenge.numberOfDays || currentDay)} of ${challenge.numberOfDays}`}
              </Text>
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
    backgroundColor: "#17161C",
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
  privateBadge: {
    backgroundColor: "rgba(45, 30, 88, 0.82)",
    borderColor: "rgba(167, 139, 250, 0.48)",
  },
  badgeText: {
    color: "#F5F2F8",
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
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
    marginBottom: 7,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "#C7C0CF",
    fontSize: 10,
    fontWeight: "700",
    flexShrink: 1,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#837C8C",
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

export default ProfileChallengeGalleryCard;
