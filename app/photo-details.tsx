import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image as NativeImage,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity as NativeTouchableOpacity,
  View,
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppAlert as Alert } from '@/utils/appAlert';
import ChallengeSummary from '../components/common/ChallengeSummary';
import AvatarImage from '../components/common/AvatarImage';
import CommentAndCount from '../components/common/CommentAndCount';
import GenuinityAndCount from '../components/common/GenuinityAndCount';
import PhotoDetailsHeader from '../components/common/PhotoDetailsHeader';
import SubmissionMediaCarousel from '../components/common/SubmissionMediaCarousel';
import { useChallenge, useDeleteSubmission, useSubmission } from '../hooks/useChallenges';
import { useGloryStatus, useOptimisticGloryToggle } from '../hooks/useFeed';
import { useUser } from '../hooks/useUsers';
import { useAuthContext } from '../providers/AuthProvider';
import {
  buildSubmissionDetailData,
  getRouteNumberParam,
  getRouteStringParam,
  type SubmissionDetailRouteParams,
} from '../utils/submissionDetail';
import { getApiErrorMessage } from '../utils/apiError';
import { showContentReportReasons } from '../utils/contentReporting';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_WIDTH = SCREEN_WIDTH - 20;
const MIN_LANDSCAPE_PHOTO_HEIGHT = Math.round(PHOTO_WIDTH * 0.56);

function formatSubmissionDate(value: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function PhotoDetailsScreen() {
  const params = useLocalSearchParams() as SubmissionDetailRouteParams;
  const router = useRouter();
  const { currentUserId } = useAuthContext();
  const openCommentsFromNotification = getRouteStringParam(params, 'openComments') === '1';
  const isReadOnly = getRouteStringParam(params, 'readOnly') === 'true';

  const routeSubmissionId = getRouteNumberParam(params, 'submissionId') || getRouteNumberParam(params, 'id');
  const { data: submissionData, isLoading: isSubmissionLoading } = useSubmission(routeSubmissionId);
  const routeOwnerUserId = getRouteNumberParam(params, 'userId');
  const ownerUserId = submissionData?.userId || routeOwnerUserId;
  const { data: ownerUser } = useUser(ownerUserId, currentUserId);
  const challengeId = submissionData?.challengeId || getRouteNumberParam(params, 'challengeId');
  const { data: challengeData } = useChallenge(challengeId, currentUserId);

  const photoData = buildSubmissionDetailData(params, {
    submission: submissionData,
    ownerUser,
    challengeTitle: challengeData?.title,
  });
  const mediaUrls = photoData.mediaUrls;
  const primaryMediaUrl = mediaUrls[0] || '';
  const submissionId = photoData.submissionId || 0;
  const submissionDate = formatSubmissionDate(photoData.submissionTime);
  const submissionUsername = photoData.userName.replace(/^@/, '') || 'user';
  const headerTitle = photoData.dayNumber > 0
    ? `Day ${photoData.dayNumber} submission by ${submissionUsername}`
    : `Submission by ${submissionUsername}`;
  const deleteSubmissionMutation = useDeleteSubmission();
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const [isMediaZoomed, setIsMediaZoomed] = useState(false);
  const [mediaHeight, setMediaHeight] = useState(PHOTO_WIDTH);
  const isMediaZoomedRef = useRef(false);
  const swipeDismissBlockedRef = useRef(false);
  const isOwnSubmission = ownerUserId > 0 && ownerUserId === currentUserId;

  useEffect(() => {
    if (!primaryMediaUrl) {
      setMediaHeight(PHOTO_WIDTH);
      return;
    }

    let isCurrent = true;
    NativeImage.getSize(
      primaryMediaUrl,
      (sourceWidth, sourceHeight) => {
        if (!isCurrent || sourceWidth <= 0 || sourceHeight <= 0) return;

        const nextHeight = sourceWidth > sourceHeight
          ? Math.max(
              MIN_LANDSCAPE_PHOTO_HEIGHT,
              Math.round(PHOTO_WIDTH * (sourceHeight / sourceWidth)),
            )
          : PHOTO_WIDTH;
        setMediaHeight(Math.min(PHOTO_WIDTH, nextHeight));
      },
      () => {
        if (isCurrent) setMediaHeight(PHOTO_WIDTH);
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [primaryMediaUrl]);

  const handleMediaZoomChange = useCallback((zoomed: boolean) => {
    isMediaZoomedRef.current = zoomed;
    setIsMediaZoomed(zoomed);
  }, []);

  const swipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (event) => {
        if (event.nativeEvent.touches.length > 1) {
          swipeDismissBlockedRef.current = true;
        } else {
          // A new one-finger sequence clears any block left by a prior pinch
          // that never granted the responder.
          swipeDismissBlockedRef.current = false;
        }
        return false;
      },
      onMoveShouldSetPanResponder: (_, { dx, dy, numberActiveTouches }) => {
        if (numberActiveTouches > 1) {
          swipeDismissBlockedRef.current = true;
          return false;
        }

        return !swipeDismissBlockedRef.current
          && !isMediaZoomedRef.current
          && numberActiveTouches === 1
          && dy > 28
          && Math.abs(dy) > Math.abs(dx) * 1.6;
      },
      onPanResponderGrant: (event) => {
        swipeDismissBlockedRef.current = swipeDismissBlockedRef.current
          || isMediaZoomedRef.current
          || event.nativeEvent.touches.length > 1;
      },
      onPanResponderStart: (event) => {
        if (event.nativeEvent.touches.length > 1) {
          swipeDismissBlockedRef.current = true;
        }
      },
      onPanResponderMove: (event) => {
        if (isMediaZoomedRef.current || event.nativeEvent.touches.length > 1) {
          swipeDismissBlockedRef.current = true;
        }
      },
      onPanResponderRelease: (_, { dx, dy, numberActiveTouches }) => {
        const dismissBlocked = swipeDismissBlockedRef.current
          || isMediaZoomedRef.current
          || numberActiveTouches > 1;
        swipeDismissBlockedRef.current = false;
        if (dismissBlocked) return;

        const isDown = dy > 120 && Math.abs(dy) > Math.abs(dx) * 1.6;
        if (isDown) {
          router.back();
        }
      },
      onPanResponderTerminate: () => {
        swipeDismissBlockedRef.current = false;
      },
      onPanResponderTerminationRequest: () => true,
      onShouldBlockNativeResponder: () => false,
    })
  ).current;

  const { data: gloryStatus } = useGloryStatus(submissionId, currentUserId);
  const {
    count,
    isGloried,
    isUngloried,
    handleGloryPress,
    handleUngloryPress,
  } = useOptimisticGloryToggle({
    submissionId,
    userId: currentUserId,
    submissionOwnerUserId: ownerUserId,
    initialCount: photoData.genuineCount || 0,
    initialIsGloried: gloryStatus?.hasGivenGlory ?? false,
    initialIsUngloried: gloryStatus?.hasUngloried ?? false,
  });

  const handleUserPress = () => {
    if (!ownerUserId) {
      return;
    }

    if (ownerUserId === currentUserId) {
      // Return to the existing tab navigator instead of stacking another one
      // above this post detail screen.
      router.navigate('/(tabs)/profile');
      return;
    }

    router.push({
      pathname: '/user-profile',
      params: {
        id: ownerUserId.toString(),
        username: photoData.userName.replace(/^@/, ''),
        profileImage: photoData.userPhoto,
      },
    });
  };

  const handleChallengePress = () => {
    if (photoData.challengeId <= 0) {
      return;
    }

    router.push({
      pathname: '/challenge-details',
      params: {
        id: photoData.challengeId.toString(),
        title: photoData.challengeTitle,
      },
    });
  };

  const handleDeleteOptionPress = () => {
    if (isReadOnly) return;
    setOptionsVisible(false);
    setDeleteConfirmationVisible(true);
  };

  const handleReportOptionPress = () => {
    setOptionsVisible(false);
    showContentReportReasons({
      targetType: 'SUBMISSION',
      targetId: submissionId,
      label: 'post',
      onReported: () => router.back(),
    });
  };

  const confirmDeletePost = async () => {
    if (isReadOnly) return;
    if (submissionId <= 0 || photoData.challengeId <= 0) {
      setDeleteConfirmationVisible(false);
      Alert.alert('Delete Failed', 'Could not find this post. Please refresh and try again.');
      return;
    }

    try {
      await deleteSubmissionMutation.mutateAsync({
        submissionId,
        userId: currentUserId,
        challengeId: photoData.challengeId,
      });
      setDeleteConfirmationVisible(false);
      router.back();
    } catch (error: any) {
      Alert.alert(
        'Delete Failed',
        getApiErrorMessage(error, 'Could not delete the post. Please try again.'),
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.screen} {...swipePanResponder.panHandlers}>
        <PhotoDetailsHeader
          title={headerTitle}
          onBackPress={() => router.back()}
          rightAction={submissionId > 0 && !isReadOnly ? (
            <TouchableOpacity
              accessibilityLabel="Post options"
              accessibilityRole="button"
              onPress={() => setOptionsVisible(true)}
              style={styles.headerOptionsButton}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#18142F" />
            </TouchableOpacity>
          ) : undefined}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isMediaZoomed}
        >
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.userHeader}
              onPress={ownerUserId > 0 ? handleUserPress : undefined}
              activeOpacity={ownerUserId > 0 ? 0.8 : 1}
            >
              <AvatarImage
                uri={photoData.userPhoto}
                size={40}
                style={styles.avatar}
              />
              <View style={styles.userText}>
                <Text style={styles.username}>{photoData.userName.replace(/^@/, '')}</Text>
                {submissionDate ? (
                  <Text style={styles.metaText}>{submissionDate}</Text>
                ) : null}
              </View>
            </TouchableOpacity>

            <View style={[styles.mediaShell, { height: mediaHeight }]}>
              {mediaUrls.length > 0 ? (
                <SubmissionMediaCarousel
                  mediaUrls={mediaUrls}
                  width={PHOTO_WIDTH}
                  height={mediaHeight}
                  expandable
                  contentFit="contain"
                  onZoomChange={handleMediaZoomChange}
                />
              ) : (
                <View style={styles.mediaPlaceholder}>
                  {isSubmissionLoading ? (
                    <ActivityIndicator size="small" color="#4700ec" />
                  ) : (
                    <Ionicons name="image-outline" size={48} color="#333" />
                  )}
                </View>
              )}
            </View>

            <View style={styles.contentSection}>
              <ChallengeSummary
                challengeName={photoData.challengeName || 'Challenge'}
                title={photoData.challengeTitle || 'Challenge Photo'}
                onPress={photoData.challengeId > 0 ? handleChallengePress : undefined}
              />

              {photoData.description ? (
                <Text style={styles.description} numberOfLines={5}>
                  {photoData.description}
                </Text>
              ) : null}
            </View>

            <View style={styles.actionsContainer}>
              <GenuinityAndCount
                genuineCount={count}
                ingenuineCount={photoData.ingenuineCount || 0}
                submissionId={submissionId}
                isGloried={isGloried}
                isUngloried={isUngloried}
                onGenuinePress={handleGloryPress}
                onIngenuinePress={handleUngloryPress}
              />
              <View style={styles.spacer} />
              <CommentAndCount
                commentCount={photoData.commentCount || 0}
                submissionId={submissionId}
                initiallyOpen={openCommentsFromNotification}
              />
            </View>
          </View>
        </ScrollView>
      </View>
      <Modal
        visible={optionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsVisible(false)}
      >
        <NativeTouchableOpacity
          activeOpacity={1}
          style={styles.optionsBackdrop}
          onPress={() => setOptionsVisible(false)}
        >
          <View style={styles.optionsSheet}>
            {isOwnSubmission ? (
              <TouchableOpacity
                style={styles.optionsDeleteButton}
                onPress={handleDeleteOptionPress}
                activeOpacity={0.85}
              >
                <Ionicons name="trash-outline" size={20} color="#ff6b72" />
                <Text style={styles.optionsDeleteText}>Delete post</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.optionsDeleteButton}
                onPress={handleReportOptionPress}
                activeOpacity={0.85}
              >
                <Ionicons name="flag-outline" size={20} color="#ff6b72" />
                <Text style={styles.optionsDeleteText}>Report post</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.optionsCancelButton}
              onPress={() => setOptionsVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.optionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </NativeTouchableOpacity>
      </Modal>
      <Modal
        visible={deleteConfirmationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleteSubmissionMutation.isPending) {
            setDeleteConfirmationVisible(false);
          }
        }}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="trash-outline" size={24} color="#ff8a8a" />
            </View>
            <Text style={styles.confirmTitle}>Delete post?</Text>
            <Text style={styles.confirmBody}>
              This removes the submission from your challenge and profile. Warning: deleting this submission will reduce
              your points for this challenge.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmCancelButton]}
                onPress={() => setDeleteConfirmationVisible(false)}
                disabled={deleteSubmissionMutation.isPending}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmDeleteButton]}
                onPress={confirmDeletePost}
                feedbackTiming="after-paint"
                disabled={deleteSubmissionMutation.isPending}
                activeOpacity={0.85}
              >
                {deleteSubmissionMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons name="trash" size={16} color="#ffffff" />
                    <Text style={styles.confirmDeleteText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  screen: {
    flex: 1,
  },
  headerOptionsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 10,
    marginVertical: 14,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#DDD4FF',
  },
  userText: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18142F',
  },
  metaText: {
    color: '#777389',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  mediaShell: {
    width: PHOTO_WIDTH,
    backgroundColor: '#F2F0F7',
  },
  mediaPlaceholder: {
    width: PHOTO_WIDTH,
    height: PHOTO_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F0F7',
  },
  contentSection: {
    paddingBottom: 2,
  },
  description: {
    color: '#000000',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  spacer: {
    flex: 1,
  },
  optionsBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  optionsSheet: {
    gap: 8,
  },
  optionsDeleteButton: {
    minHeight: 54,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF4F5',
    borderWidth: 1,
    borderColor: '#FFD6DA',
  },
  optionsDeleteText: {
    color: '#ff6b72',
    fontSize: 16,
    fontWeight: '700',
  },
  optionsCancelButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  optionsCancelText: {
    color: '#18142F',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.74)',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  confirmIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFD6DA',
  },
  confirmTitle: {
    color: '#18142F',
    fontSize: 18,
    fontWeight: '700',
  },
  confirmBody: {
    color: '#655F70',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  confirmButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  confirmCancelButton: {
    backgroundColor: '#F8F7FC',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  confirmDeleteButton: {
    backgroundColor: '#d9363e',
  },
  confirmCancelText: {
    color: '#18142F',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmDeleteText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
