import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useStartChallengeCrew } from '../../hooks/useChallengeCrew';
import type { ChallengeCrewStatus } from '../../types/challengeCrew';
import { getApiErrorMessage } from '../../utils/apiError';
import { AppAlert as Alert } from '../../utils/appAlert';

interface ChallengeCrewPanelProps {
  challengeId: number;
  startDate?: string;
  status?: ChallengeCrewStatus;
  isLoading?: boolean;
  hasError?: boolean;
  canManageInvites: boolean;
  viewerIsParticipant: boolean;
  onInvite: () => void;
}

const parseCalendarDate = (value?: string): Date | null => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
};

const isFutureCalendarDate = (value?: string): boolean => {
  const date = parseCalendarDate(value);
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() > today.getTime();
};

const formatCalendarDate = (value?: string): string => {
  const date = parseCalendarDate(value);
  return date
    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'the scheduled date';
};

const ActionButton = ({
  label,
  icon,
  onPress,
  disabled = false,
  secondary = false,
  loading = false,
  deferAction = false,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  loading?: boolean;
  deferAction?: boolean;
}) => (
  <TouchableOpacity
    style={[
      styles.actionButton,
      secondary && styles.actionButtonSecondary,
      disabled && styles.actionButtonDisabled,
    ]}
    onPress={onPress}
    feedbackTiming={deferAction ? 'after-paint' : 'immediate'}
    disabled={disabled}
    activeOpacity={0.84}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    {loading ? (
      <ActivityIndicator size="small" color={secondary ? '#4700EC' : '#FFFFFF'} />
    ) : (
      <Ionicons name={icon} size={18} color={secondary ? '#4700EC' : '#FFFFFF'} />
    )}
    <Text style={[
      styles.actionButtonText,
      secondary && styles.actionButtonTextSecondary,
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function ChallengeCrewPanel({
  challengeId,
  startDate,
  status,
  isLoading = false,
  hasError = false,
  canManageInvites,
  viewerIsParticipant,
  onInvite,
}: ChallengeCrewPanelProps) {
  const startMutation = useStartChallengeCrew(challengeId);

  const showError = (title: string, error: unknown) => {
    Alert.alert(title, getApiErrorMessage(error, 'Please try again.'));
  };

  const runStartMutation = () => {
    startMutation.mutate(undefined, {
      onError: (error) => showError('Could not start', error),
    });
  };

  const handleStartChallenge = () => {
    if (!status || status.acceptedCount < status.minimumStartCount) {
      Alert.alert(
        'Participant needed',
        'Rejoin this challenge or invite someone who accepts before starting it.',
      );
      return;
    }

    if (!isFutureCalendarDate(startDate)) {
      runStartMutation();
      return;
    }

    Alert.alert(
      'Start challenge early?',
      `This challenge is scheduled for ${formatCalendarDate(startDate)}. Starting now will move the start date to today.`,
      [
        { text: 'Keep schedule', style: 'cancel' },
        { text: 'Start early', onPress: runStartMutation },
      ],
    );
  };

  if (isLoading && !status) {
    return (
      <View style={styles.panel}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#9B7BFF" />
          <Text style={styles.mutedText}>Loading challenge...</Text>
        </View>
      </View>
    );
  }

  if (hasError || !status) {
    return (
      <View style={[styles.panel, styles.errorPanel]}>
        <View style={styles.errorMessageRow}>
          <Ionicons name="cloud-offline-outline" size={20} color="#FFC1C1" />
          <View style={styles.flexCopy}>
            <Text style={styles.errorTitle}>Some challenge controls are unavailable</Text>
            <Text style={styles.errorText}>
              {canManageInvites
                ? 'You can still invite app friends, or pull to refresh the other controls.'
                : 'Pull to refresh the challenge controls.'}
            </Text>
          </View>
        </View>
        {canManageInvites ? <View style={styles.actionsRow}>
          <ActionButton
            label="Invite app friends"
            icon="person-add-outline"
            secondary
            onPress={onInvite}
          />
        </View> : null}
      </View>
    );
  }

  if (status.state !== 'LOBBY') {
    return null;
  }

  const startsInFuture = isFutureCalendarDate(startDate);
  const hasMinimumParticipants = status.acceptedCount >= status.minimumStartCount;
  const canStartChallenge = status.canStart && hasMinimumParticipants;
  const participantLabel = `${status.acceptedCount} participant${status.acceptedCount === 1 ? '' : 's'}`;
  const pendingLabel = status.pendingInviteCount > 0
    ? `${status.pendingInviteCount} invite${status.pendingInviteCount === 1 ? '' : 's'} pending`
    : null;

  return (
    <View style={styles.panel}>
      <View style={styles.eyebrowRow}>
        <Ionicons name="lock-closed-outline" size={18} color="#6C42E8" />
        <Text style={styles.eyebrow}>PRIVATE CHALLENGE</Text>
      </View>
      <Text style={styles.title}>
        {status.canManageCrew
          ? hasMinimumParticipants
            ? viewerIsParticipant ? 'Ready when you are.' : 'Your crew is ready.'
            : 'Add a participant before you start.'
          : 'Ready when the creator is.'}
      </Text>
      <Text style={styles.body}>
        {status.canManageCrew
          ? !hasMinimumParticipants
            ? 'Rejoin this challenge or invite someone who accepts before starting it.'
            : !viewerIsParticipant
              ? startsInFuture
                ? `Scheduled for ${formatCalendarDate(startDate)}. Start for your crew now, or rejoin if you want to participate.`
                : 'Start for your crew now, or rejoin if you want to participate.'
              : startsInFuture
            ? `Scheduled for ${formatCalendarDate(startDate)}. You can bring people in now or start early.`
            : 'Start on your own now, or invite people to join you. You can bring people in anytime.'
          : 'This challenge has not started yet. The creator gets it going!'}
      </Text>

      <View style={styles.participantSummary}>
        <Ionicons name="person-outline" size={16} color="#6C42E8" />
        <Text style={styles.participantSummaryText}>{participantLabel}</Text>
        {pendingLabel ? (
          <>
            <View style={styles.summaryDot} />
            <Text style={styles.participantSummaryMuted}>{pendingLabel}</Text>
          </>
        ) : null}
      </View>

      {!status.canManageCrew ? (
        <View style={styles.waitingNote}>
          <Ionicons name="time-outline" size={17} color="#6C42E8" />
          <Text style={styles.waitingText}>The creator can start this challenge at any time.</Text>
        </View>
      ) : null}

      {(status.canManageCrew || canManageInvites) ? (
        <View style={styles.actionsRow}>
          {status.canManageCrew ? (
            <ActionButton
              label={canStartChallenge
                ? !viewerIsParticipant
                  ? startsInFuture ? 'Start crew early' : 'Start for crew'
                  : startsInFuture ? 'Start early' : 'Start challenge'
                : 'Participant needed'}
              icon="play-circle-outline"
              disabled={startMutation.isPending || !canStartChallenge}
              loading={startMutation.isPending}
              deferAction
              onPress={handleStartChallenge}
            />
          ) : null}
          {canManageInvites ? (
            <ActionButton
              label="Invite app friends"
              icon="person-add-outline"
              secondary
              onPress={onInvite}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 16,
    marginBottom: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#F0ECFF',
    padding: 18,
  },
  errorPanel: {
    borderColor: '#683a48',
    backgroundColor: '#FFF1F2',
  },
  errorMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  eyebrow: {
    color: '#6C42E8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  title: {
    color: '#18142F',
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 26,
  },
  body: {
    color: '#5F5868',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  loadingRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mutedText: {
    color: '#5F5868',
    fontSize: 13,
    fontWeight: '700',
  },
  errorTitle: {
    color: '#B4233C',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: '#8E5260',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  flexCopy: {
    flex: 1,
  },
  participantSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    minHeight: 42,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(109,54,232,0.10)',
    paddingHorizontal: 12,
    marginTop: 18,
  },
  participantSummaryText: {
    color: '#18142F',
    fontSize: 12,
    fontWeight: '700',
  },
  participantSummaryMuted: {
    color: '#6F6879',
    fontSize: 11,
    fontWeight: '700',
  },
  summaryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#756b8a',
  },
  actionsRow: {
    gap: 9,
    marginTop: 17,
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 19,
    backgroundColor: '#6c44ea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  actionButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFC2FF',
  },
  actionButtonDisabled: {
    opacity: 0.52,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtonTextSecondary: {
    color: '#4700EC',
  },
  waitingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(109,54,232,0.10)',
    padding: 12,
    marginTop: 16,
  },
  waitingText: {
    flex: 1,
    color: '#777389',
    fontSize: 12,
    lineHeight: 17,
  },
});
