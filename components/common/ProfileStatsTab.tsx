import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MappedChallenge } from './ChallengeCard';
import type { Submission } from '../../types/api';
import { parseChallengeCategories } from '../../utils/challengeCategories';
import { calculateProfileStats } from '../../utils/profileStatsMetrics';

type ProfileStatsTabProps = {
  submissions: Submission[];
  challenges: MappedChallenge[];
  submissionChallengeTitles?: Map<number, string>;
  isLoading?: boolean;
  isPartial?: boolean;
};

type CategoryStat = {
  label: string;
  count: number;
};

const calculationDetails = [
  {
    title: 'Showing up',
    description: 'Completed scheduled challenge days divided by the days that were due after you joined. Upcoming and inactive challenges are not included.',
  },
  {
    title: 'Streak',
    description: 'Completed scheduled days in a row. One missed day in any 7-day stretch is protected but does not add to the total. A second miss within that stretch ends the streak; the next completed day starts a new one.',
  },
  {
    title: 'Challenges finished',
    description: 'Ended challenges completed in full divided by all eligible challenges that have ended.',
  },
  {
    title: 'Weekly activity',
    description: 'The number of unique days you posted during the last 28 days, divided by four to show an average week.',
  },
  {
    title: 'Challenge interests',
    description: 'The categories from challenges you joined. Each challenge adds one count to each of its categories.',
  },
  {
    title: 'Recent activity and highlights',
    description: 'Recent activity counts submissions on each of the last 7 days. Highlights use your complete visible submission history and ignore duplicate or inactive posts.',
  },
];

const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

const formatDayLabel = (dayKey: string): string =>
  new Date(`${dayKey}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1);

const formatDayCount = (value: number): string =>
  `${value} ${value === 1 ? 'day' : 'days'}`;

const buildCategoryStats = (challenges: MappedChallenge[]): CategoryStat[] => {
  const counts = new Map<string, CategoryStat>();

  challenges.forEach((challenge) => {
    parseChallengeCategories(challenge.category).forEach((category) => {
      const normalizedCategory = category.toLocaleLowerCase();
      const current = counts.get(normalizedCategory);
      counts.set(normalizedCategory, {
        label: current?.label || category,
        count: (current?.count || 0) + 1,
      });
    });
  });

  return Array.from(counts.values())
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 4);
};

export default function ProfileStatsTab({
  submissions,
  challenges,
  submissionChallengeTitles,
  isLoading = false,
  isPartial = false,
}: ProfileStatsTabProps) {
  const [showCalculationInfo, setShowCalculationInfo] = useState(false);
  const stats = useMemo(() => {
    const metrics = calculateProfileStats({ submissions, challenges });
    const categoryStats = buildCategoryStats(challenges);
    const mostActiveChallenge = metrics.mostActiveChallengeId === null
      ? { title: 'No activity yet', count: 0 }
      : {
          title: submissionChallengeTitles?.get(metrics.mostActiveChallengeId)
            || `Challenge #${metrics.mostActiveChallengeId}`,
          count: metrics.mostActiveChallengeCount,
        };

    return {
      ...metrics,
      categoryStats,
      mostActiveChallenge,
      maxRhythmCount: Math.max(1, ...metrics.rhythmDays.map((day) => day.count)),
      topCategory: categoryStats[0],
    };
  }, [challenges, submissionChallengeTitles, submissions]);

  const maxCategoryCount = Math.max(1, ...stats.categoryStats.map((category) => category.count));

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color="#4700EC" />
        <Text style={styles.loadingTitle}>Loading your progress...</Text>
        <Text style={styles.loadingText}>Gathering your challenge activity.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statsHeadingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>Personal insights</Text>
          <Text style={styles.statsHeading}>Your progress</Text>
          <Text style={styles.statsIntro}>A clear view of the habits you are building.</Text>
        </View>
        <Pressable
          style={styles.infoButton}
          onPress={() => setShowCalculationInfo(true)}
          accessibilityRole="button"
          accessibilityLabel="How profile stats are calculated"
          hitSlop={8}
        >
          <Ionicons name="information-outline" size={19} color="#4700EC" />
        </Pressable>
      </View>
      {isPartial ? (
        <View style={styles.partialNotice}>
          <Ionicons name="cloud-offline-outline" size={16} color="#F5C76B" />
          <Text style={styles.partialNoticeText}>Some stats are unavailable right now. Pull to retry.</Text>
        </View>
      ) : null}
      <LinearGradient
        colors={['#2D086B', '#5A16D6', '#8A51FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.momentumCard}
      >
        <View style={styles.momentumGlowLarge} />
        <View style={styles.momentumGlowSmall} />
        <View style={styles.momentumTopRow}>
          <View style={styles.momentumBadge}>
            <Ionicons name="pulse" size={14} color="#FFFFFF" />
            <Text style={styles.momentumBadgeText}>Current momentum</Text>
          </View>
          <View style={styles.consistencyPill}>
            <Text style={styles.consistencyValue}>
              {stats.consistencyPercentage === null ? '—' : `${stats.consistencyPercentage}%`}
            </Text>
            <Text style={styles.consistencyLabel}>showing up</Text>
          </View>
        </View>
        <Text style={styles.momentumTitle}>
          {stats.currentStreak > 0 ? `${formatDayCount(stats.currentStreak)} streak` : 'Start your streak'}
        </Text>
        <Text style={styles.momentumSubtitle}>Every check-in builds the habit you came here for.</Text>
        <View style={styles.momentumFooter}>
          <View style={styles.momentumStat}>
            <Ionicons name="checkmark-circle" size={17} color="#C9FFDC" />
            <View>
              <Text style={styles.momentumStatValue}>{stats.completedDueDays}</Text>
              <Text style={styles.momentumStatLabel}>check-in days</Text>
            </View>
          </View>
          <View style={styles.momentumDivider} />
          <View style={styles.momentumStat}>
            <Ionicons name="flame" size={17} color="#FFD990" />
            <View>
              <Text style={styles.momentumStatValue}>{stats.longestStreak}</Text>
              <Text style={styles.momentumStatLabel}>best streak</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.metricGrid}>
        <View style={styles.metricCard}>
          <View style={[styles.metricIcon, styles.iconPurple]}>
            <Ionicons name="trophy-outline" size={18} color="#4700EC" />
          </View>
          <Text style={styles.metricLabel}>Challenges finished</Text>
          <Text style={styles.metricValue}>
            {stats.challengeCompletionPercentage === null ? '—' : `${stats.challengeCompletionPercentage}%`}
          </Text>
          <Text style={styles.metricSubtext}>
            {stats.endedChallenges > 0
              ? `${stats.completedChallenges} of ${stats.endedChallenges} completed in full`
              : 'Complete a challenge to begin'}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.metricIcon, styles.iconGreen]}>
            <Ionicons name="calendar-outline" size={18} color="#137A4A" />
          </View>
          <Text style={styles.metricLabel}>Weekly activity</Text>
          <Text style={styles.metricValue}>{stats.activeDaysPerWeek}</Text>
          <Text style={styles.metricSubtext}>active days in an average week</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIcon, styles.iconPurple]}>
              <Ionicons name="color-palette-outline" size={16} color="#4700EC" />
            </View>
            <Text style={styles.sectionTitle}>Challenge interests</Text>
          </View>
          <Text style={styles.sectionNote}>Challenges joined</Text>
        </View>
        {stats.categoryStats.length > 0 ? (
          stats.categoryStats.map((category) => (
            <View key={category.label} style={styles.barRow}>
              <Text style={styles.barName} numberOfLines={1}>{category.label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.max(8, (category.count / maxCategoryCount) * 100)}%` }]} />
              </View>
              <Text style={styles.barValue}>{category.count}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Challenge categories will appear here after this profile joins challenges.</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIcon, styles.iconGreen]}>
              <Ionicons name="stats-chart-outline" size={16} color="#137A4A" />
            </View>
            <Text style={styles.sectionTitle}>Recent activity</Text>
          </View>
          <Text style={styles.sectionNote}>Last 7 days</Text>
        </View>
        <View style={styles.rhythmGrid}>
          {stats.rhythmDays.map((day) => (
            <View key={day.key} style={styles.rhythmDay}>
              <Text style={styles.rhythmCount}>{day.count || ''}</Text>
              <View style={styles.rhythmColumn}>
                <View
                  style={[
                    styles.rhythmBar,
                    { height: `${Math.max(12, (day.count / stats.maxRhythmCount) * 100)}%` },
                    day.count === 0 && styles.rhythmBarEmpty,
                  ]}
                />
              </View>
              <Text style={styles.rhythmLabel}>{formatDayLabel(day.key)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.miniGrid}>
        <View style={[styles.miniCard, styles.miniCardPurple]}>
          <View style={styles.miniCardTopRow}>
            <View style={[styles.miniIcon, styles.iconPurple]}>
              <Ionicons name="flash-outline" size={17} color="#4700EC" />
            </View>
            <Text style={styles.miniCardOverline}>Your focus</Text>
          </View>
          <Text style={styles.metricLabel}>Most active challenge</Text>
          <Text style={styles.miniValue} numberOfLines={1}>{stats.mostActiveChallenge.title}</Text>
          <Text style={styles.metricSubtext}>{formatDayCount(stats.mostActiveChallenge.count)} completed</Text>
        </View>
        <View style={[styles.miniCard, styles.miniCardGold]}>
          <View style={styles.miniCardTopRow}>
            <View style={[styles.miniIcon, styles.iconGold]}>
              <Ionicons name="sparkles-outline" size={17} color="#9B6200" />
            </View>
            <Text style={styles.miniCardOverline}>Top theme</Text>
          </View>
          <Text style={styles.metricLabel}>Top interest</Text>
          <Text style={styles.miniValue} numberOfLines={1}>{stats.topCategory?.label || 'None yet'}</Text>
          <Text style={styles.metricSubtext}>
            {stats.topCategory ? `${stats.topCategory.count} challenges` : 'Join challenges to build this'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIcon, styles.iconGold]}>
              <Ionicons name="sparkles-outline" size={16} color="#9B6200" />
            </View>
            <Text style={styles.sectionTitle}>Your highlights</Text>
          </View>
          <Text style={styles.sectionNote}>All time</Text>
        </View>
        <View style={styles.highlightGrid}>
          <View style={styles.highlightCard}>
            <View style={[styles.highlightIcon, styles.iconGold]}>
              <Ionicons name="sparkles-outline" size={17} color="#9B6200" />
            </View>
            <Text style={styles.highlightValue}>{formatCompactNumber(stats.totalGlories)}</Text>
            <Text style={styles.highlightTitle}>Glories</Text>
            <Text style={styles.highlightSubtext}>earned</Text>
          </View>
          <View style={styles.highlightCard}>
            <View style={[styles.highlightIcon, styles.iconPurple]}>
              <Ionicons name="chatbubble-ellipses-outline" size={17} color="#4700EC" />
            </View>
            <Text style={styles.highlightValue}>{formatCompactNumber(stats.totalComments)}</Text>
            <Text style={styles.highlightTitle}>Comments</Text>
            <Text style={styles.highlightSubtext}>received</Text>
          </View>
          <View style={styles.highlightCard}>
            <View style={[styles.highlightIcon, styles.iconGreen]}>
              <Ionicons name="calendar-clear-outline" size={17} color="#137A4A" />
            </View>
            <Text style={styles.highlightValue}>{stats.uniqueSubmissionDays}</Text>
            <Text style={styles.highlightTitle}>Active days</Text>
            <Text style={styles.highlightSubtext}>with posts</Text>
          </View>
        </View>
      </View>

      <Modal
        visible={showCalculationInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalculationInfo(false)}
      >
        <View style={styles.infoModalOverlay}>
          <Pressable
            style={styles.infoModalBackdrop}
            onPress={() => setShowCalculationInfo(false)}
            accessibilityRole="button"
            accessibilityLabel="Close stats information"
          />
          <View style={styles.infoModalCard}>
            <View style={styles.infoModalHeader}>
              <View style={styles.infoModalTitleRow}>
                <Ionicons name="information-circle-outline" size={23} color="#C9BAFF" />
                <Text style={styles.infoModalTitle}>How your stats work</Text>
              </View>
              <Pressable
                style={styles.infoModalCloseButton}
                onPress={() => setShowCalculationInfo(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
              >
                <Ionicons name="close" size={21} color="#D8D4DE" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.infoModalContent}>
              {calculationDetails.map((detail) => (
                <View key={detail.title} style={styles.infoDetail}>
                  <Text style={styles.infoDetailTitle}>{detail.title}</Text>
                  <Text style={styles.infoDetailText}>{detail.description}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 14,
    paddingBottom: 24,
    backgroundColor: '#F8F7FC',
  },
  loadingContainer: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingTitle: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    color: '#000000',
    fontSize: 11,
  },
  headingCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: '#6A3AE8',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  statsIntro: {
    color: '#5F5868',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  statsHeadingRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statsHeading: {
    color: '#000000',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '700',
  },
  infoButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#F0ECFF',
  },
  momentumCard: {
    minHeight: 214,
    borderRadius: 26,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#4700EC',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 7,
  },
  momentumGlowLarge: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -70,
    top: -74,
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  momentumGlowSmall: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    left: -24,
    bottom: -42,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  momentumTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  momentumBadge: {
    height: 30,
    borderRadius: 19,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  momentumBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  consistencyPill: {
    alignItems: 'flex-end',
  },
  consistencyValue: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '700',
  },
  consistencyLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 9,
    lineHeight: 12,
  },
  momentumTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    marginTop: 19,
  },
  momentumSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
    maxWidth: 290,
  },
  momentumFooter: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 17,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(18,0,62,0.24)',
  },
  momentumStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  momentumStatValue: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '700',
  },
  momentumStatLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 9,
    lineHeight: 12,
  },
  momentumDivider: {
    width: 1,
    height: 26,
    marginHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconPurple: { backgroundColor: '#EEE8FF' },
  iconGreen: { backgroundColor: '#E7F8EF' },
  iconGold: { backgroundColor: '#FFF3D9' },
  partialNotice: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  partialNoticeText: {
    flex: 1,
    color: '#8A5700',
    fontSize: 11,
    lineHeight: 15,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 154,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    padding: 14,
    shadowColor: '#2A174E',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  metricLabel: {
    color: '#000000',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  metricValue: {
    marginTop: 6,
    color: '#000000',
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '700',
  },
  metricSubtext: {
    marginTop: 5,
    color: '#514A5B',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '400',
  },
  section: {
    borderWidth: 1,
    borderColor: '#E7E3EF',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 15,
    marginTop: 12,
    shadowColor: '#2A174E',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#000000',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  sectionTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNote: {
    color: '#6F6879',
    fontSize: 11,
    fontWeight: '400',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 10,
  },
  barName: {
    width: 78,
    color: '#000000',
    fontSize: 11,
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#E7E3EF',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4700ec',
  },
  barValue: {
    width: 32,
    color: '#000000',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
  },
  emptyText: {
    color: '#000000',
    fontSize: 12,
    lineHeight: 18,
  },
  rhythmGrid: {
    height: 112,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  rhythmDay: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  rhythmColumn: {
    width: '100%',
    height: 70,
    justifyContent: 'flex-end',
  },
  rhythmBar: {
    width: '100%',
    minHeight: 9,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: '#4700EC',
  },
  rhythmBarEmpty: {
    backgroundColor: '#E7E3EF',
  },
  rhythmLabel: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '600',
  },
  rhythmCount: {
    height: 14,
    color: '#6F6879',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '600',
  },
  miniGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  miniCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    borderRadius: 21,
    padding: 13,
    backgroundColor: '#FFFFFF',
  },
  miniCardPurple: { backgroundColor: '#F6F2FF' },
  miniCardGold: { backgroundColor: '#FFFAEF' },
  miniCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  miniIcon: {
    width: 32,
    height: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCardOverline: {
    color: '#6F6879',
    fontSize: 9,
    fontWeight: '600',
  },
  miniValue: {
    marginTop: 7,
    color: '#000000',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  highlightGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  highlightCard: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    padding: 10,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    borderRadius: 18,
    backgroundColor: '#FCFBFE',
  },
  highlightIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  highlightTitle: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '600',
  },
  highlightSubtext: {
    marginTop: 2,
    color: '#6F6879',
    fontSize: 9,
    fontWeight: '400',
  },
  highlightValue: {
    color: '#000000',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
  },
  infoModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
  },
  infoModalCard: {
    maxHeight: '78%',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 10,
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  infoModalTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoModalTitle: {
    flex: 1,
    color: '#000000',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  infoModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
  },
  infoModalContent: {
    paddingVertical: 6,
    paddingBottom: 16,
  },
  infoDetail: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  infoDetailTitle: {
    color: '#000000',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  infoDetailText: {
    marginTop: 3,
    color: '#000000',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400',
  },
});
