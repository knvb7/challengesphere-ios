import hapticFeedback from '@/utils/haptics';
import { AppAlert as Alert } from '@/utils/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import {
    ActivityIndicator,
    BackHandler,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import FloatingScreenControls from '../components/common/FloatingScreenControls';
import { useInviteDetails, useRedeemInvite } from '../hooks/useInvites';
import { useAuthContext } from '../providers/AuthProvider';
import { normalizeInviteCode, pendingInviteService } from '../services/pendingInviteService';
import { SkeletonBlock, useSkeletonShimmer } from '../components/common/Skeleton';
import { getApiErrorMessage } from '../utils/apiError';
import { showChallengeLimitUpgrade } from '../utils/challengeLimitUpgrade';

const InvitationSkeleton = () => {
  const shimmer = useSkeletonShimmer();
  return (
    <View style={{ flex: 1, padding: 20, gap: 16 }}>
      <SkeletonBlock translateX={shimmer} width="100%" height={180} borderRadius={16} />
      <SkeletonBlock translateX={shimmer} width="70%" height={22} borderRadius={8} />
      <SkeletonBlock translateX={shimmer} width="90%" height={14} borderRadius={6} />
      <SkeletonBlock translateX={shimmer} width="80%" height={14} borderRadius={6} />
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        {[1, 2, 3].map((i) => (
          <SkeletonBlock key={i} translateX={shimmer} width={80} height={28} borderRadius={14} />
        ))}
      </View>
      <View style={{ marginTop: 12, gap: 10 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <SkeletonBlock translateX={shimmer} width={20} height={20} borderRadius={10} />
            <SkeletonBlock translateX={shimmer} width="70%" height={12} borderRadius={6} />
          </View>
        ))}
      </View>
      <View style={{ position: 'absolute', bottom: 32, left: 20, right: 20, gap: 12 }}>
        <SkeletonBlock translateX={shimmer} width="100%" height={52} borderRadius={14} />
        <SkeletonBlock translateX={shimmer} width="100%" height={52} borderRadius={14} />
      </View>
    </View>
  );
};

export default function ChallengeInvitationScreen() {
  const router = useRouter();
  const { top: topInset } = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { currentUserId, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const CURRENT_USER_ID = currentUserId;

  const routeInviteCode = Array.isArray(params.inviteCode) ? params.inviteCode[0] : params.inviteCode;
  const inviteCode = normalizeInviteCode(routeInviteCode as string | undefined);
  const { data: invitation, isLoading, error } = useInviteDetails(inviteCode);
  const redeemInviteMutation = useRedeemInvite();

  const exitInvite = useCallback(async () => {
    await pendingInviteService.clear(inviteCode);
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/challenges');
  }, [inviteCode, router]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      void exitInvite();
      return true;
    });
    return () => subscription.remove();
  }, [exitInvite]);

  const handleAcceptChallenge = async () => {
    if (!inviteCode) return;
    hapticFeedback.buttonPress();

    if (authLoading) return;
    if (!isAuthenticated) {
      const saved = await pendingInviteService.save(inviteCode);
      if (!saved) {
        Alert.alert('Invalid invitation', 'This invitation link cannot be continued.');
        return;
      }
      router.replace('/login');
      return;
    }

    redeemInviteMutation.mutate(
      { inviteCode, userId: CURRENT_USER_ID },
      {
        onSuccess: (data) => {
          hapticFeedback.challengeJoined();
          void pendingInviteService.clear(inviteCode);
          Alert.alert(
            '🎉 Challenge Joined!',
            data.message || `You've joined "${data.challengeTitle}". Get ready!`,
            [{
              text: 'View Challenge',
              onPress: () => router.replace({
                pathname: '/challenge-details',
                params: {
                  id: String(data.challengeId),
                  title: data.challengeTitle || invitation?.challengeTitle || '',
                  isCreator: 'false',
                },
              }),
            }]
          );
        },
        onError: (err: any) => {
          if (showChallengeLimitUpgrade(
            err,
            'Failed to redeem invite. It may have expired or reached max uses.',
            () => router.push('/premium' as any),
          )) return;
          Alert.alert(
            'Could Not Join',
            getApiErrorMessage(err, 'Failed to redeem invite. It may have expired or reached max uses.'),
          );
        },
      }
    );
  };

  const handleDeclineChallenge = () => {
    hapticFeedback.warning();
    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this challenge invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            hapticFeedback.delete();
            void exitInvite();
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FloatingScreenControls onBackPress={() => void exitInvite()} />
        <View style={[styles.loadingContent, { paddingTop: topInset + 64 }]}>
          <InvitationSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !invitation) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FloatingScreenControls onBackPress={() => void exitInvite()} />
        <View style={[styles.centerContainer, { paddingTop: topInset + 64 }]}>
          <Ionicons name="alert-circle" size={64} color="#FF5252" />
          <Text style={styles.errorTitle}>Invite Not Found</Text>
          <Text style={styles.errorSubtitle}>This invite link may have expired or been deactivated.</Text>
          <TouchableOpacity style={styles.goBackButton} onPress={() => void exitInvite()}>
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }



  const isExpired = invitation.expiresAt ? new Date(invitation.expiresAt) < new Date() : false;
  const isInactive = invitation.active === false;
  const isMaxedOut = invitation.maxUses != null && invitation.useCount != null && invitation.useCount >= invitation.maxUses;
  const canRedeem = !isExpired && !isInactive && !isMaxedOut;
  // Private previews deliberately omit their identifying fields. Treat an
  // absent privacy marker as private so older or partial responses fail closed.
  const isPrivateInvitation = invitation.privateChallenge !== false;
  const inviterLabel = invitation.inviterName
    || (invitation.inviterUsername ? `@${invitation.inviterUsername}` : 'A friend');
  const durationLabel = invitation.challengeMode === 'ONE_OFF'
    ? 'One check-in'
    : invitation.challengeDurationDays
      ? `${invitation.challengeDurationDays} day${invitation.challengeDurationDays === 1 ? '' : 's'}`
      : 'Daily';
  const acceptedCount = invitation.acceptedCount ?? invitation.useCount ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FloatingScreenControls onBackPress={() => void exitInvite()} />

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset }]}
      >
        {/* Invitation Header */}
        <View style={styles.invitationHeader}>
          <View style={styles.inviteIcon}>
            <Ionicons name="mail-open" size={40} color="#4700ecff" />
          </View>
          <Text style={styles.inviteTitle} accessibilityRole="header">You&apos;re Invited!</Text>
          <Text style={styles.inviteSubtitle}>
            {isPrivateInvitation ? (
              'You received a private challenge invitation.'
            ) : (
              <><Text style={styles.inviterName}>{inviterLabel}</Text> wants you in this challenge</>
            )}
          </Text>
        </View>

        {/* Status Banner */}
        {!canRedeem && (
          <View style={styles.statusBanner}>
            <Ionicons
              name={isExpired ? 'time' : isInactive ? 'close-circle' : 'alert-circle'}
              size={20}
              color="#FF5252"
            />
            <Text style={styles.statusBannerText}>
              {isPrivateInvitation
                ? 'This private invitation is no longer available'
                : isExpired
                  ? 'This invite has expired'
                  : isInactive
                    ? 'This invite has been deactivated'
                    : 'This invite has reached its maximum uses'}
            </Text>
          </View>
        )}

        {isPrivateInvitation ? (
          <View style={styles.challengeCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed" size={20} color="#4700ecff" />
              <Text style={styles.sectionTitle}>Private until you join</Text>
            </View>
            <Text style={styles.rulesText}>
              Accepting adds you to the private challenge. Its name and details will be revealed only after you join successfully.
            </Text>
          </View>
        ) : (
          <>
            {/* Public Challenge Details */}
            <View style={styles.challengeCard}>
              <Text style={styles.challengeTitle} accessibilityRole="header">
                {invitation.challengeTitle || `Challenge #${invitation.challengeId}`}
              </Text>
              {invitation.challengeDescription && (
                <Text style={styles.challengeDescription}>{invitation.challengeDescription}</Text>
              )}
              {invitation.challengeCategories && (
                <Text style={styles.categoryText}>{invitation.challengeCategories.split(',').join('  ·  ')}</Text>
              )}

              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={18} color="#8F69FF" />
                  <Text style={styles.detailLabel}>Commitment</Text>
                  <Text style={styles.detailValue}>{durationLabel}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Ionicons name="people" size={18} color="#4700ecff" />
                  <Text style={styles.detailLabel}>In the challenge</Text>
                  <Text style={styles.detailValue}>{invitation.participantCount ?? '—'}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  <Text style={styles.detailLabel}>Joined from link</Text>
                  <Text style={styles.detailValue}>{acceptedCount}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Ionicons name="camera-outline" size={18} color="#8F69FF" />
                  <Text style={styles.detailLabel}>Submission format</Text>
                  <Text style={styles.detailValue}>Photo required</Text>
                </View>

                {invitation.remainingUses != null && (
                  <View style={styles.detailItem}>
                    <Ionicons name="person-add-outline" size={18} color="#8F69FF" />
                    <Text style={styles.detailLabel}>Spots left on link</Text>
                    <Text style={styles.detailValue}>{invitation.remainingUses}</Text>
                  </View>
                )}
              </View>

              {(invitation.challengeStartDate || invitation.expiresAt) && (
                <View style={styles.startDateContainer}>
                  <Ionicons name="calendar" size={18} color="#4CAF50" />
                  <Text style={styles.startDateText}>
                    {invitation.challengeStartDate
                      ? `Start date ${new Date(`${invitation.challengeStartDate}T00:00:00`).toLocaleDateString()}`
                      : `Invite expires ${new Date(invitation.expiresAt!).toLocaleDateString()}`}
                  </Text>
                </View>
              )}
            </View>

            {invitation.challengeRules && (
              <View style={styles.rulesCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#8F69FF" />
                  <Text style={styles.sectionTitle}>Rules</Text>
                </View>
                <Text style={styles.rulesText}>{invitation.challengeRules}</Text>
              </View>
            )}

            {invitation.challengeBenefits && (
              <View style={styles.rulesCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="sparkles-outline" size={20} color="#8F69FF" />
                  <Text style={styles.sectionTitle}>Why join</Text>
                </View>
                <Text style={styles.rulesText}>{invitation.challengeBenefits}</Text>
              </View>
            )}

            <View style={styles.rulesCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle" size={20} color="#4700ecff" />
                <Text style={styles.sectionTitle}>Before you join</Text>
              </View>
              <Text style={styles.rulesText}>
                You can review everything first. Joining adds you to the challenge so you can check in and support the group.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={handleDeclineChallenge}
          disabled={redeemInviteMutation.isPending}
        >
          <Ionicons name="close" size={20} color="#FF4444" />
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptButton, (!canRedeem || redeemInviteMutation.isPending || authLoading) && styles.acceptButtonDisabled]}
          onPress={handleAcceptChallenge}
          feedbackTiming="after-paint"
          disabled={!canRedeem || redeemInviteMutation.isPending || authLoading}
        >
          {redeemInviteMutation.isPending ? (
            <>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.acceptButtonText}>Joining...</Text>
            </>
          ) : (
            <>
              <Ionicons name={isAuthenticated ? 'checkmark' : 'log-in-outline'} size={20} color="#ffffff" />
              <Text style={styles.acceptButtonText}>
                {!canRedeem ? 'Unavailable' : authLoading ? 'Checking account…' : isAuthenticated ? 'Accept challenge' : 'Continue to join'}
              </Text>
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
  loadingContent: { flex: 1 },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#777389',
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#18142F',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#777389',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  goBackButton: {
    marginTop: 20,
    backgroundColor: '#4700ecff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  goBackButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  invitationHeader: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  inviteIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4700ec1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  inviteTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#18142F',
    marginBottom: 8,
  },
  inviteSubtitle: {
    fontSize: 15,
    color: '#777389',
    textAlign: 'center',
    lineHeight: 21,
  },
  inviterName: {
    color: '#4700EC',
    fontWeight: '700',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff525220',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  statusBannerText: {
    fontSize: 13,
    color: '#ff5252',
    fontWeight: '500',
    flex: 1,
  },
  challengeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  challengeTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#18142F',
    marginBottom: 8,
  },
  challengeDescription: {
    color: '#777389',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  categoryText: {
    color: '#a98bff',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  detailItem: {
    alignItems: 'center',
    minWidth: '45%' as any,
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: '#777389',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#18142F',
    fontWeight: '600',
  },
  startDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4caf5020',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  startDateText: {
    fontSize: 13,
    color: '#4caf50',
    fontWeight: '500',
  },
  rulesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18142F',
  },
  rulesText: {
    fontSize: 13,
    color: '#5F5A67',
    lineHeight: 19,
  },
  contextNote: {
    color: '#777181',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F8F7FC',
    borderTopWidth: 1,
    borderTopColor: '#E7E3EF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ff4444',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4700ecff',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  acceptButtonDisabled: {
    backgroundColor: '#4700ec80',
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
