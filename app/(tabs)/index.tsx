import { Ionicons } from '@expo/vector-icons';
import { FEED_ENABLED } from '@/constants/feed';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useAuthContext } from '@/providers/AuthProvider';
import Feed from '@/screens/Feed';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';

const FriendsTab = () => {
  const router = useRouter();
  const { currentUserId } = useAuthContext();
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount(currentUserId);

  const inviteFriends = () => {
    router.push({ pathname: '/invite-contacts', params: { mode: 'app' } } as any);
  };

  const createPrivateChallenge = () => {
    router.push('/(tabs)/create');
  };

  const openNotifications = () => {
    router.push('/notifications');
  };

  const friendsHeader = (
    <>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Friends</Text>
          <Text style={styles.headerSubtitle}>Activity from your connections.</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={openNotifications}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open notifications"
        >
          <Ionicons name="notifications-outline" size={20} color="#18142F" />
          {unreadNotifications > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotifications > 9 ? '9+' : unreadNotifications.toString()}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroSummary}>
          <View style={styles.heroIcon}>
            <Ionicons name="people" size={20} color="#F4EFFF" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>PRIVATE CHALLENGES</Text>
            <Text style={styles.heroTitle}>Start something worth remembering!</Text>
            <Text style={styles.heroBody}>Begin a private challenge solo or invite your folks!</Text>
          </View>
        </View>
        <View style={styles.heroActions}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={createPrivateChallenge}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel="Create a private challenge"
          >
            <Ionicons name="lock-closed" size={17} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Create challenge</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={inviteFriends}
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityLabel="Invite friends to ChallengeSphere"
          >
            <Ionicons name="paper-plane-outline" size={17} color="#5B3FE5" />
            <Text style={styles.secondaryActionText}>Invite friends</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {FEED_ENABLED ? (
        <Feed headerComponent={friendsHeader} />
      ) : (
        <ScrollView style={styles.feedContainer} contentContainerStyle={styles.disabledContent}>
          {friendsHeader}
          <View style={styles.activityEmpty}>
            <View style={styles.activityEmptyIcon}>
              <Ionicons name="sparkles-outline" size={25} color="#5B3FE5" />
            </View>
            <Text style={styles.activityEmptyTitle}>No connection check-ins yet</Text>
            <Text style={styles.activityEmptyBody}>
              Public posts from followers and people you follow will appear here. Private posts only appear from challenges you share.
            </Text>
            <TouchableOpacity style={styles.emptyInviteButton} onPress={inviteFriends} activeOpacity={0.84}>
              <Ionicons name="person-add-outline" size={17} color="#FFFFFF" />
              <Text style={styles.emptyInviteText}>Invite your first friend</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: '#18142F',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    marginTop: 3,
    color: '#777389',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  notificationButton: {
    position: 'relative',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4700ec',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  heroCard: {
    marginHorizontal: 14,
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CFC2FF',
    borderRadius: 22,
    backgroundColor: '#F0ECFF',
  },
  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4700ec',
  },
  heroSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  heroEyebrow: {
    color: '#5B3FE5',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  heroTitle: {
    marginTop: 2,
    color: '#18142F',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  heroBody: {
    marginTop: 2,
    color: '#655F70',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 10,
  },
  primaryAction: {
    flex: 1.35,
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 16,
    backgroundColor: '#4700ec',
    paddingHorizontal: 12,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryAction: {
    flex: 0.85,
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#B8A6FF',
    borderRadius: 16,
    backgroundColor: '#FBFAFF',
    paddingHorizontal: 10,
  },
  secondaryActionText: {
    color: '#5B3FE5',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 7,
  },
  sectionTitle: {
    color: '#18142F',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  sectionHint: {
    marginTop: 2,
    color: '#777389',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  feedContainer: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  disabledContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  activityEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 28,
  },
  activityEmptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#DDD4FF',
  },
  activityEmptyTitle: {
    marginTop: 13,
    color: '#18142F',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  activityEmptyBody: {
    marginTop: 6,
    maxWidth: 330,
    color: '#777389',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyInviteButton: {
    minHeight: 42,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 16,
    backgroundColor: '#2c2140',
    borderWidth: 1,
    borderColor: '#4b3968',
    paddingHorizontal: 16,
  },
  emptyInviteText: {
    color: '#18142F',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default FriendsTab;
