import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
  View,
} from "react-native";

import { User } from "../../types/api";
import { isOfficialGlobalCreator } from "../../utils/globalChallenges";
import { AppTouchableOpacity as TouchableOpacity } from "./AppPressable";
import AvatarImage from "./AvatarImage";
import OfficialAccountBadge from "./OfficialAccountBadge";
import PremiumBadge from "./PremiumBadge";

type RecommendedFriendsCarouselProps = {
  users: User[];
  onUserPress: (user: User) => void;
  onFollowPress: (user: User) => void;
  isFollowing: boolean;
  followedUserIds: ReadonlySet<number>;
  style?: StyleProp<ViewStyle>;
};

const RecommendedFriendsCarousel = ({
  users,
  onUserPress,
  onFollowPress,
  isFollowing,
  followedUserIds,
  style,
}: RecommendedFriendsCarouselProps) => {
  if (users.length === 0) {
    return null;
  }

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Recommended friends</Text>
        <Ionicons name="sparkles-outline" size={16} color="#9B7CFF" />
      </View>
      <FlatList
        data={users}
        keyExtractor={(user) => user.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isFollowed = followedUserIds.has(item.id);

          return (
            <TouchableOpacity
              style={styles.personCard}
              onPress={() => onUserPress(item)}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={`Open @${item.username}'s profile`}
            >
              <AvatarImage uri={item.profilePicUrl} size={54} style={styles.avatar} />
              <View style={styles.identityRow}>
                <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
                {isOfficialGlobalCreator(item.username) ? (
                  <OfficialAccountBadge compact />
                ) : item.premiumUser > 0 ? (
                  <PremiumBadge />
                ) : null}
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {(item.followers ?? 0).toLocaleString()} followers
              </Text>
              <TouchableOpacity
                style={[styles.followButton, isFollowed && styles.followingButton]}
                onPress={(event) => {
                  event.stopPropagation();
                  onFollowPress(item);
                }}
                disabled={isFollowed || isFollowing}
                accessibilityRole="button"
                accessibilityLabel={`${isFollowed ? "Following" : "Follow"} @${item.username}`}
              >
                <Text style={[styles.followText, isFollowed && styles.followingText]}>
                  {isFollowed ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 10,
    marginVertical: 6,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E7E3EF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  title: {
    color: "#18142F",
    fontSize: 14,
    fontWeight: "700",
  },
  list: {
    paddingHorizontal: 12,
    gap: 10,
  },
  personCard: {
    width: 128,
    minHeight: 164,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7E3EF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    padding: 12,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#E7E3EF",
  },
  username: {
    color: "#18142F",
    fontSize: 12,
    fontWeight: "700",
    minWidth: 0,
    flexShrink: 1,
  },
  identityRow: {
    width: "100%",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  meta: {
    color: "#8C82AA",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 10,
    maxWidth: "100%",
  },
  followButton: {
    height: 30,
    minWidth: 82,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4700EC",
  },
  followingButton: {
    backgroundColor: "#F0ECFF",
    borderWidth: 1,
    borderColor: "#DDD4FF",
  },
  followText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  followingText: {
    color: "#4700EC",
  },
});

export default RecommendedFriendsCarousel;
