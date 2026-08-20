import { Ionicons } from '@expo/vector-icons';
import { AppPressable as Pressable } from '@/components/common/AppPressable';
import FloatingScreenControls from '@/components/common/FloatingScreenControls';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MediaSourceChooser from '../components/common/MediaSourceChooser';
import { useCreateSupportTicket } from '../hooks/useSupport';
import { useAuthContext } from '../providers/AuthProvider';
import { mediaService } from '../services/mediaService';
import { SupportIssueType } from '../types/api';
import { AppAlert as Alert } from '../utils/appAlert';
import { getApiErrorMessage } from '../utils/apiError';

type AppSupportProps = {
  onBack?: () => void;
};

type IssueOption = {
  label: string;
  value: SupportIssueType;
  icon: keyof typeof Ionicons.glyphMap;
};

const MAX_SCREENSHOTS = 3;
const SUBJECT_MIN_LENGTH = 3;
const SUBJECT_MAX_LENGTH = 120;
const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 4000;

const ISSUE_OPTIONS: IssueOption[] = [
  { label: 'Bug', value: SupportIssueType.BUG, icon: 'bug-outline' },
  { label: 'Question', value: SupportIssueType.QUESTION, icon: 'help-circle-outline' },
  { label: 'Account', value: SupportIssueType.ACCOUNT, icon: 'person-circle-outline' },
  { label: 'Challenge', value: SupportIssueType.CHALLENGE, icon: 'trophy-outline' },
  { label: 'Media upload', value: SupportIssueType.MEDIA_UPLOAD, icon: 'images-outline' },
  { label: 'Other', value: SupportIssueType.OTHER, icon: 'ellipsis-horizontal-circle-outline' },
];

const getDeviceInfo = () => {
  const constantsWithDevice = Constants as typeof Constants & { deviceName?: string };
  const parts = [
    constantsWithDevice.deviceName,
    `${Platform.OS} ${String(Platform.Version)}`,
  ].filter(Boolean);
  return parts.join(' · ');
};

export default function AppSupport({ onBack }: AppSupportProps) {
  const router = useRouter();
  const { top: topInset } = useSafeAreaInsets();
  const { currentUserId, user } = useAuthContext();
  const createTicketMutation = useCreateSupportTicket();

  const [issueType, setIssueType] = useState<SupportIssueType>(SupportIssueType.BUG);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [screenshots, setScreenshots] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [chooserVisible, setChooserVisible] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const submissionInProgress = useRef(false);

  const isSubmitting = createTicketMutation.isPending || uploadProgress.some((progress) => progress > 0 && progress < 100);
  const canAddScreenshots = screenshots.length < MAX_SCREENSHOTS;
  const selectedIssue = useMemo(
    () => ISSUE_OPTIONS.find((option) => option.value === issueType) || ISSUE_OPTIONS[0],
    [issueType]
  );

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  };

  const handleSelectedScreenshots = (assets: ImagePicker.ImagePickerAsset[]) => {
    const remainingSlots = MAX_SCREENSHOTS - screenshots.length;
    if (remainingSlots <= 0) {
      Alert.alert('Screenshot limit reached', `You can attach up to ${MAX_SCREENSHOTS} screenshots.`);
      return;
    }

    const nextAssets = assets.slice(0, remainingSlots);
    setScreenshots((current) => [...current, ...nextAssets]);

    if (assets.length > remainingSlots) {
      Alert.alert('Only 3 screenshots', `Added ${remainingSlots} screenshot${remainingSlots === 1 ? '' : 's'}.`);
    }
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const validate = () => {
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (!currentUserId) {
      Alert.alert('Sign in required', 'Please sign in before contacting support.');
      return null;
    }

    if (cleanSubject.length < SUBJECT_MIN_LENGTH || cleanSubject.length > SUBJECT_MAX_LENGTH) {
      Alert.alert('Subject required', 'Use a subject between 3 and 120 characters.');
      return null;
    }

    if (cleanMessage.length < MESSAGE_MIN_LENGTH || cleanMessage.length > MESSAGE_MAX_LENGTH) {
      Alert.alert('Message required', 'Describe the issue in 10 to 4000 characters.');
      return null;
    }

    return { cleanSubject, cleanMessage };
  };

  const submit = async () => {
    if (submissionInProgress.current || isSubmitting) {
      return;
    }

    const valid = validate();
    if (!valid) {
      return;
    }

    submissionInProgress.current = true;
    setSubmitted(false);
    setUploadProgress(screenshots.map(() => 1));

    try {
      const screenshotKeys = screenshots.length
        ? await mediaService.uploadSupportScreenshots(
          currentUserId,
          screenshots.map((asset) => ({
            uri: asset.uri,
            fileName: asset.fileName || undefined,
            type: asset.type || undefined,
            mimeType: asset.mimeType || undefined,
            fileSize: asset.fileSize,
            width: asset.width,
            height: asset.height,
          })),
          (fileIndex, progress) => {
            setUploadProgress((current) => {
              const next = [...current];
              next[fileIndex] = progress;
              return next;
            });
          }
        )
        : [];

      await createTicketMutation.mutateAsync({
        issueType,
        subject: valid.cleanSubject,
        message: valid.cleanMessage,
        appVersion: Constants.expoConfig?.version || '1.0.0',
        platform: Platform.OS,
        deviceInfo: getDeviceInfo(),
        screenshotKeys,
      });

      setSubject('');
      setMessage('');
      setScreenshots([]);
      setUploadProgress([]);
      setSubmitted(true);
      Alert.alert('Support request sent', 'Thanks. We sent your request to ironside-dev@challengesphere.com.');
    } catch (error) {
      setUploadProgress([]);
      Alert.alert(
        'Support request failed',
        getApiErrorMessage(error, 'Could not send your support request. Please try again.'),
      );
    } finally {
      submissionInProgress.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FloatingScreenControls onBackPress={handleBack} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingTop: topInset + 8 }]}
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color="#ffffff" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle} accessibilityRole="header">Tell us what happened</Text>
              <Text style={styles.heroSubtitle}>
                We will include your account context and send screenshots as private support links.
              </Text>
            </View>
          </View>

          {submitted && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={20} color="#62D9B3" />
              <Text style={styles.successText}>
                Your request was sent to ironside-dev@challengesphere.com.
              </Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>Issue type</Text>
          <View style={styles.issueGrid}>
            {ISSUE_OPTIONS.map((option) => {
              const active = option.value === issueType;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  onPress={() => setIssueType(option.value)}
                  style={[styles.issueChip, active && styles.issueChipActive]}
                >
                  <Ionicons
                    name={option.icon}
                    size={17}
                    color={active ? '#5B3FE5' : '#655F70'}
                  />
                  <Text style={[styles.issueChipText, active && styles.issueChipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.field}>
            <Text style={styles.sectionLabel}>Subject</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Short summary"
              placeholderTextColor="#686868"
              maxLength={SUBJECT_MAX_LENGTH}
              style={styles.input}
            />
            <Text style={styles.counter}>{subject.trim().length}/{SUBJECT_MAX_LENGTH}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.sectionLabel}>Message</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={`Describe the ${selectedIssue.label.toLowerCase()} clearly`}
              placeholderTextColor="#686868"
              maxLength={MESSAGE_MAX_LENGTH}
              multiline
              textAlignVertical="top"
              style={styles.messageInput}
            />
            <Text style={styles.counter}>{message.trim().length}/{MESSAGE_MAX_LENGTH}</Text>
          </View>

          <View style={styles.screenshotHeader}>
            <Text style={styles.sectionLabel}>Screenshots</Text>
            <Text style={styles.counter}>{screenshots.length}/{MAX_SCREENSHOTS}</Text>
          </View>

          <View style={styles.screenshotGrid}>
            {screenshots.map((asset, index) => (
              <View key={`${asset.uri}-${index}`} style={styles.screenshotTile}>
                <Image source={{ uri: asset.uri }} style={styles.screenshotImage} />
                <Pressable
                  accessibilityLabel="Remove screenshot"
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => removeScreenshot(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={14} color="#ffffff" />
                </Pressable>
                {!!uploadProgress[index] && uploadProgress[index] < 100 && (
                  <View style={styles.progressOverlay}>
                    <Text style={styles.progressText}>{uploadProgress[index]}%</Text>
                  </View>
                )}
              </View>
            ))}

            {canAddScreenshots && !isSubmitting && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setChooserVisible(true)}
                style={styles.addScreenshotTile}
              >
                <Ionicons name="add" size={24} color="#FFD447" />
                <Text style={styles.addScreenshotText}>Add</Text>
              </Pressable>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            feedbackTiming="after-paint"
            onPress={submit}
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          >
            {isSubmitting ? (
              <View style={styles.submitContent}>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.submitText}>Sending request</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>Submit request</Text>
            )}
          </Pressable>

          <Text style={styles.footerText}>
            Replies go to the email on your ChallengeSphere account{user?.emailId ? ` (${user.emailId})` : ''}.
          </Text>
        </ScrollView>

        <MediaSourceChooser
          visible={chooserVisible && !isSubmitting}
          onClose={() => setChooserVisible(false)}
          onSelected={handleSelectedScreenshots}
          allowsMultipleSelection
          selectionLimit={MAX_SCREENSHOTS - screenshots.length}
          quality={0.82}
          title="Add screenshot"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 34,
  },
  hero: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    paddingVertical: 16,
    paddingRight: 16,
    paddingLeft: 64,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
    marginBottom: 18,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4700ec',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    color: '#18142F',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    marginBottom: 5,
  },
  heroSubtitle: {
    color: '#655F70',
    fontSize: 13,
    lineHeight: 18,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(98, 217, 179, 0.35)',
    backgroundColor: 'rgba(98, 217, 179, 0.1)',
    marginBottom: 18,
  },
  successText: {
    flex: 1,
    minWidth: 0,
    color: '#187A3D',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionLabel: {
    color: '#18142F',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  issueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  issueChip: {
    minHeight: 40,
    minWidth: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
  },
  issueChipActive: {
    borderColor: '#7454ff',
    backgroundColor: '#F0ECFF',
  },
  issueChipText: {
    color: '#655F70',
    fontSize: 13,
    fontWeight: '700',
  },
  issueChipTextActive: {
    color: '#5B3FE5',
  },
  field: {
    marginBottom: 16,
  },
  input: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
    color: '#18142F',
    paddingHorizontal: 13,
    fontSize: 14,
  },
  messageInput: {
    minHeight: 142,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
    color: '#18142F',
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  counter: {
    color: '#777777',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
  },
  screenshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  screenshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 20,
  },
  screenshotTile: {
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#F8F7FC',
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  progressText: {
    color: '#18142F',
    fontSize: 13,
    fontWeight: '700',
  },
  addScreenshotTile: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E7E3EF',
    backgroundColor: '#F8F7FC',
  },
  addScreenshotText: {
    color: '#a8a8a8',
    fontSize: 12,
    fontWeight: '700',
  },
  submitButton: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4700ec',
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  footerText: {
    color: '#777777',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 14,
  },
});
