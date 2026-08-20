import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { Image as ExpoImage, type ImageProps } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ChallengeSubmissionPreview as ChallengeSubmissionPreviewData,
  ChallengeMomentumSnapshot,
  LeaderboardEntry,
  PrivateChallengeRankSummary,
  SubmissionPreviewItem,
} from '../../types/api';
import { useSignedMediaRecovery } from '../../hooks/useSignedMediaRecovery';
import { parseChallengeCategories } from '../../utils/challengeCategories';
import { getChallengeFallbackPhotoSource } from '../../utils/challengeFallbackPhotos';
import { getMinimumVisibleChallengerCount } from '../../utils/challengeParticipantCounts';
import {
  getGlobalCreatorDisplayUsername,
  isOfficialGlobalCreator,
  OFFICIAL_ACCOUNT_AVATAR_SOURCE,
} from '../../utils/globalChallenges';
import { createCachedRemoteImageSource } from '../../utils/remoteImageCache';
import AvatarImage from './AvatarImage';
import OfficialAccountBadge from './OfficialAccountBadge';
import PremiumBadge from './PremiumBadge';
import ChallengeSubmissionPreview from './ChallengeSubmissionPreview';
import SubmissionMediaCarousel from './SubmissionMediaCarousel';

export interface ChallengeOverviewCreator {
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
  isCreator?: boolean;
  isFollowing?: boolean;
  canFollow?: boolean;
  premiumUser?: number | boolean;
}

export interface ChallengeOverviewParticipant {
  id: number;
  username: string;
  avatarUrl?: string | null;
}

export interface ChallengeOverviewLeaderboardRow {
  id: string;
  rank: number;
  username: string;
  subtitle?: string;
  score: string;
  avatarUrl?: string | null;
}

interface ChallengeDetailsOverviewProps {
  title: string;
  description: string;
  rules?: string;
  benefits?: string;
  category?: string;
  duration: string;
  currentDay: number;
  numberOfDays: number;
  daysLeft: number;
  progress: number;
  challengeMode?: string;
  momentum?: ChallengeMomentumSnapshot;
  privateRank?: PrivateChallengeRankSummary;
  privateCrewState?: string;
  createdAt?: string;
  startDate?: string;
  endDate?: string;
  isPrivate?: boolean;
  isCreator?: boolean;
  status?: string;
  tags?: string[];
  image?: string;
  coverPhotoUrls?: string[];
  participantsCount: number;
  creator?: ChallengeOverviewCreator | null;
  participants?: ChallengeOverviewParticipant[];
  leaderboardEntries?: LeaderboardEntry[];
  leaderboardRows?: ChallengeOverviewLeaderboardRow[];
  onCreatorPress?: () => void;
  onFollowCreator?: () => void;
  onParticipantsPress?: () => void;
  onLeaderboardPress?: () => void;
  onLeaderboardParticipantPress?: (row: ChallengeOverviewLeaderboardRow) => void;
  submissionPreview?: ChallengeSubmissionPreviewData;
  submissionPreviewPreload?: ChallengeSubmissionPreviewData;
  submissionPreviewLoading?: boolean;
  submissionPreviewProfileMode?: boolean;
  submissionPreviewUsername?: string;
  submissionPreviewScope?: 'all' | 'mine';
  onSubmissionPreviewScopeChange?: (scope: 'all' | 'mine') => void;
  onSubmissionPreviewPress?: (submission: SubmissionPreviewItem) => void;
  onSubmissionPreviewViewAll?: () => void;
}

const formatDate = (value?: string): string => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (value?: string): string => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const sanitizeTags = (tags?: string[]): string[] => {
  return (tags || [])
    .map((tag) => tag.replace(/^#/, '').trim())
    .filter(Boolean);
};

const buildLeaderboardRows = (
  leaderboardEntries?: LeaderboardEntry[],
  leaderboardRows?: ChallengeOverviewLeaderboardRow[]
): ChallengeOverviewLeaderboardRow[] => {
  if (leaderboardRows?.length) {
    return leaderboardRows.slice(0, 5);
  }

  return (leaderboardEntries || []).slice(0, 5).map((entry, index) => ({
    id: String(entry.userId),
    rank: entry.rank || index + 1,
    username: entry.displayName || entry.username || 'User',
    subtitle: `${entry.submissionCount ?? 0} submissions`,
    score: String(Math.round(entry.score)),
    avatarUrl: entry.profilePictureUrl,
  }));
};

const getPreviewRankStyle = (rank: number) => {
  if (rank === 1) return { backgroundColor: '#FFE8A3', borderColor: '#FFD84D', color: '#7A4B00' };
  if (rank === 2) return { backgroundColor: '#E2E6EC', borderColor: '#DCE1E8', color: '#4E5968' };
  if (rank === 3) return { backgroundColor: '#F2D0B5', borderColor: '#E5A06C', color: '#7A3E12' };
  return { backgroundColor: '#E7E3EF', borderColor: '#AAA3B2', color: '#655F70' };
};

export default function ChallengeDetailsOverview({
  title,
  description,
  rules,
  benefits,
  category,
  duration,
  currentDay,
  numberOfDays,
  daysLeft,
  progress,
  createdAt,
  startDate,
  endDate,
  isPrivate,
  isCreator,
  status = 'active',
  tags,
  image,
  coverPhotoUrls,
  participantsCount,
  creator,
  participants,
  leaderboardEntries,
  leaderboardRows,
  onCreatorPress,
  onFollowCreator,
  onParticipantsPress,
  onLeaderboardPress,
  onLeaderboardParticipantPress,
  submissionPreview,
  submissionPreviewPreload,
  submissionPreviewLoading,
  submissionPreviewProfileMode,
  submissionPreviewUsername,
  submissionPreviewScope,
  onSubmissionPreviewScopeChange,
  onSubmissionPreviewPress,
  onSubmissionPreviewViewAll,
}: ChallengeDetailsOverviewProps) {
  const recoverSignedMedia = useSignedMediaRecovery();
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [heroWidth, setHeroWidth] = useState(0);
  const safeProgress = Math.max(0, Math.min(progress || 0, 100));
  const visibleParticipantsCount = getMinimumVisibleChallengerCount(participantsCount);
  const isOfficialCreator = Boolean(creator && isOfficialGlobalCreator(creator.username));
  const safeCurrentDay = numberOfDays > 0 ? Math.min(Math.max(currentDay || 1, 1), numberOfDays) : 1;
  const visibleTags = sanitizeTags(tags);
  const categoryPills = parseChallengeCategories(category || 'General');
  const topRows = buildLeaderboardRows(leaderboardEntries, leaderboardRows);
  const participantPreview = (participants || []).slice(0, 4);
  const uploadedCoverPhotoUrls = (coverPhotoUrls || []).filter(Boolean);
  const heroImageUri = uploadedCoverPhotoUrls[0] || image;
  const heroImageSource = heroImageUri
    ? createCachedRemoteImageSource(heroImageUri)
    : getChallengeFallbackPhotoSource({ title, description, category, tags });
  const hasLeaderboard = topRows.length > 0;
  const visibility = isPrivate ? 'Private' : 'Public';
  const categoryText = categoryPills.join(', ') || 'General';
  const durationText = duration || `${numberOfDays || 1} days`;
  const statusText = status === 'deleted'
    ? 'Deleted'
    : status === 'completed'
      ? 'Completed'
      : status === 'upcoming'
        ? 'Upcoming'
        : 'Active';
  const detailsSummary = `${statusText} · Day ${safeCurrentDay} of ${numberOfDays || 1} · ${safeProgress}% complete`;
  const handleHeroLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== heroWidth) setHeroWidth(nextWidth);
  };
  const handleLeaderboardRowPress = (row: ChallengeOverviewLeaderboardRow) => {
    if (onLeaderboardParticipantPress) {
      onLeaderboardParticipantPress(row);
      return;
    }
    onLeaderboardPress?.();
  };

  return (
    <View style={styles.container}>
      <View
        style={styles.heroImageFrame}
        onLayout={handleHeroLayout}
      >
        {uploadedCoverPhotoUrls.length > 0 && heroWidth > 0 ? (
          <SubmissionMediaCarousel
            mediaUrls={uploadedCoverPhotoUrls}
            width={heroWidth}
            height={258}
            autoPlay
            borderRadius={21}
            contentFit="contain"
            containBackdrop
          />
        ) : (
          <ExpoImage
            source={heroImageSource}
            style={styles.heroImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={120}
            onError={() => recoverSignedMedia(heroImageUri)}
          />
        )}
        <LinearGradient
          colors={[
            'rgba(7, 6, 10, 0.24)',
            'rgba(7, 6, 10, 0.06)',
            'rgba(7, 6, 10, 0.02)',
          ]}
          locations={[0, 0.34, 1]}
          style={styles.heroOverlay}
          pointerEvents="none"
        />
        <View style={styles.heroTopContent} pointerEvents="none">
          <View style={styles.headerBadges}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{statusText}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Day {safeCurrentDay} of {numberOfDays || 1}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{visibility}</Text>
            </View>
          </View>

          {isCreator && (
            <View style={styles.creatorBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.creatorBadgeText}>Creator</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.heroCopyCard}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2} selectable>{title}</Text>
        </View>

        <Text style={styles.description} numberOfLines={3} selectable>
          {description || 'No description available.'}
        </Text>

        {rules?.trim() ? (
          <View style={styles.rulesSection}>
            <View style={styles.rulesHeadingRow}>
              <Ionicons name="list-outline" size={17} color="#5B3FE5" />
              <Text style={styles.rulesHeading}>Rules</Text>
            </View>
            <Text style={styles.rulesText} selectable>{rules.trim()}</Text>
          </View>
        ) : null}

        {benefits?.trim() ? (
          <View style={styles.benefitsSection}>
            <View style={styles.rulesHeadingRow}>
              <Ionicons name="gift-outline" size={17} color="#5B3FE5" />
              <Text style={styles.rulesHeading}>Rewards &amp; benefits</Text>
            </View>
            <Text style={styles.rulesText} selectable>{benefits.trim()}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.detailsAccordion, detailsExpanded && styles.detailsAccordionExpanded]}>
        <TouchableOpacity
          style={styles.detailsAccordionHeader}
          onPress={() => setDetailsExpanded((expanded) => !expanded)}
          activeOpacity={0.76}
          accessibilityRole="button"
          accessibilityState={{ expanded: detailsExpanded }}
          accessibilityLabel={detailsExpanded ? 'Hide challenge details' : 'Show challenge details'}
        >
          <View style={styles.detailsHeaderIcon}>
            <Ionicons name="information-circle-outline" size={21} color="#5B3FE5" />
          </View>
          <View style={styles.detailsHeaderCopy}>
            <Text style={styles.detailsHeaderTitle}>Challenge details</Text>
            <Text style={styles.detailsHeaderSummary} numberOfLines={1}>
              {detailsSummary}
            </Text>
          </View>
          <View style={styles.detailsToggle}>
            <Text style={styles.detailsToggleText}>
              {detailsExpanded ? 'Show less' : 'Show more'}
            </Text>
            <Ionicons
              name={detailsExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#5B3FE5"
            />
          </View>
        </TouchableOpacity>

        {detailsExpanded && (
          <View style={styles.detailsExpandedContent}>
            <View style={styles.detailsProgressSection}>
              <View style={styles.detailsProgressTop}>
                <View style={[styles.progressRing, safeProgress > 0 && styles.progressRingActive]}>
                  <Text style={styles.progressRingText}>{safeProgress}%</Text>
                </View>
                <View style={styles.statusCopy}>
                  <Text style={styles.statusTitle}>
                    {status === 'completed' || safeProgress >= 100
                      ? 'Challenge complete'
                      : `Today is Day ${safeCurrentDay}`}
                  </Text>
                  <Text style={styles.statusSubtitle} numberOfLines={1}>
                    {Math.max(0, daysLeft)} days left · {visibleParticipantsCount.toLocaleString()} challengers joined
                  </Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={['#7C4DFF', '#FFFFFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${safeProgress}%` }]}
                />
              </View>
              <View style={styles.summaryGrid}>
                <SummaryItem value={`Day ${safeCurrentDay}`} label="Current day" />
                <SummaryItem value={String(Math.max(0, daysLeft))} label="Days left" />
                <SummaryItem value={visibleParticipantsCount.toLocaleString()} label="Joined" />
              </View>
            </View>

            {creator && (
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Creator</Text>
                <TouchableOpacity
                  style={styles.creatorCard}
                  activeOpacity={onCreatorPress ? 0.75 : 1}
                  onPress={onCreatorPress}
                >
                  <Avatar
                    url={creator.avatarUrl}
                    label={creator.username}
                    size={42}
                    fallbackSource={isOfficialCreator ? OFFICIAL_ACCOUNT_AVATAR_SOURCE : undefined}
                  />
                  <View style={styles.creatorCopy}>
                    <Text style={styles.label}>Created by</Text>
                    <View style={styles.creatorNameRow}>
                      <Text style={styles.creatorName} numberOfLines={1}>
                        {isOfficialCreator
                          ? 'ChallengeSphere'
                          : creator.displayName || `@${getGlobalCreatorDisplayUsername(creator.username)}`}
                      </Text>
                      {isOfficialCreator && <OfficialAccountBadge />}
                      {!isOfficialCreator && creator.premiumUser ? <PremiumBadge /> : null}
                    </View>
                  </View>
                  {creator.canFollow && (
                    <TouchableOpacity
                      style={[styles.followButton, creator.isFollowing && styles.followingButton]}
                      onPress={onFollowCreator}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.followButtonText, creator.isFollowing && styles.followingButtonText]}>
                        {creator.isFollowing ? 'Following' : 'Follow'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>About</Text>
              <View style={styles.detailsRows}>
                <DetailRow icon="bookmark-outline" label="Category" value={categoryText} />
                <DetailRow icon="time-outline" label="Duration" value={durationText} />
                <DetailRow
                  icon="calendar-outline"
                  label="Timeline"
                  value={`${formatDate(startDate)} – ${formatDate(endDate)}`}
                />
                <DetailRow icon="sparkles-outline" label="Created" value={formatDateTime(createdAt)} />
                <DetailRow
                  icon={isPrivate ? 'lock-closed-outline' : 'eye-outline'}
                  label="Visibility"
                  value={visibility}
                  last
                />
              </View>
            </View>

            {visibleTags.length > 0 && (
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Tags</Text>
                <View style={styles.tagsWrap}>
                  {visibleTags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          </View>
        )}
      </View>

      <ChallengeSubmissionPreview
        preview={submissionPreview}
        preloadPreview={submissionPreviewPreload}
        loading={submissionPreviewLoading}
        profileMode={submissionPreviewProfileMode}
        profileUsername={submissionPreviewUsername}
        scope={submissionPreviewScope}
        onScopeChange={onSubmissionPreviewScopeChange}
        onSubmissionPress={onSubmissionPreviewPress}
        onViewAll={onSubmissionPreviewViewAll}
        compact={false}
      />

      <View style={styles.standaloneSection}>
        <Text style={styles.standaloneSectionTitle}>All participants</Text>
        <TouchableOpacity
          style={styles.participantsCard}
          onPress={onParticipantsPress}
          activeOpacity={onParticipantsPress ? 0.75 : 1}
        >
          <View>
            <Text style={styles.participantsCount}>
              {visibleParticipantsCount.toLocaleString()} joined
            </Text>
            {participantPreview.length > 0 && (
              <View style={styles.avatarStack}>
                {participantPreview.map((participant) => (
                  <Avatar
                    key={participant.id}
                    url={participant.avatarUrl}
                    label={participant.username}
                    size={31}
                    stacked
                  />
                ))}
              </View>
            )}
          </View>
          {onParticipantsPress && (
            <View style={styles.viewAllRow}>
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="chevron-forward" size={16} color="#5B3FE5" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.standaloneSection}>
        <View style={styles.leaderboardSectionHeader}>
          <Text style={[styles.standaloneSectionTitle, styles.standaloneSectionTitleInline]}>
            Challenge leaderboard
          </Text>
          {onLeaderboardPress && (
            <TouchableOpacity onPress={onLeaderboardPress} activeOpacity={0.75}>
              <Text style={styles.viewFullLeaderboardText}>View full</Text>
            </TouchableOpacity>
          )}
        </View>
        {hasLeaderboard ? (
          <>
            <LeaderboardPreviewPodium
              rows={topRows}
              onRowPress={handleLeaderboardRowPress}
            />
            <View style={styles.leaderboardListCard}>
              {topRows.map((row, index) => {
                const rankStyle = getPreviewRankStyle(row.rank);
                return (
                  <TouchableOpacity
                    key={`${row.id}-${row.rank}`}
                    style={[
                      styles.leaderboardRow,
                      index === topRows.length - 1 && styles.leaderboardRowLast,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => handleLeaderboardRowPress(row)}
                  >
                    <View
                      style={[
                        styles.rankBadge,
                        {
                          backgroundColor: rankStyle.backgroundColor,
                          borderColor: rankStyle.borderColor,
                        },
                      ]}
                    >
                      <Text style={[styles.rankText, { color: rankStyle.color }]}>{row.rank}</Text>
                    </View>
                    <Avatar url={row.avatarUrl} label={row.username} size={34} />
                    <View style={styles.leaderCopy}>
                      <Text style={styles.leaderName} numberOfLines={1}>{row.username}</Text>
                      {!!row.subtitle && <Text style={styles.leaderMeta}>{row.subtitle}</Text>}
                    </View>
                    <Text style={styles.leaderScore}>{row.score}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.leaderboardCard}>
            <Text style={styles.emptyLeaderboardText}>No rankings yet</Text>
          </View>
        )}
      </View>

    </View>
  );
}

const SummaryItem = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.summaryItem}>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const DetailRow = ({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) => (
  <View style={[styles.detailRow, !last && styles.detailRowDivider]}>
    <View style={styles.detailRowIcon}>
      <Ionicons name={icon} size={17} color="#BBA7FF" />
    </View>
    <Text style={styles.detailRowLabel}>{label}</Text>
    <Text style={styles.detailRowValue} numberOfLines={2}>{value}</Text>
  </View>
);

const Avatar = ({
  url,
  label,
  size,
  stacked,
  fallbackSource,
}: {
  url?: string | null;
  label: string;
  size: number;
  stacked?: boolean;
  fallbackSource?: ImageProps['source'];
}) => {
  const avatarStyle = [
    styles.avatar,
    stacked && styles.stackedAvatar,
  ];
  return (
    <AvatarImage
      uri={url}
      size={size}
      style={avatarStyle}
      fallbackSource={fallbackSource}
      accessibilityLabel={`${label || 'User'} profile picture`}
    />
  );
};

const LeaderboardPreviewPodium = ({
  rows,
  onRowPress,
}: {
  rows: ChallengeOverviewLeaderboardRow[];
  onRowPress: (row: ChallengeOverviewLeaderboardRow) => void;
}) => {
  const podiumRows = rows.slice(0, 3);
  const visualRows = podiumRows.length >= 3
    ? [podiumRows[1], podiumRows[0], podiumRows[2]]
    : podiumRows.length === 2
      ? [podiumRows[1], podiumRows[0]]
      : podiumRows;

  return (
    <View style={styles.previewPodiumCard}>
      <View style={styles.previewPodiumGlow} />
      {visualRows.map((row) => {
        const rankStyle = getPreviewRankStyle(row.rank);
        const isFirst = row.rank === 1;

        return (
          <TouchableOpacity
            key={`${row.id}-${row.rank}`}
            style={[styles.previewPodiumPlace, isFirst && styles.previewPodiumPlaceFirst]}
            activeOpacity={0.76}
            onPress={() => onRowPress(row)}
            accessibilityLabel={`${row.rank === 1 ? 'First' : row.rank === 2 ? 'Second' : 'Third'} place, ${row.username}, ${row.score} points`}
          >
            <View
              style={[
                styles.previewPodiumAvatarRing,
                isFirst && styles.previewPodiumAvatarRingFirst,
                { backgroundColor: rankStyle.backgroundColor, borderColor: rankStyle.borderColor },
              ]}
            >
              <Avatar url={row.avatarUrl} label={row.username} size={isFirst ? 46 : 38} />
            </View>
            <Text style={styles.previewPodiumName} numberOfLines={1}>{row.username}</Text>
            <Text style={styles.previewPodiumScore}>{row.score} points</Text>
            <LinearGradient
              colors={isFirst ? ['#7446EE', '#3A1B86'] : ['#44335F', '#251A35']}
              style={[
                styles.previewPodiumBlock,
                isFirst && styles.previewPodiumBlockFirst,
                row.rank === 3 && styles.previewPodiumBlockThird,
              ]}
            >
              <Text style={[styles.previewPodiumRank, { color: rankStyle.borderColor }]}>
                {row.rank}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  heroImageFrame: {
    height: 258,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#111017',
    borderWidth: 1,
    borderColor: '#292630',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopContent: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroCopyCard: {
    marginTop: 10,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  headerBadges: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  statusBadge: {
    minHeight: 26,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 8, 14, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusBadgeText: {
    color: '#f3eefb',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 7,
  },
  title: {
    flex: 1,
    color: '#18142F',
    fontSize: 23,
    lineHeight: 27,
    fontWeight: '700',
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(184, 134, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.62)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  creatorBadgeText: {
    color: '#fff1b5',
    fontSize: 10,
    fontWeight: '700',
  },
  description: {
    color: '#777389',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
  },
  rulesSection: {
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E7E3EF',
  },
  benefitsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E7E3EF',
  },
  rulesHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  rulesHeading: {
    color: '#18142F',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  rulesText: {
    color: '#5F596B',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },
  detailsProgressSection: {
    paddingTop: 16,
    paddingBottom: 14,
  },
  detailsProgressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
    borderWidth: 5,
    borderColor: '#DDD4FF',
  },
  progressRingActive: {
    borderColor: '#7c4dff',
  },
  progressRingText: {
    color: '#18142F',
    fontSize: 12,
    fontWeight: '700',
  },
  statusCopy: {
    flex: 1,
    minWidth: 0,
  },
  statusTitle: {
    color: '#18142F',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  statusSubtitle: {
    color: '#9c93a7',
    fontSize: 10,
    lineHeight: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    minHeight: 58,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  summaryValue: {
    color: '#18142F',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    color: '#655F70',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
  progressTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#EDEAF2',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    marginTop: 13,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#7c4dff',
  },
  creatorCard: {
    minHeight: 66,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creatorCopy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: '#655F70',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 3,
  },
  creatorName: {
    color: '#18142F',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  followButton: {
    borderRadius: 999,
    backgroundColor: '#4700ec',
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  followingButton: {
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#5b44b2',
  },
  followButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#5B3FE5',
  },
  leaderboardSectionHeader: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  viewFullLeaderboardText: {
    color: '#5B3FE5',
    fontSize: 11,
    fontWeight: '700',
  },
  detailsAccordion: {
    marginTop: 18,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  detailsAccordionExpanded: {
    borderColor: '#9D83FF',
  },
  detailsAccordionHeader: {
    minHeight: 78,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  detailsHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#DDD4FF',
  },
  detailsHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  detailsHeaderTitle: {
    color: '#18142F',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailsHeaderSummary: {
    color: '#655F70',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  detailsToggleText: {
    color: '#5B3FE5',
    fontSize: 10,
    fontWeight: '700',
  },
  detailsExpandedContent: {
    marginHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#E7E3EF',
  },
  detailsSection: {
    paddingTop: 15,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: '#E7E3EF',
  },
  detailsSectionTitle: {
    color: '#18142F',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  detailsRows: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#F8F7FC',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    paddingHorizontal: 11,
  },
  detailRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  detailRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  detailRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
  },
  detailRowLabel: {
    width: 66,
    color: '#655F70',
    fontSize: 10,
    fontWeight: '700',
  },
  detailRowValue: {
    flex: 1,
    color: '#18142F',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    borderRadius: 999,
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#DDD4FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tagText: {
    color: '#5B3FE5',
    fontSize: 12,
    fontWeight: '600',
  },
  standaloneSection: {
    marginTop: 16,
  },
  standaloneSectionTitle: {
    color: '#18142F',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  standaloneSectionTitleInline: {
    marginBottom: 0,
  },
  participantsCard: {
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantsCount: {
    color: '#18142F',
    fontSize: 14,
    fontWeight: '600',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    color: '#5B3FE5',
    fontSize: 13,
    fontWeight: '600',
  },
  leaderboardCard: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  previewPodiumCard: {
    height: 168,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8CEFA',
    backgroundColor: '#F0ECFF',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  previewPodiumGlow: {
    position: 'absolute',
    top: -76,
    width: 220,
    height: 180,
    borderRadius: 110,
    backgroundColor: '#5F35B833',
  },
  previewPodiumPlace: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  previewPodiumPlaceFirst: {
    zIndex: 2,
  },
  previewPodiumAvatarRing: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 2,
  },
  previewPodiumAvatarRingFirst: {
    shadowColor: '#FFD84D',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  previewPodiumName: {
    maxWidth: '92%',
    color: '#18142F',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    marginTop: 5,
  },
  previewPodiumScore: {
    color: '#655F70',
    fontSize: 8,
    lineHeight: 11,
    marginBottom: 6,
  },
  previewPodiumBlock: {
    width: '92%',
    height: 38,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPodiumBlockFirst: {
    height: 56,
  },
  previewPodiumBlockThird: {
    height: 30,
  },
  previewPodiumRank: {
    fontSize: 16,
    fontWeight: '700',
  },
  leaderboardListCard: {
    overflow: 'hidden',
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8D2E2',
  },
  leaderboardRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  leaderboardRowLast: {
    borderBottomWidth: 0,
  },
  rankBadge: {
    width: 32,
    height: 28,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
  },
  leaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  leaderName: {
    color: '#18142F',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  leaderMeta: {
    color: '#655F70',
    fontSize: 11,
  },
  leaderScore: {
    color: '#4700EC',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyLeaderboardText: {
    color: '#655F70',
    fontSize: 13,
    padding: 14,
    textAlign: 'center',
  },
  avatar: {
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#DDD4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedAvatar: {
    marginRight: -8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
