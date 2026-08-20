import { Ionicons } from '@expo/vector-icons';
import { AppPressable as Pressable } from '@/components/common/AppPressable';
import { Image as ExpoImage } from 'expo-image';
import type { ImagePickerAsset as ExpoImagePickerAsset } from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import {
  Platform,
  Pressable as NativePressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { ImagePickerAsset } from '../../hooks/useMedia';
import type { ChallengeProofMode } from '../../types/api';
import { useFullscreenMediaViewer } from '../../hooks/useFullscreenMediaViewer';
import MediaSourceChooser from './MediaSourceChooser';
import SubmissionMediaViewer from './SubmissionMediaViewer';

type SubmissionComposerProps = {
  challengeName: string;
  dayLabel: string;
  assets: ImagePickerAsset[];
  onAssetsChange: (assets: ImagePickerAsset[]) => void;
  caption: string;
  onCaptionChange: (caption: string) => void;
  onSubmit: () => void | Promise<void>;
  isSubmitting: boolean;
  uploadProgress?: number;
  confirmed?: boolean;
  onConfirmedChange?: (confirmed: boolean) => void;
  requireConfirmation?: boolean;
  proofMode?: ChallengeProofMode | string;
  errorMessage?: string | null;
  onErrorChange?: (message: string | null) => void;
};

const MAX_SUBMISSION_PHOTOS = 5;

const toUploadAssets = (assets: ExpoImagePickerAsset[]): ImagePickerAsset[] => {
  const pickedAt = Date.now();
  return assets.map((asset, index) => ({
    uri: asset.uri,
    fileName: asset.fileName || `submission_${pickedAt}_${index + 1}.jpg`,
    type: asset.mimeType || 'image/jpeg',
    mimeType: asset.mimeType || 'image/jpeg',
    fileSize: asset.fileSize,
    width: asset.width,
    height: asset.height,
  }));
};

export default function SubmissionComposer({
  challengeName,
  dayLabel,
  assets,
  onAssetsChange,
  caption,
  onCaptionChange,
  onSubmit,
  isSubmitting,
  uploadProgress = 0,
  confirmed = true,
  onConfirmedChange,
  requireConfirmation = false,
  errorMessage,
  onErrorChange,
}: SubmissionComposerProps) {
  const { height: viewportHeight } = useWindowDimensions();
  const [showChooser, setShowChooser] = useState(false);
  const [isPreparingSubmit, setIsPreparingSubmit] = useState(false);
  const {
    mediaUrls: viewerMediaUrls,
    initialIndex: viewerInitialIndex,
    visible: viewerVisible,
    openViewer,
    closeViewer,
  } = useFullscreenMediaViewer();
  const canChoosePhotos = assets.length < MAX_SUBMISSION_PHOTOS && !isSubmitting;
  const bottomScrollClearance = Math.min(900, Math.max(480, Math.round(viewportHeight * 0.75)));
  const clearError = useCallback(() => onErrorChange?.(null), [onErrorChange]);

  const openChooser = useCallback(() => {
    if (!canChoosePhotos) return;
    clearError();
    setShowChooser(true);
  }, [canChoosePhotos, clearError]);

  const handleSelected = useCallback((selected: ExpoImagePickerAsset[]) => {
    clearError();
    onAssetsChange([
      ...assets,
      ...toUploadAssets(selected),
    ].slice(0, MAX_SUBMISSION_PHOTOS));
  }, [assets, clearError, onAssetsChange]);

  const removeAsset = useCallback((index: number) => {
    clearError();
    onAssetsChange(assets.filter((_, assetIndex) => assetIndex !== index));
  }, [assets, clearError, onAssetsChange]);

  const canSubmit = assets.length > 0
    && caption.trim().length > 0
    && (!requireConfirmation || confirmed)
    && !isSubmitting
    && !isPreparingSubmit;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    clearError();
    setIsPreparingSubmit(true);
    try {
      await onSubmit();
    } finally {
      setIsPreparingSubmit(false);
    }
  }, [canSubmit, clearError, onSubmit]);

  const submitLabel = isSubmitting
    ? (uploadProgress > 0 ? `Posting ${uploadProgress}%` : 'Posting...')
    : isPreparingSubmit
      ? 'Preparing...'
    : requireConfirmation && !confirmed
      ? "Confirm today's progress"
      : 'Post update';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: bottomScrollClearance }]}
      scrollEnabled
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="none"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      showsVerticalScrollIndicator
      nestedScrollEnabled
    >
      <View style={styles.identity}>
        <View style={styles.identityIcon}>
          <Ionicons name="flag-outline" size={19} color="#4700EC" />
        </View>
        <View style={styles.identityCopy}>
          <Text style={styles.challengeName} numberOfLines={2} selectable>{challengeName}</Text>
          <View style={styles.dayRow}>
            <Ionicons name="calendar-clear-outline" size={13} color="#6F6879" />
            <Text style={styles.dayLabel}>{dayLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Submission photo</Text>
          <Text style={styles.sectionHint}>{assets.length}/5 selected · at least 1 required</Text>
        </View>
        {canChoosePhotos ? (
          <Pressable style={styles.chooseButton} onPress={openChooser}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.chooseText}>Add photos</Text>
          </Pressable>
        ) : null}
      </View>

      {assets.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
          {assets.map((asset, index) => (
            <View key={`${asset.uri}-${index}`} style={styles.previewWrap}>
              <NativePressable
                onPress={() => openViewer(assets.map((asset) => asset.uri), index)}
                accessibilityLabel={`Open photo ${index + 1} fullscreen`}
                accessibilityRole="button"
              >
                <ExpoImage source={{ uri: asset.uri }} style={styles.preview} contentFit="cover" />
              </NativePressable>
              <View style={styles.orderBadge}>
                <Text style={styles.orderText}>{index + 1}</Text>
              </View>
              <Pressable
                style={styles.removeButton}
                onPress={() => removeAsset(index)}
                disabled={isSubmitting}
                accessibilityLabel={`Remove photo ${index + 1}`}
              >
                <Ionicons name="close" size={15} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : canChoosePhotos ? (
        <Pressable style={styles.emptyMedia} onPress={openChooser} disabled={isSubmitting}>
          <Ionicons name="images-outline" size={28} color="#4700EC" />
          <Text style={styles.emptyTitle}>Add your submission</Text>
          <Text style={styles.emptyText}>Choose at least one photo from Gallery or Camera.</Text>
        </Pressable>
      ) : null}

      {requireConfirmation && onConfirmedChange ? (
        <Pressable
          style={[styles.confirmation, confirmed && styles.confirmationChecked]}
          onPress={() => {
            clearError();
            onConfirmedChange(!confirmed);
          }}
          disabled={isSubmitting}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmed }}
          accessibilityLabel="Confirm this is genuinely today's progress"
        >
          <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
            {confirmed ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
          </View>
          <View style={styles.confirmationCopy}>
            <Text style={styles.confirmationTitle}>Is this genuinely today&apos;s progress?</Text>
            <Text style={styles.confirmationText}>
              {assets.length > 0
                ? 'I confirm this update and its photos reflect my real effort for this challenge day.'
                : 'I confirm this update reflects my real effort for this challenge day.'}
            </Text>
          </View>
        </Pressable>
      ) : null}

      <Text style={styles.captionLabel}>Your check-in</Text>
      <View style={styles.captionBox}>
        <TextInput
          style={styles.captionInput}
          value={caption}
          onChangeText={(nextCaption) => {
            clearError();
            onCaptionChange(nextCaption);
          }}
          placeholder="What did you do, notice, or learn?"
          placeholderTextColor="#77717F"
          multiline
          numberOfLines={5}
          scrollEnabled
          maxLength={500}
          editable={!isSubmitting}
          textAlignVertical="top"
          selectionColor="#4700EC"
        />
        <Text style={styles.counter}>{caption.length}/500</Text>
      </View>

      {errorMessage ? (
        <View
          style={styles.errorBanner}
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <Ionicons name="alert-circle" size={20} color="#FF7B82" />
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <Pressable
            style={styles.errorDismiss}
            onPress={clearError}
            accessibilityRole="button"
            accessibilityLabel="Dismiss upload error"
          >
            <Ionicons name="close" size={17} color="#D6A9AC" />
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={[styles.submit, !canSubmit && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
        feedbackTiming="after-paint"
      >
        <Ionicons
          name={isSubmitting || isPreparingSubmit ? 'cloud-upload-outline' : 'arrow-up-circle-outline'}
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.submitText}>{submitLabel}</Text>
      </Pressable>

      <MediaSourceChooser
        visible={showChooser && canChoosePhotos}
        onClose={() => setShowChooser(false)}
        onSelected={handleSelected}
        allowsMultipleSelection
        selectionLimit={MAX_SUBMISSION_PHOTOS - assets.length}
        title="Submission photos"
        onError={(message) => {
          setShowChooser(false);
          onErrorChange?.(message);
        }}
      />
      <SubmissionMediaViewer
        visible={viewerVisible}
        mediaUrls={viewerMediaUrls}
        initialIndex={viewerInitialIndex}
        onClose={closeViewer}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F8F7FC' },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 96 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E7E3EF',
    padding: 13,
    marginBottom: 20,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  identityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
  },
  identityCopy: { flex: 1, marginLeft: 12 },
  challengeName: { color: '#000000', fontSize: 17, lineHeight: 22, fontWeight: '700' },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  dayLabel: { color: '#4F4858', fontSize: 12, fontWeight: '500' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { color: '#000000', fontSize: 15, fontWeight: '700' },
  sectionHint: { color: '#6F6879', fontSize: 12, marginTop: 3 },
  chooseButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#4700EC',
  },
  chooseText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  previewRow: { gap: 10, paddingBottom: 20 },
  previewWrap: { width: 128, height: 154 },
  preview: { width: 128, height: 154, borderRadius: 14, backgroundColor: '#EEEAF6' },
  orderBadge: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  orderText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  removeButton: {
    position: 'absolute',
    right: 7,
    top: 7,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  emptyMedia: {
    minHeight: 154,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CFC7DD',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: { color: '#000000', fontSize: 15, fontWeight: '700', marginTop: 10 },
  emptyText: { color: '#5F5868', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  captionLabel: { color: '#000000', fontSize: 15, fontWeight: '700', marginBottom: 9 },
  captionBox: {
    height: 150,
    borderWidth: 1,
    borderColor: '#DCD6E7',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  errorBanner: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginBottom: 14,
    paddingVertical: 11,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F7B8BD',
    backgroundColor: '#FFF2F3',
  },
  errorMessage: {
    flex: 1,
    color: '#7D1F28',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  errorDismiss: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionInput: {
    flex: 1,
    height: 108,
    maxHeight: 108,
    color: '#000000',
    fontSize: 14,
    lineHeight: 20,
    padding: 0,
  },
  counter: { color: '#6F6879', fontSize: 11, textAlign: 'right', marginTop: 5 },
  confirmation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DCD6E7',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 18,
  },
  confirmationChecked: {
    borderColor: '#22A85A',
    backgroundColor: '#F0FBF4',
  },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8B8493',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#22A85A', borderColor: '#22A85A' },
  confirmationCopy: {
    flex: 1,
    minWidth: 0,
  },
  confirmationTitle: {
    color: '#000000',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  confirmationText: {
    color: '#4F4858',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  submit: {
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22A85A',
    marginTop: 18,
  },
  submitDisabled: { opacity: 0.38 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
