import { useMutation } from '@tanstack/react-query';
import { mediaService } from '../services/mediaService';
import {
    ContentType,
    GeneratePresignedUrlsRequest,
    MediaType
} from '../types/api';

// ===================
// Media Mutations
// ===================

// Generate presigned URLs
export const useGeneratePresignedUrls = () => {
  return useMutation({
    mutationFn: (request: GeneratePresignedUrlsRequest) => mediaService.generatePresignedUrls(request),
    onError: (error) => {
      
    },
  });
};

// Upload multiple files
export const useUploadMultipleFiles = () => {
  return useMutation({
    mutationFn: ({
      userId,
      files,
      onProgress,
    }: {
      userId: number;
      files: { file: Blob | File; fileName: string; mediaType: MediaType; contentType: ContentType }[];
      onProgress?: (fileIndex: number, progress: number) => void;
    }) => mediaService.uploadMultipleFiles(userId, files, onProgress),
    onError: (error) => {
      
    },
  });
};

// Upload single image
export const useUploadImage = () => {
  return useMutation({
    mutationFn: ({
      userId,
      file,
      fileName,
      onProgress,
    }: {
      userId: number;
      file: Blob | File;
      fileName: string;
      onProgress?: (progress: number) => void;
    }) => mediaService.uploadImage(userId, file, fileName, onProgress),
    onError: (error) => {
      
    },
  });
};

// Upload single video
export const useUploadVideo = () => {
  return useMutation({
    mutationFn: ({
      userId,
      file,
      fileName,
      onProgress,
    }: {
      userId: number;
      file: Blob | File;
      fileName: string;
      onProgress?: (progress: number) => void;
    }) => mediaService.uploadVideo(userId, file, fileName, onProgress),
    onError: (error) => {
      
    },
  });
};

// Helper hook to upload submission media
export const useUploadSubmissionMedia = () => {
  const uploadMultiple = useUploadMultipleFiles();

  const uploadMedia = async (
    userId: number,
    files: File[],
    onProgress?: (totalProgress: number) => void
  ): Promise<string[]> => {
    const fileData = files.map(file => ({
      file,
      fileName: file.name,
      mediaType: mediaService.getMediaTypeFromFile(file.name),
      contentType: getContentTypeFromMimeType(file.type),
    }));

    let completedFiles = 0;
    const fileProgresses: number[] = new Array(files.length).fill(0);

    const result = await uploadMultiple.mutateAsync({
      userId,
      files: fileData,
      onProgress: (fileIndex, progress) => {
        fileProgresses[fileIndex] = progress;
        if (progress === 100) completedFiles++;
        
        const totalProgress = fileProgresses.reduce((a, b) => a + b, 0) / files.length;
        onProgress?.(Math.round(totalProgress));
      },
    });

    return result;
  };

  return {
    uploadMedia,
    isLoading: uploadMultiple.isPending,
    error: uploadMultiple.error,
  };
};

// Helper function to convert MIME type to ContentType enum
function getContentTypeFromMimeType(mimeType: string): ContentType {
  switch (mimeType) {
    case 'image/jpeg':
      return ContentType.IMAGE_JPEG;
    case 'image/png':
      return ContentType.IMAGE_PNG;
    case 'image/gif':
      return ContentType.IMAGE_GIF;
    case 'video/mp4':
      return ContentType.VIDEO_MP4;
    default:
      return ContentType.IMAGE_JPEG;
  }
}

// ===================
// React Native Image Picker Hooks
// ===================

// Image picker result type
export interface ImagePickerAsset {
  uri: string;
  fileName?: string;
  type?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
}

// Upload from image picker
export const useUploadFromImagePicker = () => {
  return useMutation({
    mutationFn: ({
      userId,
      image,
      onProgress,
    }: {
      userId: number;
      image: ImagePickerAsset;
      onProgress?: (progress: number) => void;
    }) => mediaService.uploadFromImagePicker(userId, image, onProgress),
    onError: (error) => {
      
    },
  });
};

// Upload multiple from image picker
export const useUploadMultipleFromImagePicker = () => {
  return useMutation({
    mutationFn: ({
      userId,
      images,
      onProgress,
    }: {
      userId: number;
      images: ImagePickerAsset[];
      onProgress?: (fileIndex: number, progress: number) => void;
    }) => mediaService.uploadMultipleFromImagePicker(userId, images, onProgress),
    onError: (error) => {
      
    },
  });
};

export const useUploadChallengeCoverPhotos = () => {
  return useMutation({
    mutationFn: ({
      userId,
      images,
      onProgress,
    }: {
      userId: number;
      images: ImagePickerAsset[];
      onProgress?: (fileIndex: number, progress: number) => void;
    }) => mediaService.uploadChallengeCoverPhotos(userId, images, onProgress),
    onError: (error) => {
      
    },
  });
};

// ===================
// Combined Upload Hook for Submissions
// ===================

export const useSubmissionMediaUpload = () => {
  const uploadMutation = useUploadMultipleFromImagePicker();

  const uploadSubmissionMedia = async (
    userId: number,
    images: ImagePickerAsset[],
    onOverallProgress?: (progress: number) => void
  ): Promise<string[]> => {
    const fileProgresses: number[] = new Array(images.length).fill(0);

    const result = await uploadMutation.mutateAsync({
      userId,
      images,
      onProgress: (fileIndex, progress) => {
        fileProgresses[fileIndex] = progress;
        const totalProgress = fileProgresses.reduce((a, b) => a + b, 0) / images.length;
        onOverallProgress?.(Math.round(totalProgress));
      },
    });

    return result;
  };

  return {
    uploadSubmissionMedia,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,
    reset: uploadMutation.reset,
  };
};
