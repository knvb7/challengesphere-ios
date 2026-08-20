import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity as NativeTouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import AvatarImage from '../components/common/AvatarImage';
import { getChallengeDayFromStartDate } from '../components/common/ChallengeCard';
import { SkeletonBlock, useSkeletonShimmer } from '../components/common/Skeleton';
import { useChallenge, useChallengeParticipants, useChallengeSubmissions, useGlobalChallengeSubmissionsByDay } from '../hooks/useChallenges';
import { useSignedMediaRecovery } from '../hooks/useSignedMediaRecovery';
import { useAuthContext } from '../providers/AuthProvider';
import { GlobalSubmissionSort, Submission, User } from '../types/api';
import { isOneOffChallengeMode } from '../utils/challengeMode';
import { createCachedRemoteImageSource } from '../utils/remoteImageCache';
import { buildSubmissionDetailRouteParams } from '../utils/submissionDetail';
import { getProfileDisplayName, matchesUserSearch } from '../utils/userDisplay';

function parseMediaUrls(raw?: string | string[]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);

  const value = raw.trim();
  if (!value) return [];

  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      // Fall through to comma-separated parsing.
    }
  }

  return value.split(',').map((url) => url.trim()).filter(Boolean);
}

const GRID_GAP = 8;
const GRID_HORIZONTAL_PADDING = 12;
const GRID_COLS = 2;
const GLOBAL_SUBMISSIONS_PAGE_SIZE = 24;
const PARTICIPANT_PICKER_LIMIT = 4;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const SORT_OPTIONS: { key: GlobalSubmissionSort; label: string; compactLabel: string; icon: IoniconName }[] = [
  { key: 'newest', label: 'Newest', compactLabel: 'Newest', icon: 'sparkles-outline' },
  { key: 'glories', label: 'Most glories', compactLabel: 'Top', icon: 'diamond-outline' },
  { key: 'oldest', label: 'Oldest', compactLabel: 'Oldest', icon: 'time-outline' },
];

function formatDate(dateInput: string | Date) {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function getDayDate(startDateStr: string, day: number) {
  if (!startDateStr || day <= 0) return '';
  const date = new Date(startDateStr);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + day - 1);
  return formatDate(date);
}

export default function GlobalSubmissionsScreen() {
  const { width: viewportWidth } = useWindowDimensions();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const recoverSignedMedia = useSignedMediaRecovery();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUserId } = useAuthContext();
  const challengeId = Number(params.challengeId) || 0;
  const routeTitle = (params.title as string) || 'Challenge';
  const routeNumberOfDays = Number(params.numberOfDays) || 0;
  const routeStartDate = (params.startDate as string) || '';
  const [selectedDay, setSelectedDay] = useState(0);
  const [dayDropdownOpen, setDayDropdownOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState<GlobalSubmissionSort>('newest');
  const [participantQuery, setParticipantQuery] = useState('');
  const [appliedParticipantQuery, setAppliedParticipantQuery] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<User | null>(null);
  const [participantPickerOpen, setParticipantPickerOpen] = useState(false);
  const [submissionPage, setSubmissionPage] = useState(1);
  const [loadedSubmissions, setLoadedSubmissions] = useState<Submission[]>([]);
  const loadMoreRequestRef = useRef(false);
  const [pageInfo, setPageInfo] = useState({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
  });
  const { data: challengeData } = useChallenge(challengeId, currentUserId);
  const { data: participantsData, isLoading: participantsLoading } = useChallengeParticipants(challengeId);
  const gridItemSize = useMemo(
    () => Math.floor((viewportWidth - (GRID_HORIZONTAL_PADDING * 2) - GRID_GAP) / GRID_COLS),
    [viewportWidth]
  );

  const challengeTitle = challengeData?.title || routeTitle;
  const challengeMode = challengeData?.challengeMode || (params.challengeMode as string) || 'DAILY';
  const isOneOff = isOneOffChallengeMode(challengeMode);
  const numberOfDays = isOneOff ? 1 : challengeData?.numberOfDays || routeNumberOfDays;
  const startDate = challengeData?.startDate || challengeData?.createdAt || routeStartDate;
  const currentDay = useMemo(() => startDate ? getChallengeDayFromStartDate(startDate) : 0, [startDate]);
  const maxVisibleDay = useMemo(() => {
    if (isOneOff) return 1;
    if (numberOfDays > 0 && currentDay > 0) {
      return Math.max(1, Math.min(numberOfDays, currentDay));
    }
    if (numberOfDays > 0) {
      return numberOfDays;
    }
    return Math.max(1, currentDay || selectedDay || 1);
  }, [currentDay, numberOfDays, selectedDay, isOneOff]);

  useEffect(() => {
    setSelectedDay((day) => day === 0 ? 0 : Math.max(1, Math.min(maxVisibleDay, day)));
  }, [maxVisibleDay]);

  const dayOptions = useMemo(
    () => isOneOff ? [0] : [0, ...Array.from({ length: maxVisibleDay }, (_, index) => maxVisibleDay - index)],
    [isOneOff, maxVisibleDay]
  );
  const normalizedParticipantQuery = useMemo(
    () => participantQuery.trim().replace(/^@+/, ''),
    [participantQuery]
  );
  const resetLoadedSubmissionPages = useCallback(() => {
    loadMoreRequestRef.current = false;
    setSubmissionPage(1);
    setLoadedSubmissions([]);
    setPageInfo({ currentPage: 1, totalPages: 0, totalCount: 0 });
  }, []);

  const applyParticipantFilter = useCallback((nextQuery = normalizedParticipantQuery) => {
    if (nextQuery === appliedParticipantQuery) {
      return;
    }
    resetLoadedSubmissionPages();
    setAppliedParticipantQuery(nextQuery);
  }, [appliedParticipantQuery, normalizedParticipantQuery, resetLoadedSubmissionPages]);

  const allSubmissionsQuery = useChallengeSubmissions(
    challengeId,
    currentUserId,
    submissionPage,
    GLOBAL_SUBMISSIONS_PAGE_SIZE,
    selectedSort,
    appliedParticipantQuery,
    selectedDay === 0
  );
  const daySubmissionsQuery = useGlobalChallengeSubmissionsByDay(
    challengeId,
    selectedDay,
    currentUserId,
    submissionPage,
    GLOBAL_SUBMISSIONS_PAGE_SIZE,
    selectedSort,
    appliedParticipantQuery
  );
  const activeSubmissionsQuery = selectedDay === 0 ? allSubmissionsQuery : daySubmissionsQuery;
  const { data, isLoading, isFetching, error, refetch } = activeSubmissionsQuery;

  useEffect(() => {
    setSubmissionPage(1);
    setLoadedSubmissions([]);
    setPageInfo({ currentPage: 1, totalPages: 0, totalCount: 0 });
  }, [challengeId, currentUserId, selectedDay, selectedSort, appliedParticipantQuery]);

  useEffect(() => {
    if (!data) return;

    setPageInfo({
      currentPage: data.currentPage,
      totalPages: data.totalPages,
      totalCount: data.totalCount,
    });
    setLoadedSubmissions((previous) => {
      if (data.currentPage <= 1) {
        return data.submissions || [];
      }
      const byId = new Map(previous.map((submission) => [submission.id, submission]));
      for (const submission of data.submissions || []) {
        byId.set(submission.id, submission);
      }
      return Array.from(byId.values());
    });
  }, [data]);

  const selectedDayDate = selectedDay === 0 || isOneOff ? '' : getDayDate(startDate, selectedDay);
  const selectedDayLabel = selectedDay === 0
    ? 'All days'
    : isOneOff
      ? 'All submissions'
      : `Day ${selectedDay}${selectedDayDate ? ` • ${selectedDayDate}` : ''}`;
  const activeFilterCount = [
    selectedDay !== 0,
    selectedSort !== 'newest',
    Boolean(appliedParticipantQuery),
  ].filter(Boolean).length;
  const hasFilterDraft = normalizedParticipantQuery.length > 0 || selectedDay !== 0 || selectedSort !== 'newest';

  const handleSelectDay = useCallback((day: number) => {
    if (day !== selectedDay) {
      resetLoadedSubmissionPages();
      setSelectedDay(day);
    }
  }, [resetLoadedSubmissionPages, selectedDay]);

  const handleRefresh = useCallback(() => {
    if (submissionPage !== 1) {
      resetLoadedSubmissionPages();
      return;
    }
    refetch();
  }, [refetch, resetLoadedSubmissionPages, submissionPage]);

  const handleParticipantQueryChange = useCallback((value: string) => {
    setParticipantQuery(value);
    setParticipantPickerOpen(true);
    if (selectedParticipant || appliedParticipantQuery) {
      setSelectedParticipant(null);
      applyParticipantFilter('');
    }
  }, [appliedParticipantQuery, applyParticipantFilter, selectedParticipant]);

  const handleClearParticipantQuery = useCallback(() => {
    setParticipantQuery('');
    setSelectedParticipant(null);
    setParticipantPickerOpen(true);
    applyParticipantFilter('');
  }, [applyParticipantFilter]);

  const handleSortChange = useCallback((sort: GlobalSubmissionSort) => {
    if (sort === selectedSort) {
      return;
    }
    resetLoadedSubmissionPages();
    setSelectedSort(sort);
  }, [resetLoadedSubmissionPages, selectedSort]);

  const handleResetFilters = useCallback(() => {
    setParticipantQuery('');
    setAppliedParticipantQuery('');
    setSelectedParticipant(null);
    setParticipantPickerOpen(false);
    setSelectedSort('newest');
    setSelectedDay(0);
    resetLoadedSubmissionPages();
    Keyboard.dismiss();
  }, [resetLoadedSubmissionPages]);

  const hasMoreSubmissions = pageInfo.totalPages > pageInfo.currentPage;
  const isLoadingMore = isFetching && submissionPage > 1;
  const selectedParticipantSubmissions = selectedParticipant
    ? loadedSubmissions.filter((submission) => submission.userId === selectedParticipant.id)
    : loadedSubmissions;
  const visibleResultCount = selectedParticipant
    ? selectedParticipantSubmissions.length
    : Math.max(pageInfo.totalCount, loadedSubmissions.length);
  const resultCountLabel = visibleResultCount === 1 ? '1 submission' : `${visibleResultCount} submissions`;
  const momentCountLabel = visibleResultCount === 1 ? '1 moment' : `${visibleResultCount} moments`;

  const handleLoadMore = useCallback(() => {
    if (!hasMoreSubmissions || isFetching || loadMoreRequestRef.current) return;

    loadMoreRequestRef.current = true;
    setSubmissionPage((page) => page + 1);
  }, [hasMoreSubmissions, isFetching]);

  useEffect(() => {
    if (!isFetching) {
      loadMoreRequestRef.current = false;
    }
  }, [isFetching]);

  const participantMap = useMemo(() => {
    const map = new Map<number, User>();
    for (const participant of participantsData?.participants || []) {
      map.set(participant.id, participant);
    }
    return map;
  }, [participantsData]);

  const matchingParticipants = useMemo(() => (
    (participantsData?.participants || [])
      .filter((participant) => matchesUserSearch(participant, normalizedParticipantQuery))
      .sort((left, right) => left.username.localeCompare(right.username))
      .slice(0, PARTICIPANT_PICKER_LIMIT)
  ), [normalizedParticipantQuery, participantsData?.participants]);

  const handleSelectParticipant = useCallback((participant: User) => {
    setSelectedParticipant(participant);
    setParticipantQuery(`@${participant.username}`);
    setParticipantPickerOpen(false);
    applyParticipantFilter(participant.username);
    Keyboard.dismiss();
  }, [applyParticipantFilter]);

  const handleParticipantSearchSubmit = useCallback(() => {
    const exactMatch = matchingParticipants.find(
      (participant) => participant.username.toLowerCase() === normalizedParticipantQuery.toLowerCase()
    );
    const participant = exactMatch || matchingParticipants[0];
    if (participant) {
      handleSelectParticipant(participant);
    }
  }, [handleSelectParticipant, matchingParticipants, normalizedParticipantQuery]);

  const openSubmission = useCallback((submission: Submission) => {
    const author = participantMap.get(submission.userId);
    const authorName = author?.username || `User ${submission.userId}`;

    router.push({
      pathname: '/photo-details',
      params: buildSubmissionDetailRouteParams({
        submission,
        userName: authorName,
        userPhoto: author?.profilePicUrl || '',
        challengeTitle,
        participantCount: participantsData?.totalParticipants ?? 0,
      }),
    });
  }, [challengeTitle, participantMap, participantsData?.totalParticipants, router]);

  const renderSubmission = ({ item, index }: { item: Submission; index: number }) => {
    const urls = parseMediaUrls(item.mediaUrls as any);
    const thumb = urls[0];
    const author = participantMap.get(item.userId);
    const authorName = author?.displayName?.trim() || author?.username || `User ${item.userId}`;
    const dayLabel = isOneOff ? 'Submission' : `Day ${item.dayNumber}`;
    const gloriesLabel = `${item.gloriesCount || 0} ${(item.gloriesCount || 0) === 1 ? 'glory' : 'glories'}`;

    return (
      <TouchableOpacity
        style={[styles.gridItem, { width: gridItemSize, height: gridItemSize }]}
        activeOpacity={0.8}
        onPress={() => openSubmission(item)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${authorName}'s ${isOneOff ? 'submission' : `Day ${item.dayNumber} submission`}`}
      >
        {thumb ? (
          <ExpoImage
            source={createCachedRemoteImageSource(thumb)}
            style={styles.gridImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={100}
            onError={() => recoverSignedMedia(thumb)}
          />
        ) : (
          <View style={[styles.gridImage, styles.noImagePlaceholder]}>
            <Ionicons name="document-text-outline" size={24} color="#555" />
          </View>
        )}

        {urls.length > 1 && (
          <View style={styles.multiPhotoBadge} pointerEvents="none">
            <Ionicons name="copy-outline" size={11} color="#F8FAFC" />
            <Text style={styles.multiPhotoBadgeText}>{urls.length}</Text>
          </View>
        )}

        <LinearGradient
          colors={['rgba(8, 7, 12, 0)', 'rgba(8, 7, 12, 0.96)']}
          locations={[0, 0.46]}
          style={styles.submissionMetaOverlay}
          pointerEvents="none"
        >
          <View style={styles.submissionAuthorRow}>
            <AvatarImage
              uri={author?.profilePicUrl}
              size={22}
              style={styles.submissionAvatar}
              accessibilityLabel={`${authorName}'s profile picture`}
            />
            <Text style={styles.submissionAuthorName} numberOfLines={1}>{authorName}</Text>
          </View>
          <View style={styles.submissionMetaRow}>
            <Text style={styles.submissionMetaText}>{dayLabel}</Text>
            <View style={styles.metaDot} />
            <Ionicons name="diamond-outline" size={10} color="#D8CCFF" />
            <Text style={styles.submissionMetaText}>{gloriesLabel}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={22} color="#18142F" />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle} numberOfLines={1} selectable>{challengeTitle}</Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>Global submissions</Text>
      </View>
    </View>
  );

  const renderToolbar = () => (
    <View>
      <View style={styles.compactToolbar}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#85808F" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search participant"
              placeholderTextColor="#77717F"
              value={participantQuery}
              onChangeText={handleParticipantQueryChange}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={80}
              returnKeyType="search"
              onFocus={() => setParticipantPickerOpen(true)}
              onSubmitEditing={handleParticipantSearchSubmit}
              accessibilityLabel="Search participant submissions"
            />
            {participantQuery.length > 0 && (
              <TouchableOpacity
                onPress={handleClearParticipantQuery}
                accessibilityLabel="Clear participant filter"
                accessibilityRole="button"
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color="#77717F" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.filterIconButton, activeFilterCount > 0 && styles.filterIconButtonActive]}
            onPress={() => {
              setParticipantPickerOpen(false);
              Keyboard.dismiss();
              setDayDropdownOpen(true);
            }}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Open submission filters"
          >
            <Ionicons name="options-outline" size={19} color={activeFilterCount > 0 ? '#F7F5FB' : '#A29CAA'} />
            {activeFilterCount > 0 ? (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {participantPickerOpen ? (
          <View style={styles.participantPicker} accessibilityLabel="Matching challenge participants">
            <View style={styles.participantPickerHeader}>
              <Text style={styles.participantPickerTitle}>
                {normalizedParticipantQuery ? 'Matching participants' : 'Challenge participants'}
              </Text>
              <Text style={styles.participantPickerCount}>{matchingParticipants.length} shown</Text>
            </View>

            {participantsLoading ? (
              <View style={styles.participantPickerState}>
                <ActivityIndicator size="small" color="#4700EC" />
                <Text style={styles.participantPickerStateText}>Loading participants…</Text>
              </View>
            ) : matchingParticipants.length === 0 ? (
              <View style={styles.participantPickerState}>
                <Ionicons name="person-outline" size={18} color="#6F6975" />
                <Text style={styles.participantPickerStateText}>No participant found</Text>
              </View>
            ) : (
              matchingParticipants.map((participant) => {
                const displayName = getProfileDisplayName(participant);
                const selected = selectedParticipant?.id === participant.id;
                const avatarUri = participant.profilePictureUrl
                  || participant.profilePicUrl
                  || participant.userProfilePicUrl;
                return (
                  <TouchableOpacity
                    key={participant.id}
                    style={[styles.participantOption, selected && styles.participantOptionSelected]}
                    onPress={() => handleSelectParticipant(participant)}
                    activeOpacity={0.78}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Show submissions from ${participant.username}`}
                  >
                    <AvatarImage
                      uri={avatarUri}
                      size={38}
                      style={styles.participantOptionAvatar}
                      accessibilityLabel={`${participant.username}'s profile picture`}
                    />
                    <View style={styles.participantOptionCopy}>
                      <Text style={styles.participantOptionUsername} numberOfLines={1}>@{participant.username}</Text>
                      {displayName ? (
                        <Text style={styles.participantOptionName} numberOfLines={1}>{displayName}</Text>
                      ) : null}
                    </View>
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'chevron-forward'}
                      size={selected ? 20 : 16}
                      color={selected ? '#8D67FF' : '#625C68'}
                    />
                  </TouchableOpacity>
                );
              })
            )}

            {!normalizedParticipantQuery && (participantsData?.participants.length || 0) > PARTICIPANT_PICKER_LIMIT ? (
              <Text style={styles.participantPickerHint}>Type a username to narrow the list</Text>
            ) : null}
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[styles.quickFilterChip, selectedDay !== 0 && styles.quickFilterChipActive]}
            onPress={() => {
              setParticipantPickerOpen(false);
              Keyboard.dismiss();
              setDayDropdownOpen(true);
            }}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={`Showing ${selectedDayLabel}. Choose submission day`}
          >
            <Text style={[styles.quickFilterText, selectedDay !== 0 && styles.quickFilterTextActive]} numberOfLines={1}>
              {selectedDayLabel}
            </Text>
            <Ionicons name="chevron-down" size={13} color={selectedDay !== 0 ? '#4700EC' : '#98919F'} />
          </TouchableOpacity>

          {SORT_OPTIONS.map((option) => {
            const active = selectedSort === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.quickFilterChip, active && styles.quickFilterChipActive]}
                onPress={() => {
                  setParticipantPickerOpen(false);
                  Keyboard.dismiss();
                  handleSortChange(option.key);
                }}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Sort by ${option.label}`}
              >
                <Ionicons name={option.icon} size={13} color={active ? '#4700EC' : '#98919F'} />
                <Text style={[styles.quickFilterText, active && styles.quickFilterTextActive]}>{option.compactLabel}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {appliedParticipantQuery ? (
          <Text style={styles.resultMetaFilter} numberOfLines={1}>
            Showing submissions from @{selectedParticipant?.username || appliedParticipantQuery}
          </Text>
        ) : null}
      </View>

      <View style={styles.galleryToolbar}>
        <Text style={styles.galleryTitle}>Community moments</Text>
        <Text style={styles.galleryCount}>{resultCountLabel}</Text>
      </View>
    </View>
  );

  const renderFilterSheet = () => (
    <Modal
      visible={dayDropdownOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setDayDropdownOpen(false)}
    >
      <NativeTouchableOpacity
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={() => setDayDropdownOpen(false)}
      >
        <NativeTouchableOpacity
          style={[
            styles.dropdownSheet,
            { paddingBottom: Math.max(bottomInset, 16) + 8 },
          ]}
          activeOpacity={1}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.dropdownHandle} />
          <View style={styles.sheetTitleRow}>
            <Text style={styles.dropdownTitle}>Refine submissions</Text>
            <TouchableOpacity
              onPress={handleResetFilters}
              disabled={!hasFilterDraft}
              accessibilityRole="button"
              accessibilityLabel="Reset submission filters"
            >
              <Text style={[styles.sheetResetText, !hasFilterDraft && styles.sheetResetTextDisabled]}>Reset</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sheetSectionLabel}>Showing</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sheetOptionsContent}
          >
            {dayOptions.map((day) => {
              const selected = day === selectedDay;
              const dayDate = day === 0 || isOneOff ? '' : getDayDate(startDate, day);
              const label = day === 0 ? 'All days' : isOneOff ? 'All submissions' : `Day ${day}`;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.sheetOptionChip, selected && styles.sheetOptionChipSelected]}
                  onPress={() => handleSelectDay(day)}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${label}${dayDate ? `, ${dayDate}` : ''}`}
                >
                  <Text style={[styles.sheetOptionText, selected && styles.sheetOptionTextSelected]}>{label}</Text>
                  {dayDate ? (
                    <Text style={[styles.sheetOptionDate, selected && styles.sheetOptionDateSelected]}>{dayDate}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.sheetSectionLabel}>Sort by</Text>
          <View style={styles.sheetSortRow}>
            {SORT_OPTIONS.map((option) => {
              const active = selectedSort === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.sheetSortOption, active && styles.sheetOptionChipSelected]}
                  onPress={() => handleSortChange(option.key)}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons name={option.icon} size={14} color={active ? '#FFFFFF' : '#6F6879'} />
                  <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.sheetApplyButton}
            onPress={() => setDayDropdownOpen(false)}
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityLabel="Show submissions"
          >
            <Text style={styles.sheetApplyButtonText}>Show submissions</Text>
          </TouchableOpacity>
        </NativeTouchableOpacity>
      </NativeTouchableOpacity>
    </Modal>
  );

  const shimmer = useSkeletonShimmer();
  const submissions = selectedParticipantSubmissions;
  const showInitialLoading = isLoading || participantsLoading || (isFetching && submissionPage === 1 && loadedSubmissions.length === 0);
  const emptyTitle = appliedParticipantQuery
    ? `No submissions from @${appliedParticipantQuery}`
    : selectedDay === 0
      ? 'No submissions yet'
      : isOneOff
      ? 'No submissions yet'
      : `No submissions for Day ${selectedDay}`;
  const renderFooter = () => isLoadingMore ? (
    <View style={styles.footerLoader} accessibilityLabel="Loading more submissions">
      <ActivityIndicator size="small" color="#4700EC" />
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {renderHeader()}
      {showInitialLoading ? (
        <ScrollView
          style={styles.submissionList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {renderToolbar()}
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 6 }, (_, index) => (
              <SkeletonBlock
                key={index}
                translateX={shimmer}
                width={gridItemSize}
                height={gridItemSize}
                borderRadius={10}
              />
            ))}
          </View>
        </ScrollView>
      ) : error ? (
        <FlatList
          style={styles.submissionList}
          data={[] as Submission[]}
          renderItem={renderSubmission}
          numColumns={GRID_COLS}
          ListHeaderComponent={renderToolbar}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Ionicons name="alert-circle-outline" size={54} color="#64748B" />
              <Text style={styles.emptyTitle}>Failed to load submissions</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={handleRefresh} tintColor="#4700ecff" colors={['#4700ecff']} />}
          contentContainerStyle={[styles.listContent, styles.listContentGrow]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      ) : (
        <FlatList
          style={styles.submissionList}
          data={submissions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSubmission}
          numColumns={GRID_COLS}
          ListHeaderComponent={renderToolbar}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Ionicons name="images-outline" size={58} color="#475569" />
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              {hasFilterDraft ? (
                <TouchableOpacity style={styles.clearFiltersButton} onPress={handleResetFilters}>
                  <Text style={styles.clearFiltersText}>Clear filters</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          columnWrapperStyle={styles.gridRow}
          refreshControl={<RefreshControl refreshing={isFetching && submissionPage === 1} onRefresh={handleRefresh} tintColor="#4700ecff" colors={['#4700ecff']} />}
          contentContainerStyle={[styles.listContent, submissions.length === 0 && styles.listContentGrow]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
      {renderFilterSheet()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  header: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: '#18142F',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  headerSubtitle: {
    color: '#777389',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  headerBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#DDD4FF',
  },
  filterPanel: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#273444',
    backgroundColor: '#0f141b',
  },
  filterSummaryRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  filterSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  filterEyebrow: {
    color: '#8f6bff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  filterSummary: {
    color: '#d8dee8',
    fontSize: 12,
    fontWeight: '600',
  },
  resetButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#4700ec',
  },
  resetButtonDisabled: {
    backgroundColor: '#151d26',
    borderWidth: 1,
    borderColor: '#273444',
  },
  resetButtonText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  resetButtonTextDisabled: {
    color: '#64748b',
  },
  dayDropdownButton: {
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD4FF',
    backgroundColor: '#F0ECFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34215e',
  },
  filterButtonCopy: {
    flex: 1,
    minWidth: 0,
  },
  dayDropdownLabel: {
    color: '#8f6bff',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayDropdownValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  searchBox: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: '#18142F',
    fontSize: 13,
    padding: 0,
  },
  participantPicker: {
    marginTop: 8,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2d2934',
  },
  participantPickerHeader: {
    minHeight: 34,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#242129',
  },
  participantPickerTitle: {
    color: '#9d96a5',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  participantPickerCount: {
    color: '#68626e',
    fontSize: 9,
    fontWeight: '600',
  },
  participantPickerState: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  participantPickerStateText: {
    color: '#777389',
    fontSize: 11,
    fontWeight: '600',
  },
  participantOption: {
    minHeight: 58,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#211E25',
  },
  participantOptionSelected: {
    backgroundColor: '#241c38',
  },
  participantOptionAvatar: {
    borderWidth: 1,
    borderColor: '#3e3650',
  },
  participantOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  participantOptionUsername: {
    color: '#18142F',
    fontSize: 13,
    fontWeight: '700',
  },
  participantOptionName: {
    color: '#777389',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  participantPickerHint: {
    color: '#777389',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  sortHeaderText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  activeFilterText: {
    color: '#8f6bff',
    fontSize: 11,
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortChip: {
    minHeight: 34,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#121922',
    borderWidth: 1,
    borderColor: '#22303a',
  },
  sortChipActive: {
    backgroundColor: '#4700ec',
    borderColor: '#4700ec',
  },
  sortChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  sortChipTextActive: {
    color: '#f8fafc',
  },
  resultMetaFilter: {
    marginTop: 8,
    color: '#9b8ac8',
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  dropdownSheet: {
    maxHeight: '62%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#E7E3EF',
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  dropdownHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#B7B0BE',
    alignSelf: 'center',
    marginBottom: 20,
  },
  dropdownTitle: {
    color: '#18142F',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  dropdownList: {
    flexGrow: 0,
  },
  dropdownOption: {
    minHeight: 58,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#121922',
    borderWidth: 1,
    borderColor: '#22303a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownOptionSelected: {
    backgroundColor: '#F0ECFF',
    borderColor: '#4700ecff',
  },
  dropdownOptionText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownOptionTextSelected: {
    color: '#f8fafc',
  },
  dropdownOptionDate: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 3,
  },
  listContent: {
    paddingBottom: 32,
  },
  listContentGrow: {
    flexGrow: 1,
  },
  submissionList: {
    flex: 1,
  },
  gridItem: {
    marginBottom: GRID_GAP,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 5,
  },
  gridItemLastInRow: {
    marginRight: 0,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  noImagePlaceholder: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiPhotoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(15,23,42,0.78)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.20)',
  },
  multiPhotoBadgeText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '600',
  },
  compactToolbar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterIconButton: {
    position: 'relative',
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  filterIconButtonActive: {
    backgroundColor: '#4700EC',
    borderColor: '#4700ec',
  },
  filterCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18142F',
    borderWidth: 2,
    borderColor: '#F8F7FC',
  },
  filterCountBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  quickFiltersContent: {
    gap: 8,
    paddingTop: 9,
    paddingBottom: 1,
  },
  quickFilterChip: {
    minHeight: 34,
    paddingHorizontal: 13,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  quickFilterChipActive: {
    backgroundColor: '#F0ECFF',
    borderColor: '#4700ec',
  },
  quickFilterText: {
    maxWidth: 140,
    color: '#777389',
    fontSize: 11,
    fontWeight: '700',
  },
  quickFilterTextActive: {
    color: '#18142F',
  },
  galleryToolbar: {
    minHeight: 54,
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    paddingTop: 5,
    paddingBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryTitle: {
    color: '#18142F',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  galleryCount: {
    color: '#777389',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
  },
  gridRow: {
    gap: GRID_GAP,
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
  },
  submissionMetaOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 66,
    paddingHorizontal: 9,
    paddingBottom: 8,
    justifyContent: 'flex-end',
  },
  submissionAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  submissionAvatar: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  submissionAuthorName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  submissionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    marginLeft: 29,
  },
  submissionMetaText: {
    color: '#b9b2c2',
    fontSize: 9,
    fontWeight: '600',
  },
  metaDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#716a79',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetResetText: {
    color: '#a98cff',
    fontSize: 12,
    fontWeight: '700',
  },
  sheetResetTextDisabled: {
    color: '#AAA4B1',
  },
  sheetSectionLabel: {
    color: '#777389',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 9,
  },
  sheetOptionsContent: {
    gap: 8,
    paddingRight: 20,
  },
  sheetOptionChip: {
    minHeight: 42,
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCD6E7',
  },
  sheetOptionChipSelected: {
    backgroundColor: '#4700EC',
    borderColor: '#4700ec',
  },
  sheetOptionText: {
    color: '#18142F',
    fontSize: 12,
    fontWeight: '700',
  },
  sheetOptionTextSelected: {
    color: '#FFFFFF',
  },
  sheetOptionDate: {
    color: '#777389',
    fontSize: 9,
    marginTop: 2,
  },
  sheetOptionDateSelected: {
    color: '#E6DEFF',
  },
  sheetSortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sheetSortOption: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCD6E7',
  },
  sheetApplyButton: {
    minHeight: 48,
    marginTop: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4700ec',
  },
  sheetApplyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 54,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4700ecff',
  },
  retryText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  clearFiltersButton: {
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#4700ec',
  },
  clearFiltersText: {
    color: '#18142F',
    fontSize: 12,
    fontWeight: '700',
  },
  footerLoader: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    paddingBottom: 32,
  },
  skeletonTile: {
    marginRight: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  skeletonTileLastInRow: {
    marginRight: 0,
    marginBottom: GRID_GAP,
  },
});
