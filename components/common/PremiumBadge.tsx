import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

type PremiumBadgeVariant = 'identity' | 'membership';
type PremiumBadgeSize = 'inline' | 'profile';

interface PremiumBadgeProps {
  variant?: PremiumBadgeVariant;
  size?: PremiumBadgeSize;
  style?: StyleProp<ViewStyle>;
}

export default function PremiumBadge({
  variant = 'identity',
  size = 'inline',
  style,
}: PremiumBadgeProps) {
  const isIdentity = variant === 'identity';
  const isProfileSize = size === 'profile';
  const iconSize = isIdentity ? (isProfileSize ? 10 : 9) : 12;

  return (
    <View
      style={[
        isIdentity ? styles.identityBadge : styles.membershipBadge,
        isIdentity && isProfileSize ? styles.profileIdentityBadge : null,
        style,
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="ChallengeSphere Premium member"
    >
      <LinearGradient
        colors={['#9A6AFF', '#6D36E8', '#4B1BB8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={isIdentity ? styles.identityGradient : styles.membershipGradient}
      >
        <View style={[styles.iconFrame, { width: iconSize, height: iconSize }]}>
          <Ionicons
            name="diamond"
            size={iconSize}
            color="#FFFFFF"
            style={[styles.icon, { width: iconSize, height: iconSize, lineHeight: iconSize }]}
          />
        </View>
        {!isIdentity && <Text style={styles.label}>PREMIUM</Text>}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  identityBadge: {
    width: 16,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0,
  },
  profileIdentityBadge: {
    width: 18,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
  },
  membershipBadge: {
    height: 26,
    minWidth: 26,
    borderRadius: 13,
    overflow: 'hidden',
    flexShrink: 0,
  },
  identityGradient: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  membershipGradient: {
    flex: 1,
    paddingHorizontal: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    textAlign: 'center',
    transform: [{ translateY: -0.5 }],
  },
  label: {
    color: '#FFFFFF',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
