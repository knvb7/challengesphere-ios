import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { AppAlert as Alert } from '@/utils/appAlert';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { ImagePickerAsset, useSubmissionMediaUpload } from '../../hooks/useMedia';
import { useFullscreenMediaViewer } from '../../hooks/useFullscreenMediaViewer';
import SubmissionMediaViewer from './SubmissionMediaViewer';

interface ImageUploaderProps {
  userId: number;
  maxImages?: number;
  onUploadComplete?: (urls: string[]) => void;
  onUploadError?: (error: Error) => void;
  showPreview?: boolean;
  buttonText?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  userId,
  maxImages = 5,
  onUploadComplete,
  onUploadError,
  showPreview = true,
  buttonText = 'Add Photos',
}) => {
  const [selectedImages, setSelectedImages] = useState<ImagePickerAsset[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const {
    mediaUrls: viewerMediaUrls,
    initialIndex: viewerInitialIndex,
    visible: viewerVisible,
    openViewer,
    closeViewer,
  } = useFullscreenMediaViewer();
  const { uploadSubmissionMedia, isUploading, uploadError, reset } = useSubmissionMediaUpload();

  const pickImages = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload images.');
        return;
      }

      // Pick images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: maxImages - selectedImages.length,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets) {
        const newImages: ImagePickerAsset[] = result.assets.map((asset) => ({
          uri: asset.uri,
          fileName: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.mimeType,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height,
        }));

        setSelectedImages((prev) => [...prev, ...newImages].slice(0, maxImages));
      }
    } catch {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newImage: ImagePickerAsset = {
          uri: asset.uri,
          fileName: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.mimeType,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height,
        };

        if (selectedImages.length < maxImages) {
          setSelectedImages((prev) => [...prev, newImage]);
        } else {
          Alert.alert('Limit Reached', `Maximum ${maxImages} images allowed`);
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('No Images', 'Please select at least one image to upload');
      return;
    }

    try {
      setUploadProgress(0);
      const urls = await uploadSubmissionMedia(userId, selectedImages, (progress) => {
        setUploadProgress(progress);
      });

      onUploadComplete?.(urls);
      setSelectedImages([]);
      setUploadProgress(0);
      reset();
    } catch (error) {
      onUploadError?.(error as Error);
      Alert.alert('Upload Failed', 'Failed to upload images. Please try again.');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Add Image',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImages },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      {/* Image Previews */}
      {showPreview && selectedImages.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewContainer}>
          {selectedImages.map((image, index) => (
            <View key={index} style={styles.imageWrapper}>
              <TouchableOpacity
                onPress={() => openViewer(selectedImages.map((image) => image.uri), index)}
                activeOpacity={0.88}
                accessibilityLabel={`Open photo ${index + 1} fullscreen`}
                accessibilityRole="button"
              >
                <Image source={{ uri: image.uri }} style={styles.previewImage} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(index)}
                disabled={isUploading}
              >
                <Ionicons name="close-circle" size={24} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Image Button */}
      {selectedImages.length < maxImages && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={showImageOptions}
          disabled={isUploading}
        >
          <Ionicons name="camera-outline" size={24} color="#FFD700" />
          <Text style={styles.addButtonText}>{buttonText}</Text>
          <Text style={styles.countText}>
            ({selectedImages.length}/{maxImages})
          </Text>
        </TouchableOpacity>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="small" color="#FFD700" />
          <Text style={styles.progressText}>Uploading... {uploadProgress}%</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
          </View>
        </View>
      )}

      {/* Upload Button */}
      {selectedImages.length > 0 && !isUploading && (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={uploadImages}
          feedbackTiming="after-paint"
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#000" />
          <Text style={styles.uploadButtonText}>Upload {selectedImages.length} Image(s)</Text>
        </TouchableOpacity>
      )}

      {/* Error Message */}
      {uploadError && (
        <Text style={styles.errorText}>Upload failed. Please try again.</Text>
      )}
      <SubmissionMediaViewer
        visible={viewerVisible}
        mediaUrls={viewerMediaUrls}
        initialIndex={viewerInitialIndex}
        onClose={closeViewer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  previewContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  imageWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#0a0a0a',
  },
  addButtonText: {
    color: '#ffd700',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  countText: {
    color: '#777389',
    fontSize: 13,
    marginLeft: 8,
  },
  progressContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  progressText: {
    color: '#ffd700',
    marginTop: 8,
    fontSize: 13,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffd700',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffd700',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  uploadButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorText: {
    color: '#ff4444',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ImageUploader;
