import { useIsFocused } from '@react-navigation/native';
import React, {
  startTransition,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  type DimensionValue,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabSkeletonVariant = 'challenges' | 'create' | 'explore' | 'feed' | 'profile';

type TabShellConfig = {
  title: string;
  variant: TabSkeletonVariant;
  testId: string;
};

const TAB_SHELLS: Record<string, TabShellConfig> = {
  challenges: { title: 'Challenges', variant: 'challenges', testId: 'challenges' },
  index: { title: 'Friends', variant: 'feed', testId: 'friends' },
  create: { title: 'Create a challenge', variant: 'create', testId: 'create' },
  global: { title: 'Explore', variant: 'explore', testId: 'explore' },
  profile: { title: 'Profile', variant: 'profile', testId: 'profile' },
};

const FALLBACK_SHELL: TabShellConfig = {
  title: 'ChallengeSphere',
  variant: 'challenges',
  testId: 'unknown',
};

function SkeletonBlock({
  height,
  width = '100%',
  radius = 10,
  style,
}: {
  height: number;
  width?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.skeletonBlock,
        { borderRadius: radius, height, width },
        style,
      ]}
    />
  );
}

const SkeletonLines = () => (
  <View style={styles.skeletonLines}>
    <SkeletonBlock height={13} width="72%" radius={7} />
    <SkeletonBlock height={11} width="92%" radius={6} />
    <SkeletonBlock height={11} width="58%" radius={6} />
  </View>
);

const GallerySkeleton = () => (
  <>
    <SkeletonBlock height={54} radius={18} />
    <View style={styles.chipRow}>
      <SkeletonBlock height={34} width={74} radius={17} />
      <SkeletonBlock height={34} width={88} radius={17} />
      <SkeletonBlock height={34} width={68} radius={17} />
    </View>
    {[0, 1].map((item) => (
      <View key={item} style={styles.galleryCard}>
        <SkeletonBlock height={132} radius={14} />
        <SkeletonLines />
      </View>
    ))}
  </>
);

const FeedSkeleton = () => (
  <>
    <SkeletonBlock height={118} radius={18} />
    <View style={styles.feedCard}>
      <View style={styles.avatarRow}>
        <SkeletonBlock height={36} width={36} radius={18} />
        <View style={styles.avatarCopy}>
          <SkeletonBlock height={12} width="42%" radius={6} />
          <SkeletonBlock height={10} width="28%" radius={5} />
        </View>
      </View>
      <SkeletonBlock height={282} radius={0} />
      <SkeletonLines />
    </View>
  </>
);

const CreateSkeleton = () => (
  <>
    <SkeletonBlock height={104} radius={18} />
    <View style={styles.formCard}>
      <SkeletonBlock height={13} width="32%" radius={7} />
      <SkeletonBlock height={48} radius={12} />
      <SkeletonBlock height={13} width="42%" radius={7} />
      <SkeletonBlock height={92} radius={12} />
      <SkeletonBlock height={13} width="30%" radius={7} />
      <View style={styles.chipRow}>
        <SkeletonBlock height={36} width={88} radius={18} />
        <SkeletonBlock height={36} width={78} radius={18} />
      </View>
    </View>
  </>
);

const ProfileSkeleton = () => (
  <>
    <View style={styles.profileSummary}>
      <SkeletonBlock height={82} width={82} radius={41} />
      <View style={styles.profileCopy}>
        <SkeletonBlock height={18} width="58%" radius={9} />
        <SkeletonBlock height={12} width="38%" radius={6} />
        <SkeletonBlock height={11} width="82%" radius={6} />
      </View>
    </View>
    <View style={styles.statsRow}>
      {[0, 1, 2].map((item) => (
        <SkeletonBlock key={item} height={54} width="31%" radius={12} />
      ))}
    </View>
    <SkeletonBlock height={42} radius={12} />
    <View style={styles.profileGrid}>
      {[0, 1, 2, 3].map((item) => (
        <SkeletonBlock key={item} height={150} width="48.5%" radius={12} />
      ))}
    </View>
  </>
);

function SkeletonContent({ variant }: { variant: TabSkeletonVariant }) {
  if (variant === 'feed') return <FeedSkeleton />;
  if (variant === 'create') return <CreateSkeleton />;
  if (variant === 'profile') return <ProfileSkeleton />;
  return <GallerySkeleton />;
}

export function TabSceneSkeleton({ routeName }: { routeName: string }) {
  const shell = TAB_SHELLS[routeName] ?? FALLBACK_SHELL;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
      testID={`tab-skeleton-${shell.testId}`}
    >
      {shell.variant === 'feed' || shell.variant === 'challenges' ? (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{shell.title}</Text>
        </View>
      ) : null}
      <View
        accessibilityLabel={`Loading ${shell.title}`}
        accessibilityRole="progressbar"
        style={styles.content}
      >
        <SkeletonContent variant={shell.variant} />
      </View>
    </SafeAreaView>
  );
}

export default function InstantTabScene({
  children,
  routeName,
}: {
  children: React.ReactNode;
  routeName: string;
}) {
  const isFocused = useIsFocused();
  const mountedRef = useRef(false);
  const revealAttemptRef = useRef(0);
  const [candidateEpoch, setCandidateEpoch] = useState<number | null>(null);
  const markContentCommitted = useCallback(() => {
    mountedRef.current = true;
  }, []);

  useLayoutEffect(() => {
    if (!isFocused || mountedRef.current) return undefined;

    const attempt = ++revealAttemptRef.current;
    let cancelled = false;
    let secondFrame: number | undefined;
    const firstFrame = requestAnimationFrame(() => {
      if (cancelled || revealAttemptRef.current !== attempt) return;

      // A callback from the first RAF still runs before that frame paints.
      // The second RAF guarantees the destination skeleton was visible first.
      secondFrame = requestAnimationFrame(() => {
        if (cancelled || revealAttemptRef.current !== attempt) return;

        // Mounting a data-heavy tab is deliberately interruptible. A newer
        // focus change invalidates this epoch before abandoned content can
        // commit behind the newly selected tab.
        startTransition(() => setCandidateEpoch(attempt));
      });
    });

    return () => {
      cancelled = true;
      if (revealAttemptRef.current === attempt) {
        revealAttemptRef.current += 1;
      }
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
    };
  }, [isFocused]);

  const canRenderContent = mountedRef.current
    || (isFocused && candidateEpoch === revealAttemptRef.current);

  if (!canRenderContent) {
    return <TabSceneSkeleton routeName={routeName} />;
  }

  return (
    <ContentCommitBoundary onCommit={markContentCommitted}>
      {children}
    </ContentCommitBoundary>
  );
}

function ContentCommitBoundary({
  children,
  onCommit,
}: {
  children: React.ReactNode;
  onCommit: () => void;
}) {
  useLayoutEffect(onCommit, [onCommit]);
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  header: {
    minHeight: 62,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  headerTitle: {
    color: '#18142F',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  content: {
    flex: 1,
    gap: 14,
    paddingHorizontal: 14,
    paddingTop: 16,
    overflow: 'hidden',
  },
  skeletonBlock: {
    backgroundColor: '#FFFFFF',
  },
  skeletonLines: {
    gap: 8,
    padding: 14,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  galleryCard: {
    overflow: 'hidden',
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  feedCard: {
    overflow: 'hidden',
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
  },
  avatarCopy: {
    flex: 1,
    gap: 7,
  },
  formCard: {
    gap: 11,
    padding: 16,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 6,
  },
  profileCopy: {
    flex: 1,
    gap: 9,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
});
