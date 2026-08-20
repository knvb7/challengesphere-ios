import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const palette = {
  ink: '#18142F',
  muted: '#777389',
  purple: '#6C4FF8',
  lavender: '#EEE9FF',
  coral: '#FF7568',
  mint: '#51D4AE',
  yellow: '#FFD66B',
  blue: '#5EB8F5',
  canvas: '#F8F7FC',
  white: '#FFFFFF',
  line: '#ECE9F3',
};

type Filter = 'All' | 'Created' | 'Saved' | 'Completed';

const challenges = [
  {
    title: 'Morning Reset',
    category: 'Mindfulness',
    day: 'Day 12 of 14',
    progress: 86,
    filter: 'Saved' as Filter,
    accent: palette.mint,
    image: require('../assets/images/challenge-fallbacks/lifestyle-2.png'),
  },
  {
    title: '30 Days Strong',
    category: 'Fitness',
    day: 'Day 18 of 30',
    progress: 60,
    filter: 'Created' as Filter,
    accent: palette.coral,
    image: require('../assets/images/challenge-fallbacks/fitness-1.png'),
  },
  {
    title: 'Ship Something',
    category: 'Creativity',
    day: 'Day 9 of 21',
    progress: 43,
    filter: 'Created' as Filter,
    accent: palette.purple,
    image: require('../assets/images/challenge-fallbacks/creativity-2.png'),
  },
  {
    title: 'Read Every Day',
    category: 'Learning',
    day: 'Completed',
    progress: 100,
    filter: 'Completed' as Filter,
    accent: palette.yellow,
    image: require('../assets/images/challenge-fallbacks/learning-2.png'),
  },
];

function MiniStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ChallengeCard({ item }: { item: (typeof challenges)[number] }) {
  return (
    <Pressable style={({ pressed }) => [styles.challengeCard, pressed && styles.pressed]}>
      <ImageBackground source={item.image} style={styles.challengeImage} imageStyle={styles.challengeImageRadius}>
        <LinearGradient
          colors={['rgba(17,13,35,0.02)', 'rgba(17,13,35,0.8)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.cardTopRow}>
          <View style={styles.categoryPill}><Text style={styles.categoryPillText}>{item.category}</Text></View>
          <View style={styles.heartButton}><Ionicons name="heart-outline" size={16} color={palette.white} /></View>
        </View>
        <View>
          <Text style={styles.challengeTitle}>{item.title}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${item.progress}%`, backgroundColor: item.accent }]} />
          </View>
          <View style={styles.challengeMeta}>
            <Text style={styles.challengeDay}>{item.day}</Text>
            <Text style={styles.challengePercent}>{item.progress}%</Text>
          </View>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

function BottomItem({ icon, label, active }: { icon: keyof typeof Ionicons.glyphMap; label: string; active?: boolean }) {
  return (
    <Pressable style={styles.bottomItem}>
      <View style={[styles.bottomIconWrap, active && styles.bottomIconActive]}>
        <Ionicons name={icon} size={20} color={active ? palette.purple : '#9894A7'} />
      </View>
      <Text style={[styles.bottomLabel, active && styles.bottomLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export default function MyChallengesPreview() {
  const [filter, setFilter] = useState<Filter>('All');
  const [checkedIn, setCheckedIn] = useState(false);
  const visibleChallenges = useMemo(
    () => filter === 'All' ? challenges : challenges.filter((challenge) => challenge.filter === filter),
    [filter],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneCanvas}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>MY SPACE</Text>
              <Text style={styles.pageTitle}>My challenges</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable style={styles.iconButton}><Ionicons name="search" size={20} color={palette.ink} /></Pressable>
              <Pressable style={styles.avatar}><Text style={styles.avatarText}>PD</Text><View style={styles.onlineDot} /></Pressable>
            </View>
          </View>

          <LinearGradient colors={['#7658FA', '#9A72FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.momentumCard}>
            <View style={styles.momentumGlowOne} />
            <View style={styles.momentumGlowTwo} />
            <View style={styles.momentumHeader}>
              <View style={styles.flameBubble}><Ionicons name="flame" size={19} color={palette.yellow} /></View>
              <Text style={styles.momentumLabel}>YOUR MOMENTUM</Text>
              <View style={styles.weekChip}><Text style={styles.weekChipText}>This week</Text></View>
            </View>
            <View style={styles.momentumMain}>
              <View><Text style={styles.streakValue}>12</Text><Text style={styles.streakLabel}>day streak</Text></View>
              <View style={styles.weekDays}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                  <View key={`${day}-${index}`} style={styles.dayItem}>
                    <View style={[styles.dayCircle, index < 5 && styles.dayCircleDone]}>
                      {index < 5 ? <Ionicons name="checkmark" size={12} color={palette.purple} /> : <Text style={styles.dayDot}>·</Text>}
                    </View>
                    <Text style={styles.dayLabel}>{day}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.momentumDivider} />
            <View style={styles.statsRow}>
              <MiniStat value="4" label="active" color={palette.mint} />
              <MiniStat value="68%" label="on track" color={palette.yellow} />
              <MiniStat value="146" label="check-ins" color={palette.coral} />
            </View>
          </LinearGradient>

          <Pressable onPress={() => setCheckedIn(!checkedIn)} style={({ pressed }) => [styles.checkinCard, pressed && styles.pressed]}>
            <View style={[styles.checkinIcon, checkedIn && styles.checkinIconDone]}>
              <Ionicons name={checkedIn ? 'checkmark' : 'sparkles'} size={21} color={checkedIn ? palette.white : palette.purple} />
            </View>
            <View style={styles.checkinCopy}>
              <Text style={styles.checkinTitle}>{checkedIn ? 'All caught up!' : '2 check-ins waiting'}</Text>
              <Text style={styles.checkinText}>{checkedIn ? 'Beautiful work — come back tomorrow.' : 'Keep your streak glowing today.'}</Text>
            </View>
            <View style={styles.checkinArrow}><Ionicons name={checkedIn ? 'checkmark' : 'arrow-forward'} size={18} color={palette.purple} /></View>
          </Pressable>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Your collection</Text>
              <Text style={styles.sectionSubtitle}>{visibleChallenges.length} challenges</Text>
            </View>
            <Pressable style={styles.sortButton}><Ionicons name="options-outline" size={18} color={palette.ink} /></Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {(['All', 'Created', 'Saved', 'Completed'] as Filter[]).map((item) => (
              <Pressable
                key={item}
                onPress={() => setFilter(item)}
                style={[styles.filterChip, filter === item && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.grid}>
            {visibleChallenges.map((challenge) => <ChallengeCard key={challenge.title} item={challenge} />)}
          </View>

          <Pressable style={({ pressed }) => [styles.exploreCard, pressed && styles.pressed]}>
            <View style={styles.exploreIcon}><Ionicons name="compass" size={22} color={palette.coral} /></View>
            <View style={styles.exploreCopy}>
              <Text style={styles.exploreTitle}>Ready for something new?</Text>
              <Text style={styles.exploreText}>Explore challenges picked for you.</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={palette.coral} />
          </Pressable>
        </ScrollView>

        <View style={styles.bottomNav}>
          <BottomItem icon="grid-outline" label="Discover" />
          <BottomItem icon="trophy" label="Challenges" active />
          <Pressable style={styles.createButton}><Ionicons name="add" size={27} color={palette.white} /></Pressable>
          <BottomItem icon="people-outline" label="Community" />
          <BottomItem icon="person-outline" label="Profile" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const softShadow = Platform.select({
  web: { boxShadow: '0 12px 32px rgba(39, 29, 76, 0.08)' } as any,
  default: { shadowColor: '#271D4C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.canvas },
  phoneCanvas: { flex: 1, backgroundColor: palette.canvas, width: '100%', maxWidth: 500, alignSelf: 'center' },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 116 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  eyebrow: { color: palette.purple, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  pageTitle: { color: palette.ink, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -1.1, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  avatar: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink },
  avatarText: { color: palette.white, fontSize: 12, fontWeight: '700' },
  onlineDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: palette.mint, borderWidth: 2, borderColor: palette.white, right: -1, bottom: -1 },
  momentumCard: { borderRadius: 28, padding: 20, overflow: 'hidden', ...softShadow },
  momentumGlowOne: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.10)', right: -48, top: -70 },
  momentumGlowTwo: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(81,212,174,0.16)', left: -40, bottom: -58 },
  momentumHeader: { flexDirection: 'row', alignItems: 'center' },
  flameBubble: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  momentumLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '700', letterSpacing: 1.1, marginLeft: 9 },
  weekChip: { marginLeft: 'auto', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.14)' },
  weekChipText: { color: palette.white, fontSize: 10, fontWeight: '700' },
  momentumMain: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18 },
  streakValue: { color: palette.white, fontSize: 47, lineHeight: 48, fontWeight: '700', letterSpacing: -2 },
  streakLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700' },
  weekDays: { flexDirection: 'row', gap: 5 },
  dayItem: { alignItems: 'center', gap: 5 },
  dayCircle: { width: 24, height: 24, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  dayCircleDone: { backgroundColor: palette.white },
  dayDot: { color: palette.white, fontSize: 16, lineHeight: 14 },
  dayLabel: { color: 'rgba(255,255,255,0.62)', fontSize: 8, fontWeight: '700' },
  momentumDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 18 },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  statDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statValue: { color: palette.white, fontSize: 15, fontWeight: '700' },
  statLabel: { width: '100%', marginLeft: 13, marginTop: 1, color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '600' },
  checkinCard: { marginTop: 14, minHeight: 82, borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, ...softShadow },
  checkinIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.lavender },
  checkinIconDone: { backgroundColor: palette.mint },
  checkinCopy: { flex: 1, marginLeft: 12 },
  checkinTitle: { color: palette.ink, fontSize: 14, fontWeight: '700' },
  checkinText: { color: palette.muted, fontSize: 11, marginTop: 4 },
  checkinArrow: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#F4F1FF', alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { marginTop: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: palette.ink, fontSize: 21, fontWeight: '700', letterSpacing: -0.5 },
  sectionSubtitle: { color: palette.muted, fontSize: 11, marginTop: 3 },
  sortButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  filters: { gap: 8, paddingTop: 15, paddingBottom: 16 },
  filterChip: { height: 36, borderRadius: 12, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  filterChipActive: { backgroundColor: palette.ink, borderColor: palette.ink },
  filterText: { color: palette.muted, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: palette.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  challengeCard: { width: '48.5%', minHeight: 218, borderRadius: 22, overflow: 'hidden', backgroundColor: '#211A38', ...softShadow },
  challengeImage: { flex: 1, minHeight: 218, padding: 12, justifyContent: 'space-between' },
  challengeImageRadius: { borderRadius: 22 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.9)' },
  categoryPillText: { color: palette.ink, fontSize: 8, fontWeight: '700' },
  heartButton: { width: 28, height: 28, borderRadius: 10, backgroundColor: 'rgba(17,13,35,0.28)', alignItems: 'center', justifyContent: 'center' },
  challengeTitle: { color: palette.white, fontSize: 16, lineHeight: 18, fontWeight: '700', letterSpacing: -0.4 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  challengeMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 },
  challengeDay: { color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: '600' },
  challengePercent: { color: palette.white, fontSize: 9, fontWeight: '700' },
  exploreCard: { marginTop: 14, minHeight: 78, borderRadius: 21, padding: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF2EF', borderWidth: 1, borderColor: '#FFE4DE' },
  exploreIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.white },
  exploreCopy: { flex: 1, marginLeft: 12 },
  exploreTitle: { color: palette.ink, fontSize: 13, fontWeight: '700' },
  exploreText: { color: palette.muted, fontSize: 10, marginTop: 4 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  bottomNav: { position: 'absolute', left: 12, right: 12, bottom: 10, height: 76, borderRadius: 24, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, ...softShadow },
  bottomItem: { minWidth: 54, alignItems: 'center', justifyContent: 'center' },
  bottomIconWrap: { width: 34, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bottomIconActive: { backgroundColor: palette.lavender },
  bottomLabel: { color: '#9995A8', fontSize: 8, fontWeight: '700', marginTop: 3 },
  bottomLabelActive: { color: palette.purple, fontWeight: '700' },
  createButton: { width: 50, height: 50, borderRadius: 18, marginTop: -30, backgroundColor: palette.purple, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: palette.canvas, ...softShadow },
});
