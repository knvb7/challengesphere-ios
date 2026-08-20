import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { useGenerateInviteLink, useInvitesForChallenge } from '@/hooks/useInvites';
import { useAuthContext } from '@/providers/AuthProvider';
import type { InviteLinkResponse } from '@/types/api';
import { AppAlert as Alert } from '@/utils/appAlert';
import { getApiErrorMessage } from '@/utils/apiError';

type ChallengeInviteCodeMenuItemProps = {
  challengeId: number;
  enabled: boolean;
  onBeforeCopy?: () => void;
};

const isAvailableInvite = (invite: InviteLinkResponse | undefined): boolean => {
  // This menu item owns the shareable code. Never surface a recipient-bound
  // private invitation as though it were safe to copy for anyone.
  if (!invite?.inviteCode || invite.active === false || invite.recipientUserId != null) return false;
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) return false;
  return invite.maxUses == null
    || invite.useCount == null
    || invite.useCount < invite.maxUses;
};

export default function ChallengeInviteCodeMenuItem({
  challengeId,
  enabled,
  onBeforeCopy,
}: ChallengeInviteCodeMenuItemProps) {
  const { currentUserId } = useAuthContext();
  const canManageCode = enabled && challengeId > 0 && currentUserId > 0;
  const inviteQuery = useInvitesForChallenge(challengeId, canManageCode);
  const generateInvite = useGenerateInviteLink();
  const generationAttemptRef = useRef<number | null>(null);

  const availableInvite = useMemo(() => {
    const candidates = [
      generateInvite.data,
      ...(inviteQuery.data?.invites ?? []),
    ];
    return candidates.find(
      (invite) => invite?.challengeId === challengeId && isAvailableInvite(invite),
    );
  }, [challengeId, generateInvite.data, inviteQuery.data?.invites]);

  useEffect(() => {
    generationAttemptRef.current = null;
  }, [challengeId]);

  useEffect(() => {
    if (
      !canManageCode
      || inviteQuery.isLoading
      || inviteQuery.isError
      || !inviteQuery.data
      || availableInvite
      || generateInvite.isPending
      || generationAttemptRef.current === challengeId
    ) {
      return;
    }

    generationAttemptRef.current = challengeId;
    generateInvite.mutate({
      challengeId,
      userId: currentUserId,
      expiresInHours: 720,
    });
  }, [
    availableInvite,
    canManageCode,
    challengeId,
    currentUserId,
    generateInvite,
    inviteQuery.data,
    inviteQuery.isError,
    inviteQuery.isLoading,
  ]);

  if (!canManageCode) return null;

  const inviteCode = availableInvite?.inviteCode;
  const preparingCode = inviteQuery.isLoading || generateInvite.isPending;
  const codePreparationFailed = inviteQuery.isError || generateInvite.isError;

  const generateCode = (showError: boolean) => {
    generationAttemptRef.current = challengeId;
    generateInvite.mutate({
      challengeId,
      userId: currentUserId,
      expiresInHours: 720,
    }, {
      onError: (error) => {
        generationAttemptRef.current = null;
        if (showError) {
          Alert.alert(
            'Could not create invite code',
            getApiErrorMessage(error, 'Please try again.'),
          );
        }
      },
    });
  };

  const handlePress = async () => {
    if (!inviteCode) {
      if (preparingCode) return;
      generateCode(true);
      return;
    }

    try {
      await Clipboard.setStringAsync(inviteCode);
      onBeforeCopy?.();
      Alert.alert('Invite code copied', `${inviteCode} is ready to paste.`);
    } catch {
      Alert.alert('Could not copy code', 'Please try again.');
    }
  };

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={handlePress}
      disabled={preparingCode}
      accessibilityRole="button"
      accessibilityLabel={inviteCode ? `Copy invite code ${inviteCode}` : 'Create invite code'}
    >
      <Ionicons name="key-outline" size={20} color="#D8C7FF" />
      <View style={styles.copy}>
        <Text style={styles.label}>Invite code</Text>
        <Text style={styles.code} numberOfLines={1}>
          {inviteCode ?? (preparingCode
            ? 'Preparing…'
            : codePreparationFailed
              ? 'Tap to retry'
              : 'Tap to create')}
        </Text>
      </View>
      {preparingCode ? (
        <ActivityIndicator size="small" color="#5B3FE5" />
      ) : (
        <Ionicons
          name={inviteCode ? 'copy-outline' : codePreparationFailed ? 'alert-circle-outline' : 'refresh-outline'}
          size={18}
          color="#5B3FE5"
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E7E3EF',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: '#18142F',
    fontSize: 14,
    fontWeight: '700',
  },
  code: {
    color: '#655F70',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginTop: 1,
  },
});
