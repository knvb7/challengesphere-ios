import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { AppAlert as Alert } from '@/utils/appAlert';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AvatarImage from '../components/common/AvatarImage';
import { useBlockedUsers, useUnblockUser } from '../hooks/useUsers';
import { useAds } from '../providers/AdsProvider';
import { useAuthContext } from '../providers/AuthProvider';
import { confirmAccountDeletionEntry } from '../utils/accountDeletionConfirmation';

interface PrivacySecurityProps {
  onBack?: () => void;
}

export default function PrivacySecurity({ onBack }: PrivacySecurityProps) {
  const router = useRouter();
  const { currentUserId } = useAuthContext();
  const { isPrivacyOptionsRequired, showPrivacyOptions } = useAds();
  const [isOpeningAdPrivacy, setIsOpeningAdPrivacy] = React.useState(false);
  const { data: blockedData, isLoading: blockedLoading, error: blockedError } = useBlockedUsers(currentUserId, 1, 50);
  const unblockUser = useUnblockUser();
  const blockedUsers = blockedData?.users ?? [];

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  const confirmUnblock = (userId: number, username: string) => {
    Alert.alert('Unblock account?', `@${username} will be able to find and interact with you again.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: () => {
          unblockUser.mutate(
            { blockerId: currentUserId, blockedId: userId },
            { onError: () => Alert.alert('Unblock Failed', 'Could not unblock this account. Please try again.') }
          );
        },
      },
    ]);
  };

  const handleAdvertisingPrivacy = async () => {
    if (isOpeningAdPrivacy) return;

    setIsOpeningAdPrivacy(true);
    try {
      await showPrivacyOptions();
    } catch {
      Alert.alert('Privacy Choices Unavailable', 'Could not open advertising privacy choices. Please try again.');
    } finally {
      setIsOpeningAdPrivacy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#18142F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Safety</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>HOW VISIBILITY WORKS</Text>
        <View style={styles.card}>
          <InfoRow
            icon="lock-closed-outline"
            title="Private challenge content"
            body="Private challenges and their submissions are available only to active participants. Invite links can add participants, so share them only with people you trust."
          />
          <View style={styles.divider} />
          <InfoRow
            icon="people-outline"
            title="Profile activity"
            body="Public check-ins may appear in the Connections feed for your followers and people you follow. Full profile activity and connections require a mutual follow; private posts require shared challenge membership."
          />
          <View style={styles.divider} />
          <InfoRow
            icon="globe-outline"
            title="Public challenges"
            body="Submissions posted to a public challenge may be visible to its community. Check the challenge visibility before posting."
          />
        </View>

        <Text style={styles.sectionLabel}>BLOCKED ACCOUNTS</Text>
        <View style={styles.card}>
          {blockedLoading ? (
            <View style={styles.centerRow}><ActivityIndicator color="#9B75FF" /><Text style={styles.muted}>Loading blocked accounts…</Text></View>
          ) : blockedError ? (
            <Text style={styles.errorText}>Blocked accounts could not be loaded.</Text>
          ) : blockedUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#8E8791" />
              <Text style={styles.emptyTitle}>No blocked accounts</Text>
              <Text style={styles.muted}>Use the menu on any public profile to block or report an account.</Text>
            </View>
          ) : (
            blockedUsers.map((user, index) => (
              <View key={user.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.blockedRow}>
                  <AvatarImage uri={user.profilePicUrl} size={38} />
                  <Text style={styles.blockedName} numberOfLines={1}>@{user.username}</Text>
                  <TouchableOpacity
                    style={styles.unblockButton}
                    onPress={() => confirmUnblock(user.id, user.username)}
                    disabled={unblockUser.isPending}
                  >
                    <Text style={styles.unblockText}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionLabel}>POLICIES & ACCOUNT CONTROL</Text>
        <View style={styles.card}>
          <ActionRow icon="people-circle-outline" title="Terms & Community Rules" onPress={() => router.push('/community-rules' as any)} />
          <View style={styles.divider} />
          <ActionRow icon="document-text-outline" title="Privacy Policy" onPress={() => router.push('/privacy-policy' as any)} />
          {isPrivacyOptionsRequired ? (
            <>
              <View style={styles.divider} />
              <ActionRow
                icon="options-outline"
                title={isOpeningAdPrivacy ? 'Opening Advertising Privacy Choices…' : 'Advertising Privacy Choices'}
                onPress={() => void handleAdvertisingPrivacy()}
              />
            </>
          ) : null}
          <View style={styles.divider} />
          <ActionRow
            icon="trash-outline"
            title="Delete Account"
            danger
            onPress={() => confirmAccountDeletionEntry(() => router.push('/delete-account' as any))}
          />
        </View>

        <Text style={styles.footer}>
          This page intentionally shows only controls that are currently enforced by ChallengeSphere.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.iconWrap}><Ionicons name={icon} size={20} color="#5B3FE5" /></View>
      <View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowBody}>{body}</Text></View>
    </View>
  );
}

function ActionRow({ icon, title, onPress, danger = false }: { icon: keyof typeof Ionicons.glyphMap; title: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon} size={21} color={danger ? '#D92D45' : '#5B3FE5'} />
      <Text style={[styles.actionTitle, danger && styles.dangerText]}>{title}</Text>
      <Ionicons name="chevron-forward" size={17} color="#706A73" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E7E3EF' },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#18142F', fontSize: 17, fontWeight: '700' },
  content: { padding: 18, paddingBottom: 42 },
  sectionLabel: { color: '#8d8590', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginTop: 20, marginBottom: 9 },
  card: { borderRadius: 19, borderWidth: 1, borderColor: '#E7E3EF', backgroundColor: '#FFFFFF', overflow: 'hidden' },
  infoRow: { flexDirection: 'row', gap: 12, padding: 16 },
  iconWrap: { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0ECFF' },
  rowCopy: { flex: 1 },
  rowTitle: { color: '#18142F', fontSize: 14, fontWeight: '700' },
  rowBody: { color: '#655F70', fontSize: 12, lineHeight: 18, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#E7E3EF', marginLeft: 16 },
  centerRow: { minHeight: 80, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#8e8791', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  errorText: { color: '#ff8a8a', padding: 18, textAlign: 'center' },
  emptyState: { alignItems: 'center', padding: 20, gap: 6 },
  emptyTitle: { color: '#18142F', fontSize: 14, fontWeight: '700' },
  blockedRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 11 },
  blockedName: { flex: 1, color: '#18142F', fontSize: 14, fontWeight: '700' },
  unblockButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 13, borderWidth: 1, borderColor: '#7054b5' },
  unblockText: { color: '#5B3FE5', fontSize: 12, fontWeight: '700' },
  actionRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  actionTitle: { flex: 1, color: '#18142F', fontSize: 14, fontWeight: '600' },
  dangerText: { color: '#ff8989' },
  footer: { color: '#716b73', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 18, paddingHorizontal: 12 },
});
