import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { Image as ExpoImage } from 'expo-image';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ChallengeSubmissionPreview as ChallengeSubmissionPreviewData,
  SubmissionPreviewItem,
} from '../../types/api';
import { useSignedMediaRecovery } from '../../hooks/useSignedMediaRecovery';
import { createCachedRemoteImageSource } from '../../utils/remoteImageCache';

interface ChallengeSubmissionPreviewProps {
  preview?: ChallengeSubmissionPreviewData;
  preloadPreview?: ChallengeSubmissionPreviewData;
  loading?: boolean;
  profileMode?: boolean;
  profileUsername?: string;
  scope?: 'all' | 'mine';
  onScopeChange?: (scope: 'all' | 'mine') => void;
  onSubmissionPress?: (submission: SubmissionPreviewItem) => void;
  onViewAll?: () => void;
  compact?: boolean;
}

const SKELETON_ITEMS = [0, 1, 2, 3];

export default function ChallengeSubmissionPreview({
  preview,
  preloadPreview,
  loading = false,
  profileMode = false,
  profileUsername,
  scope = 'all',
  onScopeChange,
  onSubmissionPress,
  onViewAll,
  compact = true,
}: ChallengeSubmissionPreviewProps) {
  const recoverSignedMedia = useSignedMediaRecovery();

  const visibleSubmissions = useMemo(
    () => (preview?.submissions || []).slice(0, 4),
    [preview?.submissions],
  );
  const submissionsToPreload = useMemo(
    () => (preloadPreview?.submissions || []).slice(0, 4),
    [preloadPreview?.submissions],
  );
  const totalCount = Math.max(preview?.totalCount || 0, visibleSubmissions.length);
  const hiddenCount = Math.max(0, totalCount - visibleSubmissions.length);
  const missingSlotCount = compact ? Math.max(0, 4 - visibleSubmissions.length) : 0;
  const expandedSingleSubmission = !compact && visibleSubmissions.length === 1;
  const username = profileUsername?.replace(/^@/, '').trim();
  const title = profileMode ? 'User submissions' : 'Submissions';
  const showScopeTabs = !profileMode && Boolean(onScopeChange);
  const showingMine = showScopeTabs && scope === 'mine';

  return (
    <View style={[styles.container, !compact && styles.containerExpanded]}>
      <View
        style={styles.preloadCache}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {submissionsToPreload.map((submission) => (
          <ExpoImage
            key={`${submission.submissionId}:${submission.mediaUrl}`}
            source={createCachedRemoteImageSource(submission.mediaUrl)}
            style={styles.preloadImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="low"
            recyclingKey={`${submission.submissionId}:${submission.mediaUrl}`}
            onError={() => recoverSignedMedia(submission.mediaUrl)}
          />
        ))}
      </View>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Ionicons name="camera-outline" size={19} color="#6C42E8" />
          <Text style={styles.title}>{title}</Text>
        </View>
        {!!onViewAll && !loading && visibleSubmissions.length > 0 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={(event) => {
              event.stopPropagation();
              onViewAll();
            }}
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel={`Show all ${title.toLowerCase()}`}
          >
            <Text style={styles.viewAllText}>Show all</Text>
            <Ionicons name="chevron-forward" size={17} color="#6C42E8" />
          </TouchableOpacity>
        )}
      </View>

      {showScopeTabs ? (
        <View style={styles.scopeTabs}>
          {(['all', 'mine'] as const).map((nextScope) => {
            const selected = scope === nextScope;
            const label = nextScope === 'all' ? 'All submissions' : 'My submissions';
            return (
              <TouchableOpacity
                key={nextScope}
                style={[styles.scopeTab, selected && styles.scopeTabSelected]}
                onPress={(event) => {
                  event.stopPropagation();
                  onScopeChange?.(nextScope);
                }}
                activeOpacity={0.78}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={label}
              >
                <Text style={[styles.scopeTabText, selected && styles.scopeTabTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {loading ? (
        <View style={[styles.thumbnailRow, !compact && styles.thumbnailGridExpanded]}>
          {SKELETON_ITEMS.map((item) => (
            <View
              key={item}
              style={[
                styles.thumbnailButton,
                !compact && styles.thumbnailButtonExpanded,
                styles.skeleton,
              ]}
            >
              {item === 0 && <ActivityIndicator size="small" color="#8064e8" />}
            </View>
          ))}
        </View>
      ) : visibleSubmissions.length > 0 ? (
        <View style={[styles.thumbnailRow, !compact && styles.thumbnailGridExpanded]}>
          {visibleSubmissions.map((submission, index) => {
            const showOverflow = hiddenCount > 0 && index === visibleSubmissions.length - 1;
            return (
              <TouchableOpacity
                key={submission.submissionId}
                style={[
                  styles.thumbnailButton,
                  !compact && styles.thumbnailButtonExpanded,
                  expandedSingleSubmission && styles.thumbnailButtonExpandedSingle,
                ]}
                onPress={(event) => {
                  event.stopPropagation();
                  onSubmissionPress?.(submission);
                }}
                activeOpacity={onSubmissionPress ? 0.78 : 1}
                accessibilityRole={onSubmissionPress ? 'button' : undefined}
                accessibilityLabel={`Open submission ${submission.submissionId}`}
              >
                <ExpoImage
                  source={createCachedRemoteImageSource(submission.mediaUrl)}
                  style={styles.thumbnail}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  priority="high"
                  recyclingKey={`${submission.submissionId}:${submission.mediaUrl}`}
                  transition={120}
                  onError={() => recoverSignedMedia(submission.mediaUrl)}
                />
                {showOverflow && (
                  <View style={styles.overflowOverlay}>
                    <View style={styles.overflowCount}>
                      <Text style={styles.overflowText}>+{hiddenCount}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {Array.from({ length: missingSlotCount }, (_, index) => (
            <View
              key={`thumbnail-spacer-${index}`}
              style={[styles.thumbnailSpacer, !compact && styles.thumbnailSpacerExpanded]}
              pointerEvents="none"
            />
          ))}
        </View>
      ) : (
        <View style={[styles.emptyState, !compact && styles.emptyStateExpanded]}>
          <Ionicons name="images-outline" size={compact ? 24 : 30} color="#6C42E8" />
          <Text style={styles.emptyTitle}>
            {profileMode
              ? `No submissions from ${username ? `@${username}` : 'this user'} yet.`
              : showingMine
                ? 'You have no submissions yet.'
                : 'No submissions yet.'}
          </Text>
          {!profileMode && (
            <Text style={styles.emptySubtitle}>
              {showingMine ? 'Your challenge check-ins will appear here.' : 'Be the first one to submit!'}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  preloadCache: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
  preloadImage: {
    position: 'absolute',
    width: 1,
    height: 1,
  },
  container: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
  },
  containerExpanded: {
    marginHorizontal: 0,
    marginTop: 16,
    marginBottom: 0,
    padding: 16,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
    marginBottom: 12,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 9,
  },
  title: {
    color: '#18142F',
    fontSize: 16,
    fontWeight: '700',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingVertical: 3,
    gap: 2,
  },
  viewAllText: {
    color: '#5B3FE5',
    fontSize: 13,
    fontWeight: '700',
  },
  scopeTabs: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    marginBottom: 14,
    borderRadius: 15,
    backgroundColor: '#F0ECFF',
  },
  scopeTab: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  scopeTabSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD4FF',
  },
  scopeTabText: {
    color: '#6F6879',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  scopeTabTextSelected: {
    color: '#4700EC',
  },
  thumbnailRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 9,
  },
  thumbnailGridExpanded: {
    flexWrap: 'wrap',
  },
  thumbnailButton: {
    flex: 1,
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#F8F7FC',
  },
  thumbnailButtonExpanded: {
    flex: 0,
    width: '48.5%',
    height: 112,
    aspectRatio: undefined,
    borderRadius: 18,
    borderColor: '#E7E3EF',
  },
  thumbnailButtonExpandedSingle: {
    width: '100%',
    height: 136,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailSpacer: {
    flex: 1,
    aspectRatio: 1,
  },
  thumbnailSpacerExpanded: {
    flex: 0,
    width: '48.5%',
    height: 112,
    aspectRatio: undefined,
  },
  skeleton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#E7E3EF',
    backgroundColor: '#F0ECFF',
  },
  overflowOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  overflowCount: {
    minWidth: 38,
    height: 38,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(8, 8, 11, 0.9)',
  },
  overflowText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emptyStateExpanded: {
    minHeight: 116,
  },
  emptyTitle: {
    marginTop: 7,
    color: '#18142F',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 2,
    color: '#655F70',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
