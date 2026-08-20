import AvatarImage from '@/components/common/AvatarImage';
import { HapticTab } from '@/components/HapticTab';
import InstantTabScene from '@/components/navigation/InstantTabScene';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthContext } from '@/providers/AuthProvider';
import { useUser } from '@/hooks/useUsers';
import { getTabBarMetrics } from '@/utils/tabBarMetrics';

const renderChallengesTabButton = (props: BottomTabBarButtonProps) => (
  <HapticTab {...props} routeName="challenges" />
);
const renderFriendsTabButton = (props: BottomTabBarButtonProps) => (
  <HapticTab {...props} routeName="index" />
);
const renderCreateTabButton = (props: BottomTabBarButtonProps) => (
  <HapticTab {...props} routeName="create" />
);
const renderExploreTabButton = (props: BottomTabBarButtonProps) => (
  <HapticTab {...props} routeName="global" />
);
const renderProfileTabButton = (props: BottomTabBarButtonProps) => (
  <HapticTab {...props} routeName="profile" />
);
const renderTabScreenLayout: NonNullable<React.ComponentProps<typeof Tabs>['screenLayout']> = ({
  children,
  route,
}) => <InstantTabScene routeName={route.name}>{children}</InstantTabScene>;

function useTabIconAnimation(focused: boolean, focusedScale: number) {
  const scale = React.useRef(new Animated.Value(focused ? focusedScale : 1)).current;
  const opacity = React.useRef(new Animated.Value(focused ? 1 : 0.7)).current;

  React.useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(scale, {
        toValue: focused ? focusedScale : 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.7,
        duration: 120,
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [focused, focusedScale, opacity, scale]);

  return { opacity, transform: [{ scale }] };
}

function ProfileTabIcon({ focused }: { focused: boolean }) {
  const { user: authUser, currentUserId } = useAuthContext();
  const { data: currentUser } = useUser(currentUserId);
  const animatedStyle = useTabIconAnimation(focused, 1.14);

  const profilePicUrl = currentUser?.profilePicUrl || authUser?.profilePicUrl;
  return (
    <Animated.View style={animatedStyle}>
      <AvatarImage
        uri={profilePicUrl}
        size={28}
        style={{
          borderWidth: focused ? 2 : 1,
          borderColor: focused ? '#4700ecff' : '#666666',
        }}
      />
    </Animated.View>
  );
}

type TabIconProps = {
  focused: boolean;
  activeIconName: keyof typeof Ionicons.glyphMap;
  inactiveIconName: keyof typeof Ionicons.glyphMap;
  title: string;
};

function TabIcon({ focused, activeIconName, inactiveIconName, title }: TabIconProps) {
  const isCreate = title === 'Create';
  const animatedStyle = useTabIconAnimation(focused, 1);
  const iconName = focused ? activeIconName : inactiveIconName;
  const iconColor = focused ? '#FFFFFF' : '#8F8996';

  return (
    <View style={styles.tabIconSlot}>
      <Animated.View
        style={[
          styles.tabIconSurface,
          focused && styles.tabIconSurfaceFocused,
          animatedStyle,
        ]}
      >
        <Ionicons name={iconName} size={isCreate ? 24 : 25} color={iconColor} />
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  const { bottom } = useSafeAreaInsets();
  const tabBarMetrics = getTabBarMetrics(bottom);

  return (
    <Tabs
      initialRouteName="challenges"
      detachInactiveScreens={true}
      screenLayout={renderTabScreenLayout}
      screenOptions={{
        lazy: true,
        freezeOnBlur: true,
        animation: 'none',
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          height: tabBarMetrics.height,
          paddingBottom: tabBarMetrics.paddingBottom,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderTopColor: '#E7E3EF',
          overflow: 'hidden',
        },
        sceneStyle: { backgroundColor: '#f8f7fc' },
      }}>
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Challenges',
          headerShown: false,
          tabBarButton: renderChallengesTabButton,
          tabBarAccessibilityLabel: 'Challenges tab',
          tabBarButtonTestID: 'bottom-tab-challenges',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              activeIconName="trophy"
              inactiveIconName="trophy-outline"
              title="Challenges"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Friends',
          headerShown: false,
          tabBarButton: renderFriendsTabButton,
          tabBarAccessibilityLabel: 'Friends tab',
          tabBarButtonTestID: 'bottom-tab-friends',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              activeIconName="people"
              inactiveIconName="people-outline"
              title="Friends"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          headerShown: false,
          tabBarButton: renderCreateTabButton,
          tabBarAccessibilityLabel: 'Create tab',
          tabBarButtonTestID: 'bottom-tab-create',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              activeIconName="add"
              inactiveIconName="add"
              title="Create"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="global"
        options={{
          title: 'Explore',
          headerShown: false,
          tabBarButton: renderExploreTabButton,
          tabBarAccessibilityLabel: 'Explore tab',
          tabBarButtonTestID: 'bottom-tab-explore',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              activeIconName="compass"
              inactiveIconName="compass-outline"
              title="Explore"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarButton: renderProfileTabButton,
          tabBarAccessibilityLabel: 'Profile tab',
          tabBarButtonTestID: 'bottom-tab-profile',
          tabBarIcon: ({ focused }) => (
            <ProfileTabIcon focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconSlot: {
    width: 54,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: 2 }],
  },
  tabIconSurface: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconSurfaceFocused: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4700ec',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#4700EC',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
