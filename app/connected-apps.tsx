import { Ionicons } from '@expo/vector-icons';
import { AppAlert as Alert } from '@/utils/appAlert';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import FloatingScreenControls from '@/components/common/FloatingScreenControls';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import IntegrationLogo from '../components/integrations/IntegrationLogo';
import {
  CODING_INTEGRATIONS_ENABLED,
  INTEGRATION_PROVIDER_LIST,
  IntegrationProviderConfig,
} from '../constants/integrationProviders';
import { useCodeforcesIntegration } from '../hooks/useCodeforcesIntegration';
import { useLeetCodeIntegration } from '../hooks/useLeetCodeIntegration';
import { useAuthContext } from '../providers/AuthProvider';

const ConnectedAppsScreen = () => {
  const router = useRouter();
  const { top: topInset } = useSafeAreaInsets();
  const { currentUserId } = useAuthContext();
  const { isConnected } = useCodeforcesIntegration(currentUserId, CODING_INTEGRATIONS_ENABLED);
  const { isConnected: isLeetCodeConnected } = useLeetCodeIntegration(
    currentUserId,
    CODING_INTEGRATIONS_ENABLED
  );

  const handleProviderPress = (provider: IntegrationProviderConfig) => {
    void Haptics.selectionAsync();
    if (!provider.available) {
      Alert.alert('Coming soon', `${provider.name} integration is coming soon.`);
      return;
    }

    router.push({
      pathname: '/integration-detail',
      params: { provider: provider.key },
    } as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FloatingScreenControls onBackPress={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: topInset + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.providerListCard}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Integrations</Text>
          <Text style={styles.sectionIntro}>Choose an app, confirm your account, then sync when a challenge needs it.</Text>
          {INTEGRATION_PROVIDER_LIST.map((provider) => (
            <ProviderRow
              key={provider.key}
              provider={provider}
              isConnected={(provider.key === 'CODEFORCES' && isConnected)
                || (provider.key === 'LEETCODE' && isLeetCodeConnected)}
              onPress={() => handleProviderPress(provider)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const ProviderRow = ({
  provider,
  isConnected,
  onPress,
}: {
  provider: IntegrationProviderConfig;
  isConnected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.providerRow, !provider.available && styles.providerRowDisabled]}
    onPress={onPress}
    activeOpacity={0.82}
  >
    <IntegrationLogo provider={provider} size={48} disabled={!provider.available} />
    <View style={styles.providerRowText}>
      <View style={styles.providerRowTitleLine}>
        <Text style={[styles.providerRowTitle, !provider.available && styles.disabledText]}>
          {provider.name}
        </Text>
        {isConnected ? (
          <View style={styles.connectedMiniPill}>
            <Text style={styles.connectedMiniText}>Connected</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.providerRowSubtitle, !provider.available && styles.disabledText]} numberOfLines={2}>
        {provider.subtitle}
      </Text>
    </View>
    <View style={styles.providerRowRight}>
      {!provider.available ? (
        <Text style={styles.comingSoonText}>Coming soon</Text>
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#888888" />
      )}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  providerListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
  },
  sectionTitle: {
    marginLeft: 52,
    color: '#18142F',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionIntro: {
    marginLeft: 52,
    color: '#8e8e8e',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 12,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E7E3EF',
  },
  providerRowDisabled: {
    opacity: 0.62,
  },
  providerRowText: {
    flex: 1,
    marginLeft: 12,
  },
  providerRowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  providerRowTitle: {
    color: '#18142F',
    fontSize: 15,
    fontWeight: '600',
  },
  providerRowSubtitle: {
    color: '#969696',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  providerRowRight: {
    minWidth: 76,
    alignItems: 'flex-end',
  },
  comingSoonText: {
    color: '#777777',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  disabledText: {
    color: '#777389',
  },
  connectedMiniPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#ECFDF3',
  },
  connectedMiniText: {
    color: '#187A3D',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default ConnectedAppsScreen;
