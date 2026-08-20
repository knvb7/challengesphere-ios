import { Ionicons } from '@expo/vector-icons';
import { LEGAL_URLS } from '@/constants/legalLinks';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';

const RULES = [
  ['Use ChallengeSphere safely', 'Choose challenges that fit your health, ability, environment, and local laws. Stop if an activity feels unsafe. ChallengeSphere does not provide medical advice.'],
  ['Share honest progress', 'Post your own genuine progress. Do not manipulate submissions, impersonate another person, or claim work you did not do.'],
  ['Respect people and privacy', 'No harassment, hate, threats, sexual exploitation, bullying, doxxing, or unwanted contact. Get permission before showing another person.'],
  ['Keep harmful content out', 'Do not post illegal activity, graphic violence, dangerous instructions, scams, spam, or content that infringes another person’s rights.'],
  ['Private still requires care', 'Private challenge content is limited to its participants, but participants can save or share what they see. Avoid secrets, exact locations, and sensitive personal information.'],
  ['Moderation and reports', 'You can report an individual challenge, post, comment, or account, and you can block accounts. We may remove content, restrict features, or disable accounts to protect people and enforce these rules.'],
] as const;

export default function CommunityRulesScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#18142F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Community Rules</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <Ionicons name="shield-checkmark-outline" size={30} color="#5B3FE5" />
          <Text style={styles.title}>Build each other up.</Text>
          <Text style={styles.body}>
            By creating an account or posting content, you agree to use ChallengeSphere lawfully,
            respect these rules, and only upload content you have the right to share.
          </Text>
          <Text style={styles.version}>Current version: 22 July 2026</Text>
        </View>

        {RULES.map(([title, body], index) => (
          <View key={title} style={styles.ruleCard}>
            <View style={styles.numberBadge}><Text style={styles.number}>{index + 1}</Text></View>
            <View style={styles.ruleCopy}>
              <Text style={styles.ruleTitle}>{title}</Text>
              <Text style={styles.ruleBody}>{body}</Text>
            </View>
          </View>
        ))}

        <View style={styles.termsCard}>
          <Text style={styles.ruleTitle}>Terms of Use</Text>
          <Text style={styles.ruleBody}>
            You retain ownership of your content and give ChallengeSphere permission to host,
            process, display, and moderate it solely to operate and protect the service. Features
            may change, and accounts or content may be restricted for safety, legal compliance,
            or rule violations. You remain responsible for your conduct, challenge choices, and
            content. Where permitted by law, the service is provided without guarantees of
            uninterrupted availability or a particular outcome.
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URLS.terms)} style={styles.linkButton}>
            <Text style={styles.linkText}>Read the complete Terms of Use</Text>
            <Ionicons name="open-outline" size={15} color="#5B3FE5" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URLS.privacy)} style={styles.linkButton}>
            <Text style={styles.linkText}>Read the Privacy Policy</Text>
            <Ionicons name="open-outline" size={15} color="#5B3FE5" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URLS.support)} style={styles.linkButton}>
            <Text style={styles.linkText}>Contact Support</Text>
            <Ionicons name="arrow-forward" size={15} color="#5B3FE5" />
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          You will be asked to record acceptance of the current version before your first submission upload.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E7E3EF' },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#18142F', fontSize: 17, fontWeight: '700' },
  content: { padding: 18, paddingBottom: 40, gap: 12 },
  introCard: { padding: 20, borderRadius: 22, backgroundColor: '#F0ECFF', borderWidth: 1, borderColor: '#E7E3EF' },
  title: { color: '#18142F', fontSize: 24, fontWeight: '700', marginTop: 12 },
  body: { color: '#777389', fontSize: 14, lineHeight: 21, marginTop: 8 },
  version: { color: '#8f8399', fontSize: 12, marginTop: 14 },
  ruleCard: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E3EF' },
  numberBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0ECFF' },
  number: { color: '#4700EC', fontWeight: '700' },
  ruleCopy: { flex: 1 },
  ruleTitle: { color: '#18142F', fontSize: 15, fontWeight: '700' },
  ruleBody: { color: '#655F70', fontSize: 13, lineHeight: 19, marginTop: 5 },
  termsCard: { padding: 18, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E3EF' },
  linkButton: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  linkText: { color: '#5B3FE5', fontSize: 13, fontWeight: '700' },
  footer: { color: '#77717b', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
});
