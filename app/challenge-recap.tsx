import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTouchableOpacity as TouchableOpacity } from '../components/common/AppPressable';
import { useAllUserChallengeSubmissions, useChallenge } from '../hooks/useChallenges';
import { useSignedMediaRecovery } from '../hooks/useSignedMediaRecovery';
import { useAuthContext } from '../providers/AuthProvider';
import type { Submission } from '../types/api';
import { isOneOffChallengeMode } from '../utils/challengeMode';
import { isMemoirPhotoUrl, parseMemoirMediaUrls } from '../utils/memoirCollage';
import { createCachedRemoteImageSource } from '../utils/remoteImageCache';

type RecapSlide =
  | { key: 'intro'; kind: 'intro' }
  | { key: string; kind: 'day'; day: number; endDay: number; submissions: Submission[] }
  | { key: 'memoir'; kind: 'memoir' };

type RecapMoment = {
  key: string;
  uri: string;
  description: string;
  gloriesCount: number;
  submissionTime: string;
  submissionNumber: number;
  mediaNumber: number;
  mediaCount: number;
};

const CELEBRATION_COLORS = ['#FFD55F', '#FF66A8', '#79DFFF', '#8F73FF', '#62E6A6', '#FFAB5F'];

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function getSubmissionTime(submission: Submission) {
  const value = submission.submissionTime || submission.createdAt || '';
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getDayDate(startDateValue: string, day: number) {
  if (!startDateValue) return '';
  const date = new Date(startDateValue);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + day - 1);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function getMomentTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function buildDayMoments(submissions: Submission[]): RecapMoment[] {
  const moments: RecapMoment[] = [];
  const sortedSubmissions = [...submissions].sort(
    (left, right) => getSubmissionTime(left) - getSubmissionTime(right),
  );

  sortedSubmissions.forEach((submission, submissionIndex) => {
    const mediaUrls = parseMemoirMediaUrls(
      submission.mediaUrls as string | string[] | undefined,
    ).filter(isMemoirPhotoUrl);

    mediaUrls.forEach((uri, mediaIndex) => {
      moments.push({
        key: `${submission.id || submission.submissionId || submissionIndex}:${mediaIndex}`,
        uri,
        description: submission.description || 'Progress captured.',
        gloriesCount: submission.gloriesCount || 0,
        submissionTime: submission.submissionTime || submission.createdAt || '',
        submissionNumber: submissionIndex + 1,
        mediaNumber: mediaIndex + 1,
        mediaCount: mediaUrls.length,
      });
    });
  });

  return moments;
}

function buildDaySlides(
  totalDays: number,
  submissionsByDay: Map<number, Submission[]>,
): Extract<RecapSlide, { kind: 'day' }>[] {
  const daySlides: Extract<RecapSlide, { kind: 'day' }>[] = [];
  let day = 1;

  while (day <= totalDays) {
    const submissions = submissionsByDay.get(day) || [];
    if (submissions.length > 0) {
      daySlides.push({
        key: `day-${day}`,
        kind: 'day',
        day,
        endDay: day,
        submissions,
      });
      day += 1;
      continue;
    }

    let endDay = day;
    while (
      endDay < totalDays
      && (submissionsByDay.get(endDay + 1) || []).length === 0
    ) {
      endDay += 1;
    }

    daySlides.push({
      key: endDay === day ? `day-${day}` : `quiet-${day}-${endDay}`,
      kind: 'day',
      day,
      endDay,
      submissions: [],
    });
    day = endDay + 1;
  }

  return daySlides;
}

function IntroSlide({
  title,
  completedDays,
  proofCount,
  gloryCount,
  availableHeight,
}: {
  title: string;
  completedDays: number;
  proofCount: number;
  gloryCount: number;
  availableHeight: number;
}) {
  return (
    <LinearGradient
      colors={['rgba(82,43,160,0.78)', 'rgba(18,12,29,0.98)', '#08070C']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.introCard, { minHeight: Math.min(520, Math.max(430, availableHeight - 18)) }]}
    >
      <View style={styles.introGlowOne} />
      <View style={styles.introGlowTwo} />
      <View style={styles.confettiLayer} pointerEvents="none">
        {Array.from({ length: 18 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.confettiPiece,
              {
                left: `${5 + ((index * 29) % 90)}%`,
                top: 12 + ((index * 41) % 150),
                backgroundColor: CELEBRATION_COLORS[index % CELEBRATION_COLORS.length],
                transform: [{ rotate: `${index * 31}deg` }],
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.completionBadge}>
        <Ionicons name="checkmark" size={43} color="#190B25" />
        <Text style={styles.completionSparkle}>✨</Text>
      </View>
      <Text style={styles.introEyebrow} numberOfLines={2}>{title}</Text>
      <Text style={styles.introTitle}>Challenge complete! 🏁</Text>
      <Text style={styles.introBody}>
        You showed up and made the journey yours. Relive every check-in, one day at a time.
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{completedDays}</Text>
          <Text style={styles.statLabel}>days</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{proofCount}</Text>
          <Text style={styles.statLabel}>proofs</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{gloryCount}</Text>
          <Text style={styles.statLabel}>glories</Text>
        </View>
      </View>

      <View style={styles.readyRow}>
        <View style={styles.readyIcon}>
          <Ionicons name="play" size={16} color="#D7C8FF" />
        </View>
        <View style={styles.readyCopy}>
          <Text style={styles.readyTitle}>Your full recap is ready</Text>
          <Text style={styles.readySubtitle}>Press Start recap to play your journey</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function DaySlide({
  day,
  endDay,
  submissions,
  startDate,
  stageWidth,
  availableHeight,
  recoverSignedMedia,
}: {
  day: number;
  endDay: number;
  submissions: Submission[];
  startDate: string;
  stageWidth: number;
  availableHeight: number;
  recoverSignedMedia: (url: string) => void;
}) {
  const moments = useMemo(() => buildDayMoments(submissions), [submissions]);
  const [activeMoment, setActiveMoment] = useState(0);
  const hasMultipleMoments = moments.length > 1;
  const cardWidth = hasMultipleMoments
    ? Math.max(250, Math.round(stageWidth * 0.86))
    : stageWidth;
  const cardHeight = Math.min(500, Math.max(360, availableHeight - 72));
  const startDayDate = getDayDate(startDate, day);
  const endDayDate = getDayDate(startDate, endDay);
  const isQuietPeriod = moments.length === 0 && endDay > day;
  const dayLabel = endDay > day ? `DAY ${day} – DAY ${endDay}` : `DAY ${day}`;
  const dateLabel = endDay > day && startDayDate && endDayDate
    ? `${startDayDate} – ${endDayDate}`
    : startDayDate;

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offset / (cardWidth + 12));
    setActiveMoment(Math.max(0, Math.min(moments.length - 1, nextIndex)));
  };

  return (
    <View style={styles.daySlide}>
      <View style={styles.dayHeadingRow}>
        <View style={styles.dayPill}>
          <Text style={styles.dayPillText}>{dayLabel}</Text>
        </View>
        {dateLabel ? <Text style={styles.dayDate}>{dateLabel}</Text> : null}
        {moments.length > 0 ? (
          <Text style={styles.momentCount}>{activeMoment + 1} / {moments.length}</Text>
        ) : null}
      </View>

      {moments.length === 0 ? (
        <LinearGradient
          colors={['#25173D', '#100C18', '#08070C']}
          style={[styles.emptyDayCard, { width: stageWidth, height: cardHeight }]}
        >
          <View style={styles.emptyDayIcon}>
            <Ionicons name="calendar-outline" size={30} color="#C7B3F4" />
          </View>
          <Text style={styles.emptyDayTitle}>
            {isQuietPeriod ? 'A quiet period in the story' : 'A quiet day in the story'}
          </Text>
          <Text style={styles.emptyDayBody}>
            {isQuietPeriod
              ? `From Day ${day} through Day ${endDay}, no photo submissions were posted.`
              : `No photo submission was posted for Day ${day}.`}
          </Text>
        </LinearGradient>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={cardWidth + 12}
            snapToAlignment="start"
            disableIntervalMomentum
            onMomentumScrollEnd={handleMomentumEnd}
            contentContainerStyle={hasMultipleMoments ? styles.momentRailMultiple : undefined}
          >
            {moments.map((moment, index) => (
              <View
                key={moment.key}
                style={[
                  styles.momentCard,
                  { width: cardWidth, height: cardHeight },
                  index < moments.length - 1 && styles.momentCardSpacing,
                ]}
              >
                <ExpoImage
                  source={createCachedRemoteImageSource(moment.uri)}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={180}
                  onError={() => recoverSignedMedia(moment.uri)}
                  accessibilityLabel={`Day ${day} submission photo ${index + 1}`}
                />
                <LinearGradient
                  colors={['rgba(5,4,8,0.08)', 'rgba(5,4,8,0.24)', 'rgba(5,4,8,0.96)']}
                  locations={[0, 0.48, 1]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.momentBadgeRow}>
                  <View style={styles.momentBadge}>
                    <Ionicons name="image-outline" size={13} color="#FFFFFF" />
                    <Text style={styles.momentBadgeText}>Submission {moment.submissionNumber}</Text>
                  </View>
                  {moment.mediaCount > 1 ? (
                    <View style={styles.mediaBadge}>
                      <Text style={styles.mediaBadgeText}>{moment.mediaNumber}/{moment.mediaCount}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.momentCopy}>
                  <Text style={styles.momentTitle} numberOfLines={3}>
                    {moment.description}
                  </Text>
                  <View style={styles.momentMetaRow}>
                    {getMomentTime(moment.submissionTime) ? (
                      <Text style={styles.momentMeta}>{getMomentTime(moment.submissionTime)}</Text>
                    ) : null}
                    <View style={styles.gloryMeta}>
                      <Ionicons name="sparkles" size={14} color="#FFD66F" />
                      <Text style={styles.momentMeta}>{moment.gloriesCount} glories</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {hasMultipleMoments ? (
            <View style={styles.scrollHintRow}>
              <Ionicons name="swap-horizontal" size={15} color="#A89CBD" />
              <Text style={styles.scrollHint}>Swipe for every submission from Day {day}</Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function MemoirSlide({
  title,
  proofCount,
  completedDays,
  availableHeight,
}: {
  title: string;
  proofCount: number;
  completedDays: number;
  availableHeight: number;
}) {
  const hasProofs = proofCount > 0;

  return (
    <LinearGradient
      colors={['rgba(74,44,151,0.8)', 'rgba(19,14,30,0.98)', '#07070B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.memoirCard, { minHeight: Math.min(520, Math.max(430, availableHeight - 18)) }]}
    >
      <View style={styles.memoirGlow} />
      <View style={styles.memoirIcon}>
        <Ionicons name={hasProofs ? 'book' : 'albums-outline'} size={36} color="#FFF1B8" />
      </View>
      <Text style={styles.memoirEyebrow}>YOUR CHALLENGE STORY</Text>
      <Text style={styles.memoirTitle}>
        {hasProofs ? 'Your memoir is ready.' : 'Your timeline is ready.'}
      </Text>
      <Text style={styles.memoirBody}>
        {hasProofs
          ? 'Turn the full journey into a shareable memory with every proof and milestone in one place.'
          : 'Review the full challenge timeline and every day that shaped the journey.'}
      </Text>

      <View style={styles.memoirPreview}>
        <View style={styles.memoirPreviewTop}>
          <View style={styles.memoirPreviewMark}>
            <Ionicons name="sparkles" size={17} color="#FFD56A" />
          </View>
          <View style={styles.memoirPreviewCopy}>
            <Text style={styles.memoirPreviewLabel}>{hasProofs ? 'MEMOIR' : 'TIMELINE'}</Text>
            <Text style={styles.memoirPreviewTitle} numberOfLines={2}>{title}</Text>
          </View>
        </View>
        <View style={styles.memoirPreviewStats}>
          <Text style={styles.memoirPreviewStat}>{completedDays} active days</Text>
          <View style={styles.memoirPreviewDot} />
          <Text style={styles.memoirPreviewStat}>{proofCount} proofs</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

export default function ChallengeRecapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const recoverSignedMedia = useSignedMediaRecovery();
  const { currentUserId } = useAuthContext();
  const challengeId = Number(getStringParam(params.challengeId as string | string[] | undefined)) || 0;
  const { data: challenge, isLoading: challengeLoading } = useChallenge(challengeId, currentUserId);
  const {
    data: submissions = [],
    isLoading: submissionsLoading,
    isError,
    refetch,
  } = useAllUserChallengeSubmissions(currentUserId, challengeId, currentUserId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;

  const challengeTitle = challenge?.title
    || getStringParam(params.title as string | string[] | undefined)
    || 'Challenge';
  const challengeMode = challenge?.challengeMode
    || getStringParam(params.challengeMode as string | string[] | undefined)
    || 'DAILY';
  const isReadOnly = getStringParam(params.readOnly as string | string[] | undefined) === 'true';
  const isOneOff = isOneOffChallengeMode(challengeMode);
  const startDate = challenge?.startDate
    || getStringParam(params.startDate as string | string[] | undefined)
    || challenge?.createdAt
    || '';
  const highestSubmittedDay = submissions.reduce(
    (highest, submission) => Math.max(highest, submission.dayNumber || 0),
    0,
  );
  const routeDays = Number(getStringParam(params.numberOfDays as string | string[] | undefined)) || 0;
  const totalDays = isOneOff
    ? 1
    : Math.max(1, challenge?.numberOfDays || routeDays || highestSubmittedDay);
  const submissionsByDay = useMemo(() => {
    const grouped = new Map<number, Submission[]>();
    submissions.forEach((submission) => {
      const day = Math.max(1, submission.dayNumber || 1);
      const current = grouped.get(day) || [];
      current.push(submission);
      grouped.set(day, current);
    });
    return grouped;
  }, [submissions]);
  const slides = useMemo<RecapSlide[]>(() => [
    { key: 'intro', kind: 'intro' },
    ...buildDaySlides(totalDays, submissionsByDay),
    { key: 'memoir', kind: 'memoir' },
  ], [submissionsByDay, totalDays]);
  const activeSlide = slides[activeIndex] || slides[0];
  const completedDays = submissionsByDay.size;
  const proofCount = submissions.length;
  const gloryCount = submissions.reduce(
    (total, submission) => total + (submission.gloriesCount || 0),
    0,
  );
  const isLastSlide = activeIndex === slides.length - 1;
  const stageWidth = Math.min(width - 32, 410);
  const availableHeight = Math.max(400, height - 210);

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, fade]);

  useEffect(() => {
    if (!isPlaying) return;
    if (isLastSlide) {
      setIsPlaying(false);
      return;
    }

    const delay = activeSlide.kind === 'day' && activeSlide.submissions.length > 1
      ? 5200
      : 3600;
    const timeout = setTimeout(() => {
      setActiveIndex((current) => Math.min(current + 1, slides.length - 1));
    }, delay);
    return () => clearTimeout(timeout);
  }, [activeSlide, isLastSlide, isPlaying, slides.length]);

  const goTo = (index: number, pause = true) => {
    if (pause) setIsPlaying(false);
    setActiveIndex(Math.max(0, Math.min(slides.length - 1, index)));
  };

  const openMemoir = () => {
    router.replace({
      pathname: '/challenge-submissions',
      params: {
        challengeId: challengeId.toString(),
        title: challengeTitle,
        numberOfDays: totalDays.toString(),
        startDate,
        challengeMode,
        readOnly: isReadOnly ? 'true' : 'false',
        ...(proofCount > 0 ? { openMemoir: 'true' } : {}),
      },
    });
  };

  const handleMainAction = () => {
    if (isLastSlide) {
      openMemoir();
      return;
    }
    if (activeIndex === 0) {
      setIsPlaying(true);
      setActiveIndex(1);
      return;
    }
    goTo(activeIndex + 1);
  };

  const renderSlide = () => {
    if (activeSlide.kind === 'intro') {
      return (
        <IntroSlide
          title={challengeTitle}
          completedDays={completedDays}
          proofCount={proofCount}
          gloryCount={gloryCount}
          availableHeight={availableHeight}
        />
      );
    }
    if (activeSlide.kind === 'day') {
      return (
        <DaySlide
          day={activeSlide.day}
          endDay={activeSlide.endDay}
          submissions={activeSlide.submissions}
          startDate={startDate}
          stageWidth={stageWidth}
          availableHeight={availableHeight}
          recoverSignedMedia={recoverSignedMedia}
        />
      );
    }
    return (
      <MemoirSlide
        title={challengeTitle}
        proofCount={proofCount}
        completedDays={completedDays}
        availableHeight={availableHeight}
      />
    );
  };

  if (challengeLoading || submissionsLoading) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={['top', 'bottom']}>
        <StatusBar style="light" backgroundColor="#06050A" />
        <ActivityIndicator color="#A989FF" size="large" />
        <Text style={styles.loadingText}>Preparing your recap…</Text>
      </SafeAreaView>
    );
  }

  if (challengeId <= 0 || isError) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={['top', 'bottom']}>
        <StatusBar style="light" backgroundColor="#06050A" />
        <View style={styles.errorIcon}>
          <Ionicons name="cloud-offline-outline" size={30} color="#D8C8F7" />
        </View>
        <Text style={styles.errorTitle}>Recap unavailable</Text>
        <Text style={styles.errorBody}>We couldn’t load the complete challenge story.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => void refetch()}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeTextButton} onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <StatusBar style="light" backgroundColor="#06050A" />
      <LinearGradient
        colors={['#171020', '#09070E', '#050509']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.backgroundGlow} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.roundButton}
          onPress={() => router.back()}
          accessibilityLabel="Close challenge recap"
        >
          <Ionicons name="close" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>CHALLENGE RECAP</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{challengeTitle}</Text>
        </View>
        <TouchableOpacity
          style={styles.roundButton}
          onPress={() => setIsPlaying((playing) => !playing)}
          accessibilityLabel={isPlaying ? 'Pause challenge recap' : 'Play challenge recap'}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={17} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.progressRow} accessibilityLabel={`Slide ${activeIndex + 1} of ${slides.length}`}>
        {slides.map((slide, index) => (
          <TouchableOpacity
            key={slide.key}
            style={styles.progressHitArea}
            onPress={() => goTo(index)}
            accessibilityLabel={`Open recap slide ${index + 1}`}
          >
            <View
              style={[
                styles.progressSegment,
                index <= activeIndex && styles.progressSegmentActive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.stage}>
        <Animated.View
          style={[
            styles.slideTransition,
            {
              width: stageWidth,
              opacity: fade,
              transform: [{
                translateX: fade.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
              }],
            },
          ]}
        >
          {renderSlide()}
        </Animated.View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.navButton, activeIndex === 0 && styles.navButtonDisabled]}
          disabled={activeIndex === 0}
          onPress={() => goTo(activeIndex - 1)}
          accessibilityLabel="Previous recap slide"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mainButton} onPress={handleMainAction}>
          <Text style={styles.mainButtonText}>
            {isLastSlide
              ? proofCount > 0 ? 'Open memoir' : 'View timeline'
              : activeIndex === 0
                ? 'Start recap'
                : activeIndex === slides.length - 2
                  ? 'Finish recap'
                  : activeSlide.kind === 'day' && activeSlide.endDay > activeSlide.day
                    ? 'Continue'
                    : 'Next day'}
          </Text>
          <Ionicons
            name={isLastSlide ? 'book-outline' : activeIndex === 0 ? 'play' : 'arrow-forward'}
            size={18}
            color="#3B168D"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, isLastSlide && styles.navButtonDisabled]}
          disabled={isLastSlide}
          onPress={() => goTo(activeIndex + 1)}
          accessibilityLabel="Next recap slide"
        >
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06050A',
    paddingHorizontal: 16,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#06050A',
  },
  loadingText: {
    marginTop: 14,
    color: '#BDB1D2',
    fontSize: 13,
    fontWeight: '500',
  },
  errorIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171020',
  },
  errorTitle: {
    marginTop: 18,
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '700',
  },
  errorBody: {
    marginTop: 8,
    color: '#A99DBB',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 150,
    minHeight: 48,
    marginTop: 22,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  retryButtonText: {
    color: '#3B168D',
    fontSize: 14,
    fontWeight: '700',
  },
  closeTextButton: {
    minHeight: 42,
    marginTop: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#BDB1D2',
    fontSize: 13,
    fontWeight: '600',
  },
  backgroundGlow: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    top: -90,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(117,69,225,0.25)',
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerEyebrow: {
    color: '#AFA2C6',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  progressRow: {
    height: 18,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  progressHitArea: {
    flex: 1,
    height: 18,
    justifyContent: 'center',
  },
  progressSegment: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  progressSegmentActive: {
    backgroundColor: '#FFFFFF',
  },
  stage: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  slideTransition: {
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  introCard: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introGlowOne: {
    position: 'absolute',
    width: 240,
    height: 240,
    top: -115,
    right: -70,
    borderRadius: 120,
    backgroundColor: 'rgba(134,95,255,0.3)',
  },
  introGlowTwo: {
    position: 'absolute',
    width: 190,
    height: 190,
    bottom: -110,
    left: -90,
    borderRadius: 95,
    backgroundColor: 'rgba(255,163,82,0.13)',
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  confettiPiece: {
    position: 'absolute',
    width: 6,
    height: 12,
    borderRadius: 3,
    opacity: 0.9,
  },
  completionBadge: {
    width: 84,
    height: 84,
    marginBottom: 19,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFB465',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#FF66A8',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 25,
    elevation: 10,
    transform: [{ rotate: '-4deg' }],
  },
  completionSparkle: {
    position: 'absolute',
    right: -20,
    top: -18,
    fontSize: 28,
    transform: [{ rotate: '4deg' }],
  },
  introEyebrow: {
    maxWidth: '90%',
    color: '#D6C8EE',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: 0.8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  introTitle: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    textAlign: 'center',
  },
  introBody: {
    maxWidth: 315,
    marginTop: 10,
    color: '#D8D0E8',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    textAlign: 'center',
  },
  statsRow: {
    width: '100%',
    marginTop: 20,
    flexDirection: 'row',
    gap: 8,
  },
  statTile: {
    flex: 1,
    minHeight: 64,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  statLabel: {
    marginTop: 2,
    color: '#BEB2D1',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readyRow: {
    width: '100%',
    minHeight: 56,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  readyIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(156,124,255,0.22)',
  },
  readyCopy: {
    flex: 1,
    minWidth: 0,
  },
  readyTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  readySubtitle: {
    marginTop: 1,
    color: '#BDB2D2',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '400',
  },
  daySlide: {
    width: '100%',
  },
  dayHeadingRow: {
    minHeight: 34,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayPill: {
    minHeight: 29,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dayPillText: {
    color: '#F1EAFF',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 0.45,
  },
  dayDate: {
    marginLeft: 8,
    color: '#A89DBB',
    fontSize: 11,
    fontWeight: '500',
  },
  momentCount: {
    marginLeft: 'auto',
    color: '#A89DBB',
    fontSize: 11,
    fontWeight: '600',
  },
  momentRailMultiple: {
    paddingRight: 44,
  },
  momentCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#15121D',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  momentCardSpacing: {
    marginRight: 12,
  },
  momentBadgeRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  momentBadge: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(7,6,12,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  momentBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  mediaBadge: {
    minWidth: 38,
    minHeight: 30,
    marginLeft: 'auto',
    paddingHorizontal: 8,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,6,12,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  mediaBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  momentCopy: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
  },
  momentTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '700',
  },
  momentMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gloryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  momentMeta: {
    color: '#D7CEE8',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  scrollHintRow: {
    minHeight: 28,
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  scrollHint: {
    color: '#A89CBD',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyDayCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  emptyDayIcon: {
    width: 64,
    height: 64,
    marginBottom: 16,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(184,151,255,0.14)',
  },
  emptyDayTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDayBody: {
    marginTop: 8,
    color: '#B5A9C8',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
    textAlign: 'center',
  },
  memoirCard: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoirGlow: {
    position: 'absolute',
    top: -80,
    right: -70,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(255,207,91,0.13)',
  },
  memoirIcon: {
    width: 78,
    height: 78,
    marginBottom: 18,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  memoirEyebrow: {
    color: '#CBBEE1',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  memoirTitle: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '700',
    textAlign: 'center',
  },
  memoirBody: {
    maxWidth: 310,
    marginTop: 11,
    color: '#D5CCE4',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
    textAlign: 'center',
  },
  memoirPreview: {
    width: '100%',
    marginTop: 23,
    padding: 14,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
  },
  memoirPreviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memoirPreviewMark: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,213,106,0.12)',
  },
  memoirPreviewCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  memoirPreviewLabel: {
    color: '#BDAFD1',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  memoirPreviewTitle: {
    marginTop: 2,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  memoirPreviewStats: {
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.09)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  memoirPreviewStat: {
    color: '#CBBFD9',
    fontSize: 10,
    fontWeight: '500',
  },
  memoirPreviewDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#7E7093',
  },
  controls: {
    minHeight: 62,
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navButton: {
    width: 54,
    height: 54,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  mainButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 19,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  mainButtonText: {
    color: '#3B168D',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
});
