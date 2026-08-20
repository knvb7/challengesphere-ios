import { Ionicons } from '@expo/vector-icons';
import { AppAlert as Alert } from '@/utils/appAlert';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import DurationPickerModal from '../components/common/DurationPickerModal';
import MediaSourceChooser from '../components/common/MediaSourceChooser';
import OptionSelector from '../components/common/OptionSelector';
import SubmissionMediaViewer from '../components/common/SubmissionMediaViewer';
import { useUpdateChallenge } from '../hooks/useChallenges';
import { useFullscreenMediaViewer } from '../hooks/useFullscreenMediaViewer';
import { useUploadChallengeCoverPhotos } from '../hooks/useMedia';
import { useAuthContext } from '../providers/AuthProvider';
import type { ChallengeProofMode, ChallengeUpdateRequest } from '../types/api';
import { buildChallengeDescription, parseChallengeDescription } from '../utils/challengeDescription';
import { getDurationLabel, parseDurationToDays } from '../utils/challengeDuration';
import { parseCoverPhotoUrls } from '../utils/challengePhotos';
import { getApiErrorMessage } from '../utils/apiError';

interface MediaItem {
  id: string;
  uri: string;
  type: 'image';
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  isExisting?: boolean;
  storageKey?: string;
}

interface EditChallengeForm {
  title: string;
  description: string;
  categories: string[];
  duration: string;
  rules: string;
  rewards: string;
  proofMode: ChallengeProofMode;
  photos: MediaItem[];
}

type EditChallengeErrors = Partial<Record<keyof EditChallengeForm, string>>;

const categories = [
  'Fun', 'Fitness', 'Health', 'Coding', 'Learning', 'Creativity', 'Productivity', 'Social', 'Other'
];

const durations = ['1 Day', '3 Days', '1 Week', '2 Weeks', '3 Weeks', '1 Month'];

function parseCategoryList(value?: string | string[]) {
  const raw = Array.isArray(value) ? value.join(',') : value || '';
  return raw
    .split(',')
    .map((category) => category.trim())
    .filter(Boolean);
}

function challengeCoverStorageKey(value: string): string | undefined {
  const direct = value.replace(/^\/+/, '');
  const keyPattern = /^challenges\/user_\d+\/covers\/\d{13}_[0-9a-f-]+\.(?:jpg|png|gif)$/i;
  if (keyPattern.test(direct)) return direct;

  try {
    const path = decodeURIComponent(new URL(value).pathname).replace(/^\/+/, '');
    if (keyPattern.test(path)) return path;

    const withoutBucket = path.split('/').slice(1).join('/');
    return keyPattern.test(withoutBucket) ? withoutBucket : undefined;
  } catch (_error) {
    return undefined;
  }
}

export default function EditChallengeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUserId } = useAuthContext();
  const updateChallengeMutation = useUpdateChallenge();
  const uploadChallengeCoverPhotosMutation = useUploadChallengeCoverPhotos();
  const parsedDescription = parseChallengeDescription(params.description as string, params.benefits as string | undefined);
  const initialCategories = parseCategoryList(params.categories as string | string[] | undefined);
  if (initialCategories.length === 0 && params.category) {
    initialCategories.push(...parseCategoryList(params.category as string | string[]));
  }
  const initialChallengeMode = ((params.challengeMode as string) || '').toUpperCase();
  const initialNumberOfDays = Number(params.numberOfDays) || parseDurationToDays(params.duration as string) || 0;
  const initialDuration = initialChallengeMode === 'ONE_OFF'
    ? 'One-off'
    : getDurationLabel(initialNumberOfDays) || (params.duration as string) || '';
  const isOneOffChallenge = initialChallengeMode === 'ONE_OFF' || initialDuration === 'One-off';
  const initialCoverPhotoUrls = (() => {
    const parsed = parseCoverPhotoUrls(params.coverPhotoUrls as string | string[] | undefined);
    if (parsed.length > 0) return parsed;
    const image = (params.image as string | undefined)?.trim();
    return image ? [image] : [];
  })();

  const [form, setForm] = useState<EditChallengeForm>({
    title: (params.title as string) || '',
    description: parsedDescription.mainDescription,
    categories: initialCategories,
    duration: initialDuration,
    rules: parsedDescription.rules || 'Complete the daily task and share your progress',
    rewards: parsedDescription.benefits || 'Personal satisfaction and community recognition',
    proofMode: 'PHOTO_REQUIRED',
    photos: initialCoverPhotoUrls.map((url, index) => ({
      id: `existing-${index}-${url}`,
      uri: url,
      type: 'image' as const,
      isExisting: true,
      storageKey: challengeCoverStorageKey(url),
    })),
  });

  const [errors, setErrors] = useState<EditChallengeErrors>({});
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showOtherModal, setShowOtherModal] = useState(false);
  const [otherCategoryDraft, setOtherCategoryDraft] = useState('');
  const [showMediaSourceChooser, setShowMediaSourceChooser] = useState(false);
  const {
    mediaUrls: viewerMediaUrls,
    initialIndex: viewerInitialIndex,
    visible: viewerVisible,
    openViewer,
    closeViewer,
  } = useFullscreenMediaViewer();
  const isSaving = updateChallengeMutation.isPending || uploadChallengeCoverPhotosMutation.isPending;
  const allCategories = [...categories, ...form.categories.filter((category) => !categories.includes(category))];

  const updateForm = (field: keyof EditChallengeForm, value: string | MediaItem[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const toggleCategory = (category: string) => {
    if (category === 'Other') {
      setOtherCategoryDraft('');
      setShowOtherModal(true);
      return;
    }

    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((item) => item !== category)
        : [...prev.categories, category],
    }));

    if (errors.categories) {
      setErrors((prev) => ({ ...prev, categories: undefined }));
    }
  };

  const confirmOtherCategory = () => {
    const category = otherCategoryDraft.trim();
    if (!category) {
      return;
    }

    setForm((prev) => {
      const alreadySelected = prev.categories.some(
        (selected) => selected.toLowerCase() === category.toLowerCase()
      );
      return alreadySelected
        ? prev
        : { ...prev, categories: [...prev.categories, category] };
    });
    setErrors((prev) => ({ ...prev, categories: undefined }));
    setShowOtherModal(false);
    setOtherCategoryDraft('');
  };

  // Media handling functions
  const addPhoto = () => {
    if (form.photos.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 5 photos.');
      return;
    }
    setShowMediaSourceChooser(true);
  };

  const handleMediaSelected = (assets: ImagePicker.ImagePickerAsset[]) => {
    const remaining = 5 - form.photos.length;
    const selected = assets.slice(0, remaining).map((asset, index): MediaItem => ({
        id: `${Date.now()}_${index}`,
        uri: asset.uri,
        type: 'image',
        fileName: asset.fileName ?? `challenge_photo_${Date.now()}.jpg`,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
    }));
    setForm(prev => ({ ...prev, photos: [...prev.photos, ...selected] }));
  };

  const removePhoto = (photoId: string) => {
    setForm(prev => ({
      ...prev,
      photos: prev.photos.filter(photo => photo.id !== photoId)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: EditChallengeErrors = {};

    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (form.categories.length === 0) newErrors.categories = 'At least one category is required';
    if (!form.duration) newErrors.duration = 'Duration is required';
    if (!form.rules.trim()) newErrors.rules = 'Rules are required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const challengeId = Number(params.id);
    if (!challengeId) {
      Alert.alert('Error', 'Challenge ID is missing.');
      return;
    }

    const existingCoverPhotoUrls = form.photos
      .filter(photo => photo.isExisting && photo.storageKey)
      .map(photo => photo.storageKey as string);
    const localPhotos = form.photos.filter(photo => !photo.isExisting && !/^https?:\/\//i.test(photo.uri));

    if (localPhotos.length > 0 && (!currentUserId || currentUserId <= 0)) {
      Alert.alert('Sign In Required', 'Please sign in before uploading challenge photos.');
      return;
    }

    try {
      const uploadedCoverPhotoUrls = localPhotos.length > 0
        ? await uploadChallengeCoverPhotosMutation.mutateAsync({
            userId: currentUserId,
            images: localPhotos.map(photo => ({
              uri: photo.uri,
              fileName: photo.fileName,
              mimeType: photo.mimeType,
              fileSize: photo.fileSize,
              type: photo.mimeType,
            })),
          })
        : [];

      const coverPhotoUrls = [...existingCoverPhotoUrls, ...uploadedCoverPhotoUrls];
      const selectedNumberOfDays = isOneOffChallenge ? 1 : parseDurationToDays(form.duration);
      const selectedCategories = form.categories.map((category) => category.trim()).filter(Boolean);
      const updateData: ChallengeUpdateRequest = {
        title: form.title.trim(),
        description: buildChallengeDescription(form.description, form.rules, form.rewards),
        categories: selectedCategories.join(','),
        hashtags: selectedCategories.map((category) => category.toLowerCase()).join(','),
        benefits: form.rewards.trim() || undefined,
        numberOfDays: selectedNumberOfDays,
        proofMode: form.proofMode,
      };

      if (initialCoverPhotoUrls.length > 0 || form.photos.length > 0) {
        updateData.coverPhotoUrls = coverPhotoUrls;
      }

      updateChallengeMutation.mutate(
        {
          challengeId,
          data: updateData,
        },
        {
          onSuccess: () => {
            Alert.alert('Challenge Updated', 'Your challenge has been successfully updated!', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          },
          onError: (err: any) => {
            const message = getApiErrorMessage(
              err,
              'Could not update the challenge. Please try again.',
            );
            Alert.alert('Update Failed', message);
          },
        }
      );
    } catch (err: any) {
      const message = getApiErrorMessage(
        err,
        'Failed to upload challenge photos. Please try again.',
      );
      Alert.alert('Upload Failed', message);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  const renderInput = (
    label: string,
    field: 'title' | 'description' | 'rules' | 'rewards',
    placeholder: string,
    multiline = false,
    numberOfLines = 1
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[
          styles.textInput,
          multiline && styles.multilineInput,
          errors[field] && styles.inputError,
        ]}
        value={form[field] as string}
        onChangeText={(value) => updateForm(field, value)}
        placeholder={placeholder}
        placeholderTextColor="#666666"
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={field === 'title' ? 255 : field === 'description' ? 1000 : field === 'rules' ? 2000 : 1000}
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field] as string}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Challenge</Text>
          <TouchableOpacity
            onPress={handleSave}
            feedbackTiming="after-paint"
            style={styles.saveButton}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#4700ecff" size="small" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              {renderInput(
                'Challenge Title',
                'title',
                'Enter a catchy title for your challenge'
              )}

              {renderInput(
                'Description',
                'description',
                'Describe what participants need to do and why it\'s beneficial',
                true,
                4
              )}

              <View style={styles.multiSelectContainer}>
                <Text style={styles.inputLabel}>Categories</Text>
                {errors.categories && <Text style={styles.errorText}>{errors.categories}</Text>}
                <View style={styles.categoriesGrid}>
                  {allCategories.map((category) => {
                    const selected = form.categories.includes(category);
                    return (
                      <TouchableOpacity
                        key={category}
                        style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                        onPress={() => toggleCategory(category)}
                      >
                        <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                          {category}
                        </Text>
                        {selected ? (
                          <Ionicons name="checkmark-circle" size={16} color="#4700ecff" style={styles.categoryCheckIcon} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Duration</Text>
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    isOneOffChallenge && styles.pickerButtonDisabled,
                    errors.duration && styles.inputError,
                  ]}
                  onPress={() => {
                    if (!isOneOffChallenge) setShowDurationPicker(true);
                  }}
                  disabled={isOneOffChallenge}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      !form.duration && styles.placeholderText,
                      isOneOffChallenge && styles.pickerTextDisabled,
                    ]}
                  >
                    {form.duration || 'Select duration'}
                  </Text>
                  <Ionicons
                    name={isOneOffChallenge ? 'lock-closed-outline' : 'time-outline'}
                    size={20}
                    color="#8A8A84"
                  />
                </TouchableOpacity>
                <Text style={styles.lockedFormatText}>
                  {isOneOffChallenge
                    ? 'One-off format cannot be changed after creation.'
                    : 'This challenge will remain a daily challenge.'}
                </Text>
                {errors.duration ? <Text style={styles.errorText}>{errors.duration}</Text> : null}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Challenge Details</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Check-in style</Text>
                <Text style={styles.sectionSubtitle}>
                  Every check-in needs at least one photo and a short caption.
                </Text>
              </View>
              
              {renderInput(
                'Rules & Requirements',
                'rules',
                'What are the specific rules and requirements for this challenge?',
                true,
                3
              )}

              {renderInput(
                'Rewards & Benefits',
                'rewards',
                'What will participants gain from completing this challenge?',
                true,
                3
              )}
            </View>

            {/* Media Upload Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Challenge Media</Text>
              <Text style={styles.sectionSubtitle}>
                Add photos to showcase your challenge (optional)
              </Text>

              {/* Photos Section */}
              <View style={styles.mediaTypeContainer}>
                <View style={styles.mediaTypeHeader}>
                  <Text style={styles.mediaTypeTitle}>Photos ({form.photos.length}/5)</Text>
                  <TouchableOpacity
                    style={[styles.addMediaButton, form.photos.length >= 5 && styles.addMediaButtonDisabled]}
                    onPress={addPhoto}
                    disabled={form.photos.length >= 5}
                  >
                    <Ionicons name="camera" size={20} color={form.photos.length >= 5 ? "#666666" : "#4700ecff"} />
                    <Text style={[styles.addMediaText, form.photos.length >= 5 && styles.addMediaTextDisabled]}>
                      Add Photo
                    </Text>
                  </TouchableOpacity>
                </View>

                {form.photos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScrollView}>
                    {form.photos.map((photo, index) => (
                      <View key={photo.id} style={styles.mediaItem}>
                        <TouchableOpacity
                          onPress={() => openViewer(form.photos.map((photo) => photo.uri), index)}
                          activeOpacity={0.88}
                          accessibilityLabel={`Open photo ${index + 1} fullscreen`}
                          accessibilityRole="button"
                        >
                          <Image source={{ uri: photo.uri }} style={styles.mediaPreview} resizeMode="contain" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeMediaButton}
                          onPress={() => removePhoto(photo.id)}
                        >
                          <Ionicons name="close-circle" size={24} color="#FF5252" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>

            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={20} color="#FF9800" />
              <Text style={styles.warningText}>
                Note: Editing a challenge that&apos;s already active may affect current participants. 
                Consider the impact before making significant changes.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.cancelBottomButton} onPress={handleCancel}>
            <Ionicons name="close-outline" size={20} color="#FF5252" />
            <Text style={styles.cancelBottomText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveBottomButton, isSaving && { opacity: 0.6 }]}
            onPress={handleSave}
            feedbackTiming="after-paint"
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Ionicons name="checkmark-outline" size={20} color="#ffffff" />
            )}
            <Text style={styles.saveBottomText}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showOtherModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOtherModal(false)}
      >
        <View style={styles.otherModalBackdrop}>
          <View style={styles.otherModalCard}>
            <Text style={styles.otherModalTitle}>Add a custom category</Text>
            <Text style={styles.otherModalSubtitle}>
              Choose a short category that clearly describes this challenge.
            </Text>
            <TextInput
              style={styles.otherModalInput}
              placeholder="e.g. Meditation, Cooking..."
              placeholderTextColor="#666666"
              value={otherCategoryDraft}
              onChangeText={setOtherCategoryDraft}
              onSubmitEditing={confirmOtherCategory}
              autoFocus
              returnKeyType="done"
              maxLength={30}
            />
            <View style={styles.otherModalActions}>
              <TouchableOpacity
                style={[styles.otherModalButton, styles.otherModalCancel]}
                onPress={() => setShowOtherModal(false)}
              >
                <Text style={styles.otherModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.otherModalButton, styles.otherModalConfirm]}
                onPress={confirmOtherCategory}
                disabled={!otherCategoryDraft.trim()}
              >
                <Text style={styles.otherModalConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <MediaSourceChooser
        visible={showMediaSourceChooser}
        onClose={() => setShowMediaSourceChooser(false)}
        onSelected={handleMediaSelected}
        allowsMultipleSelection
        selectionLimit={5 - form.photos.length}
        aspect={[16, 9]}
        title="Challenge photos"
      />
      <DurationPickerModal
        visible={showDurationPicker}
        value={form.duration}
        options={durations}
        onSelect={(duration) => updateForm('duration', duration)}
        onClose={() => setShowDurationPicker(false)}
      />
      <SubmissionMediaViewer
        visible={viewerVisible}
        mediaUrls={viewerMediaUrls}
        initialIndex={viewerInitialIndex}
        onClose={closeViewer}
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
    borderBottomColor: '#E7E3EF',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 15,
    color: '#ff5252',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#18142F',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  saveText: {
    fontSize: 15,
    color: '#4700ecff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#18142F',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18142F',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    color: '#18142F',
    minHeight: 56,
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ff5252',
  },
  errorText: {
    fontSize: 13,
    color: '#ff5252',
    marginTop: 4,
  },
  pickerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
  },
  pickerText: {
    fontSize: 15,
    color: '#18142F',
  },
  pickerButtonDisabled: {
    backgroundColor: '#F1EFF5',
  },
  pickerTextDisabled: {
    color: '#777389',
  },
  lockedFormatText: {
    color: '#777389',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
  },
  placeholderText: {
    color: '#777389',
  },
  pickerOptions: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    borderRadius: 16,
    marginTop: 8,
    maxHeight: 200,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  selectedOption: {
    backgroundColor: '#4700ecff20',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#18142F',
  },
  selectedOptionText: {
    color: '#4700ecff',
    fontWeight: '600',
  },
  multiSelectContainer: {
    marginBottom: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  categoryChipSelected: {
    borderColor: '#4700ecff',
    backgroundColor: '#4700ec20',
  },
  categoryChipText: {
    color: '#18142F',
    fontSize: 13,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#4700ecff',
    fontWeight: '600',
  },
  categoryCheckIcon: {
    marginLeft: 2,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ff980020',
    borderWidth: 1,
    borderColor: '#ff9800',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    gap: 12,
  },
  warningText: {
    fontSize: 13,
    color: '#ff9800',
    lineHeight: 19,
    flex: 1,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E7E3EF',
  },
  cancelBottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ff5252',
    gap: 8,
  },
  cancelBottomText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ff5252',
  },
  saveBottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4700ecff',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  saveBottomText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#777389',
    marginBottom: 16,
    lineHeight: 19,
  },
  mediaTypeContainer: {
    marginBottom: 20,
  },
  mediaTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mediaTypeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18142F',
  },
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#4700ecff20',
    borderRadius: 12,
    gap: 6,
  },
  addMediaButtonDisabled: {
    backgroundColor: '#66666620',
  },
  addMediaText: {
    fontSize: 13,
    color: '#4700ecff',
    fontWeight: '500',
  },
  addMediaTextDisabled: {
    color: '#777389',
  },
  mediaScrollView: {
    marginTop: 8,
  },
  mediaItem: {
    position: 'relative',
    marginRight: 12,
  },
  mediaPreview: {
    width: 120,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    resizeMode: 'contain',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#18142F',
  },
  otherModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  otherModalCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    padding: 20,
  },
  otherModalTitle: {
    color: '#18142F',
    fontSize: 18,
    fontWeight: '700',
  },
  otherModalSubtitle: {
    color: '#777389',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 16,
  },
  otherModalInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
    color: '#18142F',
    paddingHorizontal: 13,
    fontSize: 14,
  },
  otherModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  otherModalButton: {
    minWidth: 78,
    minHeight: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  otherModalCancel: {
    backgroundColor: '#FFFFFF',
  },
  otherModalConfirm: {
    backgroundColor: '#4700ec',
  },
  otherModalCancelText: {
    color: '#5F5968',
    fontSize: 13,
    fontWeight: '600',
  },
  otherModalConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
