import { Ionicons } from '@expo/vector-icons';
import { AppAlert as Alert } from '@/utils/appAlert';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../providers/AuthProvider';
import { useSubscription } from '../providers/SubscriptionContext';
import { userService } from '../services/userService';
import { getApiErrorMessage } from '../utils/apiError';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { logout } = useAuthContext();
  const { status: subscriptionStatus, isPurchasePending, manageSubscription } = useSubscription();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const canDelete = confirmation.trim().toUpperCase() === 'DELETE' && !deleting;

  const deleteAccount = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      const response = await userService.deleteOwnAccount('DELETE');
      Alert.alert('Account deleted', response.message, [{
        text: 'Continue',
        onPress: () => {
          void logout().finally(() => router.replace('/login'));
        },
      }]);
    } catch (error) {
      Alert.alert('Deletion Failed', getApiErrorMessage(error, 'Could not delete your account. Please try again.'));
      setDeleting(false);
    }
  };

  const confirmAccountDeletion = () => {
    if (!canDelete) return;
    Keyboard.dismiss();
    Alert.alert(
      'Final warning (3 of 3): delete your account?',
      subscriptionStatus?.premium
        ? 'Deleting your account does not cancel App Store billing. Manage your subscription first if you want to stop renewal. Your ChallengeSphere data cannot be restored after deletion.'
        : 'Your account, submissions, interactions, and owned challenges cannot be restored after this. Are you absolutely sure?',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: () => void deleteAccount(),
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} disabled={deleting}>
          <Ionicons name="arrow-back" size={24} color="#18142F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={styles.headerButton} />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.warningIcon}><Ionicons name="warning-outline" size={34} color="#FF7C7C" /></View>
          <Text style={styles.title}>This cannot be undone.</Text>
          <Text style={styles.description}>
            Your account will be disabled immediately. Personal profile data is anonymized,
            sessions and connected services are removed, your submissions and interactions are
            deleted, and private challenges you created are taken offline. Public challenges you
            created and their cover media may remain available under an anonymized deleted account
            so existing participants can continue. Keyed, non-readable fingerprints of your email
            and username are retained for up to 90 days for deletion auditing and abuse prevention;
            the original values and your display name are not retained in that record.
          </Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Stored photos</Text>
            <Text style={styles.infoText}>
              ChallengeSphere does not delete storage objects during a live app request. Profile,
              submission, and private-challenge media are placed in a controlled cleanup queue for
              administrative removal. Preserved public challenge covers remain available.
            </Text>
          </View>

          {subscriptionStatus?.premium ? (
            <View style={styles.subscriptionCard}>
              <View style={styles.subscriptionHeading}>
                <Ionicons name="card-outline" size={20} color="#5B25D6" />
                <Text style={styles.subscriptionTitle}>App Store subscription</Text>
              </View>
              <Text style={styles.subscriptionText}>
                Deleting your ChallengeSphere account does not cancel Premium billing. Manage your
                subscription in the App Store before deletion if you do not want it to renew.
              </Text>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={manageSubscription}
                disabled={deleting || isPurchasePending}
              >
                {isPurchasePending ? (
                  <ActivityIndicator color="#5B25D6" />
                ) : (
                  <Text style={styles.manageButtonText}>Manage subscription</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={styles.stepLabel}>Confirmation 2 of 3</Text>
          <Text style={styles.label}>TYPE DELETE TO CONFIRM</Text>
          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!deleting}
            placeholder="DELETE"
            placeholderTextColor="#655F68"
            style={styles.input}
            accessibilityLabel="Type DELETE to confirm"
          />

          <TouchableOpacity
            style={[styles.deleteButton, !canDelete && styles.deleteButtonDisabled]}
            disabled={!canDelete}
            onPress={confirmAccountDeletion}
            accessibilityRole="button"
          >
            {deleting ? <ActivityIndicator color="#fff" /> : <Ionicons name="trash-outline" size={19} color="#fff" />}
            <Text style={styles.deleteButtonText}>{deleting ? 'Deleting…' : 'Permanently delete account'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} disabled={deleting} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Keep my account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E7E3EF' },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#18142F', fontSize: 17, fontWeight: '700' },
  content: { padding: 22, paddingBottom: 44, alignItems: 'center' },
  warningIcon: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#68303a', marginTop: 12 },
  title: { color: '#18142F', fontSize: 24, fontWeight: '700', marginTop: 18 },
  description: { color: '#bdb7c0', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  infoCard: { width: '100%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E3EF', borderRadius: 18, padding: 16, marginTop: 24 },
  infoTitle: { color: '#18142F', fontSize: 14, fontWeight: '700' },
  infoText: { color: '#969099', fontSize: 12, lineHeight: 18, marginTop: 6 },
  subscriptionCard: { width: '100%', backgroundColor: '#F7F3FF', borderWidth: 1, borderColor: '#D9CCFA', borderRadius: 18, padding: 16, marginTop: 14 },
  subscriptionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subscriptionTitle: { color: '#18142F', fontSize: 14, fontWeight: '700' },
  subscriptionText: { color: '#5E5868', fontSize: 12, lineHeight: 18, marginTop: 8 },
  manageButton: { minHeight: 44, marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: '#B9A4F1', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  manageButtonText: { color: '#5B25D6', fontSize: 14, fontWeight: '700' },
  stepLabel: { alignSelf: 'flex-start', color: '#8e8791', fontSize: 12, fontWeight: '600', marginTop: 26, marginBottom: 6 },
  label: { alignSelf: 'flex-start', color: '#b9b1bc', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  input: { width: '100%', height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#E7E3EF', backgroundColor: '#FFFFFF', color: '#18142F', textAlign: 'center', fontSize: 18, fontWeight: '700', letterSpacing: 2 },
  deleteButton: { width: '100%', minHeight: 52, borderRadius: 16, marginTop: 18, backgroundColor: '#c93645', flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  deleteButtonDisabled: { opacity: 0.35 },
  deleteButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelButton: { padding: 16, marginTop: 4 },
  cancelText: { color: '#b9b1bc', fontSize: 14, fontWeight: '700' },
});
