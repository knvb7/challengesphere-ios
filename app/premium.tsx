import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import FloatingScreenControls from '@/components/common/FloatingScreenControls';
import PremiumBadge from '@/components/common/PremiumBadge';
import { LEGAL_URLS } from '@/constants/legalLinks';
import { ADS_ENABLED_FOR_PLATFORM } from '@/constants/releaseFeatures';
import { useSubscription } from '@/providers/SubscriptionContext';

const PLAN_CHALLENGE_LIMITS = {
  free: { public: 5, private: 5 },
  premium: { public: 20, private: 20 },
} as const;

const freeOffers = [
  { icon: 'earth-outline' as const, title: `${PLAN_CHALLENGE_LIMITS.free.public} public`, body: 'active challenges' },
  { icon: 'lock-closed-outline' as const, title: `${PLAN_CHALLENGE_LIMITS.free.private} private`, body: 'active challenges' },
  ...(ADS_ENABLED_FOR_PLATFORM
    ? [{ icon: 'megaphone-outline' as const, title: 'Ads included', body: 'supports the free plan' }]
    : []),
  { icon: 'person-outline' as const, title: 'Standard profile', body: 'all core profile features' },
];

const premiumOffers = [
  { icon: 'earth-outline' as const, title: `${PLAN_CHALLENGE_LIMITS.premium.public} public`, body: 'active challenges' },
  { icon: 'lock-closed-outline' as const, title: `${PLAN_CHALLENGE_LIMITS.premium.private} private`, body: 'active challenges' },
  ...(ADS_ENABLED_FOR_PLATFORM
    ? [{ icon: 'ban-outline' as const, title: 'No ads', body: 'a focused experience' }]
    : []),
  { icon: 'diamond-outline' as const, title: 'Diamond badge', body: 'stand out on your profile' },
];

const purchaseHighlights = [
  {
    icon: 'layers-outline' as const,
    value: `${PLAN_CHALLENGE_LIMITS.premium.public} + ${PLAN_CHALLENGE_LIMITS.premium.private}`,
    label: 'public & private',
  },
  ...(ADS_ENABLED_FOR_PLATFORM
    ? [{ icon: 'ban-outline' as const, value: 'No ads', label: 'stay focused' }]
    : []),
  { icon: 'diamond-outline' as const, value: 'Diamond', label: 'Premium badge' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const { top: topInset } = useSafeAreaInsets();
  const {
    status,
    isLoading,
    isPurchasePending,
    canPurchase,
    canRestore,
    presentPaywall,
    restorePurchases,
    manageSubscription,
  } = useSubscription();
  const isPremium = status?.premium ?? false;
  const currentPlanLimits = isPremium
    ? PLAN_CHALLENGE_LIMITS.premium
    : PLAN_CHALLENGE_LIMITS.free;
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FloatingScreenControls onBackPress={() => router.back()} tone="media" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topInset + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={['#3B0AAA', '#6D36E8', '#9A67FF']} style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="diamond" size={30} color="#5B25D6" />
          </View>
          {isPremium ? <PremiumBadge variant="membership" style={styles.heroBadge} /> : null}
          <Text style={styles.heroTitle} accessibilityRole="header">
            {isPremium ? 'Premium is active' : 'Do more. Stay focused.'}
          </Text>
          <Text style={styles.heroBody}>
            {isPremium
              ? (ADS_ENABLED_FOR_PLATFORM
                ? 'Your higher challenge limits, badge, and ad-free experience are enabled.'
                : 'Your higher challenge limits and Premium profile badge are enabled.')
              : (ADS_ENABLED_FOR_PLATFORM
                ? 'Build more habits and friendly rivalries without interruptions.'
                : 'Unlock higher challenge limits and a Premium profile badge.')}
          </Text>
        </LinearGradient>

        <View style={styles.usageCard}>
          <Text style={styles.sectionTitle}>Your active challenges</Text>
          {isLoading && !status ? (
            <ActivityIndicator color="#5B25D6" style={styles.loader} />
          ) : (
            <View style={styles.usageRow}>
              <Usage
                label="Public"
                value={status?.activePublicChallenges ?? 0}
                limit={status?.publicChallengeLimit ?? currentPlanLimits.public}
              />
              <View style={styles.usageDivider} />
              <Usage
                label="Private"
                value={status?.activePrivateChallenges ?? 0}
                limit={status?.privateChallengeLimit ?? currentPlanLimits.private}
              />
            </View>
          )}
        </View>

        {isPremium ? (
          <View style={styles.membershipCard}>
            <View style={styles.membershipTitleRow}>
              <View style={styles.membershipDiamond}>
                <Ionicons name="diamond" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.membershipTitleCopy}>
                <Text style={styles.sectionTitleCompact}>Your membership</Text>
                <Text style={styles.membershipStatus}>Premium · {formatStatus(status?.status)}</Text>
              </View>
              <PremiumBadge />
            </View>
            <View style={styles.membershipDetails}>
              <MembershipDetail
                icon="calendar-outline"
                label={status?.willRenew ? 'Renews' : 'Access until'}
                value={formatDate(status?.expiresAt)}
              />
              <MembershipDetail
                icon="card-outline"
                label="Billing"
                value="App Store"
              />
            </View>

            <TouchableOpacity
              style={[styles.membershipManageButton, isPurchasePending && styles.disabledButton]}
              onPress={manageSubscription}
              disabled={isPurchasePending}
            >
              {isPurchasePending ? (
                <ActivityIndicator color="#5B25D6" />
              ) : (
                <>
                  <Ionicons name="settings-outline" size={17} color="#5B25D6" />
                  <Text style={styles.membershipManageButtonText}>Manage subscription</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <LinearGradient
            colors={['#211049', '#4B1DA7', '#6D36E8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.upgradeCard}
          >
            <View style={styles.upgradeHeader}>
              <View style={styles.upgradeDiamond}>
                <Ionicons name="diamond" size={22} color="#6D36E8" />
              </View>
              <View style={styles.upgradeHeaderCopy}>
                <Text style={styles.upgradeEyebrow}>CHALLENGESPHERE PREMIUM</Text>
                <Text style={styles.upgradeTitle}>Unlock your full challenge capacity</Text>
              </View>
            </View>

            <View style={styles.upgradeBenefits}>
              {purchaseHighlights.map((highlight) => (
                <View key={highlight.value} style={styles.upgradeBenefit}>
                  <Ionicons name={highlight.icon} size={16} color="#DCCFFF" />
                  <Text style={styles.upgradeBenefitValue}>{highlight.value}</Text>
                  <Text style={styles.upgradeBenefitLabel}>{highlight.label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.upgradeButton,
                (isPurchasePending || (isLoading && !status) || !canPurchase) && styles.upgradeButtonDisabled,
              ]}
              onPress={presentPaywall}
              disabled={isPurchasePending || (isLoading && !status) || !canPurchase}
              accessibilityLabel="Choose a ChallengeSphere Premium plan"
            >
              {isPurchasePending || (isLoading && !status) ? (
                <ActivityIndicator color="#4B1DA7" />
              ) : (
                <>
                  <Text style={styles.upgradeButtonText}>
                    {canPurchase ? 'Choose a plan' : 'Plans unavailable'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#4B1DA7" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.checkoutNote}>
              <Ionicons name="shield-checkmark-outline" size={15} color="#DCCFFF" />
              <Text style={styles.checkoutNoteText}>Secure monthly or annual checkout through the App Store</Text>
            </View>
          </LinearGradient>
        )}

        <View style={styles.plansSection}>
          <Text style={styles.plansTitle}>Compare plans</Text>
          <Text style={styles.plansSubtitle}>Active limits include challenges you create or join.</Text>
          <View style={styles.planColumns}>
            <PlanCard
              name="FREE"
              headline="Free forever"
              caption="The core experience"
              offers={freeOffers}
              current={!isPremium}
            />
            <PlanCard
              name="PREMIUM"
              headline="Monthly or annual"
              caption="Get. More. Done."
              offers={premiumOffers}
              premium
              current={isPremium}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.restoreButton, !canRestore && styles.restoreButtonDisabled]}
          onPress={restorePurchases}
          disabled={isPurchasePending || !canRestore}
        >
          <Text style={[styles.restoreButtonText, !canRestore && styles.restoreButtonTextDisabled]}>
            Restore purchases
          </Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          Monthly and annual prices are shown in the App Store checkout. Subscriptions renew automatically until cancelled.
        </Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URLS.terms)}>
            <Text style={styles.legalLinkText}>Terms of Use</Text>
          </TouchableOpacity>
          <Text style={styles.legalLinkSeparator}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URLS.privacy)}>
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Usage({ label, value, limit }: { label: string; value: number; limit: number }) {
  const progress = limit > 0 ? Math.min(100, Math.round((value / limit) * 100)) : 0;
  return (
    <View style={styles.usageItem}>
      <Text style={styles.usageValue}>{value} / {limit}</Text>
      <Text style={styles.usageLabel}>{label}</Text>
      <View style={styles.usageTrack}>
        <View style={[styles.usageFill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

function MembershipDetail({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.membershipDetail}>
      <Ionicons name={icon} size={16} color="#5B25D6" />
      <View>
        <Text style={styles.membershipDetailLabel}>{label}</Text>
        <Text style={styles.membershipDetailValue}>{value}</Text>
      </View>
    </View>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatStatus(value?: string | null): string {
  if (!value) return 'Not available';
  return value.toLowerCase().split('_').map((part) => (
    part ? `${part[0].toUpperCase()}${part.slice(1)}` : part
  )).join(' ');
}

interface PlanOffer {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

function PlanCard({
  name,
  headline,
  caption,
  offers,
  premium = false,
  current,
}: {
  name: string;
  headline: string;
  caption: string;
  offers: PlanOffer[];
  premium?: boolean;
  current: boolean;
}) {
  return (
    <View style={[styles.planCard, premium && styles.premiumPlanCard]}>
      <LinearGradient
        colors={premium ? ['#4B16BD', '#7A3FF0'] : ['#F3F1F5', '#ECE9F0']}
        style={styles.planHeader}
      >
        <View style={styles.planHeaderTop}>
          <Text style={[styles.planName, premium && styles.premiumPlanName]}>{name}</Text>
          <View style={[styles.planStatusPill, premium && styles.premiumPlanStatusPill]}>
            <Text style={[styles.planStatusText, premium && styles.premiumPlanStatusText]}>
              {current ? 'CURRENT' : premium ? 'UPGRADE' : 'INCLUDED'}
            </Text>
          </View>
        </View>
        <Text style={[styles.planHeadline, premium && styles.premiumPlanHeadline]}>{headline}</Text>
        <Text style={[styles.planCaption, premium && styles.premiumPlanCaption]}>{caption}</Text>
      </LinearGradient>
      <View style={styles.planOffers}>
        {offers.map((offer, index) => (
          <View
            key={offer.title}
            style={[styles.planOffer, index === offers.length - 1 && styles.planOfferLast]}
          >
            <View style={[styles.planOfferIcon, premium && styles.premiumPlanOfferIcon]}>
              <Ionicons name={offer.icon} size={14} color={premium ? '#5B25D6' : '#6E687C'} />
            </View>
            <View style={styles.planOfferCopy}>
              <Text style={[styles.planOfferTitle, premium && styles.premiumText]}>{offer.title}</Text>
              <Text style={styles.planOfferBody}>{offer.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F7FC' },
  content: { padding: 16, paddingBottom: 36 },
  hero: { borderRadius: 24, paddingHorizontal: 24, paddingVertical: 30, alignItems: 'center' },
  heroIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroBadge: { marginBottom: 10 },
  heroTitle: { color: '#FFFFFF', fontSize: 25, lineHeight: 30, fontWeight: '800', textAlign: 'center' },
  heroBody: { color: '#EDE6FF', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  usageCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E3EF', borderRadius: 20, padding: 18, marginTop: 16 },
  sectionTitle: { color: '#18142F', fontSize: 16, fontWeight: '700', marginBottom: 16 },
  loader: { marginVertical: 10 },
  usageRow: { flexDirection: 'row', alignItems: 'center' },
  usageItem: { flex: 1, alignItems: 'center' },
  usageDivider: { width: 1, height: 38, backgroundColor: '#E7E3EF' },
  usageValue: { color: '#5B25D6', fontSize: 20, fontWeight: '800' },
  usageLabel: { color: '#777389', fontSize: 12, marginTop: 3 },
  usageTrack: { width: '72%', height: 4, borderRadius: 2, backgroundColor: '#E7E3EF', overflow: 'hidden', marginTop: 8 },
  usageFill: { height: '100%', borderRadius: 2, backgroundColor: '#6D36E8' },
  membershipCard: { backgroundColor: '#F0EBFF', borderWidth: 1, borderColor: '#D9CBFF', borderRadius: 20, padding: 17, marginTop: 16 },
  membershipTitleRow: { flexDirection: 'row', alignItems: 'center' },
  membershipDiamond: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5B25D6', marginRight: 11 },
  membershipTitleCopy: { flex: 1 },
  sectionTitleCompact: { color: '#18142F', fontSize: 15, lineHeight: 19, fontWeight: '800' },
  membershipStatus: { color: '#5B25D6', fontSize: 12, lineHeight: 16, fontWeight: '700', marginTop: 2 },
  membershipDetails: { flexDirection: 'row', gap: 10, marginTop: 15 },
  membershipDetail: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 13, backgroundColor: '#FFFFFF', padding: 10 },
  membershipDetailLabel: { color: '#817B8D', fontSize: 8, lineHeight: 11, fontWeight: '700', textTransform: 'uppercase' },
  membershipDetailValue: { color: '#312C3B', fontSize: 10, lineHeight: 14, fontWeight: '800', marginTop: 1 },
  membershipManageButton: { minHeight: 46, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D9CBFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  membershipManageButtonText: { color: '#5B25D6', fontSize: 13, fontWeight: '800' },
  upgradeCard: { borderRadius: 22, padding: 18, marginTop: 16, overflow: 'hidden' },
  upgradeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  upgradeDiamond: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  upgradeHeaderCopy: { flex: 1, minWidth: 0 },
  upgradeEyebrow: { color: '#DCCFFF', fontSize: 9, lineHeight: 12, fontWeight: '900', letterSpacing: 0.8 },
  upgradeTitle: { color: '#FFFFFF', fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 3 },
  upgradeBenefits: { flexDirection: 'row', gap: 8, marginTop: 17 },
  upgradeBenefit: { flex: 1, minWidth: 0, minHeight: 76, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, paddingVertical: 9 },
  upgradeBenefitValue: { color: '#FFFFFF', fontSize: 11, lineHeight: 15, fontWeight: '900', marginTop: 5, textAlign: 'center' },
  upgradeBenefitLabel: { color: '#DCCFFF', fontSize: 8, lineHeight: 11, fontWeight: '600', marginTop: 1, textAlign: 'center' },
  upgradeButton: { minHeight: 50, borderRadius: 16, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  upgradeButtonDisabled: { opacity: 0.58 },
  upgradeButtonText: { color: '#4B1DA7', fontSize: 15, fontWeight: '900' },
  checkoutNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  checkoutNoteText: { flexShrink: 1, color: '#DCCFFF', fontSize: 9, lineHeight: 13, fontWeight: '600', textAlign: 'center' },
  plansSection: { marginTop: 20 },
  plansTitle: { color: '#18142F', fontSize: 19, lineHeight: 24, fontWeight: '800' },
  plansSubtitle: { color: '#777389', fontSize: 12, lineHeight: 17, marginTop: 3, marginBottom: 14 },
  planColumns: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  planCard: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDD8E7', borderRadius: 20, overflow: 'hidden' },
  premiumPlanCard: { backgroundColor: '#FBF9FF', borderWidth: 2, borderColor: '#6D36E8', shadowColor: '#6D36E8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 3 },
  planHeader: { minHeight: 112, paddingHorizontal: 12, paddingVertical: 13 },
  planHeaderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  planName: { color: '#514B5C', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  premiumPlanName: { color: '#FFFFFF' },
  planStatusPill: { height: 18, borderRadius: 9, paddingHorizontal: 6, backgroundColor: '#DDD9E1', alignItems: 'center', justifyContent: 'center' },
  premiumPlanStatusPill: { backgroundColor: '#FFFFFF26' },
  planStatusText: { color: '#625B6C', fontSize: 7, fontWeight: '900', letterSpacing: 0.4 },
  premiumPlanStatusText: { color: '#FFFFFF' },
  planHeadline: { color: '#18142F', fontSize: 17, lineHeight: 21, fontWeight: '900', marginTop: 18 },
  premiumPlanHeadline: { color: '#FFFFFF' },
  planCaption: { color: '#817B8D', fontSize: 9, lineHeight: 12, marginTop: 3 },
  premiumPlanCaption: { color: '#E6DAFF' },
  premiumText: { color: '#4D17C3' },
  planOffers: { width: '100%', paddingHorizontal: 10 },
  planOffer: { minHeight: 60, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EFECF3', paddingVertical: 9 },
  planOfferLast: { borderBottomWidth: 0 },
  planOfferIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1EEF4', alignItems: 'center', justifyContent: 'center', marginRight: 7, flexShrink: 0 },
  premiumPlanOfferIcon: { backgroundColor: '#E7DDFF' },
  planOfferCopy: { flex: 1, minWidth: 0 },
  planOfferTitle: { color: '#312C3B', fontSize: 11, lineHeight: 14, fontWeight: '800' },
  planOfferBody: { color: '#817B8D', fontSize: 8, lineHeight: 11, marginTop: 1 },
  disabledButton: { opacity: 0.65 },
  restoreButton: { height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  restoreButtonDisabled: { opacity: 0.55 },
  restoreButtonText: { color: '#5B25D6', fontSize: 14, fontWeight: '700' },
  restoreButtonTextDisabled: { color: '#918A9D' },
  disclaimer: { color: '#8B8798', fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: 12 },
  legalLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  legalLinkText: { color: '#5B25D6', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  legalLinkSeparator: { color: '#8B8798', fontSize: 11, lineHeight: 16 },
});
