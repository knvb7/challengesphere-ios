import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { IntegrationProviderConfig } from '../../constants/integrationProviders';

interface IntegrationLogoProps {
  provider: IntegrationProviderConfig;
  size?: number;
  disabled?: boolean;
}

const IntegrationLogo: React.FC<IntegrationLogoProps> = ({ provider, size = 48, disabled = false }) => {
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [provider.logoUri]);

  const logoStyle = [
    styles.logo,
    {
      width: size,
      height: size,
      borderRadius: Math.max(12, size / 3),
      backgroundColor: `${provider.accent}22`,
      borderColor: `${provider.accent}55`,
      opacity: disabled ? 0.45 : 1,
    },
  ];

  return (
    <View style={logoStyle}>
      {provider.key === 'CODEFORCES' ? (
        <CodeforcesBarsLogo size={size} disabled={disabled} />
      ) : !logoFailed ? (
        <Image
          source={{ uri: provider.logoUri }}
          style={[
            styles.logoImage,
            {
              width: size - 14,
              height: size - 14,
            },
          ]}
          resizeMode="contain"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <Text style={[styles.fallbackText, { color: provider.accent, fontSize: Math.max(9, size / 4.8) }]}>
          {provider.fallback}
        </Text>
      )}
    </View>
  );
};

const CodeforcesBarsLogo = ({ size, disabled }: { size: number; disabled: boolean }) => {
  const barWidth = Math.max(4, Math.round(size * 0.15));
  const baseHeight = Math.max(14, Math.round(size * 0.48));
  const barGap = Math.max(2, Math.round(size * 0.06));

  return (
    <View style={styles.codeforcesBars}>
      <View
        style={[
          styles.codeforcesBar,
          {
            width: barWidth,
            height: Math.round(baseHeight * 0.72),
            backgroundColor: disabled ? '#777777' : '#1F8ACB',
            marginRight: barGap,
          },
        ]}
      />
      <View
        style={[
          styles.codeforcesBar,
          {
            width: barWidth,
            height: baseHeight,
            backgroundColor: disabled ? '#777777' : '#F6C244',
            marginRight: barGap,
          },
        ]}
      />
      <View
        style={[
          styles.codeforcesBar,
          {
            width: barWidth,
            height: Math.round(baseHeight * 1.18),
            backgroundColor: disabled ? '#777777' : '#D94A3D',
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  logo: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  logoImage: {
    maxWidth: '80%',
    maxHeight: '80%',
  },
  codeforcesBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  codeforcesBar: {
    borderRadius: 2,
  },
  fallbackText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default IntegrationLogo;
