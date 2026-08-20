import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import PublicChallengeBroadcastAnimation from '../components/common/PublicChallengeBroadcastAnimation';
import { useStartChallengeCrew } from '../hooks/useChallengeCrew';
import { getApiErrorMessage } from '../utils/apiError';
import { AppAlert as Alert } from '../utils/appAlert';
import { parseChallengeCategories } from '../utils/challengeCategories';

interface ChallengeDetails {
  title: string;
  visibility: string;
  duration: string;
  maxParticipants?: string;
  invitedFriends: number;
  category: string;
  startDate?: string;
}

const getCurrentLocalDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatScheduledDate = (value?: string): string => {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function ChallengeCreatedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const challengeDetails: ChallengeDetails = {
    title: (params.title as string) || 'Your Challenge',
    visibility: (params.visibility as string) || 'Private',
    duration: (params.duration as string) || '1 Week',
    maxParticipants: params.maxParticipants as string,
    invitedFriends: parseInt((params.invitedFriends as string) || '0'),
    category: (params.categories as string) || (params.category as string) || 'General',
    startDate: params.startDate as string | undefined,
  };

  const isPrivate = challengeDetails.visibility === 'Private';
  const categoryPills = parseChallengeCategories(challengeDetails.category);
  const challengeId = params.challengeId as string | undefined;
  const numericChallengeId = Number(challengeId) || 0;
  const startMutation = useStartChallengeCrew(numericChallengeId);
  const startsLater = Boolean(
    isPrivate
    && challengeDetails.startDate
    && challengeDetails.startDate > getCurrentLocalDate(),
  );
  const scheduledDateLabel = formatScheduledDate(challengeDetails.startDate);

  // Animations
  const checkScale = useRef(new Animated.Value(isPrivate ? 1 : 0)).current;
  const titleOpacity = useRef(new Animated.Value(isPrivate ? 1 : 0)).current;
  const cardSlide = useRef(new Animated.Value(isPrivate ? 0 : 40)).current;
  const cardOpacity = useRef(new Animated.Value(isPrivate ? 1 : 0)).current;
  const buttonsOpacity = useRef(new Animated.Value(isPrivate ? 1 : 0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  const glowScale = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  useEffect(() => {
    if (isPrivate) {
      return undefined;
    }

    Animated.sequence([
      Animated.spring(checkScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 6,
      }),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(cardSlide, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }),
      ]),
      Animated.timing(buttonsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [buttonsOpacity, cardOpacity, cardSlide, checkScale, glowPulse, isPrivate, titleOpacity]);

  const inviteFriends = () => {
    if (isPrivate) {
      if (!challengeId) {
        Alert.alert('Challenge unavailable', 'Open Your Sphere and try again.');
        return;
      }
      router.push({
        pathname: '/challenge-details',
        params: {
          id: challengeId,
          title: challengeDetails.title,
          category: categoryPills.join(','),
          duration: challengeDetails.duration,
          challengeMode: (params.challengeMode as string) || 'DAILY',
          isCreator: 'true',
          isPrivate: 'true',
          openInviteModal: 'true',
          ...(challengeDetails.startDate ? { startDate: challengeDetails.startDate } : {}),
        },
      });
      return;
    }

    router.push({
      pathname: '/invite-contacts',
      params: {
        mode: 'challenge',
        challengeId: challengeId || '',
        challengeTitle: challengeDetails.title,
      },
    } as any);
  };

  const openChallenge = (replace = false, started = false) => {
    if (!challengeId) return;
    const route = {
      pathname: '/challenge-details' as const,
      params: {
        id: challengeId,
        title: challengeDetails.title,
        category: categoryPills.join(','),
        duration: challengeDetails.duration,
        challengeMode: (params.challengeMode as string) || 'DAILY',
        isCreator: 'true',
        isPrivate: isPrivate.toString(),
        ...(challengeDetails.startDate ? { startDate: challengeDetails.startDate } : {}),
        ...(isPrivate && started ? { status: 'active' } : {}),
      },
    };
    if (replace) {
      router.replace(route);
    } else {
      router.push(route);
    }
  };

  const startPrivateChallenge = () => {
    if (numericChallengeId <= 0 || startMutation.isPending) {
      if (numericChallengeId <= 0) {
        Alert.alert('Challenge unavailable', 'Open Your Sphere and try again.');
      }
      return;
    }
    startMutation.mutate(undefined, {
      onSuccess: () => openChallenge(true, true),
      onError: (error) => Alert.alert(
        'Could not start challenge',
        getApiErrorMessage(error, 'Please try again.'),
      ),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Success Hero */}
        <View style={styles.heroSection}>
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
            <LinearGradient
              colors={['#4CAF50', '#2E7D32']}
              style={styles.checkGradient}
            >
              <Ionicons name="checkmark" size={44} color="#fff" />
            </LinearGradient>
          </Animated.View>

          <Animated.Text style={[styles.heroTitle, { opacity: titleOpacity }]}>
            Challenge Created!
          </Animated.Text>
          <Animated.Text style={[styles.heroSubtitle, { opacity: titleOpacity }]}>
            {isPrivate
              ? startsLater
                ? `Scheduled for ${scheduledDateLabel}. Invite people now, or open it if you decide to start early.`
                : 'Start now on your own, or bring people along whenever you want.'
              : 'Your challenge is live and ready to share.'}
          </Animated.Text>
        </View>

        <Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardSlide }] }}>
          <TouchableOpacity
            style={styles.invitePrimary}
            onPress={isPrivate ? startsLater ? () => openChallenge() : startPrivateChallenge : inviteFriends}
            feedbackTiming="after-paint"
            disabled={isPrivate && startMutation.isPending}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={isPrivate
              ? startsLater
                ? `Open scheduled challenge ${challengeDetails.title}`
                : `Start ${challengeDetails.title}`
              : `Invite someone to ${challengeDetails.title}`}
          >
            <LinearGradient
              colors={['#8F6BFF', '#4700EC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.invitePrimaryGradient}
            >
              <View style={styles.invitePrimaryTop}>
                <View style={styles.invitePrimaryIcon}>
                  {isPrivate && !startsLater && startMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name={isPrivate ? startsLater ? 'calendar' : 'play' : 'paper-plane'} size={21} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.invitePrimaryCopy}>
                  <Text style={styles.invitePrimaryEyebrow}>
                    {isPrivate ? startsLater ? 'SCHEDULE SAVED' : 'READY WHEN YOU ARE' : 'BRING PEOPLE IN'}
                  </Text>
                  <Text style={styles.invitePrimaryTitle}>
                    {isPrivate
                      ? startsLater
                        ? `Starts ${scheduledDateLabel}`
                        : startMutation.isPending ? 'Starting...' : 'Start challenge'
                      : challengeDetails.invitedFriends > 0 ? 'Invite more people' : 'Invite people'}
                  </Text>
                  <Text style={styles.invitePrimaryText}>
                    {isPrivate
                      ? startsLater
                        ? 'Open the challenge to review it or choose to begin early.'
                        : 'Begin solo now. You can invite people before or after you start.'
                      : 'Share the challenge through WhatsApp or any app.'}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={21} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
          {isPrivate ? (
            <TouchableOpacity
              style={styles.bringPeopleButton}
              onPress={inviteFriends}
              accessibilityRole="button"
              accessibilityLabel={`Bring people into ${challengeDetails.title}`}
            >
              <View style={styles.bringPeopleIcon}>
                <Ionicons name="person-add-outline" size={19} color="#D8C7FF" />
              </View>
              <View style={styles.bringPeopleCopy}>
                <Text style={styles.bringPeopleTitle}>Bring people in</Text>
                <Text style={styles.bringPeopleText}>Optional · invite specific app friends</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#817590" />
            </TouchableOpacity>
          ) : null}
        </Animated.View>

        {/* Visibility Reveal */}
        <Animated.View style={[styles.revealScene, { opacity: cardOpacity, transform: [{ translateY: cardSlide }] }]}>
          <View style={styles.revealHeaderRow}>
            <View style={[styles.revealIcon, isPrivate ? styles.privateRevealIcon : styles.publicRevealIcon]}>
              <Ionicons name={isPrivate ? 'lock-closed' : 'globe-outline'} size={18} color={isPrivate ? '#5B3FE5' : '#187A3D'} />
            </View>
            <View style={styles.revealCopy}>
              <Text style={styles.revealTitle}>{isPrivate ? 'Your private sphere is ready' : 'Public discovery enabled'}</Text>
              <Text style={styles.revealSubtitle}>
                {isPrivate ? 'Only the people you invite can access and join this challenge.' : 'Your challenge is now discoverable across ChallengeSphere.'}
              </Text>
            </View>
          </View>

          {isPrivate ? (
            <View style={styles.privateSecureState}>
              <View style={styles.privateBadge}>
                <Ionicons name="shield-checkmark" size={28} color="#5B3FE5" />
              </View>
              <Text style={styles.privateSecureTitle}>Your circle, your challenge</Text>
              <Text style={styles.privateSecureMeta}>
                {challengeDetails.invitedFriends > 0
                  ? `${challengeDetails.invitedFriends} invited`
                  : 'Ready to start on your own'}
              </Text>
            </View>
          ) : (
            !isPrivate && (
              <View style={styles.publicStage}>
                <View style={[styles.signalBeam, styles.signalBeamLeft]} />
                <View style={[styles.signalBeam, styles.signalBeamRight]} />
                <Animated.View style={[styles.stageGlow, { transform: [{ scale: glowScale }] }]} />
                <PublicChallengeBroadcastAnimation />
              </View>
            )
          )}
        </Animated.View>

        {/* Summary Card */}
        <Animated.View style={[styles.summaryCard, { opacity: cardOpacity, transform: [{ translateY: cardSlide }] }]}>
          <Text style={styles.cardLabel}>CHALLENGE</Text>
          <Text style={styles.challengeTitle} selectable>{challengeDetails.title}</Text>

          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Ionicons name={isPrivate ? 'lock-closed' : 'globe-outline'} size={13} color="#5B3FE5" />
              <Text style={styles.chipText}>{challengeDetails.visibility}</Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="time-outline" size={13} color="#5B3FE5" />
              <Text style={styles.chipText}>{challengeDetails.duration}</Text>
            </View>
            {parseChallengeCategories(challengeDetails.category).map((category) => (
              <View key={category} style={[styles.chip, styles.categoryChip]}>
                <Ionicons name="bookmark-outline" size={13} color="#5B3FE5" />
                <Text style={styles.chipText}>{category}</Text>
              </View>
            ))}
            {challengeDetails.maxParticipants && challengeDetails.maxParticipants !== 'No limit' && (
              <View style={styles.chip}>
                <Ionicons name="people-outline" size={13} color="#5B3FE5" />
                <Text style={styles.chipText}>Max {challengeDetails.maxParticipants}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Invited Friends */}
        {challengeDetails.invitedFriends > 0 && (
          <Animated.View style={[styles.inviteCard, { opacity: cardOpacity, transform: [{ translateY: cardSlide }] }]}>
            <View style={styles.inviteIconRow}>
              <View style={styles.inviteIconCircle}>
                <Ionicons name="paper-plane" size={18} color="#4700ec" />
              </View>
              <View style={styles.inviteTextBlock}>
                <Text style={styles.inviteTitle}>
                  {challengeDetails.invitedFriends} Invitation{challengeDetails.invitedFriends > 1 ? 's' : ''} Sent
                </Text>
                <Text style={styles.inviteSubtitle}>
                  Your friends will be notified shortly
                </Text>
              </View>
            </View>

            <View style={styles.flowRow}>
              <View style={styles.flowDot}>
                <Ionicons name="mail" size={12} color="#4700ec" />
              </View>
              <View style={styles.flowLine} />
              <View style={styles.flowDot}>
                <Ionicons name="eye" size={12} color="#4700ec" />
              </View>
              <View style={styles.flowLine} />
              <View style={[styles.flowDot, { backgroundColor: '#2e7d3220' }]}>
                <Ionicons name="checkmark" size={12} color="#2E7D32" />
              </View>
            </View>
            <View style={styles.flowLabels}>
              <Text style={styles.flowLabel}>Sent</Text>
              <Text style={styles.flowLabel}>Reviewed</Text>
              <Text style={styles.flowLabel}>Accepted</Text>
            </View>
          </Animated.View>
        )}

        {/* Secondary action */}
        <Animated.View style={[styles.actionsCard, { opacity: cardOpacity, transform: [{ translateY: cardSlide }] }]}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => openChallenge()}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="eye-outline" size={18} color="#4700ec" />
            </View>
            <Text style={styles.actionLabel}>View Challenge</Text>
            <Ionicons name="chevron-forward" size={16} color="#555" />
          </TouchableOpacity>

        </Animated.View>

        {/* Bottom Buttons */}
        <Animated.View style={[styles.buttonRow, { opacity: buttonsOpacity }]}>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push('/(tabs)/create')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#5B3FE5" />
            <Text style={styles.outlineButtonText}>Create another</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.solidButton}
            onPress={() => router.replace('/(tabs)/challenges')}
            activeOpacity={0.8}
          >
            <Text style={styles.solidButtonText}>Your Sphere</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
  },
  checkCircle: {
    marginBottom: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  checkGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: '#18142F',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    maxWidth: 310,
    lineHeight: 20,
  },

  // Primary activation action
  invitePrimary: {
    marginBottom: 14,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#4700EC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  invitePrimaryGradient: {
    padding: 17,
  },
  invitePrimaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  invitePrimaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  invitePrimaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  invitePrimaryEyebrow: {
    color: '#dccfff',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  invitePrimaryTitle: {
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
  },
  invitePrimaryText: {
    marginTop: 2,
    color: '#dccfff',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
  },
  bringPeopleButton: {
    minHeight: 64,
    marginBottom: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 20,
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  bringPeopleIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
  },
  bringPeopleCopy: {
    flex: 1,
  },
  bringPeopleTitle: {
    color: '#18142F',
    fontSize: 13,
    fontWeight: '700',
  },
  bringPeopleText: {
    marginTop: 2,
    color: '#8f849a',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
  },

  // Visibility reveal
  revealScene: {
    backgroundColor: '#F0ECFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    overflow: 'hidden',
  },
  revealHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  revealIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publicRevealIcon: {
    backgroundColor: '#0c4f3430',
    borderWidth: 1,
    borderColor: '#2ad27d55',
  },
  privateRevealIcon: {
    backgroundColor: '#5a214f35',
    borderWidth: 1,
    borderColor: '#f08bd655',
  },
  revealCopy: {
    flex: 1,
  },
  revealTitle: {
    color: '#18142F',
    fontSize: 15,
    fontWeight: '700',
  },
  revealSubtitle: {
    color: '#8b8b96',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  publicStage: {
    height: 148,
    borderRadius: 18,
    backgroundColor: '#ECFDF3',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  signalBeam: {
    position: 'absolute',
    top: -32,
    width: 120,
    height: 190,
    backgroundColor: '#eaffc718',
    borderRadius: 60,
  },
  signalBeamLeft: {
    left: 58,
  },
  signalBeamRight: {
    right: 58,
  },
  stageGlow: {
    position: 'absolute',
    bottom: 16,
    width: 230,
    height: 62,
    borderRadius: 115,
    backgroundColor: '#41ff9430',
  },
  privateSecureState: {
    height: 148,
    borderRadius: 18,
    backgroundColor: '#F0ECFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    gap: 8,
  },
  privateBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#8c4a78',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privateSecureTitle: {
    color: '#18142F',
    fontSize: 14,
    fontWeight: '700',
  },
  privateSecureMeta: {
    color: '#9d8797',
    fontSize: 11,
  },

  // Summary card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777389',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  challengeTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#18142F',
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#4700ec14',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 24,
  },
  categoryChip: {
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#DDD4FF',
  },
  chipText: {
    fontSize: 11,
    color: '#5B3FE5',
    fontWeight: '500',
  },

  // Invite card
  inviteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  inviteIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  inviteIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4700ec18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTextBlock: {
    flex: 1,
  },
  inviteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18142F',
  },
  inviteSubtitle: {
    fontSize: 12,
    color: '#777389',
    marginTop: 1,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    marginBottom: 6,
  },
  flowDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4700ec18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E7E3EF',
    marginHorizontal: 4,
  },
  flowLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  flowLabel: {
    fontSize: 11,
    color: '#777389',
    textAlign: 'center',
    width: 60,
  },

  // Actions card
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: '#4700ec14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  outlineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD4FF',
    backgroundColor: '#FFFFFF',
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5B3FE5',
  },
  solidButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#4700ec',
    shadowColor: '#4700ec',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  solidButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
