import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    StatusBar,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FloatingScreenControls from '../components/common/FloatingScreenControls';
import GenericUserAvatar from '../components/common/GenericUserAvatar';
import PinchZoomImage from '../components/common/PinchZoomImage';
import {
  isOfficialGlobalCreator,
  OFFICIAL_ACCOUNT_AVATAR_SOURCE,
} from '../utils/globalChallenges';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 48;

export default function AvatarViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const photoUrl = params.photoUrl as string;
  const username = params.username as string | undefined;
  const isOfficialAccount = isOfficialGlobalCreator(username || '');
  const photoSource = photoUrl
    ? { uri: photoUrl }
    : isOfficialAccount
      ? OFFICIAL_ACCOUNT_AVATAR_SOURCE
      : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <FloatingScreenControls
        onBackPress={() => router.back()}
        tone="media"
      />

      {/* Full-size avatar with pinch zoom */}
      <View style={styles.imageContainer}>
        <View style={styles.imageWrapper}>
          {photoSource ? (
            <PinchZoomImage
              source={photoSource}
              width={IMAGE_SIZE}
              height={IMAGE_SIZE}
              borderRadius={IMAGE_SIZE / 2}
              resizeMode="cover"
              maxScale={6}
              accessibilityLabel={username
                ? `Profile photo for @${username.replace(/^@/, '')}`
                : 'Profile photo'}
            />
          ) : (
            <GenericUserAvatar size={IMAGE_SIZE} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  imageWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: IMAGE_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2a2a2a',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
