import { Ionicons } from '@expo/vector-icons';
import { AppAlert as Alert } from '@/utils/appAlert';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUpdateUser, useUpdateUserPreferences, useUser, useUserPreferences } from '../hooks/useUsers';
import { useAuthContext } from '../providers/AuthProvider';
import {
  disableRegisteredPushToken,
  isPushNotificationsOptedIn,
  registerForPushNotifications,
} from '../services/pushNotificationService';
import { confirmAccountDeletionEntry } from '../utils/accountDeletionConfirmation';
import { useSubscription } from '../providers/SubscriptionContext';

// Notification bitmask constants
const PUSH_NOTIFICATIONS_BIT = 1; // bit 0
const EMAIL_NOTIFICATIONS_BIT = 2; // bit 1

export default function SettingsScreen() {
  const router = useRouter();
  const isDark = false;
  const { user: authUser, logout } = useAuthContext();
  const { status: subscriptionStatus } = useSubscription();
  const userId = authUser?.id ?? 0;
  const { data: user, isLoading: isUserLoading } = useUser(userId);
  const { data: preferences, isLoading: isPreferencesLoading } = useUserPreferences(userId);
  const updateUser = useUpdateUser();
  const updatePreferences = useUpdateUserPreferences();
  const [notificationOperationPending, setNotificationOperationPending] = useState(false);
  const notificationOperationRef = useRef(false);
  const isSavingNotifications = updateUser.isPending
    || updatePreferences.isPending
    || notificationOperationPending
    || isUserLoading
    || isPreferencesLoading;

  const [pushNotifications, setPushNotifications] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [motivationAlerts, setMotivationAlerts] = useState(false);

  useEffect(() => {
    if (notificationOperationRef.current || (!user?.id && !preferences)) {
      return;
    }
    const mask = user?.notifications;
    const pushEnabled = isPushNotificationsOptedIn(
      mask,
      preferences?.pushNotificationsEnabled,
    );
    setPushNotifications(pushEnabled);
    setEmailNotifications(
      !!((mask ?? PUSH_NOTIFICATIONS_BIT) & EMAIL_NOTIFICATIONS_BIT)
      && (preferences?.emailNotificationsEnabled ?? false)
    );
    // Older preference rows inherit their existing global push choice.
    setMotivationAlerts(preferences?.notifyOnMotivation ?? pushEnabled);
  }, [preferences, user?.id, user?.notifications]);

  const saveNotificationPreferences = async (push: boolean, email: boolean) => {
    if (!userId) {
      throw new Error('Authenticated user required');
    }
    const notifications =
      (push ? PUSH_NOTIFICATIONS_BIT : 0) |
      (email ? EMAIL_NOTIFICATIONS_BIT : 0);
    await Promise.all([
      updateUser.mutateAsync({ userId, userData: { notifications } }),
      updatePreferences.mutateAsync({
        userId,
        preferences: {
          pushNotificationsEnabled: push,
          emailNotificationsEnabled: email,
        },
      }),
    ]);
  };

  const handlePushToggle = async (value: boolean) => {
    if (isSavingNotifications || notificationOperationRef.current || !userId) return;

    const previousValue = pushNotifications;
    notificationOperationRef.current = true;
    setNotificationOperationPending(true);
    setPushNotifications(value);

    try {
      if (value) {
        const token = await registerForPushNotifications(userId);
        if (!token) {
          setPushNotifications(previousValue);
          Alert.alert(
            'Notification Permission Required',
            'Allow notifications in your device settings, then try again.',
          );
          return;
        }

        try {
          await saveNotificationPreferences(true, emailNotifications);
        } catch {
          await disableRegisteredPushToken(userId).catch(() => undefined);
          setPushNotifications(previousValue);
          Alert.alert('Error', 'Failed to enable push notifications. Please try again.');
        }
        return;
      }

      try {
        await saveNotificationPreferences(false, emailNotifications);
      } catch {
        setPushNotifications(previousValue);
        Alert.alert('Error', 'Failed to disable push notifications. Please try again.');
        return;
      }

      try {
        await disableRegisteredPushToken(userId);
      } catch {
        Alert.alert(
          'Push Notifications Disabled',
          'Your preference is off. Device cleanup will retry the next time the app starts.',
        );
      }
    } catch {
      setPushNotifications(previousValue);
      Alert.alert('Error', 'Could not update push notifications. Please try again.');
    } finally {
      notificationOperationRef.current = false;
      setNotificationOperationPending(false);
    }
  };

  const handleMotivationToggle = async (value: boolean) => {
    if (isSavingNotifications || !userId) return;
    const previousValue = motivationAlerts;
    setMotivationAlerts(value);

    try {
      await updatePreferences.mutateAsync({
        userId,
        preferences: { notifyOnMotivation: value },
      });
    } catch {
      setMotivationAlerts(previousValue);
      Alert.alert('Error', 'Could not update progress and ranking alerts. Please try again.');
    }
  };

  const styles = createStyles(isDark);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch {
              // logout clears local state regardless
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    confirmAccountDeletionEntry(() => router.push('/delete-account' as any));
  };

  const SettingItem: React.FC<{
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    showArrow?: boolean;
    danger?: boolean;
    isLast?: boolean;
  }> = ({ icon, title, subtitle, onPress, rightElement, showArrow = true, danger = false, isLast = false }) => (
    <TouchableOpacity style={[styles.settingItem, isLast && styles.settingItemLast]} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, danger && styles.dangerIconContainer]}>
          <Ionicons name={icon} size={24} color={danger ? styles.dangerTitle.color : styles.iconColor.color} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, danger && styles.dangerTitle]}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showArrow && (
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={styles.chevronColor.color} 
            style={{ marginLeft: 8 }}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={styles.headerText.color} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <SettingItem
            icon="diamond-outline"
            title={subscriptionStatus?.premium ? 'Manage Premium' : 'ChallengeSphere Premium'}
            subtitle={subscriptionStatus?.premium
              ? 'Premium active · 20 public + 20 private'
              : 'More challenges, no ads, and a Premium badge'}
            onPress={() => router.push('/premium' as any)}
          />
          <SettingItem
            icon="person-outline"
            title="Edit Profile"
            subtitle="Update your profile information"
            onPress={() => router.push('/edit-profile')}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            title="Privacy & Safety"
            subtitle="Visibility, blocked accounts, and account control"
            onPress={() => router.push('/privacy-security' as any)}
          />
          <SettingItem
            icon="logo-whatsapp"
            title="Invite Friends"
            subtitle="Bring your folks to challengesphere!"
            isLast
            onPress={() => router.push({
              pathname: '/invite-contacts',
              params: { mode: 'app' },
            } as any)}
          />
        </View>

        <SectionHeader title="App Preferences" />
        <View style={styles.section}>
          <SettingItem
            icon="notifications-outline"
            title="Push Notifications"
            subtitle="Receive push notifications"
            rightElement={
              isSavingNotifications ? (
                <ActivityIndicator size="small" color="#4700ecff" />
              ) : (
                <Switch
                  value={pushNotifications}
                  onValueChange={handlePushToggle}
                  trackColor={{ false: '#767577', true: '#4700ecff' }}
                  thumbColor={pushNotifications ? '#ffffff' : '#f4f3f4'}
                  disabled={isSavingNotifications}
                />
              )
            }
            showArrow={false}
            onPress={() => handlePushToggle(!pushNotifications)}
          />
          <SettingItem
            icon="trending-up-outline"
            title="Progress & ranking alerts"
            subtitle="Milestones in your inbox and, when enabled, by push"
            isLast
            rightElement={
              isSavingNotifications ? (
                <ActivityIndicator size="small" color="#4700ecff" />
              ) : (
                <Switch
                  value={motivationAlerts}
                  onValueChange={handleMotivationToggle}
                  trackColor={{ false: '#767577', true: '#4700ecff' }}
                  thumbColor={motivationAlerts ? '#ffffff' : '#f4f3f4'}
                  disabled={isSavingNotifications}
                  accessibilityLabel="Progress and ranking alerts"
                />
              )
            }
            showArrow={false}
            onPress={() => handleMotivationToggle(!motivationAlerts)}
          />
        </View>

        <SectionHeader title="Shape ChallengeSphere" />
        <View style={styles.section}>
          {/* Integrations and the product roadmap are intentionally hidden from Settings for now. */}
          <SettingItem
            icon="bulb-outline"
            title="Request a Feature"
            subtitle="Share an idea that would improve ChallengeSphere"
            isLast
            onPress={() => router.push('/feature-request' as any)}
          />
        </View>

        <SectionHeader title="Help & Legal" />
        <View style={styles.section}>
          <SettingItem
            icon="sparkles-outline"
            title="What is this app for?"
            subtitle="Replay the intro screens"
            onPress={() => router.push({
              pathname: '/onboarding',
              params: { replay: '1', returnTo: '/settings' },
            } as any)}
          />
          <SettingItem
            icon="help-circle-outline"
            title="Help Center"
            subtitle="Get help and support"
            onPress={() => router.push('/help-center' as any)}
          />
          <SettingItem
            icon="document-text-outline"
            title="Privacy Policy"
            subtitle="How ChallengeSphere handles your data"
            onPress={() => router.push('/privacy-policy' as any)}
          />
          <SettingItem
            icon="people-circle-outline"
            title="Terms & Community Rules"
            subtitle="What everyone agrees to before posting"
            onPress={() => router.push('/community-rules' as any)}
          />
          <SettingItem
            icon="chatbubble-ellipses-outline"
            title="App Support"
            subtitle="Send issues with screenshots"
            onPress={() => router.push('/app-support' as any)}
          />
          <SettingItem
            icon="information-circle-outline"
            title="About"
            subtitle="App version and info"
            isLast
            onPress={() => router.push('/about' as any)}
          />
        </View>
        <SectionHeader title="Session" />
        <View style={styles.section}>
          <SettingItem
            icon="log-out-outline"
            title="Logout"
            subtitle="Sign out of your account"
            isLast
            onPress={handleLogout}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ChallengeSphere v{Constants.expoConfig?.version ?? '—'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#000000' : '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#000000',
  },
  headerText: {
    color: isDark ? '#ffffff' : '#000000',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#e0e0e0',
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 19,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#000000',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: isDark ? '#888888' : '#666666',
    marginBottom: 4,
  },
  profileStats: {
    fontSize: 13,
    color: '#4700ecff',
    fontWeight: '500',
  },
  editProfileButton: {
    padding: 8,
    borderRadius: 24,
    backgroundColor: isDark ? '#333333' : '#f0f0f0',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#000000',
    marginLeft: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  section: {
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? '#333333' : '#E7E3EF',
    overflow: 'hidden',
  },
  emptyIntegrationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#111111' : '#f8f9fa',
    borderWidth: 1,
    borderColor: isDark ? '#2a2a2a' : '#e2e2e2',
    borderRadius: 20,
    padding: 14,
  },
  emptyIntegrationIcon: {
    width: 44,
    height: 44,
    borderRadius: 20,
    backgroundColor: '#F0ECFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#f0f0f0',
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? '#333333' : '#F0ECFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dangerIconContainer: {
    backgroundColor: '#ff3b3020',
  },
  iconColor: {
    color: isDark ? '#ffffff' : '#5B3FE5',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: isDark ? '#ffffff' : '#000000',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: isDark ? '#888888' : '#666666',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevronColor: {
    color: isDark ? '#666666' : '#777389',
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ff3b30',
    marginBottom: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 13,
    color: isDark ? '#666666' : '#888888',
    marginBottom: 4,
    textAlign: 'center',
  },
});
