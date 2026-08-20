import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import FloatingScreenControls from '@/components/common/FloatingScreenControls';
import { LEGAL_URLS } from '@/constants/legalLinks';
import { ADS_ENABLED_FOR_PLATFORM } from '@/constants/releaseFeatures';
import React from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

const SUPPORT_EMAIL = 'ironside-dev@challengesphere.com';
const serviceProviderDescription = ADS_ENABLED_FOR_PLATFORM
  ? 'cloud hosting, storage, authentication, messaging, notifications, advertising, analytics, crash diagnostics, and customer support providers'
  : 'cloud hosting, storage, authentication, messaging, notifications, analytics, crash diagnostics, and customer support providers';

const advertisingSection = ADS_ENABLED_FOR_PLATFORM
  ? {
      title: 'Advertising and ad privacy',
      body: [
        'Eligible adult users may see clearly labelled, non-personalized ads supplied by Google Mobile Ads. We do not show ads to users under 18 or to premium users.',
        'The advertising SDK may process information such as IP address, general location derived from IP address, device or app identifiers, ad views and interactions, and diagnostic information to deliver basic ads, measure performance, prevent fraud, and keep ads secure.',
        'ChallengeSphere does not send your date of birth, exact age, gender, interests, username, photos, challenge activity, or connected-app activity to the advertising SDK as ad-targeting data.',
        'On iOS, the app asks for App Tracking Transparency permission before initializing the advertising SDK. Every app feature remains available if you decline. Where required, you can also reopen Google advertising privacy choices from Privacy & Safety.',
      ],
    }
  : {
      title: 'Advertising',
      body: [
        'This iPhone and iPad build does not include or display advertising and does not initialize Google Mobile Ads or request App Tracking Transparency permission.',
      ],
    };

const sections = [
  {
    title: 'Information we collect',
    body: [
      'Account and profile details such as your name, username, email address, phone number, date of birth or age, gender, country, bio, profile photo, interests, and account preferences.',
      'Authentication details from Sign in with Apple, including the provider-specific account identifier, verified email address, and any name you choose to share. Apple may provide a private relay address when you use Hide My Email.',
      'Challenge activity such as challenges you create or join, submissions, submission photos, comments, glories, leaderboards, streaks, followers, following, invites, and reports.',
      'Integration data that you choose to connect, including sign-in information and coding platform handles or solved-problem summaries for services such as LeetCode and Codeforces.',
      'Device and app data such as device type, app version, push notification token, log data, approximate diagnostics, crash reports, and actions needed to keep the app reliable and secure.',
      'Subscription and purchase-entitlement details from the App Store and RevenueCat, such as product, store, renewal, expiration, and entitlement status. We do not receive your payment-card details.',
      'If you grant Contacts permission, names and phone numbers are read and searched on your device only so you can open a user-directed share. ChallengeSphere does not upload your address book.',
    ],
  },
  {
    title: 'How we use information',
    body: [
      'We use information to create and secure your account, show challenges and profiles, process submissions, power followers and following, send notifications, personalize your experience, and provide support.',
      'We also use information to detect abuse, prevent spam or unsafe behavior, debug performance issues, improve app reliability, and comply with legal obligations.',
    ],
  },
  {
    title: 'Photos, submissions, and public content',
    body: [
      'ChallengeSphere is a social challenge app, so some content is meant to be visible to other users. Depending on the challenge, your privacy settings, and app features, your username, profile photo, submissions, submission photos, comments, rankings, follower lists, and challenge activity may be visible to other users.',
      'Please avoid uploading sensitive personal information in photos, comments, challenge descriptions, or submissions. If you believe content should be removed, contact us at ironside-dev@challengesphere.com.',
    ],
  },
  {
    title: 'How we share information',
    body: [
      `We do not sell your personal information. We may share information with service providers that help us run ChallengeSphere, such as ${serviceProviderDescription}.`,
      'We may also share information when required by law, to protect users and the app, to investigate abuse or security issues, or as part of a business transaction such as a merger, financing, or acquisition.',
    ],
  },
  advertisingSection,
  {
    title: 'Sign in with Apple',
    body: [
      'ChallengeSphere uses Sign in with Apple on iPhone and iPad. We use the Apple account identifier to recognize your account and capture name or email only when Apple supplies it.',
      'If you delete your ChallengeSphere account, we remove the linked Apple identity from active account data and request revocation of the associated Apple authorization.',
    ],
  },
  {
    title: 'Subscriptions and purchases',
    body: [
      'Apple processes your payment. RevenueCat helps us verify Premium status, restore purchases, and synchronize entitlement state. Deleting a ChallengeSphere account does not cancel App Store billing.',
    ],
  },
  {
    title: 'Data retention',
    body: [
      'We keep information for as long as needed to provide ChallengeSphere, maintain security, meet legal obligations, resolve disputes, and improve the service.',
      'After account deletion, keyed, non-readable fingerprints of the email address and username are retained for up to 90 days for deletion auditing and abuse prevention. The original values and display name are not retained in that record. Other profile data is anonymized or removed through the account-deletion process.',
      'ChallengeSphere removes its local subscription row during deletion. Apple and RevenueCat may retain pseudonymous transaction, entitlement, renewal, refund, and expiry records as needed to administer the still-separate App Store subscription, meet financial obligations, and support a user-initiated future restore.',
      'Private challenges you created are taken offline. Public challenges you created and their cover media may remain available under an anonymized deleted account so existing participants can continue. Profile, submission, and private-challenge media are queued for controlled cleanup.',
      'Some content may remain in backups, logs, moderation records, or other safety records for a limited period after deletion. Public content copied, saved, or shared by other users may not be fully removable by us.',
    ],
  },
  {
    title: 'Your choices and rights',
    body: [
      'You can update account details in the app, change notification preferences, disconnect supported integrations, manage device permissions, and choose what you share in challenges and comments.',
      'You can request access, correction, deletion, or export of your personal information by contacting ironside-dev@challengesphere.com. We may need to verify your identity before completing a request.',
    ],
  },
  {
    title: 'Security',
    body: [
      'We use reasonable technical and organizational safeguards to protect your information. No internet service can guarantee perfect security, so protect the Apple or Google account used to sign in and contact us quickly if you believe your ChallengeSphere account has been compromised.',
    ],
  },
  {
    title: 'Children and minors',
    body: [
      'ChallengeSphere accounts require users to be at least 13 years old or the higher minimum age required in their location. If you are a minor, use the app only with permission from a parent or guardian when required by law.',
      ADS_ENABLED_FOR_PLATFORM
        ? 'ChallengeSphere does not request or display advertising for users under 18.'
        : 'This iPhone and iPad build does not display advertising.',
      'If you believe a child has provided personal information without proper consent, contact ironside-dev@challengesphere.com and we will review the request.',
    ],
  },
  {
    title: 'International processing',
    body: [
      'Your information may be processed and stored in countries other than where you live. When we transfer or process information, we take steps designed to protect it according to this policy.',
    ],
  },
  {
    title: 'Changes to this policy',
    body: [
      'We may update this policy as ChallengeSphere evolves. If changes are material, we will provide notice in the app or by another reasonable method. The updated policy will apply from the effective date shown on this page.',
    ],
  },
];

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  const { top: topInset } = useSafeAreaInsets();
  const contactSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FloatingScreenControls onBackPress={onBack} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { paddingTop: topInset + 12 }]}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={30} color="#ffffff" />
          </View>
          <Text style={styles.title} accessibilityRole="header">Privacy Policy</Text>
          <Text style={styles.effectiveDate}>Effective date: August 19, 2026</Text>
          <Text style={styles.intro}>
            This Privacy Policy explains how ChallengeSphere and Ironside collect, use,
            share, and protect information when you use the ChallengeSphere app.
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.body.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}

        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact us</Text>
          <Text style={styles.paragraph}>
            If you have questions, requests, or concerns about this policy or your data,
            write to ironside-dev@challengesphere.com.
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={contactSupport}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={18} color="#ffffff" />
            <Text style={styles.contactButtonText}>{SUPPORT_EMAIL}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.policyButton}
            onPress={() => Linking.openURL(LEGAL_URLS.privacy)}
            activeOpacity={0.8}
          >
            <Ionicons name="open-outline" size={18} color="#5B25D6" />
            <Text style={styles.policyButtonText}>Open the public Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 36,
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d8cff',
    marginBottom: 16,
    alignSelf: 'center',
  },
  title: {
    color: '#18142F',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  effectiveDate: {
    color: '#4700EC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },
  intro: {
    color: '#777389',
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 4,
  },
  contactSection: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: '#18142F',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  paragraph: {
    color: '#5F5A67',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 10,
  },
  contactButton: {
    marginTop: 8,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#4700ec',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  policyButton: {
    minHeight: 48,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9CCFA',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  policyButtonText: {
    color: '#5B25D6',
    fontSize: 13,
    fontWeight: '700',
  },
});
