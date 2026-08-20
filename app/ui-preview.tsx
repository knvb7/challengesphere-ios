import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  ink: '#17142D',
  muted: '#716F85',
  purple: '#6C4FF8',
  lavender: '#EEE9FF',
  coral: '#FF6F61',
  mint: '#59D5B3',
  lemon: '#FFD972',
  sky: '#63BDF4',
  line: '#EDEAF4',
  canvas: '#F8F7FC',
  white: '#FFFFFF',
};

const challenges = [
  {
    title: '30 Days of Movement',
    meta: 'Day 18 of 30',
    people: '2.4k',
    image: require('../assets/images/challenge-fallbacks/fitness-1.png'),
    accent: COLORS.coral,
    progress: 60,
  },
  {
    title: 'Build in Public',
    meta: 'Day 9 of 21',
    people: '896',
    image: require('../assets/images/challenge-fallbacks/creativity-2.png'),
    accent: COLORS.purple,
    progress: 43,
  },
  {
    title: 'Mindful Mornings',
    meta: 'Day 12 of 14',
    people: '1.1k',
    image: require('../assets/images/challenge-fallbacks/lifestyle-2.png'),
    accent: COLORS.mint,
    progress: 86,
  },
];

const categories = [
  { label: 'Fun', icon: 'happy-outline' as const, color: '#FFF4E8', ink: '#E07A2D' },
  { label: 'Fitness', icon: 'barbell-outline' as const, color: '#FFF0EE', ink: COLORS.coral },
  { label: 'Creative', icon: 'color-palette-outline' as const, color: '#F0ECFF', ink: COLORS.purple },
  { label: 'Mindful', icon: 'leaf-outline' as const, color: '#E8FBF5', ink: '#25A786' },
  { label: 'Learning', icon: 'book-outline' as const, color: '#FFF8DD', ink: '#D69A13' },
];

function NavItem({ icon, label, active }: { icon: keyof typeof Ionicons.glyphMap; label: string; active?: boolean }) {
  return (
    <Pressable style={[styles.navItem, active && styles.navItemActive]}>
      <Ionicons name={icon} size={20} color={active ? COLORS.purple : COLORS.muted} />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function ChallengeCard({ item }: { item: (typeof challenges)[number] }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Image source={item.image} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <View style={styles.cardTopline}>
          <View style={[styles.liveDot, { backgroundColor: item.accent }]} />
          <Text style={styles.cardEyebrow}>ACTIVE CHALLENGE</Text>
          <Ionicons name="bookmark-outline" size={19} color={COLORS.ink} style={styles.bookmark} />
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${item.progress}%`, backgroundColor: item.accent }]} />
        </View>
        <View style={styles.cardMetaRow}>
          <Text style={styles.cardMeta}>{item.meta}</Text>
          <View style={styles.peopleRow}>
            <Ionicons name="people-outline" size={15} color={COLORS.muted} />
            <Text style={styles.cardMeta}>{item.people}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function UIPreview() {
  const { width } = useWindowDimensions();
  const compact = width < 780;
  const [joined, setJoined] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.shell}>
        {!compact && (
          <View style={styles.sidebar}>
            <View style={styles.brandRow}>
              <LinearGradient colors={[COLORS.purple, '#9B72FF']} style={styles.logoMark}>
                <Ionicons name="sparkles" size={18} color={COLORS.white} />
              </LinearGradient>
              <Text style={styles.brand}>ChallengeSphere</Text>
            </View>
            <View style={styles.navGroup}>
              <NavItem icon="grid-outline" label="Discover" active />
              <NavItem icon="trophy-outline" label="My challenges" />
              <NavItem icon="people-outline" label="Community" />
              <NavItem icon="stats-chart-outline" label="Progress" />
            </View>
            <View style={styles.sidebarSpacer} />
            <View style={styles.streakCard}>
              <View style={styles.streakIcon}>
                <Ionicons name="flame" size={22} color={COLORS.coral} />
              </View>
              <Text style={styles.streakNumber}>12 day streak</Text>
              <Text style={styles.streakCopy}>You’re on a roll. Keep showing up!</Text>
            </View>
            <NavItem icon="settings-outline" label="Settings" />
          </View>
        )}

        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topbar}>
            {compact ? (
              <View style={styles.brandRow}>
                <LinearGradient colors={[COLORS.purple, '#9B72FF']} style={styles.logoMark}>
                  <Ionicons name="sparkles" size={18} color={COLORS.white} />
                </LinearGradient>
                <Text style={styles.brand}>ChallengeSphere</Text>
              </View>
            ) : <View />}
            <View style={styles.topActions}>
              <Pressable style={styles.iconButton}><Ionicons name="search" size={20} color={COLORS.ink} /></Pressable>
              <Pressable style={styles.iconButton}><Ionicons name="notifications-outline" size={20} color={COLORS.ink} /></Pressable>
              <View style={styles.avatar}><Text style={styles.avatarText}>PD</Text></View>
            </View>
          </View>

          <View style={[styles.hero, compact && styles.heroCompact]}>
            <LinearGradient colors={['#F0ECFF', '#FFF6EF', '#EDFCF8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.heroOrnamentOne} />
            <View style={styles.heroOrnamentTwo} />
            <View style={styles.heroText}>
              <View style={styles.pill}><Ionicons name="sparkles" size={14} color={COLORS.purple} /><Text style={styles.pillText}>YOUR NEXT WIN STARTS HERE</Text></View>
              <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>Small steps.{`\n`}Big momentum.</Text>
              <Text style={styles.heroCopy}>Join people turning everyday goals into something worth celebrating.</Text>
              <View style={styles.heroActions}>
                <Pressable onPress={() => setJoined(!joined)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  <Text style={styles.primaryButtonText}>{joined ? 'You’re in!' : 'Explore challenges'}</Text>
                  <Ionicons name={joined ? 'checkmark' : 'arrow-forward'} size={18} color={COLORS.white} />
                </Pressable>
                <Pressable style={styles.secondaryButton}><Ionicons name="play-circle-outline" size={20} color={COLORS.purple} /><Text style={styles.secondaryButtonText}>How it works</Text></Pressable>
              </View>
            </View>
            {!compact && (
              <View style={styles.heroVisual}>
                <View style={styles.miniCardBack} />
                <View style={styles.miniCard}>
                  <View style={styles.miniIcon}><Ionicons name="sunny" size={26} color="#E8A91A" /></View>
                  <Text style={styles.miniLabel}>TODAY’S CHECK-IN</Text>
                  <Text style={styles.miniTitle}>Morning reset</Text>
                  <View style={styles.checkRow}><View style={styles.checkCircle}><Ionicons name="checkmark" size={15} color={COLORS.white} /></View><Text style={styles.checkText}>10 min meditation</Text></View>
                  <View style={styles.rewardRow}><Ionicons name="sparkles" size={15} color={COLORS.purple} /><Text style={styles.rewardText}>+25 momentum</Text></View>
                </View>
              </View>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <View><Text style={styles.sectionTitle}>Find your challenge</Text><Text style={styles.sectionCopy}>Pick a focus and make it yours.</Text></View>
            <Pressable style={styles.viewAll}><Text style={styles.viewAllText}>View all</Text><Ionicons name="arrow-forward" size={16} color={COLORS.purple} /></Pressable>
          </View>
          <View style={styles.categoryRow}>
            {categories.map((category) => (
              <Pressable key={category.label} style={({ pressed }) => [styles.category, pressed && styles.pressed]}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color }]}><Ionicons name={category.icon} size={22} color={category.ink} /></View>
                <Text style={styles.categoryText}>{category.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#B2AEC0" />
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <View><Text style={styles.sectionTitle}>Trending now</Text><Text style={styles.sectionCopy}>Popular with the community this week.</Text></View>
          </View>
          <View style={styles.cardsGrid}>
            {challenges.map((challenge) => <ChallengeCard key={challenge.title} item={challenge} />)}
          </View>
        </ScrollView>

        {compact && (
          <View style={styles.mobileNav}>
            <NavItem icon="grid-outline" label="Discover" active />
            <NavItem icon="trophy-outline" label="Challenges" />
            <Pressable style={styles.fab}><Ionicons name="add" size={26} color={COLORS.white} /></Pressable>
            <NavItem icon="people-outline" label="Community" />
            <NavItem icon="person-outline" label="Profile" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const shadow = Platform.select({
  web: { boxShadow: '0 16px 40px rgba(42, 31, 88, 0.08)' } as any,
  default: { shadowColor: '#342565', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  shell: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.canvas },
  sidebar: { width: 246, paddingHorizontal: 22, paddingVertical: 28, backgroundColor: COLORS.white, borderRightWidth: 1, borderRightColor: COLORS.line },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  brand: { fontSize: 18, fontWeight: '700', color: COLORS.ink, letterSpacing: -0.5 },
  navGroup: { gap: 6, marginTop: 40 },
  navItem: { minHeight: 46, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  navItemActive: { backgroundColor: COLORS.lavender },
  navLabel: { fontSize: 14, fontWeight: '600', color: COLORS.muted },
  navLabelActive: { color: COLORS.purple, fontWeight: '700' },
  sidebarSpacer: { flex: 1 },
  streakCard: { backgroundColor: '#FFF7F2', borderRadius: 20, padding: 16, marginBottom: 18 },
  streakIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFE7DF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  streakNumber: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  streakCopy: { fontSize: 12, color: COLORS.muted, lineHeight: 18, marginTop: 5 },
  main: { flex: 1 },
  mainContent: { paddingHorizontal: 32, paddingBottom: 60, width: '100%', maxWidth: 1300, alignSelf: 'center' },
  topbar: { height: 84, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  avatarText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  hero: { minHeight: 380, borderRadius: 32, overflow: 'hidden', padding: 46, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EEE9F4' },
  heroCompact: { paddingHorizontal: 24, paddingVertical: 34, minHeight: 430 },
  heroOrnamentOne: { position: 'absolute', right: -40, top: -70, width: 210, height: 210, borderRadius: 105, backgroundColor: 'rgba(108,79,248,0.08)' },
  heroOrnamentTwo: { position: 'absolute', left: '48%', bottom: -90, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(89,213,179,0.13)' },
  heroText: { flex: 1, maxWidth: 600, zIndex: 2 },
  pill: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.78)', paddingHorizontal: 13, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: 'rgba(108,79,248,0.1)' },
  pillText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1, color: COLORS.purple },
  heroTitle: { marginTop: 18, fontSize: 53, lineHeight: 57, letterSpacing: -2.5, fontWeight: '700', color: COLORS.ink },
  heroTitleCompact: { fontSize: 40, lineHeight: 44 },
  heroCopy: { marginTop: 16, color: '#5E5A72', fontSize: 16, lineHeight: 25, maxWidth: 500 },
  heroActions: { marginTop: 26, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  primaryButton: { minHeight: 50, borderRadius: 16, paddingHorizontal: 20, backgroundColor: COLORS.purple, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...shadow },
  primaryButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  secondaryButton: { minHeight: 50, borderRadius: 16, paddingHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.76)', borderWidth: 1, borderColor: '#E8E2F2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  secondaryButtonText: { color: COLORS.ink, fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  heroVisual: { width: 330, alignItems: 'center', justifyContent: 'center' },
  miniCardBack: { position: 'absolute', width: 230, height: 270, borderRadius: 28, backgroundColor: '#CFC5FF', transform: [{ rotate: '9deg' }, { translateX: 16 }] },
  miniCard: { width: 235, minHeight: 275, borderRadius: 28, padding: 24, backgroundColor: COLORS.white, transform: [{ rotate: '-3deg' }], ...shadow },
  miniIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: '#FFF5D4', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  miniLabel: { fontSize: 9, color: COLORS.muted, letterSpacing: 1, fontWeight: '700' },
  miniTitle: { fontSize: 21, color: COLORS.ink, fontWeight: '700', marginTop: 7, marginBottom: 22 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkCircle: { width: 25, height: 25, borderRadius: 9, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: COLORS.ink, fontWeight: '600', fontSize: 13 },
  rewardRow: { marginTop: 22, paddingTop: 15, borderTopWidth: 1, borderTopColor: COLORS.line, flexDirection: 'row', alignItems: 'center', gap: 7 },
  rewardText: { color: COLORS.purple, fontSize: 12, fontWeight: '700' },
  sectionHeader: { marginTop: 36, marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionTitle: { color: COLORS.ink, fontSize: 24, fontWeight: '700', letterSpacing: -0.7 },
  sectionCopy: { color: COLORS.muted, fontSize: 13, marginTop: 5 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  viewAllText: { color: COLORS.purple, fontSize: 13, fontWeight: '700' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  category: { flex: 1, minWidth: 180, minHeight: 74, borderRadius: 20, paddingHorizontal: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, flexDirection: 'row', alignItems: 'center', gap: 11 },
  categoryIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  categoryText: { flex: 1, color: COLORS.ink, fontWeight: '700', fontSize: 14 },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { flex: 1, minWidth: 260, backgroundColor: COLORS.white, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.line, ...shadow },
  cardImage: { width: '100%', height: 155, resizeMode: 'cover' },
  cardBody: { padding: 18 },
  cardTopline: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  cardEyebrow: { color: COLORS.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.9 },
  bookmark: { marginLeft: 'auto' },
  cardTitle: { color: COLORS.ink, fontWeight: '700', fontSize: 18, marginTop: 10, letterSpacing: -0.4 },
  progressTrack: { marginTop: 18, height: 6, borderRadius: 4, backgroundColor: '#EFEDF4', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  cardMetaRow: { marginTop: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  peopleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mobileNav: { position: 'absolute', left: 12, right: 12, bottom: 10, height: 70, borderRadius: 22, paddingHorizontal: 10, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', ...shadow },
  fab: { width: 48, height: 48, borderRadius: 17, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center', marginTop: -22 },
});
