import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import CommentsSheet from '@/components/common/CommentsSheet';
import type { Comment } from '@/types/api';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PREVIEW_USER_ID = 42;

const AVATARS = {
  current: Asset.fromModule(require('../assets/images/user-male-2.png')).uri,
  amara: Asset.fromModule(require('../assets/images/user-female-1.png')).uri,
  dev: Asset.fromModule(require('../assets/images/user-male-1.png')).uri,
  leo: Asset.fromModule(require('../assets/images/user-male-3.png')).uri,
};

const CHALLENGE_IMAGE = require('../assets/images/challenge-fallbacks/creativity-3.png');

function dateMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

const initialComments: Comment[] = [
  {
    id: 101,
    submissionId: 9001,
    userId: 12,
    username: 'amara.moves',
    profilePicUrl: AVATARS.amara,
    content: 'The light on the path is perfect. Did you shoot this just after sunrise?',
    createdAt: dateMinutesAgo(7),
    active: true,
  },
  {
    id: 102,
    submissionId: 9001,
    userId: PREVIEW_USER_ID,
    username: 'pranjal.builds',
    profilePicUrl: AVATARS.current,
    content: 'Yep—around 6:20. The fog cleared about five minutes later.',
    createdAt: dateMinutesAgo(18),
    active: true,
  },
  {
    id: 103,
    submissionId: 9001,
    userId: 21,
    username: 'devon.daily',
    profilePicUrl: AVATARS.dev,
    content: 'That second frame is the strongest one. The wider crop gives the route more scale.',
    createdAt: dateMinutesAgo(43),
    active: true,
  },
  {
    id: 104,
    submissionId: 9001,
    userId: 33,
    username: 'leo.outside',
    profilePicUrl: AVATARS.leo,
    content: 'Which trail is this?',
    createdAt: dateMinutesAgo(126),
    active: true,
  },
];

export default function CommentPreviewScreen() {
  const { width } = useWindowDimensions();
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState('');
  const [sheetVisible, setSheetVisible] = useState(true);
  const compact = width < 860;

  const activeComments = useMemo(
    () => comments.filter((comment) => comment.active !== false),
    [comments],
  );

  const submitPreviewComment = () => {
    const content = draft.trim();
    if (!content) return;

    setComments((current) => [
      {
        id: Date.now(),
        submissionId: 9001,
        userId: PREVIEW_USER_ID,
        username: 'pranjal.builds',
        profilePicUrl: AVATARS.current,
        content,
        createdAt: new Date().toISOString(),
        active: true,
      },
      ...current,
    ]);
    setDraft('');
  };

  return (
    <LinearGradient
      colors={['#08080A', '#0B0A0F', '#08080A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <View style={styles.ambientGlowOne} />

      <SafeAreaView style={[styles.safeArea, compact && styles.safeAreaCompact]}>
        <View style={[styles.deviceFrame, compact && styles.deviceFrameCompact]}>
          <View style={styles.deviceHeader}>
            <View style={styles.deviceNotch} />
          </View>

          <View style={styles.postCanvas}>
            <View style={styles.mockAppHeader}>
              <Image source={require('../assets/images/logo-mark-transparent.png')} style={styles.mockLogo} />
              <Text style={styles.mockBrand}>ChallengeSphere</Text>
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </View>
            <ImageBackground source={CHALLENGE_IMAGE} style={styles.challengeImage} imageStyle={styles.challengeImageAsset}>
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFill} />
              <View style={styles.challengeCopy}>
                <Text style={styles.challengeKicker}>DAY 12 · MORNING MILES</Text>
                <Text style={styles.challengeTitle}>6:20 AM on the eastern loop.</Text>
              </View>
            </ImageBackground>
            <View style={styles.postActions}>
              <View style={styles.postMeta}>
                <Ionicons name="sparkles" size={16} color="#BFAAFF" />
                <Text style={styles.postMetaText}>84 glories</Text>
              </View>
              <TouchableOpacity style={styles.openButton} onPress={() => setSheetVisible(true)}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
                <Text style={styles.openButtonText}>{activeComments.length} comments</Text>
              </TouchableOpacity>
            </View>
          </View>

          {sheetVisible ? (
            <KeyboardAvoidingView
              style={styles.sheetPreview}
              enabled={Platform.OS === 'ios'}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <CommentsSheet
                embedded
                comments={activeComments}
                commentCount={activeComments.length}
                currentUserId={PREVIEW_USER_ID}
                currentUserAvatar={AVATARS.current}
                composerValue={draft}
                onComposerChange={setDraft}
                onSubmit={submitPreviewComment}
                onClose={() => setSheetVisible(false)}
                onDelete={(commentId) => setComments((current) => current.filter((comment) => comment.id !== commentId))}
              />
            </KeyboardAvoidingView>
          ) : null}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    overflow: 'hidden',
  },
  ambientGlowOne: {
    position: 'absolute',
    width: 680,
    height: 680,
    borderRadius: 340,
    backgroundColor: 'rgba(71, 0, 236,0.105)',
    top: '50%',
    left: '50%',
    marginTop: -340,
    marginLeft: -340,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  safeAreaCompact: {
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 3,
  },
  deviceFrame: {
    width: 438,
    height: 820,
    maxHeight: '100%',
    flexShrink: 0,
    borderRadius: 42,
    padding: 7,
    backgroundColor: '#030304',
    borderWidth: 1,
    borderColor: '#312f36',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 34px 110px rgba(0,0,0,0.7)',
      } as ViewStyle,
      default: {
        shadowColor: '#000000',
        shadowOpacity: 0.55,
        shadowRadius: 38,
        shadowOffset: { width: 0, height: 28 },
        elevation: 24,
      },
    }),
  },
  deviceFrameCompact: {
    width: '100%',
    maxWidth: 430,
    height: '100%',
    borderRadius: 26,
    padding: 3,
  },
  deviceHeader: {
    position: 'absolute',
    zIndex: 4,
    top: 12,
    left: 0,
    right: 0,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  deviceNotch: {
    width: 76,
    height: 22,
    borderRadius: 12,
    backgroundColor: '#020203',
    borderWidth: 1,
    borderColor: '#17171b',
  },
  postCanvas: {
    flex: 1,
    borderRadius: 35,
    overflow: 'hidden',
    backgroundColor: '#09090d',
  },
  mockAppHeader: {
    height: 70,
    paddingTop: 21,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mockLogo: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  mockBrand: {
    flex: 1,
    color: '#18142F',
    fontSize: 12,
    fontWeight: '700',
  },
  challengeImage: {
    height: 420,
    justifyContent: 'flex-end',
  },
  challengeImageAsset: {
    resizeMode: 'cover',
  },
  challengeCopy: {
    padding: 18,
  },
  challengeKicker: {
    color: '#c4b5fd',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  challengeTitle: {
    maxWidth: 310,
    color: '#18142F',
    fontSize: 23,
    lineHeight: 27,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  postMetaText: {
    color: '#c7c5cc',
    fontSize: 11,
    fontWeight: '700',
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 15,
    backgroundColor: '#6d28d9',
  },
  openButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  sheetPreview: {
    position: 'absolute',
    top: 62,
    left: 1,
    right: 1,
    bottom: 1,
    zIndex: 3,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
});
