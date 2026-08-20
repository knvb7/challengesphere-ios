import { AppAlert as Alert } from '@/utils/appAlert';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthContext } from '../providers/AuthProvider';
import { authService } from '../services/authService';
import { signInWithApple } from '../services/appleAuthService';
import { getApiErrorMessage } from '../utils/apiError';
import { getPostAuthRoute } from '../services/onboardingService';
import { OFFICIAL_ACCOUNT_AVATAR_SOURCE } from '../utils/globalChallenges';

export default function LoginScreen() {
  const { login } = useAuthContext();
  const [loadingMethod, setLoadingMethod] = useState<'apple' | null>(null);
  const intro = useSharedValue(0);
  const cardIntro = useSharedValue(0);
  const ambient = useSharedValue(0);
  const particles = useSharedValue(0);
  const pulse = useSharedValue(0);
  const sheen = useSharedValue(0);
  const tilt = useSharedValue(0);
  const scan = useSharedValue(0);

  useEffect(() => {
    intro.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    cardIntro.value = withDelay(
      80,
      withTiming(1, {
        duration: 430,
        easing: Easing.out(Easing.cubic),
      })
    );
    ambient.value = withRepeat(
      withTiming(1, {
        duration: 3600,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
    particles.value = withRepeat(
      withTiming(1, {
        duration: 3200,
        easing: Easing.linear,
      }),
      -1,
      false
    );
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 1400,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      true
    );
    sheen.value = withRepeat(
      withDelay(
        700,
        withTiming(1, {
          duration: 1600,
          easing: Easing.inOut(Easing.cubic),
        })
      ),
      -1,
      false
    );
    tilt.value = withRepeat(
      withTiming(1, {
        duration: 3200,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
    scan.value = withRepeat(
      withDelay(
        300,
        withTiming(1, {
          duration: 4200,
          easing: Easing.linear,
        })
      ),
      -1,
      false
    );
  }, [ambient, cardIntro, intro, particles, pulse, scan, sheen, tilt]);

  const topGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ambient.value, [0, 1], [0.72, 1]),
    transform: [
      { translateX: interpolate(ambient.value, [0, 1], [0, -28]) },
      { translateY: interpolate(ambient.value, [0, 1], [0, 34]) },
      { scale: interpolate(ambient.value, [0, 1], [1, 1.14]) },
    ],
  }));

  const bottomGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ambient.value, [0, 1], [0.78, 0.48]),
    transform: [
      { translateX: interpolate(ambient.value, [0, 1], [0, 32]) },
      { translateY: interpolate(ambient.value, [0, 1], [0, -26]) },
      { scale: interpolate(ambient.value, [0, 1], [1, 1.2]) },
    ],
  }));

  const appNameStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [
      { translateY: interpolate(intro.value, [0, 1], [18, 0]) },
      { scale: interpolate(intro.value, [0, 1], [0.96, 1]) },
    ],
  }));

  const heroFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(ambient.value, [0, 1], [-6, 6]) }],
  }));

  const formCardStyle = useAnimatedStyle(() => ({
    opacity: cardIntro.value,
    transform: [
      { translateY: interpolate(cardIntro.value, [0, 1], [28, 0]) },
      { translateX: interpolate(tilt.value, [0, 1], [-4, 4]) },
      { rotate: `${interpolate(tilt.value, [0, 1], [-0.6, 0.6])}deg` },
      { scale: interpolate(cardIntro.value, [0, 1], [0.97, 1]) },
    ],
  }));

  const cardGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.16, 0.42]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.995, 1.01]) }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(pulse.value, [0, 1], [0.16, 0.32]),
  }));

  const scanlineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scan.value, [0, 0.12, 0.88, 1], [0, 0.55, 0.55, 0]),
    transform: [{ translateY: interpolate(scan.value, [0, 1], [-120, 620]) }],
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheen.value, [0, 0.16, 0.78, 1], [0, 0.9, 0.9, 0]),
    transform: [
      { translateX: interpolate(sheen.value, [0, 1], [-190, 190]) },
      { rotate: '-18deg' },
    ],
  }));

  const particleOneStyle = useAnimatedStyle(() => ({
    opacity: interpolate(particles.value, [0, 0.18, 0.78, 1], [0, 0.7, 0.7, 0]),
    transform: [
      { translateY: interpolate(particles.value, [0, 1], [26, -86]) },
      { translateX: interpolate(ambient.value, [0, 1], [-8, 18]) },
      { scale: interpolate(pulse.value, [0, 1], [0.8, 1.2]) },
    ],
  }));

  const particleTwoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(particles.value, [0, 0.24, 0.84, 1], [0, 0.58, 0.58, 0]),
    transform: [
      { translateY: interpolate(particles.value, [0, 1], [40, -110]) },
      { translateX: interpolate(ambient.value, [0, 1], [18, -16]) },
      { scale: interpolate(pulse.value, [0, 1], [1.15, 0.78]) },
    ],
  }));

  const particleThreeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(particles.value, [0, 0.12, 0.72, 1], [0, 0.64, 0.64, 0]),
    transform: [
      { translateY: interpolate(particles.value, [0, 1], [34, -96]) },
      { translateX: interpolate(ambient.value, [0, 1], [-18, 10]) },
      { scale: interpolate(pulse.value, [0, 1], [0.75, 1.16]) },
    ],
  }));

  const isLoading = loadingMethod !== null;

  const handleAppleLogin = async () => {
    setLoadingMethod('apple');
    try {
      const appleCredentials = await signInWithApple();
      const authData = await authService.loginWithApple(appleCredentials);
      await login(authData);
      const nextRoute = await getPostAuthRoute(authData);
      router.replace(nextRoute as Href);
    } catch (err: any) {
      const errorMessage = getApiErrorMessage(err, 'Please try again');
      const msg = errorMessage.toLowerCase();
      if (
        err?.code === 'ERR_REQUEST_CANCELED' ||
        msg.includes('cancel') ||
        msg.includes('request canceled')
      ) {
        return;
      }
      Alert.alert('Sign in with Apple failed', errorMessage);
    } finally {
      setLoadingMethod(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#FFFFFF', '#F7F4FF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.glowTop, topGlowStyle]} />
      <Animated.View style={[styles.glowBottom, bottomGlowStyle]} />
      <Animated.View style={[styles.particle, styles.particleOne, particleOneStyle]} />
      <Animated.View style={[styles.particle, styles.particleTwo, particleTwoStyle]} />
      <Animated.View style={[styles.particle, styles.particleThree, particleThreeStyle]} />
      <Animated.View pointerEvents="none" style={[styles.scanlineWrap, scanlineStyle]}>
        <LinearGradient
          colors={['rgba(71,0,236,0)', 'rgba(71,0,236,0.08)', 'rgba(71,0,236,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.heroCard, heroFloatStyle]}>
            <Animated.View style={[styles.loginLogoMark, appNameStyle]}>
              <Image
                source={OFFICIAL_ACCOUNT_AVATAR_SOURCE}
                style={styles.loginLogoImage}
                resizeMode="contain"
              />
            </Animated.View>
            <Animated.Text style={[styles.appName, appNameStyle]}>
              challengesphere
            </Animated.Text>
          </Animated.View>

          <Animated.View style={[styles.formCard, formCardStyle]}>
            <Animated.View pointerEvents="none" style={[styles.cardGlow, cardGlowStyle]} />
            <Animated.View pointerEvents="none" style={[styles.cardSheen, sheenStyle]}>
              <LinearGradient
                colors={[
                  'rgba(71,0,236,0)',
                  'rgba(71,0,236,0.06)',
                  'rgba(71,0,236,0)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            <Text style={styles.formTitle}>Welcome</Text>
            <Text style={styles.formSubtitle}>Continue securely with your Apple Account.</Text>

            <Animated.View
              style={[
                styles.appleButtonContainer,
                buttonAnimatedStyle,
                isLoading && styles.buttonDisabled,
              ]}
              pointerEvents={isLoading ? 'none' : 'auto'}
            >
              {loadingMethod === 'apple' ? (
                <View style={styles.appleLoadingButton}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.appleLoadingText}>Signing in…</Text>
                </View>
              ) : (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={8}
                  style={styles.appleButton}
                  onPress={handleAppleLogin}
                />
              )}
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(71, 0, 236, 0.10)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(126, 87, 255, 0.09)',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(71, 0, 236, 0.26)',
  },
  particleOne: {
    left: '18%',
    top: '38%',
  },
  particleTwo: {
    right: '18%',
    top: '45%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(71, 0, 236, 0.34)',
  },
  particleThree: {
    right: '30%',
    top: '30%',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(126, 87, 255, 0.38)',
  },
  scanlineWrap: {
    position: 'absolute',
    left: -80,
    right: -80,
    height: 120,
  },
  heroCard: {
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  loginLogoMark: {
    width: 116,
    height: 116,
    marginBottom: 14,
  },
  loginLogoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  appName: {
    fontSize: 34,
    fontWeight: '700',
    color: '#18142F',
  },
  tagline: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#777389',
    textAlign: 'center',
    maxWidth: 320,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    overflow: 'hidden',
    shadowColor: '#7b4dff',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 12,
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(71, 0, 236, 0.10)',
    shadowColor: '#4700EC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 10,
  },
  cardSheen: {
    position: 'absolute',
    top: -42,
    bottom: -42,
    width: 96,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#18142F',
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#938ca5',
    marginBottom: 18,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  appleButtonContainer: {
    borderRadius: 8,
    height: 50,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    shadowOpacity: 0.16,
    elevation: 6,
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  appleLoadingButton: {
    height: 50,
    borderRadius: 8,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  appleLoadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
