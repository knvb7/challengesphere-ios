import {
    ContentType,
    GeneratePresignedUrlsRequest,
    MediaFileInfo,
    MediaType,
    PresignedUrlInfo,
    PresignedUrlsResponse
} from '../types/api';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { apiClient } from './apiClient';
import { shouldRetryDirectUploadError, shouldUseFetchFallbackForUploadError } from './mediaUploadErrors';
import { userService } from './userService';
import { getSafeErrorMessage } from '../utils/apiError';
import {
  MAX_PHOTO_UPLOAD_BYTES,
  PHOTO_UPLOAD_LIMIT_MESSAGE,
} from '../constants/mediaUpload';

const DIRECT_UPLOAD_MAX_ATTEMPTS = 2;
const DIRECT_UPLOAD_RETRY_BASE_DELAY_MS = 800;
const MAX_SUBMISSION_PHOTO_LONG_EDGE = 1600;
const SUBMISSION_PHOTO_JPEG_COMPRESSION = 0.72;

type ImagePickerUploadAsset = {
  uri: string;
  fileName?: string;
  type?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
};

type DirectUploadTarget = Pick<PresignedUrlInfo, 'presignedUrl' | 'fileKey' | 'contentType'>;

type DirectUploadResult = {
  publicUrl: string;
  fileKey: string;
  presignedUrl: string;
  attempts: number;
};

// Map a real MIME type (e.g. "image/jpeg") to the backend ContentType enum.
function mimeToContentTypeEnum(mime?: string): ContentType {
  switch ((mime || '').toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return ContentType.IMAGE_JPEG;
    case 'image/png':
      return ContentType.IMAGE_PNG;
    case 'image/gif':
      return ContentType.IMAGE_GIF;
    case 'video/mp4':
    case 'video/quicktime':
      return ContentType.VIDEO_MP4;
    default:
      return ContentType.IMAGE_JPEG;
  }
}

// Map the backend ContentType enum back to a real MIME type for the PUT header.
function contentTypeEnumToMime(ct: ContentType | string): string {
  switch (ct) {
    case ContentType.IMAGE_JPEG: return 'image/jpeg';
    case ContentType.IMAGE_PNG:  return 'image/png';
    case ContentType.IMAGE_GIF:  return 'image/gif';
    case ContentType.VIDEO_MP4:  return 'video/mp4';
    default:
      // If backend already returned a MIME (e.g. "image/jpeg"), pass it through.
      if (typeof ct === 'string' && ct.includes('/')) return ct;
      return 'image/jpeg';
  }
}

function getPublicUrlFromUpload(fileKey: string | undefined, presignedUrl: string): string {
  const unsignedObjectUrl = presignedUrl.split('?')[0];

  return fileKey || unsignedObjectUrl;
}

function toJpegFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  const baseName = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  return `${baseName}.jpg`;
}

function getFirstPresignedUrlInfo(response: PresignedUrlsResponse, fallbackMessage: string): PresignedUrlInfo {
  if (!response.success || !response.presignedUrls || response.presignedUrls.length === 0) {
    throw new Error(getSafeErrorMessage(response.message, fallbackMessage));
  }

  return response.presignedUrls[0];
}

function getRetryDelayMs(failedAttempt: number): number {
  return DIRECT_UPLOAD_RETRY_BASE_DELAY_MS * (2 ** (failedAttempt - 1));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertUploadFileSize(fileSizeBytes: number): number {
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    throw new Error('Picked file is empty or inaccessible.');
  }
  if (fileSizeBytes > MAX_PHOTO_UPLOAD_BYTES) {
    throw new Error(PHOTO_UPLOAD_LIMIT_MESSAGE);
  }
  return fileSizeBytes;
}

async function requireUploadFileSize(asset: ImagePickerUploadAsset): Promise<number> {
  if (asset.fileSize && asset.fileSize > 0) {
    return assertUploadFileSize(asset.fileSize);
  }

  const fileInfo = await FileSystem.getInfoAsync(asset.uri);
  if (!fileInfo.exists || fileInfo.isDirectory || !fileInfo.size) {
    throw new Error('Picked file is empty or inaccessible.');
  }
  return assertUploadFileSize(fileInfo.size);
}

function base64ToBlob(base64: string, mime: string): Blob {
  const decodeBase64 = (globalThis as typeof globalThis & { atob?: (input: string) => string }).atob;

  if (!decodeBase64) {
    throw new Error('Base64 decoder is not available in this runtime.');
  }

  const binary = decodeBase64(base64);
  const parts: BlobPart[] = [];
  const chunkSize = 8192;

  for (let offset = 0; offset < binary.length; offset += chunkSize) {
    const slice = binary.slice(offset, offset + chunkSize);
    const bytes = new Uint8Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      bytes[i] = slice.charCodeAt(i);
    }
    parts.push(bytes);
  }

  return new Blob(parts, { type: mime });
}

async function readFileUriAsBlob(fileUri: string, mime: string, expectedSize?: number): Promise<Blob> {
  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();

    if (expectedSize && blob.size !== expectedSize) {
      throw new Error(`file URI blob size mismatch: expected ${expectedSize}, got ${blob.size}`);
    }

    return blob;
  } catch {}

  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToBlob(base64, mime);
}

class MediaService {
  private async prepareSubmissionPhotoForUpload(imageResult: ImagePickerUploadAsset): Promise<ImagePickerUploadAsset> {
    const fileName = imageResult.fileName || `image_${Date.now()}.jpg`;
    const originalMime = (imageResult.mimeType || imageResult.type || '').toLowerCase();

    if (this.getMediaTypeFromFile(fileName) !== MediaType.SUBMISSION_PHOTO || originalMime === 'image/gif') {
      return imageResult;
    }

    try {
      const context = ImageManipulator.ImageManipulator.manipulate(imageResult.uri);
      const width = imageResult.width || 0;
      const height = imageResult.height || 0;

      if (Math.max(width, height) > MAX_SUBMISSION_PHOTO_LONG_EDGE) {
        context.resize(width >= height
          ? { width: MAX_SUBMISSION_PHOTO_LONG_EDGE, height: null }
          : { width: null, height: MAX_SUBMISSION_PHOTO_LONG_EDGE });
      }

      const rendered = await context.renderAsync();
      const prepared = await rendered.saveAsync({
        compress: SUBMISSION_PHOTO_JPEG_COMPRESSION,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      const preparedInfo = await FileSystem.getInfoAsync(prepared.uri);

      if (!preparedInfo.exists || preparedInfo.isDirectory || !preparedInfo.size) {
        throw new Error('Prepared submission photo was empty.');
      }

      

      return {
        ...imageResult,
        uri: prepared.uri,
        fileName: toJpegFileName(fileName),
        type: 'image/jpeg',
        mimeType: 'image/jpeg',
        fileSize: preparedInfo.size,
        width: prepared.width,
        height: prepared.height,
      };
    } catch {
      return imageResult;
    }
  }

  // Generate presigned URLs for media upload (from backend)
  async generatePresignedUrls(request: GeneratePresignedUrlsRequest): Promise<PresignedUrlsResponse> {
    try {
      const response = await apiClient.post<PresignedUrlsResponse>('/submissions/presigned-urls', request);
      return response.data;
    } catch (error) {

      throw error;
    }
  }

  async generateChallengePresignedUrls(request: GeneratePresignedUrlsRequest): Promise<PresignedUrlsResponse> {
    try {
      const response = await apiClient.post<PresignedUrlsResponse>('/challenges/presigned-urls', request);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  }

  async generateSupportPresignedUrls(request: GeneratePresignedUrlsRequest): Promise<PresignedUrlsResponse> {
    try {
      const response = await apiClient.post<PresignedUrlsResponse>('/support/presigned-urls', request);
      return response.data;
    } catch (error) {

      throw error;
    }
  }

  // Generate presigned URL for a single file
  async generateSinglePresignedUrl(
    userId: number,
    fileName: string,
    mediaType: MediaType,
    contentType: ContentType,
    fileSizeBytes: number
  ): Promise<DirectUploadTarget> {
    assertUploadFileSize(fileSizeBytes);
    const response = await this.generatePresignedUrls({
      userId,
      mediaFiles: [{ fileName, mediaType, contentType, fileSizeBytes }],
    });

    const presignedInfo = getFirstPresignedUrlInfo(
      response,
      'Could not prepare this file for upload. Please try again.',
    );

    return {
      presignedUrl: presignedInfo.presignedUrl,
      fileKey: presignedInfo.fileKey,
      contentType: presignedInfo.contentType,
    };
  }

  private async uploadFileUriWithGeneratedPresignedUrl(
    getUploadTarget: () => Promise<DirectUploadTarget>,
    fileUri: string,
    fallbackContentType: ContentType | string,
    label: string,
    onProgress?: (progress: number) => void,
    maxAttempts = DIRECT_UPLOAD_MAX_ATTEMPTS
  ): Promise<DirectUploadResult> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const uploadTarget = await getUploadTarget();
      const contentType = uploadTarget.contentType || fallbackContentType;

      

      try {
        await this.uploadFileUriToPresignedUrl(
          uploadTarget.presignedUrl,
          fileUri,
          contentType,
          onProgress
        );

        return {
          publicUrl: getPublicUrlFromUpload(uploadTarget.fileKey, uploadTarget.presignedUrl),
          fileKey: uploadTarget.fileKey,
          presignedUrl: uploadTarget.presignedUrl,
          attempts: attempt,
        };
      } catch (error) {
        lastError = error;

        if (!shouldRetryDirectUploadError(error) || attempt === maxAttempts) {
          
          throw error;
        }

        const delayMs = getRetryDelayMs(attempt);
        
        await sleep(delayMs);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('S3 upload failed');
  }

  private async uploadFileUriViaBackend(
    fileUri: string,
    fileName: string,
    mediaType: MediaType,
    contentType: ContentType,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const mime = contentTypeEnumToMime(contentType);
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mime,
    } as any);
    formData.append('mediaType', mediaType);
    formData.append('contentType', contentType);

    const response = await apiClient.post<{ fileKey: string }>(
      '/submissions/upload-fallback',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            onProgress?.(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      }
    );

    return response.data.fileKey;
  }

  // Upload a Blob to S3 using a presigned URL.
  // Uses fetch(PUT) — XHR.send(blob) intermittently uploads 0 bytes on RN/iOS
  // for blobs derived from file:// URIs.
  async uploadToPresignedUrl(
    presignedUrl: string,
    file: Blob | File,
    contentType: string,
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    const mime = contentTypeEnumToMime(contentType as ContentType);
    onProgress?.(0);
    const res = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private, max-age=3600',
        'If-None-Match': '*',
      },
      body: file,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      
      throw new Error(`S3 upload failed (${res.status})${body ? `: ${body.slice(0, 200)}` : ''}`);
    }
    onProgress?.(100);
    return true;
  }

  async uploadFileUriToPresignedUrl(
    presignedUrl: string,
    fileUri: string,
    contentType: string,
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    const mime = contentTypeEnumToMime(contentType as ContentType);
    const fileInfo = await FileSystem.getInfoAsync(fileUri);

    if (!fileInfo.exists || fileInfo.isDirectory) {
      throw new Error(`Picked file is not accessible: ${fileUri}`);
    }

    onProgress?.(0);

    try {
      const uploadTask = FileSystem.createUploadTask(
        presignedUrl,
        fileUri,
        {
          headers: {
            'Content-Type': mime,
            'Cache-Control': 'private, max-age=3600',
            'If-None-Match': '*',
          },
          httpMethod: 'PUT',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          ...(Platform.OS === 'ios' ? { sessionType: FileSystem.FileSystemSessionType.FOREGROUND } : {}),
        },
        ({ totalBytesSent, totalBytesExpectedToSend }) => {
          if (totalBytesExpectedToSend > 0) {
            onProgress?.(Math.round((totalBytesSent / totalBytesExpectedToSend) * 100));
          }
        }
      );

      const result = await uploadTask.uploadAsync();

      if (!result) {
        throw new Error('S3 upload was cancelled before completion.');
      }

      if (result.status < 200 || result.status >= 300) {
        
        throw new Error(`S3 upload failed (${result.status})${result.body ? `: ${result.body.slice(0, 200)}` : ''}`);
      }
    } catch (error) {
      if (!shouldUseFetchFallbackForUploadError(error)) {
        throw error;
      }

      
      return this.uploadFileUriWithFetch(presignedUrl, fileUri, mime, fileInfo.size, onProgress);
    }

    onProgress?.(100);
    return true;
  }

  private async uploadFileUriWithFetch(
    presignedUrl: string,
    fileUri: string,
    mime: string,
    fileSize?: number,
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    onProgress?.(5);
    const blob = await readFileUriAsBlob(fileUri, mime, fileSize);
    onProgress?.(50);

    const result = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private, max-age=3600',
        'If-None-Match': '*',
      },
      body: blob,
    });

    if (!result.ok) {
      const body = await result.text().catch(() => '');
      
      throw new Error(`S3 upload failed (${result.status})${body ? `: ${body.slice(0, 200)}` : ''}`);
    }

    onProgress?.(100);
    return true;
  }

  // Upload multiple files
  async uploadMultipleFiles(
    userId: number,
    files: { file: Blob | File; fileName: string; mediaType: MediaType; contentType: ContentType }[],
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<string[]> {
    try {
      // Generate presigned URLs for all files
      const mediaFiles: MediaFileInfo[] = files.map(f => ({
        fileName: f.fileName,
        mediaType: f.mediaType,
        contentType: f.contentType,
        fileSizeBytes: assertUploadFileSize(f.file.size),
      }));

      const presignedResponse = await this.generatePresignedUrls({
        userId,
        mediaFiles,
      });

      if (!presignedResponse.success || !presignedResponse.presignedUrls) {
        throw new Error(
          getSafeErrorMessage(
            presignedResponse.message,
            'Could not prepare your files for upload. Please try again.',
          ),
        );
      }

      // Upload each file to its presigned URL
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const presignedInfo = presignedResponse.presignedUrls[i];

        await this.uploadToPresignedUrl(
          presignedInfo.presignedUrl,
          file.file,
          file.contentType,
          (progress) => onProgress?.(i, progress)
        );

        uploadedUrls.push(presignedInfo.fileKey);
      }

      return uploadedUrls;
    } catch (error) {
      
      throw error;
    }
  }

  // Upload a single image
  async uploadImage(
    userId: number,
    file: Blob | File,
    fileName: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const contentType = this.getContentTypeFromFile(fileName);
    
    const urls = await this.uploadMultipleFiles(
      userId,
      [{ file, fileName, mediaType: MediaType.SUBMISSION_PHOTO, contentType }],
      (_, progress) => onProgress?.(progress)
    );

    return urls[0];
  }

  // Upload a single video
  async uploadVideo(
    userId: number,
    file: Blob | File,
    fileName: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const urls = await this.uploadMultipleFiles(
      userId,
      [{ file, fileName, mediaType: MediaType.SUBMISSION_VIDEO, contentType: ContentType.VIDEO_MP4 }],
      (_, progress) => onProgress?.(progress)
    );

    return urls[0];
  }

  // Helper to determine content type from file extension
  private getContentTypeFromFile(fileName: string): ContentType {
    const extension = fileName.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return ContentType.IMAGE_JPEG;
      case 'png':
        return ContentType.IMAGE_PNG;
      case 'gif':
        return ContentType.IMAGE_GIF;
      case 'mp4':
        return ContentType.VIDEO_MP4;
      default:
        return ContentType.IMAGE_JPEG;
    }
  }

  // Helper to determine media type from file extension
  getMediaTypeFromFile(fileName: string): MediaType {
    const extension = fileName.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'mp4':
      case 'mov':
      case 'avi':
      case 'mkv':
        return MediaType.SUBMISSION_VIDEO;
      default:
        return MediaType.SUBMISSION_PHOTO;
    }
  }

  // Upload from React Native image picker result
  private async uploadPreparedSubmissionPhoto(
    userId: number,
    preparedImage: ImagePickerUploadAsset,
    initialPresignedInfo?: DirectUploadTarget,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const fileName = preparedImage.fileName || `image_${Date.now()}.jpg`;
    const imageMimeType = preparedImage.mimeType || preparedImage.type;
    const contentType = imageMimeType
      ? mimeToContentTypeEnum(imageMimeType)
      : this.getContentTypeFromFile(fileName);
    const mediaType = this.getMediaTypeFromFile(fileName);
    const mime = contentTypeEnumToMime(contentType);

    

    // 1. Validate the local file before asking the backend for signed URLs.
    const fileInfo = await FileSystem.getInfoAsync(preparedImage.uri);
    
    if (!fileInfo.exists || fileInfo.isDirectory || !fileInfo.size) {
      throw new Error('Picked file is empty or inaccessible. The local URI may no longer be valid.');
    }
    const fileSizeBytes = assertUploadFileSize(fileInfo.size);

    try {
      let shouldUseInitialPresignedInfo = Boolean(initialPresignedInfo);
      const uploadResult = await this.uploadFileUriWithGeneratedPresignedUrl(
        async () => {
          if (shouldUseInitialPresignedInfo && initialPresignedInfo) {
            shouldUseInitialPresignedInfo = false;
            return initialPresignedInfo;
          }
          return this.generateSinglePresignedUrl(
            userId,
            fileName,
            mediaType,
            contentType,
            fileSizeBytes
          );
        },
        preparedImage.uri,
        mime,
        'submission media',
        onProgress,
        1
      );

      
      return uploadResult.publicUrl;
    } catch (error) {
      if (!shouldRetryDirectUploadError(error)) {
        throw error;
      }

      
      const fileKey = await this.uploadFileUriViaBackend(
        preparedImage.uri,
        fileName,
        mediaType,
        contentType,
        onProgress
      );
      
      return fileKey;
    }
  }

  async uploadFromImagePicker(
    userId: number,
    imageResult: ImagePickerUploadAsset,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const preparedImage = await this.prepareSubmissionPhotoForUpload(imageResult);
    return this.uploadPreparedSubmissionPhoto(userId, preparedImage, undefined, onProgress);
  }

  async uploadProfilePhotoFromImagePicker(
    userId: number,
    image: ImagePickerUploadAsset,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const fileName = image.fileName || `profile_${Date.now()}.jpg`;
    const contentType = mimeToContentTypeEnum(image.mimeType || image.type);
    const fileSizeBytes = await requireUploadFileSize(image);
    const mediaFile: MediaFileInfo = {
      fileName,
      mediaType: MediaType.PROFILE_PHOTO,
      contentType,
      fileSizeBytes,
    };

    const uploadResult = await this.uploadFileUriWithGeneratedPresignedUrl(
      async () => getFirstPresignedUrlInfo(
        await userService.generateProfilePhotoPresignedUrl(userId, mediaFile),
        'Could not prepare your profile photo for upload. Please try again.'
      ),
      image.uri,
      contentTypeEnumToMime(contentType),
      'profile photo',
      onProgress
    );

    return uploadResult.fileKey;
  }

  // Upload multiple images from React Native image picker
  async uploadMultipleFromImagePicker(
    userId: number,
    images: ImagePickerUploadAsset[],
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<string[]> {
    if (images.length === 0) {
      return [];
    }

    const preparedImages = await Promise.all(
      images.map((image) => this.prepareSubmissionPhotoForUpload(image))
    );
    const fileSizes = await Promise.all(preparedImages.map(requireUploadFileSize));
    const mediaFiles: MediaFileInfo[] = preparedImages.map((image, index) => {
      const fileName = image.fileName || `submission_${Date.now()}_${index + 1}.jpg`;
      const contentType = image.mimeType || image.type
        ? mimeToContentTypeEnum(image.mimeType || image.type)
        : this.getContentTypeFromFile(fileName);
      return {
        fileName,
        mediaType: this.getMediaTypeFromFile(fileName),
        contentType,
        fileSizeBytes: fileSizes[index],
      };
    });
    const presignedResponse = await this.generatePresignedUrls({
      userId,
      mediaFiles,
    });
    const presignedUrls = presignedResponse.presignedUrls;

    if (!presignedResponse.success || !presignedUrls || presignedUrls.length !== preparedImages.length) {
      throw new Error(
        getSafeErrorMessage(
          presignedResponse.message,
          'Could not prepare your photos for upload. Please try again.',
        ),
      );
    }

    return Promise.all(
      preparedImages.map((image, index) =>
        this.uploadPreparedSubmissionPhoto(
          userId,
          image,
          presignedUrls[index],
          (progress) => onProgress?.(index, progress)
        )
      )
    );
  }

  async uploadChallengeCoverPhotos(
    userId: number,
    images: ImagePickerUploadAsset[],
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<string[]> {
    if (images.length === 0) {
      return [];
    }

    const preparedImages = await Promise.all(
      images.map((image) => this.prepareSubmissionPhotoForUpload(image))
    );
    const fileSizes = await Promise.all(preparedImages.map(requireUploadFileSize));
    const mediaFiles: MediaFileInfo[] = preparedImages.map((image, index) => {
      const fileName = image.fileName || `challenge_photo_${Date.now()}_${index}.jpg`;
      const contentType = image.mimeType
        ? mimeToContentTypeEnum(image.mimeType)
        : image.type
          ? mimeToContentTypeEnum(image.type)
          : this.getContentTypeFromFile(fileName);

      return {
        fileName,
        mediaType: MediaType.CHALLENGE_PHOTO,
        contentType,
        fileSizeBytes: fileSizes[index],
      };
    });

    const presignedResponse = await this.generateChallengePresignedUrls({
      userId,
      mediaFiles,
    });

    if (!presignedResponse.success || !presignedResponse.presignedUrls) {
      throw new Error(
        getSafeErrorMessage(
          presignedResponse.message,
          'Could not prepare the challenge photos for upload. Please try again.',
        ),
      );
    }

    const uploadedUrls: string[] = [];

    for (let i = 0; i < preparedImages.length; i++) {
      const image = preparedImages[i];
      const mediaFile = mediaFiles[i];
      const presignedInfo = presignedResponse.presignedUrls[i];

      if (!presignedInfo) {
        throw new Error(`Missing challenge upload URL for file ${i + 1}`);
      }

      const contentType = presignedInfo.contentType || mediaFile.contentType;
      let shouldUseInitialPresignedInfo = true;

      const uploadResult = await this.uploadFileUriWithGeneratedPresignedUrl(
        async () => {
          if (shouldUseInitialPresignedInfo) {
            shouldUseInitialPresignedInfo = false;
            return presignedInfo;
          }

          return getFirstPresignedUrlInfo(
            await this.generateChallengePresignedUrls({
              userId,
              mediaFiles: [mediaFile],
            }),
            'Could not prepare the challenge photo for upload. Please try again.'
          );
        },
        image.uri,
        contentType,
        'challenge cover photo',
        (progress) => onProgress?.(i, progress)
      );

      uploadedUrls.push(uploadResult.publicUrl);
    }

    return uploadedUrls;
  }

  async uploadSupportScreenshots(
    userId: number,
    images: ImagePickerUploadAsset[],
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<string[]> {
    if (images.length === 0) {
      return [];
    }

    const fileSizes = await Promise.all(images.map(requireUploadFileSize));
    const mediaFiles: MediaFileInfo[] = images.map((image, index) => {
      const fileName = image.fileName || `support_screenshot_${Date.now()}_${index + 1}.jpg`;
      const contentType = image.mimeType || image.type
        ? mimeToContentTypeEnum(image.mimeType || image.type)
        : this.getContentTypeFromFile(fileName);

      if (contentType === ContentType.VIDEO_MP4) {
        throw new Error('Support screenshots must be images.');
      }

      return {
        fileName,
        mediaType: MediaType.SUPPORT_SCREENSHOT,
        contentType,
        fileSizeBytes: fileSizes[index],
      };
    });

    const presignedResponse = await this.generateSupportPresignedUrls({
      userId,
      mediaFiles,
    });

    if (!presignedResponse.success || !presignedResponse.presignedUrls) {
      throw new Error(
        getSafeErrorMessage(
          presignedResponse.message,
          'Could not prepare the screenshots for upload. Please try again.',
        ),
      );
    }

    const uploadedKeys: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const mediaFile = mediaFiles[i];
      const presignedInfo = presignedResponse.presignedUrls[i];

      if (!presignedInfo) {
        throw new Error(`Missing support upload URL for screenshot ${i + 1}`);
      }

      const uploadResult = await this.uploadFileUriWithGeneratedPresignedUrl(
        async () => ({
          presignedUrl: presignedInfo.presignedUrl,
          fileKey: presignedInfo.fileKey,
          contentType: presignedInfo.contentType || mediaFile.contentType,
        }),
        image.uri,
        presignedInfo.contentType || mediaFile.contentType,
        'support screenshot',
        (progress) => onProgress?.(i, progress),
        1
      );

      uploadedKeys.push(uploadResult.fileKey);
    }

    return uploadedKeys;
  }

  // Keep newly uploaded media stored as an object key; the backend signs reads.
  getPublicUrl(fileKey: string): string {
    return fileKey;
  }
}

export const mediaService = new MediaService();
export default mediaService;
