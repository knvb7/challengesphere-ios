import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import hapticFeedback from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable as NativePressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Reanimated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAddComment, useDeleteComment, useFeedComments } from '../../hooks/useFeed';
import { useUser } from '../../hooks/useUsers';
import { useAuthContext } from '../../providers/AuthProvider';
import type { Comment } from '../../types/api';
import { AppAlert as Alert } from '../../utils/appAlert';
import { showContentReportReasons } from '../../utils/contentReporting';
import { AppOverlayPortal } from './AppOverlayPortal';
import CommentsSheet from './CommentsSheet';

interface CommentAndCountProps {
  commentCount: number;
  submissionId: number;
  onCommentSubmit?: (comment: string) => void;
  initiallyOpen?: boolean;
}

const getCommentId = (comment: Comment) => comment.id ?? comment.commentId ?? 0;

function AndroidCommentsKeyboardLayout({
  children,
  bottomInset,
}: React.PropsWithChildren<{ bottomInset: number }>) {
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  const keyboardStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, keyboard.height.value - bottomInset),
  }), [bottomInset]);

  return (
    <Reanimated.View
      style={[styles.modalRoot, keyboardStyle]}
      accessibilityViewIsModal
    >
      {children}
    </Reanimated.View>
  );
}

function CommentsKeyboardLayout({
  children,
  bottomInset,
}: React.PropsWithChildren<{ bottomInset: number }>) {
  if (Platform.OS === 'android') {
    return (
      <AndroidCommentsKeyboardLayout bottomInset={bottomInset}>
        {children}
      </AndroidCommentsKeyboardLayout>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.modalRoot}
      behavior="padding"
      keyboardVerticalOffset={-bottomInset}
      accessibilityViewIsModal
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const CommentAndCount: React.FC<CommentAndCountProps> = ({
  commentCount,
  submissionId,
  onCommentSubmit,
  initiallyOpen = false,
}) => {
  const { currentUserId, user } = useAuthContext();
  const { data: currentUser } = useUser(currentUserId, currentUserId);
  const router = useRouter();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const sheetProgress = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const modalBottomInsetRef = useRef(bottomInset);
  const newCommentRef = useRef('');
  const initialOpenHandledRef = useRef(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [localCount, setLocalCount] = useState(commentCount);
  const [reportedCommentIds, setReportedCommentIds] = useState<Set<number>>(() => new Set());
  const currentUserAvatar = currentUser?.profilePicUrl || user?.profilePicUrl;
  const currentUsername = currentUser?.username || user?.username;
  if (!isModalVisible) {
    modalBottomInsetRef.current = bottomInset;
  }
  const modalBottomInset = modalBottomInsetRef.current;

  useEffect(() => {
    setLocalCount(commentCount);
  }, [commentCount]);

  useEffect(() => () => {
    sheetProgress.stopAnimation();
  }, [sheetProgress]);

  const {
    data: commentsData,
    isLoading: loadingComments,
    isFetching: fetchingComments,
  } = useFeedComments(submissionId, currentUserId, 0, 50, isModalVisible);
  const addCommentMutation = useAddComment();
  const deleteCommentMutation = useDeleteComment();

  const comments: Comment[] = useMemo(() => {
    const seen = new Set<number | string>();

    return (commentsData?.content ?? [])
      .filter((comment) => comment.active !== false)
      .filter((comment) => !reportedCommentIds.has(getCommentId(comment)))
      .filter((comment, index) => {
        const id = getCommentId(comment) || `${comment.userId}-${comment.createdAt}-${index}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [commentsData?.content, reportedCommentIds]);

  useEffect(() => {
    if (typeof commentsData?.totalElements === 'number') {
      setLocalCount(commentsData.totalElements);
    }
  }, [commentsData?.totalElements]);

  const openComments = useCallback(() => {
    if (isModalVisible) return;

    hapticFeedback.buttonPress();
    closingRef.current = false;
    sheetProgress.stopAnimation();
    sheetProgress.setValue(0);
    setIsModalVisible(true);
  }, [isModalVisible, sheetProgress]);

  useEffect(() => {
    if (!initiallyOpen || initialOpenHandledRef.current || submissionId <= 0) {
      return;
    }
    initialOpenHandledRef.current = true;
    openComments();
  }, [initiallyOpen, openComments, submissionId]);

  const animateSheetIn = useCallback(() => {
    sheetProgress.stopAnimation();
    Animated.timing(sheetProgress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [sheetProgress]);

  const closeComments = useCallback(() => {
    if (closingRef.current) return;

    closingRef.current = true;
    Keyboard.dismiss();
    hapticFeedback.modalDismiss();
    sheetProgress.stopAnimation();
    Animated.timing(sheetProgress, {
      toValue: 0,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      closingRef.current = false;
      if (finished) {
        setIsModalVisible(false);
      }
    });
  }, [sheetProgress]);

  const handleRequestClose = useCallback(() => {
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
      return;
    }
    closeComments();
  }, [closeComments]);

  const handleComposerChange = useCallback((value: string) => {
    newCommentRef.current = value;
    setNewComment(value);
  }, []);

  const handleSubmit = useCallback(() => {
    const content = newCommentRef.current.trim();

    if (!content || submissionId <= 0 || currentUserId <= 0 || addCommentMutation.isPending) {
      return;
    }

    hapticFeedback.success();
    addCommentMutation.mutate(
      {
        submissionId,
        userId: currentUserId,
        content,
        username: currentUsername,
        profilePicUrl: currentUserAvatar,
      },
      {
        onSuccess: () => {
          newCommentRef.current = '';
          setNewComment('');
          setLocalCount((count) => count + 1);
          onCommentSubmit?.(content);
        },
        onError: () => hapticFeedback.error(),
      },
    );
  }, [addCommentMutation, currentUserAvatar, currentUserId, currentUsername, onCommentSubmit, submissionId]);

  const performDeleteComment = useCallback((commentId: number) => {
    if (!commentId || deleteCommentMutation.isPending) return;

    hapticFeedback.warning();
    deleteCommentMutation.mutate(
      { commentId, userId: currentUserId, submissionId },
      {
        onSuccess: () => setLocalCount((count) => Math.max(0, count - 1)),
        onError: () => hapticFeedback.error(),
      },
    );
  }, [currentUserId, deleteCommentMutation, submissionId]);

  const openCommentOptions = useCallback((commentId: number) => {
    if (!commentId || deleteCommentMutation.isPending) return;

    hapticFeedback.buttonPress();
    Alert.alert('Comment options', undefined, [
      {
        text: 'Delete comment',
        style: 'destructive',
        onPress: () => performDeleteComment(commentId),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [deleteCommentMutation.isPending, performDeleteComment]);

  const navigateToUser = useCallback((userId: number, username: string) => {
    Keyboard.dismiss();
    closingRef.current = false;
    sheetProgress.stopAnimation();
    sheetProgress.setValue(0);
    setIsModalVisible(false);

    requestAnimationFrame(() => {
      router.push({ pathname: '/user-profile', params: { id: userId.toString(), username } });
    });
  }, [router, sheetProgress]);

  const sheetTranslateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });
  const backdropOpacity = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  useEffect(() => {
    if (!isModalVisible) return undefined;

    const animationFrame = requestAnimationFrame(animateSheetIn);
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleRequestClose();
      return true;
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      backSubscription.remove();
    };
  }, [animateSheetIn, handleRequestClose, isModalVisible]);

  return (
    <View>
      <TouchableOpacity
        style={styles.trigger}
        onPress={openComments}
        activeOpacity={0.72}
        accessibilityLabel={`Open ${localCount} comments`}
      >
        <View style={styles.triggerIcon}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#5B3FE5" />
        </View>
        <Text style={styles.triggerCount}>{localCount}</Text>
      </TouchableOpacity>

      {isModalVisible ? (
        <AppOverlayPortal>
          <CommentsKeyboardLayout bottomInset={modalBottomInset}>
            <Animated.View style={[styles.backdropFill, { opacity: backdropOpacity }]}>
              <NativePressable
                style={StyleSheet.absoluteFill}
                onPress={closeComments}
                accessibilityRole="button"
                accessibilityLabel="Close comments"
              />
            </Animated.View>

            <CommentsSheet
              comments={comments}
              commentCount={localCount}
              currentUserId={currentUserId}
              currentUserAvatar={currentUserAvatar}
              composerValue={newComment}
              onComposerChange={handleComposerChange}
              onSubmit={handleSubmit}
              onClose={closeComments}
              onDelete={openCommentOptions}
              onReport={(commentId) => showContentReportReasons({
                targetType: 'COMMENT',
                targetId: commentId,
                label: 'comment',
                onReported: () => {
                  setReportedCommentIds((current) => {
                    const next = new Set(current);
                    next.add(commentId);
                    return next;
                  });
                  setLocalCount((count) => Math.max(0, count - 1));
                },
              })}
              onUserPress={navigateToUser}
              isLoading={loadingComments}
              isRefreshing={fetchingComments}
              isSubmitting={addCommentMutation.isPending}
              bottomInset={modalBottomInset}
              style={{
                opacity: sheetProgress,
                transform: [{ translateY: sheetTranslateY }],
              } as any}
            />
          </CommentsKeyboardLayout>
        </AppOverlayPortal>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  trigger: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 5,
    borderRadius: 22,
    backgroundColor: '#F0ECFF',
  },
  triggerIcon: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  triggerCount: {
    color: '#5B3FE5',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
});

export default CommentAndCount;
