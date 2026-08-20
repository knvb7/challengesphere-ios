import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import FloatingScreenControls from '@/components/common/FloatingScreenControls';
import { useAcceptChallengeInvite, useChallengeInviteDetails } from '@/hooks/useNotifications';
import { useAuthContext } from '@/providers/AuthProvider';
import { useSubscription } from '@/providers/SubscriptionContext';
import { notificationInboxStateService } from '@/services/notificationInboxStateService';
import { AppAlert as Alert } from '@/utils/appAlert';
import { getApiErrorMessage } from '@/utils/apiError';
import {
  showChallengeLimitUpgrade,
  showChallengeLimitUpgradeForStatus,
} from '@/utils/challengeLimitUpgrade';
import hapticFeedback from '@/utils/haptics';

const formatDate = (value?: string): string => {
  if (!value) return 'Starts when scheduled';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

export default function ChallengeInviteDetailsScreen() {
  const router = useRouter();
  const { top: topInset } = useSafeAreaInsets();
  const params = useLocalSearchParams<{ notificationId?: string | string[] }>();
  const rawNotificationId = Array.isArray(params.notificationId)
    ? params.notificationId[0]
    : params.notificationId;
  const notificationId = Number(rawNotificationId);
  const { currentUserId } = useAuthContext();
  const { status: subscriptionStatus, refreshStatus } = useSubscription();
  const { data: invitation, isLoading, error, refetch } = useChallengeInviteDetails(notificationId);
  const acceptInviteMutation = useAcceptChallengeInvite();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/notifications');
    }
  };

  const handleJoin = () => {
    if (!invitation || currentUserId <= 0 || !Number.isInteger(notificationId)) return;
    hapticFeedback.buttonPress();
    const visibility = invitation.privateChallenge ? 'private' : 'public';
    if (showChallengeLimitUpgradeForStatus(
      subscriptionStatus,
      visibility,
      'join',
      () => router.push('/premium' as any),
    )) {
      hapticFeedback.warning();
      return;
    }

    acceptInviteMutation.mutate(
      { notificationId, userId: currentUserId },
      {
        onSuccess: async (joinedChallenge) => {
          hapticFeedback.challengeJoined();
          await Promise.all([
            notificationInboxStateService.removeSaved(currentUserId, notificationId).catch(() => undefined),
            refreshStatus().catch(() => undefined),
          ]);
          Alert.alert(
            'Challenge joined',
            joinedChallenge.message || `You joined “${invitation.challengeTitle}”.`,
            [{
              text: 'View challenge',
              onPress: () => router.replace({
                pathname: '/challenge-details',
                params: {
                  id: String(joinedChallenge.challengeId),
                  title: joinedChallenge.challengeTitle || invitation.challengeTitle,
                  isCreator: 'false',
                },
              }),
            }],
          );
        },
        onError: (joinError: unknown) => {
          hapticFeedback.warning();
          if (showChallengeLimitUpgrade(
            joinError,
            'This invitation may no longer be available.',
            () => router.push('/premium' as any),
            { action: 'join', visibility },
          )) return;
          Alert.alert(
            'Could not join',
            getApiErrorMessage(joinError, 'This invitation may no longer be available.'),
          );
        },
      },
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FloatingScreenControls onBackPress={goBack} />
        <View style={[styles.centered, { paddingTop: topInset + 64 }]}>
          <ActivityIndicator size="large" color="#4700EC" />
          <Text style={styles.loadingText}>Loading invitation details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !invitation) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FloatingScreenControls onBackPress={goBack} />
        <View style={[styles.centered, { paddingTop: topInset + 64 }]}>
          <Ionicons name="mail-unread-outline" size={52} color="#4700EC" />
          <Text style={styles.errorTitle}>Invitation unavailable</Text>
          <Text style={styles.errorText}>It may have expired, been withdrawn, or belong to another account.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const visibilityLabel = invitation.privateChallenge ? 'Private challenge' : 'Public challenge';
  const inviterLabel = invitation.inviterUsername
    ? `@${invitation.inviterUsername.replace(/^@/, '')}`
    : invitation.inviterName || 'A friend';
  const creatorLabel = invitation.creatorUsername
    ? `@${invitation.creatorUsername.replace(/^@/, '')}`
    : invitation.creatorName || 'ChallengeSphere member';
  const durationLabel = invitation.challengeMode === 'ONE_OFF'
    ? 'One check-in'
    : invitation.challengeDurationDays
      ? `${invitation.challengeDurationDays} day${invitation.challengeDurationDays === 1 ? '' : 's'}`
      : 'Ongoing';
  const proofLabel = invitation.proofMode === 'FLEXIBLE' ? 'Flexible proof' : 'Photo required';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FloatingScreenControls onBackPress={goBack} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name={invitation.privateChallenge ? 'lock-closed' : 'earth'}
              size={26}
              color="#4700EC"
            />
          </View>
          <View style={styles.visibilityPill}>
            <Text style={styles.visibilityText}>{visibilityLabel}</Text>
          </View>
          <Text style={styles.challengeTitle} accessibilityRole="header">
            {invitation.challengeTitle}
          </Text>
          <Text style={styles.inviteHeadline}>
            <Text style={styles.inviterText}>{inviterLabel}</Text> invited you to review and join this challenge.
          </Text>
        </View>

        <View style={styles.factsCard}>
          <View style={styles.factItem}>
            <Ionicons name="time-outline" size={20} color="#4700EC" />
            <Text style={styles.factLabel}>Duration</Text>
            <Text style={styles.factValue}>{durationLabel}</Text>
          </View>
          <View style={styles.factItem}>
            <Ionicons name="calendar-outline" size={20} color="#4700EC" />
            <Text style={styles.factLabel}>Start date</Text>
            <Text style={styles.factValue}>{formatDate(invitation.challengeStartDate)}</Text>
          </View>
          <View style={styles.factItem}>
            <Ionicons name="camera-outline" size={20} color="#4700EC" />
            <Text style={styles.factLabel}>Check-ins</Text>
            <Text style={styles.factValue}>{proofLabel}</Text>
          </View>
          <View style={styles.factItem}>
            <Ionicons name="person-circle-outline" size={20} color="#4700EC" />
            <Text style={styles.factLabel}>Creator</Text>
            <Text style={styles.factValue}>{creatorLabel}</Text>
          </View>
        </View>

        {!!invitation.challengeCategories && (
          <View style={styles.categoryRow}>
            {invitation.challengeCategories.split(',').map((category) => category.trim()).filter(Boolean).map((category) => (
              <View key={category} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{category}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="reader-outline" size={20} color="#4700EC" />
            <Text style={styles.sectionTitle}>Description</Text>
          </View>
          <Text style={styles.sectionText}>
            {invitation.challengeDescription || 'No description was provided.'}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#4700EC" />
            <Text style={styles.sectionTitle}>Rules</Text>
          </View>
          <Text style={styles.sectionText}>
            {invitation.challengeRules || 'Follow the challenge instructions and keep your check-ins genuine.'}
          </Text>
        </View>

        {!!invitation.challengeBenefits && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="sparkles-outline" size={20} color="#4700EC" />
              <Text style={styles.sectionTitle}>Why join</Text>
            </View>
            <Text style={styles.sectionText}>{invitation.challengeBenefits}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.notNowButton} onPress={goBack} disabled={acceptInviteMutation.isPending}>
          <Text style={styles.notNowText}>Not now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.joinButton, acceptInviteMutation.isPending && styles.joinButtonDisabled]}
          onPress={handleJoin}
          disabled={acceptInviteMutation.isPending}
          feedbackTiming="after-paint"
        >
          {acceptInviteMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.joinButtonText}>
            {acceptInviteMutation.isPending ? 'Joining…' : 'Join challenge'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FC' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 28, gap: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  loadingText: { color: '#777389', fontSize: 14 },
  errorTitle: { color: '#18142F', fontSize: 19, fontWeight: '700' },
  errorText: { color: '#777389', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  retryButton: { marginTop: 8, backgroundColor: '#4700EC', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 12 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '700' },
  heroCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 22 },
  heroIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#EEE9FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  visibilityPill: { borderRadius: 999, backgroundColor: '#EEE9FF', paddingHorizontal: 11, paddingVertical: 6, marginBottom: 12 },
  visibilityText: { color: '#4700EC', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  challengeTitle: { color: '#18142F', fontSize: 24, lineHeight: 30, fontWeight: '800', textAlign: 'center' },
  inviteHeadline: { marginTop: 10, color: '#777389', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  inviterText: { color: '#4700EC', fontWeight: '700' },
  factsCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16 },
  factItem: { width: '47%', minHeight: 92, borderRadius: 16, backgroundColor: '#F8F7FC', padding: 12, gap: 4 },
  factLabel: { color: '#777389', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  factValue: { color: '#18142F', fontSize: 13, fontWeight: '700' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { borderRadius: 999, borderWidth: 1, borderColor: '#D9D0FF', backgroundColor: '#F3F0FF', paddingHorizontal: 12, paddingVertical: 7 },
  categoryChipText: { color: '#4700EC', fontSize: 11, fontWeight: '700' },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { color: '#18142F', fontSize: 16, fontWeight: '700' },
  sectionText: { color: '#5F5A67', fontSize: 14, lineHeight: 21 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#E7E3EF', backgroundColor: '#FFFFFF' },
  notNowButton: { flex: 1, height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#DCD7E5', alignItems: 'center', justifyContent: 'center' },
  notNowText: { color: '#5F5A67', fontSize: 14, fontWeight: '700' },
  joinButton: { flex: 2, height: 52, borderRadius: 16, backgroundColor: '#4700EC', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  joinButtonDisabled: { opacity: 0.65 },
  joinButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
