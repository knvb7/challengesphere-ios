import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  AppPressable as Pressable,
  AppTouchableOpacity as TouchableOpacity,
} from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useAuthContext } from '../providers/AuthProvider';
import { onboardingService } from '../services/onboardingService';

type IconName = keyof typeof Ionicons.glyphMap;

type OnboardingSlideKey = 'community' | 'fun' | 'friends' | 'prizes' | 'private';

type OnboardingSlide = {
  key: OnboardingSlideKey;
  kicker: string;
  title: string;
  body: string;
  icon: IconName;
  accent: string;
  accentSoft: string;
  background: [string, string, string];
  chips: string[];
};

type ChallengePhoto = {
  label: string;
  icon: IconName;
  source: ImageSourcePropType;
};

const CHALLENGE_PHOTOS: ChallengePhoto[] = [
  {
    label: 'Fitness',
    icon: 'barbell',
    source: {
      uri: 'https://images.unsplash.com/photo-1613937574892-25f441264a09?auto=format&fit=crop&w=900&q=80',
    },
  },
  {
    label: 'Coding',
    icon: 'code-slash',
    source: {
      uri: 'https://images.unsplash.com/photo-1641951820920-c90394aef512?auto=format&fit=crop&w=900&q=80',
    },
  },
  {
    label: 'Sports',
    icon: 'basketball',
    source: {
      uri: 'https://images.unsplash.com/photo-1659523888759-e76c7ba5a030?auto=format&fit=crop&w=900&q=80',
    },
  },
  {
    label: 'Cooking',
    icon: 'restaurant',
    source: {
      uri: 'https://images.unsplash.com/photo-1683619871228-9e5babf14e91?auto=format&fit=crop&w=900&q=80',
    },
  },
  {
    label: 'Reading',
    icon: 'book',
    source: {
      uri: 'https://images.unsplash.com/photo-1483446288147-2488bc359623?auto=format&fit=crop&w=900&q=80',
    },
  },
];

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    key: 'friends',
    kicker: 'The challenge method',
    title: 'The best way to grow or do things? Make it a challenge which is to be completed daily.',
    body: 'Whether you want to accomplish something or learn something new or even perform a basic daily routine, discipline and consistency can turn intention into real progress.',
    icon: 'paper-plane',
    accent: '#4700EC',
    accentSoft: '#F0ECFF',
    background: ['#FFFFFF', '#F7F4FF', '#FFFFFF'],
    chips: ['Choose a challenge', 'Show up regularly', 'Build real progress'],
  },
  {
    key: 'private',
    kicker: 'Your circle, your rules',
    title: 'A challenge that stays with your crew',
    body: 'For private challenges, only invited friends can join. Your submissions, progress, and encouragement stay inside the group if you would like to keep it Private!',
    icon: 'lock-closed',
    accent: '#4700EC',
    accentSoft: '#F0ECFF',
    background: ['#FFFFFF', '#F7F4FF', '#FFFFFF'],
    chips: ['Invite only', 'Trusted friends', 'Private submissions'],
  },
  {
    key: 'fun',
    kicker: 'Start within seconds!',
    title: 'Pick a goal you want to accomplish or perform (once or daily)',
    body: 'Choose a ready-made idea or create your own, set the rhythm, and begin on your own or with friends within seconds.',
    icon: 'sparkles',
    accent: '#4700EC',
    accentSoft: '#F0ECFF',
    background: ['#FFFFFF', '#F7F4FF', '#FFFFFF'],
    chips: ['Quick ideas', 'Photo submissions', 'Your pace'],
  },
  {
    key: 'community',
    kicker: 'Show up together',
    title: 'Small wins become shared momentum',
    body: 'Share a submission, celebrate progress with Glories, and help your friends come back tomorrow.',
    icon: 'people',
    accent: '#4700EC',
    accentSoft: '#F0ECFF',
    background: ['#FFFFFF', '#F7F4FF', '#FFFFFF'],
    chips: ['Daily wins', 'Glories', 'Stronger together'],
  },
];

type ShowcaseProps = {
  slide: OnboardingSlide;
  ambient: SharedValue<number>;
  pulse: SharedValue<number>;
};

function MotionShowcase(props: ShowcaseProps) {
  switch (props.slide.key) {
    case 'community':
      return <CommunityCollage {...props} />;
    case 'fun':
      return <ChallengeMixer {...props} />;
    case 'friends':
      return <LeaderboardShowcase {...props} />;
    case 'prizes':
      return <PrizePodium {...props} />;
    case 'private':
      return <PrivateRoomPreview {...props} />;
    default:
      return null;
  }
}

function CommunityCollage({ slide, ambient, pulse }: ShowcaseProps) {
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(ambient.value, [0, 1], [-8, 8]) },
      { rotate: `${interpolate(ambient.value, [0, 1], [-2.2, 2.2])}deg` },
      { scale: interpolate(pulse.value, [0, 1], [0.98, 1.04]) },
    ],
  }));

  const chipOneStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(ambient.value, [0, 1], [8, -8]) },
      { translateX: interpolate(ambient.value, [0, 1], [-5, 6]) },
    ],
  }));

  const chipTwoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(ambient.value, [0, 1], [-6, 9]) },
      { translateX: interpolate(ambient.value, [0, 1], [7, -6]) },
    ],
  }));

  return (
    <View style={styles.visualStage}>
      <SocialPhotoStack slide={slide} ambient={ambient} pulse={pulse} />
      <Animated.View style={[styles.iconPlate, { borderColor: slide.accent }, iconStyle]}>
        <LinearGradient
          colors={[slide.accentSoft, '#FFFFFF', '#FAF9FE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconGradient}
        >
          <Ionicons name={slide.icon} size={48} color={slide.accent} />
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.floatingChip, styles.floatingChipLeft, { borderColor: slide.accent }, chipOneStyle]}>
        <Ionicons name="checkmark-circle" size={16} color={slide.accent} />
        <Text style={styles.floatingChipText}>{slide.chips[0]}</Text>
      </Animated.View>

      <Animated.View style={[styles.floatingChip, styles.floatingChipRight, { borderColor: slide.accent }, chipTwoStyle]}>
        <Ionicons name="flash" size={15} color={slide.accent} />
        <Text style={styles.floatingChipText}>{slide.chips[1]}</Text>
      </Animated.View>

      <View style={[styles.centerSignal, { backgroundColor: slide.accentSoft, borderColor: slide.accent }]}>
        <Text style={[styles.centerSignalText, { color: slide.accent }]}>{slide.chips[2]}</Text>
      </View>
    </View>
  );
}

function ChallengeMixer({ slide, ambient, pulse }: ShowcaseProps) {
  const deckStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(ambient.value, [0, 1], [-5, 7]) },
      { rotate: `${interpolate(ambient.value, [0, 1], [-2.5, 2.5])}deg` },
    ],
  }));

  const commandStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(ambient.value, [0, 1], [8, -7]) },
      { scale: interpolate(pulse.value, [0, 1], [0.98, 1.03]) },
    ],
  }));

  return (
    <View style={styles.visualStage}>
      <View style={[styles.mixerGlow, { backgroundColor: slide.accentSoft }]} />
      <Animated.View style={[styles.mixerDeck, deckStyle]}>
        {CHALLENGE_PHOTOS.slice(0, 3).map((photo, index) => (
          <View
            key={photo.label}
            style={[
              styles.mixerPhotoCard,
              index === 0 && styles.mixerPhotoCardLeft,
              index === 1 && styles.mixerPhotoCardCenter,
              index === 2 && styles.mixerPhotoCardRight,
            ]}
          >
            <Image source={photo.source} style={styles.socialPhoto} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.78)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.mixerTag}>
              <Ionicons name={photo.icon} size={12} color="#050505" />
              <Text style={styles.mixerTagText}>{photo.label}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      <Animated.View style={[styles.mixerCommand, { borderColor: slide.accent }, commandStyle]}>
        <Ionicons name="shuffle" size={19} color={slide.accent} />
        <Text style={styles.mixerCommandText}>Fresh challenge drop</Text>
      </Animated.View>

      <View style={styles.mixerChipRow}>
        {['Submission', 'Timer', 'Streak'].map((label) => (
          <View key={label} style={[styles.mixerMiniChip, { backgroundColor: slide.accentSoft }]}>
            <Text style={[styles.mixerMiniChipText, { color: slide.accent }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LeaderboardShowcase({ slide, ambient, pulse }: ShowcaseProps) {
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(ambient.value, [0, 1], [-5, 6]) },
      { scale: interpolate(pulse.value, [0, 1], [0.99, 1.01]) },
    ],
  }));

  const crownStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(ambient.value, [0, 1], [2, -4]) },
      { rotate: `${interpolate(pulse.value, [0, 1], [-4, 4])}deg` },
    ],
  }));

  const leaders = [
    {
      rank: 2,
      name: 'Maya',
      score: '84 pts',
      photo: CHALLENGE_PHOTOS[2],
      columnStyle: styles.leaderboardSecond,
      blockColor: '#C9CED8',
    },
    {
      rank: 1,
      name: 'Aarav',
      score: '96 pts',
      photo: CHALLENGE_PHOTOS[0],
      columnStyle: styles.leaderboardFirst,
      blockColor: '#FFD469',
    },
    {
      rank: 3,
      name: 'Zoya',
      score: '79 pts',
      photo: CHALLENGE_PHOTOS[1],
      columnStyle: styles.leaderboardThird,
      blockColor: '#D99A6C',
    },
  ];

  return (
    <View style={styles.visualStage}>
      <View style={[styles.leaderboardGlow, { backgroundColor: slide.accentSoft }]} />
      <Animated.View style={[styles.leaderboardCard, { borderColor: `${slide.accent}24` }, cardStyle]}>
        <View style={styles.leaderboardHeader}>
          <View style={[styles.leaderboardIcon, { backgroundColor: slide.accentSoft }]}>
            <Ionicons name="trophy" size={16} color={slide.accent} />
          </View>
          <View style={styles.leaderboardHeaderCopy}>
            <Text style={styles.leaderboardTitle}>Leaderboard</Text>
            <Text style={styles.leaderboardSubtitle}>30-Day Fitness · Day 12</Text>
          </View>
          <View style={styles.leaderboardLiveBadge}>
            <View style={styles.leaderboardLiveDot} />
            <Text style={styles.leaderboardLiveText}>Live</Text>
          </View>
        </View>

        <View style={styles.leaderboardPodiumRow}>
          {leaders.map((leader) => (
            <View key={leader.rank} style={[styles.leaderboardColumn, leader.columnStyle]}>
              {leader.rank === 1 ? (
                <Animated.View style={[styles.leaderboardCrown, crownStyle]}>
                  <Ionicons name="trophy" size={14} color="#D89400" />
                </Animated.View>
              ) : null}
              <View style={[styles.leaderboardAvatarRing, leader.rank === 1 && { borderColor: '#F2B931' }]}>
                <Image source={leader.photo.source} style={styles.leaderboardAvatar} resizeMode="cover" />
              </View>
              <Text style={styles.leaderboardName}>{leader.name}</Text>
              <Text style={styles.leaderboardScore}>{leader.score}</Text>
              <View style={[styles.leaderboardBlock, { backgroundColor: leader.blockColor }]}>
                <Text style={styles.leaderboardRank}>{leader.rank}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.leaderboardUserRow, { backgroundColor: slide.accentSoft }]}>
          <View style={[styles.leaderboardUserRank, { backgroundColor: slide.accent }]}>
            <Text style={styles.leaderboardUserRankText}>4</Text>
          </View>
          <View style={styles.leaderboardUserCopy}>
            <Text style={styles.leaderboardUserName}>You</Text>
            <Text style={styles.leaderboardUserProgress}>68 pts · 12-day streak</Text>
          </View>
          <Ionicons name="trending-up" size={18} color={slide.accent} />
        </View>
      </Animated.View>
    </View>
  );
}

function PrizePodium({ slide, ambient, pulse }: ShowcaseProps) {
  const trophyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(ambient.value, [0, 1], [-10, 8]) },
      { rotate: `${interpolate(ambient.value, [0, 1], [-4, 4])}deg` },
      { scale: interpolate(pulse.value, [0, 1], [0.98, 1.04]) },
    ],
  }));

  return (
    <View style={styles.visualStage}>
      <View style={[styles.prizeGlow, { backgroundColor: slide.accentSoft }]} />
      {Array.from({ length: 10 }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.confettiDot,
            {
              left: `${9 + index * 8}%`,
              top: 26 + (index % 4) * 22,
              backgroundColor: index % 2 === 0 ? slide.accent : '#B99BFF',
              transform: [{ rotate: `${index * 23}deg` }],
            },
          ]}
        />
      ))}

      <Animated.View style={[styles.trophyBadge, { borderColor: slide.accent }, trophyStyle]}>
        <LinearGradient
          colors={[slide.accentSoft, '#FFFFFF', '#FAF9FE']}
          style={styles.trophyGradient}
        >
          <Ionicons name="trophy" size={54} color={slide.accent} />
        </LinearGradient>
      </Animated.View>

      <View style={styles.podiumRow}>
        <View style={[styles.podiumBlock, styles.podiumSecond]}>
          <Text style={styles.podiumRank}>2</Text>
        </View>
        <View style={[styles.podiumBlock, styles.podiumFirst, { borderColor: slide.accent }]}>
          <Text style={[styles.podiumRank, { color: slide.accent }]}>1</Text>
        </View>
        <View style={[styles.podiumBlock, styles.podiumThird]}>
          <Text style={styles.podiumRank}>3</Text>
        </View>
      </View>

      <View style={[styles.rewardTicket, { borderColor: slide.accent }]}>
        <Ionicons name="gift" size={15} color={slide.accent} />
        <Text style={styles.rewardTicketText}>Prize pool unlocked</Text>
      </View>
    </View>
  );
}

function PrivateRoomPreview({ slide, ambient, pulse }: ShowcaseProps) {
  const roomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(ambient.value, [0, 1], [8, -8]) },
      { scale: interpolate(pulse.value, [0, 1], [0.985, 1.015]) },
    ],
  }));

  const lockStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(ambient.value, [0, 1], [-6, 8]) },
      { rotate: `${interpolate(ambient.value, [0, 1], [4, -4])}deg` },
    ],
  }));

  return (
    <View style={styles.visualStage}>
      <View style={[styles.privateGlow, { backgroundColor: slide.accentSoft }]} />
      <Animated.View style={[styles.privateRoomShell, { borderColor: slide.accent }, roomStyle]}>
        <View style={styles.privateRoomHeader}>
          <View style={[styles.privateRoomIcon, { backgroundColor: slide.accentSoft }]}>
            <Ionicons name="lock-closed" size={18} color={slide.accent} />
          </View>
          <View>
            <Text style={styles.privateRoomTitle}>Weekend reset</Text>
            <Text style={styles.privateRoomSubtitle}>Invite only</Text>
          </View>
        </View>

        <View style={styles.memberOrbit}>
          {['M', 'A', 'J', '+'].map((label, index) => (
            <View
              key={label}
              style={[
                styles.memberBubble,
                index === 3 && { backgroundColor: slide.accent },
              ]}
            >
              <Text style={[styles.memberBubbleText, index === 3 && { color: '#FFFFFF' }]}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.privateSettingRow}>
          <Ionicons name="eye-off" size={15} color="#4700EC" />
          <Text style={styles.privateSettingText}>Hidden from public feed</Text>
          <View style={[styles.privateToggle, { backgroundColor: slide.accent }]}>
            <View style={styles.privateToggleKnob} />
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.privateLockBadge, { borderColor: slide.accent }, lockStyle]}>
        <Ionicons name="shield-checkmark" size={25} color={slide.accent} />
      </Animated.View>
    </View>
  );
}

function SocialPhotoStack({
  slide,
  ambient,
  pulse,
}: {
  slide: OnboardingSlide;
  ambient: SharedValue<number>;
  pulse: SharedValue<number>;
}) {
  const photoStackStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(ambient.value, [0, 1], [7, -7]) },
      { translateX: interpolate(ambient.value, [0, 1], [-4, 4]) },
      { scale: interpolate(pulse.value, [0, 1], [0.99, 1.015]) },
    ],
  }));

  return (
    <Animated.View style={[styles.socialPhotoStack, photoStackStyle]}>
      <View style={[styles.photoHalo, { backgroundColor: slide.accentSoft }]} />
      {CHALLENGE_PHOTOS.map((photo, index) => (
        <View
          key={photo.label}
          style={[
            styles.socialPhotoFrame,
            index === 0 && styles.socialPhotoFrameOne,
            index === 1 && styles.socialPhotoFrameTwo,
            index === 2 && styles.socialPhotoFrameThree,
            index === 3 && styles.socialPhotoFrameFour,
            index === 4 && styles.socialPhotoFrameFive,
            { borderColor: slide.accent },
          ]}
        >
          <Image source={photo.source} style={styles.socialPhoto} resizeMode="cover" />
          <View style={styles.photoLabelBadge}>
            <Ionicons name={photo.icon} size={10} color="#050505" />
            <Text style={styles.photoLabelText}>{photo.label}</Text>
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const { width, height } = useWindowDimensions();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);

  const ambient = useSharedValue(0);
  const pulse = useSharedValue(0);
  const entrance = useSharedValue(0);

  const activeSlide = ONBOARDING_SLIDES[activeIndex];
  const isLastSlide = activeIndex === ONBOARDING_SLIDES.length - 1;
  const compactVertical = height < 700;
  const shouldReplayIntro = replay === '1';

  useEffect(() => {
    ambient.value = withRepeat(
      withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true
    );
  }, [ambient, pulse]);

  useEffect(() => {
    entrance.value = 0;
    entrance.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
  }, [activeIndex, entrance]);

  useEffect(() => {
    let isActive = true;

    async function checkAccess() {
      if (isLoading) return;

      if (!isAuthenticated) {
        router.replace('/login');
        return;
      }

      const completed = await onboardingService.hasCompletedIntroForUser(user?.id ?? null);
      if (!isActive) return;

      if (completed && !shouldReplayIntro) {
        const nextRoute = await onboardingService.getPostIntroRouteForUser(
          user?.id ?? null,
          user?.profileComplete,
        );
        if (!isActive) return;
        router.replace(nextRoute);
        return;
      }

      setIsChecking(false);
    }

    checkAccess();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isLoading, shouldReplayIntro, user?.id, user?.profileComplete]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { translateY: interpolate(entrance.value, [0, 1], [18, 0]) },
      { scale: interpolate(entrance.value, [0, 1], [0.985, 1]) },
    ],
  }));

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), ONBOARDING_SLIDES.length - 1));
  };

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: width * index, animated: true });
    setActiveIndex(index);
    void Haptics.selectionAsync();
  };

  const finishOnboarding = async () => {
    if (isFinishing) return;

    setIsFinishing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (shouldReplayIntro) {
      router.replace('/settings');
      return;
    }
    await onboardingService.markIntroCompletedForUser(user?.id ?? null);
    const nextRoute = await onboardingService.getPostIntroRouteForUser(
      user?.id ?? null,
      user?.profileComplete,
    );
    router.replace(nextRoute);
  };

  const handleNext = () => {
    if (isLastSlide) {
      void finishOnboarding();
      return;
    }

    goToSlide(activeIndex + 1);
  };

  if (isLoading || isChecking) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator color="#4700EC" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={activeSlide.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Text style={styles.brand}>challengesphere</Text>
        <Pressable
          style={styles.skipButton}
          onPress={() => void finishOnboarding()}
          feedbackTiming="after-paint"
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {ONBOARDING_SLIDES.map((slide, index) => (
          <View key={slide.key} style={[styles.slide, { width }]}>
            <MotionShowcase slide={slide} ambient={ambient} pulse={pulse} />

            <Animated.View
              style={[
                styles.copyBlock,
                compactVertical && styles.copyBlockCompact,
                index === activeIndex && contentStyle,
              ]}
            >
              <Text style={[styles.kicker, { color: slide.accent }]}>{slide.kicker}</Text>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
            </Animated.View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.progressRow}>
          {ONBOARDING_SLIDES.map((slide, index) => {
            const isActive = index === activeIndex;
            return (
              <TouchableOpacity
                key={slide.key}
                activeOpacity={0.8}
                style={[
                  styles.progressSegment,
                  {
                    backgroundColor: isActive ? activeSlide.accent : '#D8D2E5',
                    width: isActive ? 34 : 16,
                  },
                ]}
                onPress={() => goToSlide(index)}
              />
            );
          })}
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          style={[styles.nextButton, { backgroundColor: activeSlide.accent }, isFinishing && styles.nextButtonDisabled]}
          onPress={handleNext}
          feedbackTiming={isLastSlide ? 'after-paint' : 'immediate'}
          disabled={isFinishing}
        >
          {isFinishing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {isLastSlide ? (shouldReplayIntro ? 'Done' : 'Create a private challenge') : 'Next'}
              </Text>
              <Ionicons
                name={isLastSlide ? (shouldReplayIntro ? 'checkmark' : 'lock-closed') : 'arrow-forward'}
                size={19}
                color="#FFFFFF"
              />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F7FC',
  },
  header: {
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 4,
  },
  brand: {
    color: '#18142F',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0,
  },
  skipButton: {
    minWidth: 58,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD4FF',
    backgroundColor: '#F0ECFF',
  },
  skipText: {
    color: '#4700EC',
    fontSize: 14,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  visualStage: {
    height: 286,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  socialPhotoStack: {
    position: 'absolute',
    width: 250,
    height: 224,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHalo: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 88,
    opacity: 0.72,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
  },
  socialPhotoFrame: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  socialPhotoFrameOne: {
    left: 8,
    top: 16,
    width: 76,
    height: 96,
    borderRadius: 8,
    transform: [{ rotate: '-7deg' }],
    zIndex: 1,
  },
  socialPhotoFrameTwo: {
    right: 8,
    top: 2,
    width: 84,
    height: 104,
    borderRadius: 8,
    transform: [{ rotate: '6deg' }],
    zIndex: 2,
  },
  socialPhotoFrameThree: {
    left: 42,
    bottom: 2,
    width: 88,
    height: 108,
    borderRadius: 8,
    transform: [{ rotate: '5deg' }],
    zIndex: 2,
  },
  socialPhotoFrameFour: {
    right: 24,
    bottom: 16,
    width: 72,
    height: 90,
    borderRadius: 8,
    transform: [{ rotate: '-5deg' }],
    zIndex: 1,
  },
  socialPhotoFrameFive: {
    left: 92,
    top: 62,
    width: 74,
    height: 94,
    borderRadius: 8,
    transform: [{ rotate: '2deg' }],
    zIndex: 3,
  },
  socialPhoto: {
    width: '100%',
    height: '100%',
  },
  photoLabelBadge: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  photoLabelText: {
    color: '#050505',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0,
  },
  mixerGlow: {
    position: 'absolute',
    width: 184,
    height: 184,
    borderRadius: 92,
    opacity: 0.8,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
  },
  mixerDeck: {
    position: 'absolute',
    width: 268,
    height: 180,
  },
  mixerPhotoCard: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  mixerPhotoCardLeft: {
    left: 0,
    top: 40,
    width: 86,
    height: 116,
    transform: [{ rotate: '-9deg' }],
  },
  mixerPhotoCardCenter: {
    left: 86,
    top: 8,
    width: 96,
    height: 136,
    zIndex: 2,
    transform: [{ rotate: '2deg' }],
  },
  mixerPhotoCardRight: {
    right: 0,
    top: 38,
    width: 86,
    height: 116,
    transform: [{ rotate: '9deg' }],
  },
  mixerTag: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 7,
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  mixerTagText: {
    color: '#050505',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0,
  },
  mixerCommand: {
    position: 'absolute',
    bottom: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
  },
  mixerCommandText: {
    color: '#18142F',
    fontSize: 13,
    fontWeight: '500',
  },
  mixerChipRow: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    gap: 8,
  },
  mixerMiniChip: {
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mixerMiniChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  leaderboardGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.9,
  },
  leaderboardCard: {
    width: 292,
    minHeight: 258,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.13,
    shadowRadius: 22,
    elevation: 9,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardHeaderCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 9,
  },
  leaderboardTitle: {
    color: '#18142F',
    fontSize: 14,
    fontWeight: '700',
  },
  leaderboardSubtitle: {
    marginTop: 1,
    color: '#777389',
    fontSize: 9,
    fontWeight: '400',
  },
  leaderboardLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    backgroundColor: '#F7F5FB',
  },
  leaderboardLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#31B56A',
  },
  leaderboardLiveText: {
    color: '#655F70',
    fontSize: 9,
    fontWeight: '600',
  },
  leaderboardPodiumRow: {
    height: 142,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
  },
  leaderboardColumn: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  leaderboardSecond: {
    paddingTop: 25,
  },
  leaderboardFirst: {
    alignSelf: 'stretch',
    paddingTop: 1,
  },
  leaderboardThird: {
    paddingTop: 37,
  },
  leaderboardCrown: {
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardAvatarRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    padding: 2,
    borderWidth: 2,
    borderColor: '#C9CED8',
    backgroundColor: '#FFFFFF',
  },
  leaderboardAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  leaderboardName: {
    marginTop: 4,
    color: '#18142F',
    fontSize: 10,
    fontWeight: '600',
  },
  leaderboardScore: {
    marginTop: 1,
    marginBottom: 4,
    color: '#777389',
    fontSize: 8,
    fontWeight: '400',
  },
  leaderboardBlock: {
    width: '100%',
    height: 31,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardRank: {
    color: '#2C2334',
    fontSize: 15,
    fontWeight: '700',
  },
  leaderboardUserRow: {
    minHeight: 43,
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardUserRank: {
    width: 25,
    height: 25,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardUserRankText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  leaderboardUserCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 9,
  },
  leaderboardUserName: {
    color: '#18142F',
    fontSize: 11,
    fontWeight: '700',
  },
  leaderboardUserProgress: {
    marginTop: 1,
    color: '#655F70',
    fontSize: 9,
    fontWeight: '400',
  },
  prizeGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    opacity: 0.78,
  },
  confettiDot: {
    position: 'absolute',
    width: 8,
    height: 14,
    borderRadius: 3,
    opacity: 0.85,
  },
  trophyBadge: {
    position: 'absolute',
    top: 22,
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 10,
  },
  trophyGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRow: {
    position: 'absolute',
    bottom: 52,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  podiumBlock: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
  },
  podiumSecond: {
    height: 70,
  },
  podiumFirst: {
    height: 96,
    backgroundColor: '#F0ECFF',
  },
  podiumThird: {
    height: 54,
  },
  podiumRank: {
    color: '#18142F',
    fontSize: 20,
    fontWeight: '600',
  },
  rewardTicket: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  rewardTicketText: {
    color: '#18142F',
    fontSize: 12,
    fontWeight: '500',
  },
  privateGlow: {
    position: 'absolute',
    width: 194,
    height: 194,
    borderRadius: 97,
    opacity: 0.74,
  },
  privateRoomShell: {
    width: 238,
    minHeight: 172,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  privateRoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  privateRoomIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privateRoomTitle: {
    color: '#18142F',
    fontSize: 15,
    fontWeight: '600',
  },
  privateRoomSubtitle: {
    color: '#777389',
    fontSize: 12,
    marginTop: 2,
  },
  memberOrbit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  memberBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#F0ECFF',
  },
  memberBubbleText: {
    color: '#18142F',
    fontSize: 13,
    fontWeight: '600',
  },
  privateSettingRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F8F7FC',
  },
  privateSettingText: {
    flex: 1,
    color: '#18142F',
    fontSize: 12,
    fontWeight: '500',
  },
  privateToggle: {
    width: 34,
    height: 20,
    borderRadius: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  privateToggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  privateLockBadge: {
    position: 'absolute',
    right: 42,
    top: 38,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  iconPlate: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  iconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingChip: {
    position: 'absolute',
    minHeight: 40,
    maxWidth: 168,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
  },
  floatingChipLeft: {
    left: 2,
    top: 46,
  },
  floatingChipRight: {
    right: 2,
    bottom: 42,
  },
  floatingChipText: {
    color: '#18142F',
    fontSize: 12,
    fontWeight: '500',
  },
  centerSignal: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  centerSignalText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  copyBlock: {
    marginTop: 8,
    minHeight: 236,
  },
  copyBlockCompact: {
    minHeight: 202,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 12,
  },
  title: {
    color: '#18142F',
    fontSize: 36,
    lineHeight: 43,
    fontWeight: '600',
    letterSpacing: 0,
  },
  body: {
    marginTop: 16,
    color: '#777389',
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '400',
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 20,
    gap: 18,
  },
  progressRow: {
    height: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressSegment: {
    height: 6,
    borderRadius: 3,
  },
  nextButton: {
    minHeight: 56,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    shadowColor: '#4700EC',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  nextButtonDisabled: {
    opacity: 0.78,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0,
  },
});
