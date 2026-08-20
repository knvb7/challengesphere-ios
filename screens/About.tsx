import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import FloatingScreenControls from '@/components/common/FloatingScreenControls';
import { LEGAL_URLS } from '@/constants/legalLinks';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface AboutProps {
  onBack?: () => void;
}

const APP_VERSION = Constants.expoConfig?.version ?? '—';
const BUILD_NUMBER = Constants.expoConfig?.ios?.buildNumber ?? '—';
const COPYRIGHT_YEAR = new Date().getFullYear();

const About = ({ onBack }: AboutProps) => {
  const router = useRouter();
  const { top: topInset } = useSafeAreaInsets();
  const handleBack = () => { if (onBack) onBack(); else router.back(); };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FloatingScreenControls onBackPress={handleBack} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* App logo & branding */}
        <View style={[styles.brandSection, { paddingTop: topInset + 16 }]}>
          <View style={styles.logoContainer}>
            <Ionicons name="trophy" size={52} color="#FFD700" />
          </View>
          <Text style={styles.appName} accessibilityRole="header">ChallengeSphere</Text>
          <Text style={styles.tagline}>The Ultimate Way to Challenge Yourself</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version {APP_VERSION} · Build {BUILD_NUMBER}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.descriptionText}>
            ChallengeSphere is a social platform where you take on real-world challenges,
            document your progress, and compete with friends. Build consistency and prove
            what you are capable of — one day at a time.
          </Text>
        </View>

        {/* Info rows */}
        <SectionHeader title="App Info" />
        <View style={styles.section}>
          <InfoRow label="Version" value={APP_VERSION} />
          <InfoRow label="Build" value={BUILD_NUMBER} />
          <InfoRow label="Developer" value="IronSide" />
          <InfoRow label="Platform" value="iOS & Android" />
        </View>

        {/* Links */}
        <SectionHeader title="Legal & Policies" />
        <View style={styles.section}>
          <LinkRow
            icon="document-text-outline"
            title="Terms of Service"
            onPress={() => Linking.openURL(LEGAL_URLS.terms)}
          />
          <LinkRow
            icon="shield-outline"
            title="Privacy Policy"
            onPress={() => Linking.openURL(LEGAL_URLS.privacy)}
          />
        </View>

        {/* Contact */}
        <SectionHeader title="Contact" />
        <View style={styles.section}>
          <LinkRow
            icon="help-buoy-outline"
            title="ChallengeSphere Support"
            onPress={() => Linking.openURL(LEGAL_URLS.support)}
          />
          <LinkRow
            icon="mail-outline"
            title="ironside-dev@challengesphere.com"
            onPress={() => Linking.openURL('mailto:ironside-dev@challengesphere.com')}
          />
          <LinkRow
            icon="globe-outline"
            title="challengesphere.com"
            onPress={() => Linking.openURL('https://challengesphere.com')}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {COPYRIGHT_YEAR} IronSide. All rights reserved.
          </Text>
          <Text style={styles.footerText}>Made with ❤️ for challengers everywhere.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const LinkRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}> = ({ icon, title, onPress }) => (
  <TouchableOpacity style={styles.linkRow} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.linkLeft}>
      <Ionicons name={icon} size={20} color="#4700ec" style={{ marginRight: 12 }} />
      <Text style={styles.linkTitle}>{title}</Text>
    </View>
    <Ionicons name="open-outline" size={16} color="#555" />
  </TouchableOpacity>
);

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  brandSection: {
    alignItems: 'center',
    paddingBottom: 36,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E7E3EF',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DDD4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    color: '#18142F',
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tagline: {
    color: '#777389',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  },
  versionBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: '#E7E3EF',
  },
  versionText: { color: '#777389', fontSize: 12 },
  descriptionSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E7E3EF',
  },
  descriptionText: {
    color: '#777389',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  sectionHeader: {
    color: '#655F70',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: 20,
    marginTop: 28,
    marginBottom: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderWidth: 0.5,
    borderColor: '#E7E3EF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E7E3EF',
  },
  infoLabel: { color: '#777389', fontSize: 14 },
  infoValue: { color: '#18142F', fontSize: 14, fontWeight: '500' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E7E3EF',
  },
  linkLeft: { flexDirection: 'row', alignItems: 'center' },
  linkTitle: { color: '#18142F', fontSize: 14 },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 4,
  },
  footerText: { color: '#444', fontSize: 12 },
});

export default About;
