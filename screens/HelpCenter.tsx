import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import FloatingScreenControls from '@/components/common/FloatingScreenControls';
import { LEGAL_URLS } from '@/constants/legalLinks';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    LayoutAnimation,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    UIManager,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HelpCenterProps {
  onBack?: () => void;
}

const FAQS = [
  {
    question: 'How do I join a challenge?',
    answer:
      'Browse challenges on the Feed or Explore tab, tap on a challenge you like, and press the "Join Challenge" button on the challenge details screen.',
  },
  {
    question: 'How do I submit progress for a challenge?',
    answer:
      'From your active challenge, tap "Submit" and add a photo to your submission for that day.',
  },
  {
    question: 'How do streaks work?',
    answer:
      'You get one protected missed day in any 7-day stretch, but it does not add to your streak total. A second miss within that stretch resets your streak, and your next completed day starts a new one.',
  },
  {
    question: 'What are Glories?',
    answer:
      'Glories are like likes — you can give a Glory to any submission to show appreciation for someone\'s effort. They also affect leaderboard scores.',
  },
  {
    question: 'How do leaderboards work?',
    answer:
      'Each challenge has its own leaderboard ranked by OVERALL score (submissions + glories + streak). You can also view leaderboards by individual category.',
  },
  {
    question: 'Can I create a private challenge?',
    answer:
      'Yes! When creating a challenge, toggle "Private" so only people you invite can see and join it.',
  },
  {
    question: 'How do I invite friends to a challenge?',
    answer:
      'Open a challenge you created or joined, then choose "Invite App Friends" to select followers or people you follow. You can still share through contacts or WhatsApp.',
  },
  {
    question: 'How do I change my password?',
    answer:
      'Go to Settings → Change Password. Enter your new password twice and tap "Update Password".',
  },
];

const SUPPORT_EMAIL = 'ironside-dev@challengesphere.com';

const HelpCenter = ({ onBack }: HelpCenterProps) => {
  const router = useRouter();
  const { top: topInset } = useSafeAreaInsets();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleBack = () => { if (onBack) onBack(); else router.back(); };

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === i ? null : i);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FloatingScreenControls onBackPress={handleBack} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: topInset + 16 }]}>
          <View style={styles.heroIcon}>
            <Ionicons name="help-buoy" size={40} color="#4700ec" />
          </View>
          <Text style={styles.heroTitle} accessibilityRole="header">How can we help?</Text>
          <Text style={styles.heroSubtitle}>
            Find answers to common questions below or reach out to our support team.
          </Text>
        </View>

        {/* Quick links */}
        <View style={styles.quickLinks}>
          <QuickLink
            icon="chatbubble-ellipses-outline"
            label="Contact Support"
            onPress={() => router.push('/app-support' as any)}
          />
          <QuickLink
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL(LEGAL_URLS.terms)}
          />
          <QuickLink
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL(LEGAL_URLS.privacy)}
          />
        </View>

        <TouchableOpacity
          style={styles.contactCard}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel={`Email support at ${SUPPORT_EMAIL}`}
        >
          <View style={styles.contactIcon}>
            <Ionicons name="mail-outline" size={20} color="#5B3FE5" />
          </View>
          <View style={styles.contactCopy}>
            <Text style={styles.contactTitle}>For any queries</Text>
            <Text style={styles.contactEmail}>{SUPPORT_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#777" />
        </TouchableOpacity>

        {/* FAQ */}
        <Text style={styles.faqHeader}>Frequently Asked Questions</Text>
        {FAQS.map((faq, i) => (
          <TouchableOpacity
            key={i}
            style={styles.faqItem}
            onPress={() => toggle(i)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ expanded: expandedIndex === i }}
          >
            <View style={styles.faqTop}>
              <Text style={styles.faqQuestion}>{faq.question}</Text>
              <Ionicons
                name={expandedIndex === i ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#666"
              />
            </View>
            {expandedIndex === i && (
              <Text style={styles.faqAnswer}>{faq.answer}</Text>
            )}
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const QuickLink: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickLink} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={icon} size={22} color="#4700ec" />
    <Text style={styles.quickLinkLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  hero: {
    alignItems: 'center',
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E7E3EF',
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0ECFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  heroTitle: { color: '#18142F', fontSize: 21, fontWeight: '700', marginBottom: 8 },
  heroSubtitle: { color: '#777389', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  quickLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E7E3EF',
  },
  quickLink: { alignItems: 'center', gap: 6, flex: 1 },
  quickLinkLabel: { color: '#5F5968', fontSize: 11, textAlign: 'center' },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 18,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    gap: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  contactCopy: {
    flex: 1,
    minWidth: 0,
  },
  contactTitle: {
    color: '#18142F',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  contactEmail: {
    color: '#5B3FE5',
    fontSize: 12,
    fontWeight: '600',
  },
  faqHeader: {
    color: '#655F70',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: 20,
    marginTop: 28,
    marginBottom: 8,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: '#E7E3EF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  faqTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  faqQuestion: { color: '#18142F', fontSize: 14, fontWeight: '500', flex: 1, marginRight: 8 },
  faqAnswer: {
    color: '#777389',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
});

export default HelpCenter;
