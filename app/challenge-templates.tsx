import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CHALLENGE_TEMPLATE_AVAILABLE_THROUGH,
  CHALLENGE_TEMPLATE_CATEGORIES,
  ChallengeTemplate,
  getAvailableChallengeTemplates,
} from '@/constants/challengeTemplates';
import { getChallengeFallbackPhotoSource } from '@/utils/challengeFallbackPhotos';
import hapticFeedback from '@/utils/haptics';

type TemplateFilter = (typeof CHALLENGE_TEMPLATE_CATEGORIES)[number];

const formatAvailabilityDate = (date: string): string => {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
};

export default function ChallengeTemplates() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<TemplateFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const availableTemplates = useMemo(() => getAvailableChallengeTemplates(), []);

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return availableTemplates.filter((template) => {
      const matchesCategory = selectedCategory === 'All'
        || template.categories.includes(selectedCategory);
      const searchableText = [
        template.title,
        template.description,
        template.cadenceLabel,
        template.proofPrompt,
        ...template.categories,
      ].join(' ').toLowerCase();

      return matchesCategory && (!query || searchableText.includes(query));
    });
  }, [availableTemplates, searchQuery, selectedCategory]);

  const handleUseTemplate = (template: ChallengeTemplate) => {
    hapticFeedback.buttonPress();
    router.push({
      pathname: '/(tabs)/create',
      params: { templateId: template.id, startMode: 'template' },
    });
  };

  const handleStartWithoutTemplate = () => {
    hapticFeedback.buttonPress();
    router.replace({
      pathname: '/(tabs)/create',
      params: { templateId: '', startMode: 'blank' },
    });
  };

  const renderTemplate = ({ item }: { item: ChallengeTemplate }) => (
    <View style={styles.templateCard}>
      <Image
        source={getChallengeFallbackPhotoSource({
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.fallbackKey,
        })}
        style={styles.templateImage}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.templateBody}>
        <View style={styles.badgeRow}>
          <View style={styles.officialBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#6C42E8" />
            <Text style={styles.officialBadgeText}>Official</Text>
          </View>
          <View style={styles.cadenceBadge}>
            <Ionicons name="calendar-outline" size={13} color="#625B70" />
            <Text style={styles.cadenceText}>{item.cadenceLabel}</Text>
          </View>
        </View>

        <Text style={styles.templateTitle} selectable>{item.title}</Text>
        <Text style={styles.templateDescription} selectable>{item.description}</Text>

        <View style={styles.categoryRow}>
          {item.categories.map((category) => (
            <View key={category} style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{category}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={styles.useButton}
          onPress={() => handleUseTemplate(item)}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={`Use ${item.title} template`}
        >
          <Ionicons name="people" size={18} color="#ffffff" />
          <Text style={styles.useButtonText}>Use Template</Text>
          <Ionicons name="arrow-forward" size={17} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color="#18142F" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Challenge friends</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={filteredTemplates}
        renderItem={renderTemplate}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={(
          <View>
            <View style={styles.introPanel}>
              <View style={styles.introIcon}>
                <Ionicons name="people" size={25} color="#6C42E8" />
              </View>
              <View style={styles.introCopy}>
                <Text style={styles.introTitle}>Pick it. Personalise it. Invite your people.</Text>
                <Text style={styles.introText}>
                  Every template starts private and stays editable. Each check-in needs a photo and short caption.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.startBlankButton}
              onPress={handleStartWithoutTemplate}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Continue without a template"
            >
              <Ionicons name="create-outline" size={18} color="#5B3FE5" />
              <View style={styles.startBlankCopy}>
                <Text style={styles.startBlankTitle}>Continue without a template</Text>
                <Text style={styles.startBlankText}>Start with a blank challenge instead</Text>
              </View>
              <Ionicons name="arrow-forward" size={17} color="#8D67FF" />
            </TouchableOpacity>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={19} color="#85808f" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search templates"
                placeholderTextColor="#77717f"
                maxLength={80}
                returnKeyType="search"
                accessibilityLabel="Search challenge templates"
              />
              {searchQuery ? (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear template search"
                >
                  <Ionicons name="close-circle" size={20} color="#77717f" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filters}
              contentContainerStyle={styles.filtersContent}
            >
              {CHALLENGE_TEMPLATE_CATEGORIES.map((category) => {
                const selected = selectedCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[styles.filterChip, selected && styles.filterChipSelected]}
                    onPress={() => {
                      hapticFeedback.selection();
                      setSelectedCategory(category);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Official templates</Text>
              <Text style={styles.resultCount}>{filteredTemplates.length} found</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={46} color="#625b70" />
            <Text style={styles.emptyTitle}>No templates found</Text>
            <Text style={styles.emptyText}>Try another search or category.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1EFF7',
  },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#F8F7FC',
    borderBottomWidth: 1,
    borderBottomColor: '#D8D2E2',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#18142F',
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  introPanel: {
    flexDirection: 'row',
    gap: 13,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#E9E3FF',
    borderWidth: 1,
    borderColor: '#D8CEFA',
  },
  introIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDD3FF',
  },
  introCopy: {
    flex: 1,
  },
  introTitle: {
    color: '#18142F',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  introText: {
    color: '#655F70',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  startBlankButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8D2E2',
    elevation: 1,
  },
  startBlankCopy: {
    flex: 1,
  },
  startBlankTitle: {
    color: '#18142F',
    fontSize: 12,
    fontWeight: '700',
  },
  startBlankText: {
    color: '#655F70',
    fontSize: 10,
    marginTop: 2,
  },
  searchBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8D2E2',
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    color: '#18142F',
    fontSize: 14,
  },
  filters: {
    marginHorizontal: -18,
    marginTop: 14,
  },
  filtersContent: {
    paddingHorizontal: 18,
    gap: 8,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8D2E2',
  },
  filterChipSelected: {
    backgroundColor: '#E7DFFF',
    borderColor: '#5B3FE5',
  },
  filterText: {
    color: '#655F70',
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextSelected: {
    color: '#4700EC',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  resultTitle: {
    color: '#18142F',
    fontSize: 18,
    fontWeight: '700',
  },
  resultCount: {
    color: '#655F70',
    fontSize: 12,
  },
  templateCard: {
    overflow: 'hidden',
    marginBottom: 16,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8D2E2',
    elevation: 2,
  },
  templateImage: {
    width: '100%',
    height: 142,
    backgroundColor: '#FFFFFF',
  },
  templateBody: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#E9E3FF',
  },
  officialBadgeText: {
    color: '#4700EC',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cadenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cadenceText: {
    color: '#655F70',
    fontSize: 11,
    fontWeight: '600',
  },
  templateTitle: {
    color: '#18142F',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  templateDescription: {
    color: '#655F70',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
  },
  categoryBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: '#F6F4FA',
    borderWidth: 1,
    borderColor: '#D8D2E2',
  },
  categoryBadgeText: {
    color: '#655F70',
    fontSize: 10,
    fontWeight: '700',
  },
  proofPanel: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderRadius: 17,
    backgroundColor: '#E9E3FF',
  },
  proofCopy: {
    flex: 1,
  },
  proofLabel: {
    color: '#4700EC',
    fontSize: 11,
    fontWeight: '700',
  },
  proofText: {
    color: '#9e97aa',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  useButton: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 15,
    borderRadius: 18,
    backgroundColor: '#4700ec',
  },
  useButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 70,
  },
  emptyTitle: {
    color: '#18142F',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
  },
  emptyText: {
    color: '#655F70',
    fontSize: 13,
    marginTop: 6,
  },
  availabilityNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingTop: 10,
  },
  availabilityText: {
    color: '#8b8497',
    fontSize: 11,
  },
});
