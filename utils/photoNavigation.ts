import { Router } from 'expo-router';

export interface PhotoNavigationParams {
  id: string;
  photoUrl: string;
  mediaUrls?: string[];
  description?: string;
  challengeSummary?: string;
  userId?: number;
  userName: string;
  userPhoto: string;
  challengeId?: number;
  challengeTitle?: string;
  challengeName?: string;
  dayNumber?: number;
  participantCount?: number;
  genuineCount?: number;
  ingenuineCount?: number;
  commentCount?: number;
  submissionId?: number;
}

export const navigateToPhotoDetails = (
  router: Router,
  params: PhotoNavigationParams
) => {
  router.push({
    pathname: '/photo-details',
    params: {
      id: params.id,
      photoUrl: params.photoUrl,
      mediaUrls: JSON.stringify(params.mediaUrls || (params.photoUrl ? [params.photoUrl] : [])),
      description: params.description || params.challengeSummary || '',
      challengeSummary: params.challengeSummary || 'Challenge photo',
      userId: params.userId?.toString() || '',
      userName: params.userName,
      userPhoto: params.userPhoto,
      challengeId: params.challengeId?.toString() || '',
      challengeTitle: params.challengeTitle || params.challengeSummary || 'Challenge Photo',
      challengeName: params.challengeName || 'Challenge',
      dayNumber: params.dayNumber?.toString() || '',
      participantCount: params.participantCount?.toString() || '1',
      genuineCount: params.genuineCount?.toString() || '24',
      ingenuineCount: params.ingenuineCount?.toString() || '3',
      commentCount: params.commentCount?.toString() || '8',
      submissionId: params.submissionId?.toString() || params.id,
    }
  });
};

export const createPhotoNavigationParams = (
  photo: { id: string; photoUrl: string; challengeSummary?: string },
  user: { realName: string; profileImage: string },
  options?: Partial<PhotoNavigationParams>
): PhotoNavigationParams => ({
  id: photo.id,
  photoUrl: photo.photoUrl,
  challengeSummary: photo.challengeSummary,
  userName: user.realName,
  userPhoto: user.profileImage,
  ...options
});
