import { Ionicons } from "@expo/vector-icons";
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import React, { useEffect, useState } from "react";
import {
  GestureResponderEvent,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSignedMediaRecovery } from "../../hooks/useSignedMediaRecovery";
import { getChallengeFallbackPhotoSource } from "../../utils/challengeFallbackPhotos";
import { getMinimumVisibleChallengerCount } from "../../utils/challengeParticipantCounts";
import {
  getGlobalCreatorDisplayUsername,
  isOfficialGlobalCreator,
  OFFICIAL_ACCOUNT_AVATAR_SOURCE,
} from "../../utils/globalChallenges";
import AvatarImage from "../common/AvatarImage";
import OfficialAccountBadge from "../common/OfficialAccountBadge";

export interface GlobalGalleryChallenge {
  id: string;
  numericId: number;
  title: string;
  description?: string;
  category: string;
  duration: string;
  participantsCount: number;
  creatorName: string;
  creatorUsername: string;
  creatorAvatar: string;
  creatorId: number;
  isFollowing: boolean;
  image?: string;
  isPrivate?: boolean;
  trending?: boolean;
  cohortKey?: string | null;
  tags: string[];
}

interface GlobalChallengeGalleryCardProps {
  challenge: GlobalGalleryChallenge;
  joined: boolean;
  isCurrentUserCreator: boolean;
  joinDisabled?: boolean;
  onPress: () => void;
  onJoin: () => void;
  onCreatorPress: () => void;
  onFollowCreator: () => void;
}

const stopCardPress = (event: GestureResponderEvent) => {
  event.stopPropagation();
};

const GlobalChallengeGalleryCard: React.FC<GlobalChallengeGalleryCardProps> = ({
  challenge,
  joined,
  isCurrentUserCreator,
  joinDisabled,
  onPress,
  onJoin,
  onCreatorPress,
  onFollowCreator,
}) => {
  const recoverSignedMedia = useSignedMediaRecovery();
  const [imageFailed, setImageFailed] = useState(false);
  const imageSource =
    challenge.image && !imageFailed
      ? { uri: challenge.image }
      : getChallengeFallbackPhotoSource(challenge);
  const visibleParticipantsCount = getMinimumVisibleChallengerCount(challenge.participantsCount);
  const isOfficialCreator = isOfficialGlobalCreator(challenge.creatorUsername);
  const badgeLabel = joined
    ? "Joined"
    : isCurrentUserCreator
      ? "Creator"
      : challenge.cohortKey
        ? "This week"
        : challenge.isPrivate
          ? "Private"
          : challenge.trending
            ? "Trending"
            : "Explore";

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
        <View style={styles.topRow}>
          <View
            style={[
              styles.badge,
              joined && styles.joinedBadge,
              isCurrentUserCreator && styles.creatorBadge,
              challenge.isPrivate && !joined && !isCurrentUserCreator && styles.privateBadge,
            ]}
          >
            {challenge.isPrivate && !joined && !isCurrentUserCreator ? (
              <Ionicons name="lock-closed" size={10} color="#18142F" />
            ) : null}
            <Text
              style={[
                styles.badgeText,
                joined && styles.joinedBadgeText,
                isCurrentUserCreator && styles.creatorBadgeText,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.86}
            >
              {badgeLabel}
            </Text>
          </View>
        </View>

      </ImageBackground>

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
            {challenge.duration}
          </Text>
        </View>
        <View style={styles.participantRow}>
          <Ionicons name="people-outline" size={12} color="#655F70" />
          <Text style={styles.participantText} numberOfLines={1}>
            {visibleParticipantsCount.toLocaleString()} joined
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.creatorRow}
          onPress={(event) => {
            stopCardPress(event);
            onCreatorPress();
          }}
          activeOpacity={0.78}
        >
          <AvatarImage
            uri={challenge.creatorAvatar}
            fallbackSource={isOfficialCreator ? OFFICIAL_ACCOUNT_AVATAR_SOURCE : undefined}
            size={24}
            style={[styles.avatar, isOfficialCreator && styles.officialAvatar]}
            accessibilityLabel={`${challenge.creatorName}'s profile picture`}
          />
          <Text style={styles.creatorText} numberOfLines={1}>
            @{getGlobalCreatorDisplayUsername(challenge.creatorUsername)}
          </Text>
          {isOfficialCreator && <OfficialAccountBadge compact />}
        </TouchableOpacity>

        {isCurrentUserCreator ? (
          <View style={styles.ownerPill}>
            <Ionicons name="star" size={12} color="#7A5100" />
            <Text style={styles.ownerPillText}>Creator</Text>
          </View>
        ) : joined ? (
          <View style={styles.joinedPill}>
            <Ionicons name="checkmark" size={13} color="#187A3B" />
            <Text style={styles.joinedPillText}>Joined</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.joinButton, joinDisabled && styles.joinButtonDisabled]}
            onPress={(event) => {
              stopCardPress(event);
              onJoin();
            }}
            activeOpacity={0.82}
            disabled={joinDisabled}
          >
            <Text style={styles.joinButtonText}>Join Challenge</Text>
          </TouchableOpacity>
        )}

        {!isCurrentUserCreator && !joined ? (
          <TouchableOpacity
            style={[styles.followButton, challenge.isFollowing && styles.followingButton]}
            onPress={(event) => {
              stopCardPress(event);
              onFollowCreator();
            }}
            activeOpacity={0.78}
          >
            <Ionicons
              name={challenge.isFollowing ? "checkmark" : "person-add-outline"}
              size={13}
              color={challenge.isFollowing ? "#4700EC" : "#5B21B6"}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: 334,
    borderRadius: 23,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E3EF",
    shadowColor: "#18142F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  image: {
    height: 190,
    justifyContent: "space-between",
    backgroundColor: "#F3F0F8",
  },
  imageRadius: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  topRow: {
    paddingTop: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  badge: {
    height: 28,
    minWidth: 66,
    maxWidth: "100%",
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(12, 10, 17, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  joinedBadge: {
    backgroundColor: "rgba(20, 70, 39, 0.86)",
    borderColor: "rgba(90, 240, 142, 0.45)",
  },
  creatorBadge: {
    backgroundColor: "#FFF1A8",
    borderColor: "#FFF1A8",
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
    textAlign: "center",
    includeFontPadding: false,
    flexShrink: 1,
  },
  joinedBadgeText: {
    color: "#D8FFE4",
  },
  creatorBadgeText: {
    color: "#7A5100",
  },
  copy: {
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  title: {
    color: "#18142F",
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
    color: "#655F70",
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
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  participantText: {
    color: "#655F70",
    fontSize: 10,
    fontWeight: "700",
  },
  footer: {
    minHeight: 60,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEEAF4",
  },
  creatorRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  officialAvatar: {
    borderWidth: 1,
    borderColor: "#A980FF",
  },
  creatorText: {
    color: "#4D4759",
    fontSize: 10,
    fontWeight: "700",
    flexShrink: 1,
  },
  joinButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#4700EC",
    alignItems: "center",
    justifyContent: "center",
  },
  joinButtonDisabled: {
    opacity: 0.58,
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  joinedPill: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#ECFDF3",
    borderWidth: 1,
    borderColor: "#8AD9A3",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  joinedPillText: {
    color: "#187A3B",
    fontSize: 10,
    fontWeight: "700",
  },
  ownerPill: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#FFF1A8",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ownerPillText: {
    color: "#7A5100",
    fontSize: 10,
    fontWeight: "700",
  },
  followButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3EEFF",
    borderWidth: 1,
    borderColor: "#D8CBFF",
  },
  followingButton: {
    backgroundColor: "#EEE7FF",
    borderColor: "#A98BFF",
  },
});

export default GlobalChallengeGalleryCard;
