import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import type { AppleAuthRequest } from '../types/api';
import { getAppleUserIdentifier } from './secureAuthStorage';

export type StoredAppleCredentialState =
  | 'authorized'
  | 'revoked'
  | 'missing'
  | 'unknown';

const randomHex = async (byteCount: number): Promise<string> => {
  const bytes = await Crypto.getRandomBytesAsync(byteCount);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export async function signInWithApple(): Promise<AppleAuthRequest> {
  if (Platform.OS !== 'ios' || !(await AppleAuthentication.isAvailableAsync())) {
    throw new Error('Sign in with Apple is not available on this device.');
  }

  const rawNonce = await randomHex(32);
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  const state = Crypto.randomUUID();
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
    state,
  });

  if (credential.state !== state) {
    throw new Error('Apple sign-in response could not be verified.');
  }
  if (!credential.identityToken || !credential.authorizationCode || !credential.user) {
    throw new Error('Apple sign-in did not return complete credentials.');
  }

  return {
    identityToken: credential.identityToken,
    authorizationCode: credential.authorizationCode,
    rawNonce,
    user: credential.user,
    email: credential.email,
    fullName: credential.fullName,
  };
}

export async function getStoredAppleCredentialState(): Promise<StoredAppleCredentialState> {
  if (Platform.OS !== 'ios') return 'unknown';

  const appleUserIdentifier = await getAppleUserIdentifier();
  if (!appleUserIdentifier) return 'missing';

  try {
    const state = await AppleAuthentication.getCredentialStateAsync(appleUserIdentifier);
    if (state === AppleAuthentication.AppleAuthenticationCredentialState.AUTHORIZED) {
      return 'authorized';
    }
    if (
      state === AppleAuthentication.AppleAuthenticationCredentialState.REVOKED
      || state === AppleAuthentication.AppleAuthenticationCredentialState.NOT_FOUND
    ) {
      return 'revoked';
    }
    return 'unknown';
  } catch {
    // The simulator does not support credential-state queries. A transient
    // platform failure must not destroy an otherwise valid backend session.
    return 'unknown';
  }
}

export function addAppleCredentialRevokeListener(listener: () => void) {
  if (Platform.OS !== 'ios') return null;
  return AppleAuthentication.addRevokeListener(listener);
}
