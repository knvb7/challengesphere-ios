import { Ionicons } from '@expo/vector-icons';
import { AppPressable as Pressable } from '@/components/common/AppPressable';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback } from 'react';
import {
  Modal,
  Pressable as NativePressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  MAX_PHOTO_UPLOAD_BYTES,
  MAX_PHOTO_UPLOAD_MB,
  PHOTO_UPLOAD_LIMIT_MESSAGE,
} from '../../constants/mediaUpload';
import { AppAlert as Alert } from '../../utils/appAlert';

type MediaSourceChooserProps = {
  visible: boolean;
  onClose: () => void;
  onSelected: (assets: ImagePicker.ImagePickerAsset[]) => void;
  allowsMultipleSelection?: boolean;
  selectionLimit?: number;
  aspect?: [number, number];
  quality?: number;
  title?: string;
  onError?: (message: string) => void;
};

export default function MediaSourceChooser({
  visible,
  onClose,
  onSelected,
  allowsMultipleSelection = false,
  selectionLimit = 1,
  aspect,
  quality = 0.82,
  title = 'Add photo',
  onError,
}: MediaSourceChooserProps) {
  const reportError = useCallback((title: string, message: string) => {
    if (onError) {
      onError(message);
      return;
    }
    Alert.alert(title, message);
  }, [onError]);

  const finishSelection = useCallback((assets: ImagePicker.ImagePickerAsset[]) => {
    const oversizedAsset = assets.find(
      (asset) => typeof asset.fileSize === 'number' && asset.fileSize > MAX_PHOTO_UPLOAD_BYTES,
    );

    if (oversizedAsset) {
      reportError(
        'Photo too large',
        `${PHOTO_UPLOAD_LIMIT_MESSAGE} Choose a smaller photo or reduce its size.`,
      );
      return;
    }

    if (assets.length > 0) {
      onSelected(assets);
    }
    onClose();
  }, [onClose, onSelected, reportError]);

  const openGallery = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        reportError('Gallery permission needed', 'Allow photo access to choose an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection,
        selectionLimit: allowsMultipleSelection ? selectionLimit : 1,
        allowsEditing: !allowsMultipleSelection && Boolean(aspect),
        aspect,
        quality,
        exif: false,
      });

      if (!result.canceled) {
        finishSelection(result.assets);
      }
    } catch {
      reportError('Photo selection failed', 'Could not open your photo library. Please try again.');
    }
  }, [allowsMultipleSelection, aspect, finishSelection, quality, reportError, selectionLimit]);

  const openCamera = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        reportError('Camera permission needed', 'Allow camera access to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: Boolean(aspect),
        aspect,
        quality,
        exif: false,
      });

      if (!result.canceled) {
        finishSelection(result.assets);
      }
    } catch {
      reportError('Camera failed', 'Could not open the camera. Please try again.');
    }
  }, [aspect, finishSelection, quality, reportError]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <NativePressable style={styles.backdrop} onPress={onClose}>
        <SafeAreaView style={styles.safeArea}>
          <NativePressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.title}>{title}</Text>
            <View style={styles.options}>
              <Pressable style={styles.option} onPress={openGallery} feedbackTiming="after-paint">
                <View style={styles.iconBox}>
                  <Ionicons name="images-outline" size={24} color="#FFD447" />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>Gallery</Text>
                  <Text style={styles.optionSubtitle}>Choose photos up to {MAX_PHOTO_UPLOAD_MB} MB each</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#707070" />
              </Pressable>
              <Pressable style={[styles.option, styles.optionLast]} onPress={openCamera} feedbackTiming="after-paint">
                <View style={styles.iconBox}>
                  <Ionicons name="camera-outline" size={24} color="#62D9B3" />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>Camera</Text>
                  <Text style={styles.optionSubtitle}>Take a photo up to {MAX_PHOTO_UPLOAD_MB} MB</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#707070" />
              </Pressable>
            </View>
            <Pressable style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </NativePressable>
        </SafeAreaView>
      </NativePressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  safeArea: {
    width: '100%',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginBottom: 18,
  },
  title: {
    color: '#18142F',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 14,
  },
  options: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E7E3EF',
    overflow: 'hidden',
  },
  option: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E7E3EF',
  },
  optionLast: {
    borderBottomWidth: 0,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  optionCopy: {
    flex: 1,
    paddingHorizontal: 13,
  },
  optionTitle: {
    color: '#18142F',
    fontSize: 15,
    fontWeight: '600',
  },
  optionSubtitle: {
    color: '#929292',
    fontSize: 13,
    marginTop: 3,
  },
  cancel: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelText: {
    color: '#5F5968',
    fontSize: 15,
    fontWeight: '500',
  },
});
