import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  Challenge,
  ChallengeSubmissionPreview as ChallengeSubmissionPreviewData,
  MyChallenge,
  ChallengeMomentumSnapshot,
  PrivateChallengeRankSummary,
  SubmissionPreviewItem,
} from '../../types/api';
import { useSignedMediaRecovery } from '../../hooks/useSignedMediaRecovery';
import { isOneOffChallengeMode } from '../../utils/challengeMode';
import { getDurationLabel } from '../../utils/challengeDuration';
import { getChallengeFallbackPhotoSource } from '../../utils/challengeFallbackPhotos';
import { parseCoverPhotoUrls } from '../../utils/challengePhotos';
import { getDisplayDescription, getMainChallengeDescription } from '../../utils/challengeDisplayText';
import ChallengeSubmissionPreview from './ChallengeSubmissionPreview';

// ─── Unified shape used by the card ────────────────────────────────────────
export interface MappedChallenge {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  numberOfDays: number;
  challengeMode?: string;
  proofMode?: string;
  status: 'active' | 'completed' | 'upcoming' | 'deleted';
  isPrivate?: boolean;
  isCreator: boolean;
  currentOwnerId?: number;
  isFavorite?: boolean;
  participationActive?: boolean;
  progress?: number;
  completionPercentage?: number;
  daysCompleted?: number;
  currentStreak?: number;
  joinedAt?: string;
  progressBasis?: 'participation' | 'timeline';
  momentum?: ChallengeMomentumSnapshot;
  privateRank?: PrivateChallengeRankSummary;
  coverPhotoUrls?: string[];
  participantCount?: number;
  hashtags?: string;
  integrationProvider?: string | null;
  verificationProvider?: string | null;
  appIntegrationProvider?: string | null;
  startDate: string;
  createdAt: string;
  endDate?: string;
  image?: string;
}

// ─── Date helpers ──────────────────────────────────────────────────────────
// Parse a date value as *local* midnight. Fixes the off-by-one bug where
// backend-stored `YYYY-MM-DD` (interpreted as UTC midnight by `new Date`)
// became the previous day once the user's timezone is behind UTC.
export const getDateOnly = (value: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const getChallengeDayFromStartDate = (startDateValue: string): number => {
  if (!startDateValue) return 1;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = getDateOnly(startDateValue);
  const diffMs = today.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
};

export const getChallengeStatusFromDates = (
  startDateValue: string,
  numberOfDays: number,
  active?: boolean
): MappedChallenge['status'] => {
  if (active === false) return 'deleted';
  if (!startDateValue) return 'active';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = getDateOnly(startDateValue);
  const currentDay = getChallengeDayFromStartDate(startDateValue);

  if (today < startDate) return 'upcoming';
  if (numberOfDays > 0 && currentDay > numberOfDays) return 'completed';
  return 'active';
};

// ─── Mappers ───────────────────────────────────────────────────────────────
export const mapChallenge = (challenge: Challenge, currentUserId: number): MappedChallenge => {
  const coverPhotoUrls = parseCoverPhotoUrls(challenge.coverPhotoUrls);
  const startDateValue = challenge.startDate || challenge.createdAt;
  const oneOff = isOneOffChallengeMode(challenge.challengeMode);
  const startDate = getDateOnly(startDateValue);
  const totalDuration = oneOff ? 1 : challenge.numberOfDays;
  const endDate = oneOff ? null : new Date(startDate.getTime() + totalDuration * 24 * 60 * 60 * 1000);
  const currentDay = getChallengeDayFromStartDate(startDateValue);
  const progressDay = Math.max(0, Math.min(currentDay - 1, totalDuration));
  const progress = totalDuration > 0 ? Math.min(100, Math.round((progressDay / totalDuration) * 100)) : 0;
  const status = oneOff
    ? challenge.active === false ? 'deleted' : 'active'
    : getChallengeStatusFromDates(startDateValue, totalDuration, challenge.active);

  return {
    id: challenge.id.toString(),
    title: challenge.title,
    description: getMainChallengeDescription(challenge),
    category: challenge.categories || 'General',
    duration: oneOff ? 'One-off' : getDurationLabel(totalDuration),
    numberOfDays: totalDuration,
    challengeMode: challenge.challengeMode,
    proofMode: challenge.proofMode,
    status,
    isPrivate: Boolean(challenge.isPrivate),
    isCreator: challenge.creatorId === currentUserId,
    currentOwnerId: challenge.currentOwnerId ?? challenge.creatorId,
    isFavorite: false,
    progress: oneOff ? 0 : status === 'completed' ? 100 : status === 'upcoming' || status === 'deleted' ? 0 : progress,
    progressBasis: 'timeline',
    coverPhotoUrls,
    participantCount: typeof challenge.participantCount === 'number'
      ? challenge.participantCount
      : typeof challenge.activeParticipantCount === 'number'
        ? challenge.activeParticipantCount
        : undefined,
    hashtags: challenge.hashtags,
    integrationProvider: challenge.integrationProvider,
    verificationProvider: challenge.verificationProvider,
    appIntegrationProvider: challenge.appIntegrationProvider,
    startDate: startDateValue,
    createdAt: challenge.createdAt,
    endDate: endDate ? endDate.toISOString().split('T')[0] : '',
    image: coverPhotoUrls[0],
  };
};

export const mapMyChallenge = (c: MyChallenge, currentUserId: number): MappedChallenge => {
  const coverPhotoUrls = parseCoverPhotoUrls(c.coverPhotoUrls);
  const startDateValue = c.startDate || c.createdAt || c.joinedAt;
  const oneOff = isOneOffChallengeMode(c.challengeMode);
  const currentDay = getChallengeDayFromStartDate(startDateValue);
  const total = oneOff ? 1 : Math.max(0, c.numberOfDays ?? 0);
  const inferredDaysFromPercent = total > 0
    ? Math.round(((c.completionPercentage ?? 0) / 100) * total)
    : 0;
  const rawCompletedDays = Math.max(0, c.daysCompleted ?? inferredDaysFromPercent);
  const cappedCompletedDays = total > 0
    ? Math.min(rawCompletedDays, Math.max(0, currentDay), total)
    : rawCompletedDays;
  const hasCompletedAllDays = oneOff ? Boolean(c.completed) || cappedCompletedDays >= 1 : total > 0 && cappedCompletedDays >= total;
  const hasElapsedPastChallenge = !oneOff && total > 0 && currentDay > total;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const status: MappedChallenge['status'] = c.active === false
    ? 'deleted'
    : !oneOff && startDateValue && getDateOnly(startDateValue) > today
      ? 'upcoming'
      : hasCompletedAllDays || hasElapsedPastChallenge
      ? 'completed'
      : 'active';
  const percent = status === 'deleted'
    ? 0
    : total > 0
      ? Math.min(100, Math.round((cappedCompletedDays / total) * 100))
      : 0;
  return {
    id: c.id.toString(),
    title: c.title,
    description: getDisplayDescription(c),
    category: c.categories || 'General',
    duration: oneOff ? 'One-off' : getDurationLabel(c.numberOfDays),
    numberOfDays: total,
    challengeMode: c.challengeMode,
    proofMode: c.proofMode,
    status,
    isPrivate: Boolean(c.isPrivate),
    isCreator: c.creatorId === currentUserId,
    currentOwnerId: c.currentOwnerId ?? c.creatorId,
    isFavorite: Boolean(c.favorite),
    participationActive: c.participationActive,
    progress: percent,
    completionPercentage: percent,
    daysCompleted: cappedCompletedDays,
    currentStreak: Math.max(0, c.currentStreak ?? 0),
    joinedAt: c.joinedAt,
    progressBasis: 'participation',
    momentum: c.momentum,
    privateRank: c.privateRank,
    coverPhotoUrls,
    participantCount: typeof c.participantCount === 'number'
      ? c.participantCount
      : typeof c.activeParticipantCount === 'number'
        ? c.activeParticipantCount
        : undefined,
    hashtags: c.hashtags,
    startDate: startDateValue,
    createdAt: c.createdAt,
    image: coverPhotoUrls[0],
  };
};

const categoryVisuals = [
  {
    pattern: /\b(code|coding|programming|leetcode|codeforces|dsa)\b/i,
    icon: 'code-slash-outline' as keyof typeof Ionicons.glyphMap,
    label: '{ }',
    backgroundColor: '#12332A',
    borderColor: '#2B7A5B',
    accentColor: '#8EF5B7',
  },
  {
    pattern: /\b(fitness|run|running|walk|workout|movement|steps)\b/i,
    icon: 'fitness-outline' as keyof typeof Ionicons.glyphMap,
    label: 'FIT',
    backgroundColor: '#2F2411',
    borderColor: '#7A5A22',
    accentColor: '#FFD58A',
  },
  {
    pattern: /\b(health|mindful|sleep|water|wellness)\b/i,
    icon: 'heart-outline' as keyof typeof Ionicons.glyphMap,
    label: 'HLT',
    backgroundColor: '#311A22',
    borderColor: '#7C384C',
    accentColor: '#FF9CB8',
  },
  {
    pattern: /\b(learn|learning|read|reading|study|book)\b/i,
    icon: 'book-outline' as keyof typeof Ionicons.glyphMap,
    label: 'RD',
    backgroundColor: '#1F2840',
    borderColor: '#4A67A4',
    accentColor: '#AFC8FF',
  },
  {
    pattern: /\b(creative|creativity|art|write|writing|music)\b/i,
    icon: 'color-palette-outline' as keyof typeof Ionicons.glyphMap,
    label: 'ART',
    backgroundColor: '#2A1F45',
    borderColor: '#51436F',
    accentColor: '#D8CCFF',
  },
];

const defaultVisual = {
  icon: 'sparkles-outline' as keyof typeof Ionicons.glyphMap,
  label: 'CS',
  backgroundColor: '#201A3F',
  borderColor: '#4B3AA1',
  accentColor: '#C8BAFF',
};

export const getChallengeVisualIdentity = (challenge: Pick<
  MappedChallenge,
  'title' | 'description' | 'category' | 'duration' | 'numberOfDays' | 'hashtags' | 'integrationProvider' | 'verificationProvider' | 'appIntegrationProvider'
>) => {
  const searchableText = [
    challenge.title,
    challenge.description,
    challenge.category,
    challenge.hashtags,
  ].filter(Boolean).join(' ');
  const visual = categoryVisuals.find((item) => item.pattern.test(searchableText)) || defaultVisual;

  return {
    ...visual,
  };
};

// ─── Card component ───────────────────────────────────────────────────────
interface ChallengeCardProps {
  challenge: MappedChallenge;
  onPress: () => void;
  // Optional extras used in "My Challenges" tab
  onUpload?: () => void;
  onEdit?: () => void;
  canUploadToday?: boolean;
  hasUploadedToday?: boolean;
  showSubmissionPreview?: boolean;
  preview?: ChallengeSubmissionPreviewData;
  previewLoading?: boolean;
  profilePreview?: boolean;
  profileUsername?: string;
  onPreviewSubmissionPress?: (submission: SubmissionPreviewItem) => void;
  onPreviewViewAll?: () => void;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  onPress,
  onUpload,
  onEdit,
  canUploadToday = false,
  hasUploadedToday = false,
  showSubmissionPreview = false,
  preview,
  previewLoading = false,
  profilePreview = false,
  profileUsername,
  onPreviewSubmissionPress,
  onPreviewViewAll,
}) => {
  const recoverSignedMedia = useSignedMediaRecovery();
  const currentDay = getChallengeDayFromStartDate(challenge.startDate);
  const oneOff = isOneOffChallengeMode(challenge.challengeMode);
  const percent = challenge.completionPercentage ?? challenge.progress ?? 0;
  const showUploadButton = !!onUpload && challenge.status === 'active';
  const statusBadgeText = challenge.status === 'active'
    ? 'Active'
    : challenge.status === 'deleted'
    ? 'Deleted'
    : challenge.status === 'completed'
      ? 'Completed'
      : 'Upcoming';
  const statusBadgeColor = challenge.status === 'deleted' ? '#FF6B6B' : '#4CAF50';
  const visualIdentity = getChallengeVisualIdentity(challenge);
  const fallbackPhotoSource = getChallengeFallbackPhotoSource(challenge);
  const displayDescription = getDisplayDescription(challenge);
  const footerTitle = showUploadButton
    ? hasUploadedToday
      ? oneOff ? 'Completed' : 'Uploaded today'
      : canUploadToday
        ? oneOff ? 'Ready to complete' : 'Upload pending'
        : 'Upload unavailable'
    : challenge.status === 'completed'
      ? 'Completed'
      : challenge.status === 'deleted'
        ? 'Deleted challenge'
        : challenge.status === 'upcoming'
          ? 'Upcoming'
          : 'Active';
  const footerSubtitle = challenge.status === 'active'
    ? oneOff ? 'One-off challenge' : `Today is Day ${currentDay}`
    : challenge.status === 'completed'
      ? oneOff ? 'One-off' : `${challenge.numberOfDays} days`
      : challenge.status === 'upcoming'
        ? 'Starts soon'
        : 'Inactive';
  // onEdit is currently surfaced elsewhere; retain prop-compat without unused local.
  void onEdit;

  return (
    <TouchableOpacity
      style={styles.challengeCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <View
            style={[
              styles.challengeVisualTile,
              {
                backgroundColor: visualIdentity.backgroundColor,
                borderColor: visualIdentity.borderColor,
              },
            ]}
          >
            <Image
              source={challenge.image ? { uri: challenge.image } : fallbackPhotoSource}
              style={styles.challengeVisualImage}
              resizeMode="contain"
              onError={() => recoverSignedMedia(challenge.image)}
            />
          </View>

          <View style={styles.cardTextColumn}>
            <View style={styles.titleRow}>
              <Text style={styles.challengeTitle} numberOfLines={2} selectable>{challenge.title}</Text>
            </View>

            <View style={styles.cardPillRow}>
              <View style={[styles.statusBadge, { borderColor: statusBadgeColor }]}>
                <Text style={[styles.statusText, { color: statusBadgeColor }]}>
                  {statusBadgeText}
                </Text>
              </View>
              {challenge.status === 'active' && !oneOff && (
                <View style={styles.neutralPill}>
                  <Text style={styles.neutralPillText}>Day {currentDay}</Text>
                </View>
              )}
              {challenge.isCreator && (
                <View style={styles.creatorBadgePill}>
                  <Ionicons name="star" size={12} color="#7A5100" />
                  <Text style={styles.creatorBadgeText}>Creator</Text>
                </View>
              )}
              {challenge.isPrivate && (
                <View style={styles.privateBadgePill}>
                  <Ionicons name="lock-closed" size={12} color="#18142F" />
                  <Text style={styles.privateBadgeText}>Private</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.challengeDescription} selectable>
          {displayDescription}
        </Text>

        {showSubmissionPreview && (
          <ChallengeSubmissionPreview
            preview={preview}
            loading={previewLoading}
            profileMode={profilePreview}
            profileUsername={profileUsername}
            onSubmissionPress={onPreviewSubmissionPress}
            onViewAll={onPreviewViewAll}
          />
        )}

        <View style={styles.challengeMetaGrid}>
          <View style={styles.challengeMetaTile}>
            <Ionicons name="bookmark-outline" size={15} color="#9c8cff" />
            <Text style={styles.metaLabel}>Category</Text>
            <Text style={styles.metaValue} numberOfLines={1}>{challenge.category}</Text>
          </View>
          <View style={styles.challengeMetaTile}>
            <Ionicons name="time-outline" size={15} color="#9c8cff" />
            <Text style={styles.metaLabel}>Duration</Text>
            <Text style={styles.metaValue} numberOfLines={1}>{challenge.duration}</Text>
          </View>
          <View style={styles.challengeMetaTile}>
            <Ionicons name="arrow-forward-outline" size={15} color="#9c8cff" />
            <Text style={styles.metaLabel}>{challenge.status === 'active' ? 'Progress' : 'Status'}</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {challenge.status === 'active' ? `${percent}%` : statusBadgeText}
            </Text>
          </View>
        </View>

        {challenge.progress !== undefined && challenge.status !== 'deleted' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${challenge.progress}%` as any }]} />
            </View>
          </View>
        )}
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.footerCopy}>
          <Text style={styles.footerTitle} numberOfLines={1}>{footerTitle}</Text>
          <Text style={styles.footerSubtitle} numberOfLines={1}>{footerSubtitle}</Text>
        </View>
        {showUploadButton && !hasUploadedToday && canUploadToday ? (
          <TouchableOpacity style={styles.footerAction} onPress={onUpload} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={15} color="#ffffff" />
            <Text style={styles.footerActionText}>{oneOff ? 'Complete' : 'Upload'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.footerAction, styles.footerActionGhost]}>
            <Text style={styles.footerActionGhostText}>View</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  challengeCard: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardContent: {
    padding: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  challengeVisualTile: {
    width: 76,
    height: 76,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeVisualImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  identityMark: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  identityMarkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#101010',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 7,
  },
  challengeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  cardPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  neutralPill: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  neutralPillText: {
    color: '#cfcfcf',
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  uploadButton: {
    padding: 8,
    borderRadius: 18,
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  uploadButtonDisabled: {
    backgroundColor: '#66666640',
  },
  challengeDescription: {
    fontSize: 13,
    color: '#cccccc',
    lineHeight: 19,
    marginBottom: 12,
  },
  challengeMetaGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  challengeMetaTile: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  metaLabel: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 11,
    color: '#dfdfdf',
    fontWeight: '600',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#272727',
    backgroundColor: '#121212',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  footerCopy: {
    flex: 1,
    minWidth: 0,
  },
  footerTitle: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '700',
  },
  footerSubtitle: {
    fontSize: 11,
    color: '#888888',
    marginTop: 2,
  },
  footerAction: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#4700ecff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerActionText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '700',
  },
  footerActionGhost: {
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#333333',
  },
  footerActionGhostText: {
    fontSize: 12,
    color: '#cfcfcf',
    fontWeight: '700',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 11,
    color: '#4CAF50',
    marginBottom: 4,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  creatorBadgePill: {
    backgroundColor: '#FFF1A8',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#B8860B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorBadgeText: {
    fontSize: 11,
    color: '#7A5100',
    fontWeight: '700',
  },
  privateBadgePill: {
    backgroundColor: '#151028',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#4700ec',
  },
  privateBadgeText: {
    fontSize: 11,
    color: '#a78bfa',
    fontWeight: '700',
  },
  challengeDayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    padding: 8,
    borderRadius: 14,
    marginBottom: 8,
  },
  challengeDayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  challengeDayText: {
    fontSize: 11,
    color: '#4700ecff',
    fontWeight: '600',
  },
  challengeStatusText: {
    fontSize: 11,
    color: '#888888',
    fontWeight: '500',
  },
  uploadStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  uploadStatusText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
  },
  uploadStatusTextPending: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '500',
  },
  uploadStatusTextUnavailable: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
  },
  completedBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0a1a0f',
    padding: 8,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1a3a1f',
  },
  completedBadgeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  completedDaysText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
  },
  upcomingBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1500',
    padding: 8,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3a2f0a',
  },
  upcomingBadgeText: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '600',
  },
  deletedBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#251010',
    padding: 8,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#5a2020',
  },
  deletedBadgeText: {
    fontSize: 11,
    color: '#FF6B6B',
    fontWeight: '700',
  },
  deletedStatusText: {
    fontSize: 11,
    color: '#b77',
    fontWeight: '600',
  },
});

export default ChallengeCard;
