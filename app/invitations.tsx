import { Ionicons } from '@expo/vector-icons';
import { AppAlert as Alert } from '@/utils/appAlert';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildChallengeInviteUrl } from '../constants/inviteLinks';
import { useInfiniteChallengesByCreator } from '../hooks/useChallenges';
import { useDeactivateInvite, useGenerateInviteLink, useInvitesForChallenge } from '../hooks/useInvites';
import { useAuthContext } from '../providers/AuthProvider';
import { InviteLinkResponse } from '../types/api';

export default function InvitationsScreen() {
  const router = useRouter();
  const { currentUserId } = useAuthContext();
  const CURRENT_USER_ID = currentUserId;
  
  // Fetch user's challenges to find ones they created
  const {
    data: challengesPages,
    isLoading: loadingChallenges,
    refetch: refetchChallenges,
    fetchNextPage: fetchNextChallengesPage,
    hasNextPage: hasNextChallengesPage,
    isFetchingNextPage: isFetchingNextChallengesPage,
  } = useInfiniteChallengesByCreator(CURRENT_USER_ID, CURRENT_USER_ID, 50);
  const createdChallenges = challengesPages?.pages?.flatMap(page => page.challenges) ?? [];
  
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const activeChallengeId = selectedChallengeId ?? (createdChallenges[0]?.id || 0);
  const activeChallenge = createdChallenges.find((challenge) => challenge.id === activeChallengeId);

  React.useEffect(() => {
    if (hasNextChallengesPage && !isFetchingNextChallengesPage) {
      fetchNextChallengesPage();
    }
  }, [hasNextChallengesPage, isFetchingNextChallengesPage, fetchNextChallengesPage, challengesPages?.pages.length]);

  // Fetch invites for the active challenge
  const isPrivateChallenge = activeChallenge?.isPrivate === true;
  const isPrivateInviteOwner = !isPrivateChallenge || (
    (activeChallenge?.currentOwnerId ?? activeChallenge?.creatorId) === CURRENT_USER_ID
  );
  const { data: invitesData, isLoading: loadingInvites, refetch: refetchInvites } = useInvitesForChallenge(
    activeChallengeId,
    !isPrivateChallenge,
  );
  const generateInviteMutation = useGenerateInviteLink();
  const deactivateInviteMutation = useDeactivateInvite();

  const invites: InviteLinkResponse[] = isPrivateChallenge ? [] : (invitesData?.invites ?? []);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchChallenges(),
        ...(!isPrivateChallenge ? [refetchInvites()] : []),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [isPrivateChallenge, refetchChallenges, refetchInvites]);

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleGenerateInvite = () => {
    if (!activeChallengeId) {
      Alert.alert('No Challenge', 'Select a challenge to generate an invite link.');
      return;
    }
    if (isPrivateChallenge) {
      if (!isPrivateInviteOwner) {
        Alert.alert('Owner Only', 'Only the private challenge owner can send invitations.');
        return;
      }
      router.push({
        pathname: '/challenge-details',
        params: {
          id: String(activeChallengeId),
          title: activeChallenge?.title || '',
          isCreator: 'true',
          isPrivate: 'true',
          openInviteModal: 'true',
        },
      });
      return;
    }
    generateInviteMutation.mutate(
      { challengeId: activeChallengeId, userId: CURRENT_USER_ID, maxUses: 10, expiresInHours: 720 },
      {
        onSuccess: (data) => {
          refetchInvites();
          const createdInviteCode = data.inviteCode;
          if (!createdInviteCode) {
            Alert.alert('Invite Created', 'The invite was created, but no shareable code was returned.');
            return;
          }
          const directInviteUrl = buildChallengeInviteUrl(createdInviteCode);
          Alert.alert('Invite Created!', `Invite code: ${createdInviteCode}\n\nInvite link: ${directInviteUrl}`, [
            { text: 'Copy Code', onPress: () => Clipboard.setStringAsync(createdInviteCode) },
            { text: 'OK' },
          ]);
        },
        onError: () => Alert.alert('Error', 'Failed to generate invite link.'),
      }
    );
  };

  const handleCopyCode = async (invite: InviteLinkResponse) => {
    if (!invite.inviteCode) return;
    await Clipboard.setStringAsync(invite.inviteCode);
    Alert.alert('Copied!', 'Invite code copied to clipboard.');
  };

  const handleWhatsAppInvite = (invite: InviteLinkResponse) => {
    if (!invite.inviteCode) return;
    router.push({
      pathname: '/invite-contacts',
      params: {
        mode: 'challenge',
        challengeId: String(invite.challengeId || activeChallengeId),
        challengeTitle: invite.challengeTitle || activeChallenge?.title || '',
        inviteCode: invite.inviteCode,
        inviteUrl: buildChallengeInviteUrl(invite.inviteCode),
      },
    } as any);
  };

  const handleDeactivateInvite = (invite: InviteLinkResponse) => {
    const inviteId = invite.inviteId;
    if (!inviteId) return;
    Alert.alert('Deactivate Invite', 'This will disable this invite link. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () => {
          deactivateInviteMutation.mutate(
            { inviteId },
            { onSuccess: () => refetchInvites() }
          );
        },
      },
    ]);
  };

  const renderInviteItem = ({ item }: { item: InviteLinkResponse }) => (
    <View style={styles.inviteItem}>
      <View style={styles.inviteHeader}>
        <View style={styles.inviteCodeBadge}>
          <Ionicons name="link" size={14} color="#4700ecff" />
          <Text style={styles.inviteCode}>{item.inviteCode}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: item.active ? '#4CAF5020' : '#F4433620' }]}>
          <Ionicons
            name={item.active ? 'checkmark-circle' : 'close-circle'}
            size={14}
            color={item.active ? '#4CAF50' : '#F44336'}
          />
          <Text style={{ color: item.active ? '#4CAF50' : '#F44336', fontSize: 11, fontWeight: '500' }}>
            {item.active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.inviteStats}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={14} color="#888" />
          <Text style={styles.statText}>{item.useCount ?? 0} / {item.maxUses ?? '∞'} uses</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="time" size={14} color="#888" />
          <Text style={styles.statText}>Created {formatTimeAgo(item.createdAt)}</Text>
        </View>
        {item.expiresAt && (
          <View style={styles.statItem}>
            <Ionicons name="calendar" size={14} color="#888" />
            <Text style={styles.statText}>Expires {new Date(item.expiresAt).toLocaleDateString()}</Text>
          </View>
        )}
      </View>

      <View style={styles.inviteActions}>
        <TouchableOpacity style={styles.copyButton} onPress={() => handleCopyCode(item)}>
          <Ionicons name="copy" size={16} color="#fff" />
          <Text style={styles.copyButtonText}>Copy Code</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.whatsappButton} onPress={() => handleWhatsAppInvite(item)}>
          <Ionicons name="logo-whatsapp" size={16} color="#fff" />
          <Text style={styles.whatsappButtonText}>WhatsApp</Text>
        </TouchableOpacity>
        {item.active && (
          <TouchableOpacity style={styles.deactivateButton} onPress={() => handleDeactivateInvite(item)}>
            <Ionicons name="close-circle-outline" size={16} color="#FF5252" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loadingChallenges) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#18142F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invitations</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4700ecff" />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#18142F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invitations</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Challenge Selector */}
      {createdChallenges.length > 0 && (
        <FlatList
          data={createdChallenges}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.challengeSelectorContent}
          style={styles.challengeSelector}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.challengeChip, activeChallengeId === item.id && styles.challengeChipActive]}
              onPress={() => setSelectedChallengeId(item.id)}
            >
              <Text style={[styles.challengeChipText, activeChallengeId === item.id && styles.challengeChipTextActive]}
                numberOfLines={1} selectable>
                {item.title}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Generate Invite Button */}
      {activeChallengeId > 0 && isPrivateInviteOwner && (
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerateInvite}
          feedbackTiming="after-paint"
          disabled={generateInviteMutation.isPending}
        >
          {generateInviteMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name={isPrivateChallenge ? 'person-add' : 'add-circle'} size={20} color="#fff" />
              <Text style={styles.generateButtonText}>
                {isPrivateChallenge ? 'Invite App Friends' : 'Generate New Invite Link'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Invites List */}
      <FlatList
        data={invites}
        renderItem={renderInviteItem}
        keyExtractor={(item, index) => String(item.inviteId ?? item.inviteCode ?? index)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4700ecff" colors={['#4700ecff']} />
        }
        ListEmptyComponent={
          loadingInvites ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color="#4700ecff" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name={isPrivateChallenge ? 'lock-closed-outline' : 'link-outline'} size={64} color="#666666" />
              <Text style={styles.emptyTitle}>
                {createdChallenges.length === 0
                  ? 'No Challenges Created'
                  : isPrivateChallenge
                    ? 'Targeted Invitations Only'
                    : 'No Invite Links'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {createdChallenges.length === 0
                  ? 'Create a challenge first, then generate invite links to share.'
                  : isPrivateChallenge
                    ? isPrivateInviteOwner
                      ? 'Private invitations are sent directly to specific app friends. Codes and external sharing are disabled.'
                      : 'Only the current owner can send invitations for this private challenge.'
                  : 'Generate an invite link to share this challenge with friends.'}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#18142F',
  },
  placeholder: {
    width: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  challengeSelector: {
    maxHeight: 50,
    marginTop: 12,
  },
  challengeSelectorContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  challengeChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
    maxWidth: 200,
  },
  challengeChipActive: {
    backgroundColor: '#4700ecff',
    borderColor: '#4700ecff',
  },
  challengeChipText: {
    color: '#777389',
    fontSize: 12,
    fontWeight: '500',
  },
  challengeChipTextActive: {
    color: '#FFFFFF',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4700ecff',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    flex: 1,
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  inviteItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  inviteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inviteCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4700ec20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inviteCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4700ecff',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  inviteStats: {
    gap: 6,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#777389',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4700ecff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25d366',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    justifyContent: 'center',
  },
  whatsappButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  deactivateButton: {
    padding: 8,
    backgroundColor: '#ff525220',
    borderRadius: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#18142F',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#777389',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 20,
  },
});
