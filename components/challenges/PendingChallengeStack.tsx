import { Ionicons } from "@expo/vector-icons";
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { getChallengeFallbackPhotoSource } from "../../utils/challengeFallbackPhotos";
import { isOneOffChallengeMode } from "../../utils/challengeMode";
import type { PendingChallengeSummary } from "../../utils/myChallengesPresentation";
import {
  MappedChallenge,
  getChallengeDayFromStartDate,
} from "../common/ChallengeCard";

interface PendingChallengeStackProps {
  summary: PendingChallengeSummary;
  onUpload: (challenge: MappedChallenge) => void;
  onOpenChallenge: (challenge: MappedChallenge) => void;
}

const getDayLabel = (challenge: MappedChallenge): string =>
  isOneOffChallengeMode(challenge.challengeMode)
    ? "One-off challenge"
    : `Day ${getChallengeDayFromStartDate(challenge.startDate)} · Keep your streak alive`;

const PendingChallengeStack: React.FC<PendingChallengeStackProps> = ({
  summary,
  onUpload,
  onOpenChallenge,
}) => {
  const [expanded, setExpanded] = useState(false);
  const { primary, remaining, moreCount, moreLabel } = summary;

  return (
    <LinearGradient
      colors={["#DDD4FF", "#C7B5FF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.primaryRow}>
        <TouchableOpacity
          style={styles.primaryCopy}
          onPress={() => onOpenChallenge(primary)}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel={`Open ${primary.title}`}
        >
          <Text style={styles.eyebrow}>UP NEXT · {moreCount + 1} PENDING</Text>
          <Text style={styles.title} numberOfLines={1}>
            {primary.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {getDayLabel(primary)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => onUpload(primary)}
          activeOpacity={0.84}
          accessibilityRole="button"
          accessibilityLabel={`Upload submission for ${primary.title}`}
        >
          <Ionicons name="camera-outline" size={14} color="#5525CE" />
          <Text style={styles.uploadText}>Upload submission</Text>
        </TouchableOpacity>
      </View>

      {moreCount > 0 && (
        <>
          <TouchableOpacity
            style={styles.moreRow}
            onPress={() => setExpanded((current) => !current)}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={`${expanded ? "Hide" : "Show"} ${moreCount} more pending challenges`}
            accessibilityState={{ expanded }}
          >
            <View style={styles.thumbnailStack}>
              {remaining.slice(0, 3).map((challenge, index) => (
                <Image
                  key={challenge.id}
                  source={
                    challenge.image
                      ? { uri: challenge.image }
                      : getChallengeFallbackPhotoSource(challenge)
                  }
                  style={[
                    styles.thumbnail,
                    index > 0 && styles.overlappingThumbnail,
                  ]}
                  resizeMode="contain"
                />
              ))}
            </View>
            <View style={styles.moreCopy}>
              <Text style={styles.moreTitle}>More submissions due today</Text>
              <Text style={styles.moreSubtitle} numberOfLines={1}>
                {remaining.map((challenge) => challenge.title).join(", ")}
              </Text>
            </View>
            <View style={styles.morePill}>
              <Text style={styles.morePillText}>{moreLabel}</Text>
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={12}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>

          {expanded && (
            <View style={styles.queue}>
              {remaining.map((challenge) => (
                <TouchableOpacity
                  key={challenge.id}
                  style={styles.queueRow}
                  onPress={() => onOpenChallenge(challenge)}
                  activeOpacity={0.78}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${challenge.title}`}
                >
                  <Image
                    source={
                      challenge.image
                        ? { uri: challenge.image }
                        : getChallengeFallbackPhotoSource(challenge)
                    }
                    style={styles.queueImage}
                    resizeMode="contain"
                  />
                  <View style={styles.queueCopy}>
                    <Text style={styles.queueTitle} numberOfLines={1} selectable>
                      {challenge.title}
                    </Text>
                    <Text style={styles.queueSubtitle}>
                      {getDayLabel(challenge)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.queueAction}
                    onPress={(event) => {
                      event.stopPropagation();
                      onUpload(challenge);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Upload submission for ${challenge.title}`}
                  >
                    <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.queueActionText}>Upload</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: "#B8A2FF",
    shadowColor: "#6D4BC4",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 7,
  },
  primaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  primaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: "#4B1FAE",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  title: {
    color: "#000000",
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "700",
    letterSpacing: -0.25,
    marginTop: 5,
  },
  subtitle: {
    color: "#4F485D",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    marginTop: 3,
  },
  uploadButton: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  uploadText: {
    color: "#5525ce",
    fontSize: 12,
    fontWeight: "700",
  },
  moreRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(71, 0, 236, 0.16)",
  },
  thumbnailStack: {
    flexDirection: "row",
    paddingLeft: 6,
  },
  thumbnail: {
    width: 28,
    height: 28,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#8D72E8",
    backgroundColor: "#F0ECFF",
    resizeMode: "contain",
  },
  overlappingThumbnail: {
    marginLeft: -7,
  },
  moreCopy: {
    flex: 1,
    minWidth: 0,
  },
  moreTitle: {
    color: "#000000",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
  },
  moreSubtitle: {
    color: "#514A5B",
    fontSize: 10,
    lineHeight: 13,
    marginTop: 2,
  },
  morePill: {
    minHeight: 30,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: "#6742CE",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  morePillText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  queue: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(71, 0, 236, 0.14)",
  },
  queueRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(71, 0, 236, 0.12)",
  },
  queueImage: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: "#F0ECFF",
    resizeMode: "contain",
  },
  queueCopy: {
    flex: 1,
    minWidth: 0,
  },
  queueTitle: {
    color: "#000000",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
  },
  queueSubtitle: {
    color: "#514A5B",
    fontSize: 10,
    lineHeight: 13,
    marginTop: 2,
  },
  queueAction: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#6742CE",
  },
  queueActionText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
});

export default PendingChallengeStack;
