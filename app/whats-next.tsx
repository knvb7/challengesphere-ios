import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import FloatingScreenControls from '@/components/common/FloatingScreenControls';

type RoadmapItem = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const ROADMAP_ITEMS: readonly RoadmapItem[] = [
  {
    title: 'Integrations',
    description: 'Connect fitness, health, and coding apps so activity can count toward your challenges.',
    icon: 'git-network-outline',
  },
  {
    title: 'Video uploads',
    description: 'Share video check-ins when a photo or caption cannot capture your progress.',
    icon: 'videocam-outline',
  },
  {
    title: 'Global feed',
    description: 'Discover public challenge updates and progress from challengers across ChallengeSphere.',
    icon: 'earth-outline',
  },
] as const;

export default function WhatsNextScreen() {
  const router = useRouter();
  const { top: topInset } = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FloatingScreenControls onBackPress={() => router.back()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topInset + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">Focused on three things.</Text>
        <Text style={styles.intro}>These are the three product areas we are planning next.</Text>

        <View style={styles.featureList}>
          {ROADMAP_ITEMS.map((item, index) => (
            <View
              key={item.title}
              style={[
                styles.featureRow,
                index < ROADMAP_ITEMS.length - 1 && styles.featureDivider,
              ]}
            >
              <View style={styles.featureIcon}>
                <Ionicons name={item.icon} size={22} color="#C5AEFF" />
              </View>
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureBody}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Plans may evolve as we learn.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    marginLeft: 52,
    color: '#18142F',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  intro: {
    marginLeft: 52,
    color: '#a9a3ad',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  featureList: {
    overflow: 'hidden',
    marginTop: 24,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    padding: 17,
  },
  featureDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
  },
  featureCopy: {
    flex: 1,
  },
  featureTitle: {
    color: '#18142F',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  featureBody: {
    color: '#655F70',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  footer: {
    color: '#77717b',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 18,
  },
});
