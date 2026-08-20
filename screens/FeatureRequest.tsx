import { Ionicons } from '@expo/vector-icons';
import { AppPressable as Pressable } from '@/components/common/AppPressable';
import FloatingScreenControls from '@/components/common/FloatingScreenControls';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateFeatureRequest } from '../hooks/useSupport';
import { FeatureRequestCategory, FeatureRequestResponse } from '../types/api';
import { getApiErrorMessage } from '../utils/apiError';
import hapticFeedback from '../utils/haptics';

type FeatureRequestProps = {
  onBack?: () => void;
};

type CategoryOption = {
  value: FeatureRequestCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const MESSAGE_MIN_LENGTH = 10;
export const MESSAGE_MAX_LENGTH = 300;

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: FeatureRequestCategory.CHALLENGES, label: 'Challenges', icon: 'trophy-outline' },
  { value: FeatureRequestCategory.COMMUNITY, label: 'Community', icon: 'people-outline' },
  { value: FeatureRequestCategory.PROGRESS_AND_STATS, label: 'Progress & Stats', icon: 'stats-chart-outline' },
  { value: FeatureRequestCategory.APP_EXPERIENCE, label: 'App Experience', icon: 'phone-portrait-outline' },
  { value: FeatureRequestCategory.OTHER, label: 'Other', icon: 'sparkles-outline' },
];

const getDeviceInfo = () => {
  const constantsWithDevice = Constants as typeof Constants & { deviceName?: string };
  return [constantsWithDevice.deviceName, `${Platform.OS} ${String(Platform.Version)}`]
    .filter(Boolean)
    .join(' · ');
};

export default function FeatureRequest({ onBack }: FeatureRequestProps) {
  const router = useRouter();
  const { top: topInset } = useSafeAreaInsets();
  const mutation = useCreateFeatureRequest();
  const [category, setCategory] = useState(FeatureRequestCategory.CHALLENGES);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedRequest, setSubmittedRequest] = useState<FeatureRequestResponse | null>(null);
  const submissionInProgress = useRef(false);

  const trimmedLength = useMemo(() => message.trim().length, [message]);
  const isValid = trimmedLength >= MESSAGE_MIN_LENGTH && trimmedLength <= MESSAGE_MAX_LENGTH;

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  };

  const submit = async () => {
    if (submissionInProgress.current || mutation.isPending || !isValid) {
      return;
    }

    submissionInProgress.current = true;
    setErrorMessage('');
    try {
      const response = await mutation.mutateAsync({
        category,
        message: message.trim(),
        appVersion: Constants.expoConfig?.version || '1.0.0',
        platform: Platform.OS,
        deviceInfo: getDeviceInfo(),
      });
      hapticFeedback.success();
      setMessage('');
      setSubmittedRequest(response);
    } catch (error) {
      hapticFeedback.error();
      setErrorMessage(getApiErrorMessage(error, 'Could not send your idea. Please try again.'));
    } finally {
      submissionInProgress.current = false;
    }
  };

  const startAnother = () => {
    setSubmittedRequest(null);
    setErrorMessage('');
    setCategory(FeatureRequestCategory.CHALLENGES);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FloatingScreenControls onBackPress={handleBack} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: topInset + 8 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="bulb-outline" size={29} color="#ffffff" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle} accessibilityRole="header">Help shape ChallengeSphere</Text>
              <Text style={styles.heroSubtitle}>
                Share one focused idea. We review every request while planning future releases.
              </Text>
            </View>
          </View>

          {submittedRequest ? (
            <View style={styles.successCard} accessibilityLiveRegion="polite">
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={26} color="#09271D" />
              </View>
              <Text style={styles.successTitle}>Idea received</Text>
              <Text style={styles.successMessage}>
                Thanks for helping improve ChallengeSphere. Your request number is #{submittedRequest.id}.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={handleBack}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Back to Settings</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={startAnother}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Request another</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>What area does this improve?</Text>
              <View style={styles.categoryGrid} accessibilityRole="radiogroup">
                {CATEGORY_OPTIONS.map((option) => {
                  const active = option.value === category;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityLabel={option.label}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => {
                        hapticFeedback.selection();
                        setCategory(option.value);
                      }}
                      style={[styles.categoryChip, active && styles.categoryChipActive]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={17}
                        color={active ? '#5B3FE5' : '#655F70'}
                      />
                      <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.field}>
                <Text style={styles.sectionLabel}>What should we add, and how would it help?</Text>
                <TextInput
                  accessibilityLabel="Feature request"
                  maxLength={MESSAGE_MAX_LENGTH}
                  multiline
                  onChangeText={(value) => {
                    setMessage(value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Example: Let challenge creators schedule weekly rest days so longer challenges feel more achievable."
                  placeholderTextColor="#68656F"
                  style={styles.messageInput}
                  textAlignVertical="top"
                  value={message}
                />
                <View style={styles.fieldMeta}>
                  <Text style={[styles.helperText, trimmedLength > 0 && !isValid && styles.helperTextWarning]}>
                    {trimmedLength === 0
                      ? `At least ${MESSAGE_MIN_LENGTH} characters`
                      : trimmedLength < MESSAGE_MIN_LENGTH
                        ? `${MESSAGE_MIN_LENGTH - trimmedLength} more to go`
                        : 'Clear, focused ideas are easiest to review'}
                  </Text>
                  <Text style={styles.counter}>{trimmedLength}/{MESSAGE_MAX_LENGTH}</Text>
                </View>
              </View>

              {errorMessage ? (
                <View style={styles.errorCard} accessibilityLiveRegion="assertive">
                  <Ionicons name="alert-circle-outline" size={19} color="#FF8A8F" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !isValid || mutation.isPending, busy: mutation.isPending }}
                disabled={!isValid || mutation.isPending}
                feedbackTiming="after-paint"
                onPress={submit}
                style={[styles.primaryButton, (!isValid || mutation.isPending) && styles.primaryButtonDisabled]}
              >
                {mutation.isPending ? (
                  <View style={styles.submitContent}>
                    <ActivityIndicator color="#ffffff" />
                    <Text style={styles.primaryButtonText}>Sending idea</Text>
                  </View>
                ) : (
                  <View style={styles.submitContent}>
                    <Text style={styles.primaryButtonText}>Send feature request</Text>
                    <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                  </View>
                )}
              </Pressable>

              <Text style={styles.privacyText}>
                Your account and app details are included automatically so we can understand the request.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardView: { flex: 1 },
  content: { padding: 18, paddingBottom: 34 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingRight: 16,
    paddingLeft: 64,
    marginBottom: 22,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#F0ECFF',
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4700ec',
  },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTitle: { color: '#18142F', fontSize: 19, lineHeight: 24, fontWeight: '700', marginBottom: 5 },
  heroSubtitle: { color: '#655F70', fontSize: 13, lineHeight: 18 },
  sectionLabel: { color: '#18142F', fontSize: 13, lineHeight: 18, fontWeight: '700', marginBottom: 9 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  categoryChip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
  },
  categoryChipActive: { borderColor: '#805aff', backgroundColor: '#F0ECFF' },
  categoryText: { color: '#5F5968', fontSize: 13, fontWeight: '700' },
  categoryTextActive: { color: '#4700EC' },
  field: { marginBottom: 18 },
  messageInput: {
    minHeight: 164,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
    color: '#18142F',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    lineHeight: 22,
  },
  fieldMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 7 },
  helperText: { flex: 1, color: '#77727e', fontSize: 11, lineHeight: 15 },
  helperTextWarning: { color: '#e5b85d' },
  counter: { color: '#85808b', fontSize: 11, fontWeight: '600' },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 112, 0.35)',
    backgroundColor: 'rgba(255, 107, 112, 0.1)',
  },
  errorText: { flex: 1, color: '#B4233C', fontSize: 12, lineHeight: 17 },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#4700ec',
  },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  submitContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  privacyText: { color: '#77727e', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 12 },
  successCard: {
    alignItems: 'center',
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(98, 217, 179, 0.36)',
    backgroundColor: 'rgba(98, 217, 179, 0.08)',
  },
  successIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    backgroundColor: '#62d9b3',
    marginBottom: 15,
  },
  successTitle: { color: '#187A3D', fontSize: 22, fontWeight: '700' },
  successMessage: { color: '#557060', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8, marginBottom: 22 },
  secondaryButton: {
    minHeight: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#ECFDF3',
  },
  secondaryButtonText: { color: '#187A3D', fontSize: 14, fontWeight: '700' },
});
