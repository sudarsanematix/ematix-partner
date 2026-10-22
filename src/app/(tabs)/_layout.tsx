import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, type } from '../../theme/typography';
import MaterialIcon from '../../components/MaterialIcon';
import { useAuth } from '../../context/AuthContext';

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const { user, loading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading]);

  if (loading || !user) {
    return null;
  }

  const TAB_BAR_CONTENT_HEIGHT = 60;
  const dynamicTabBarStyle = {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    height: Platform.OS === 'android' 
      ? TAB_BAR_CONTENT_HEIGHT + insets.bottom 
      : 85,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' 
      ? Math.max(insets.bottom, 8) 
      : 28,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, dynamicTabBarStyle, { backgroundColor: isDark ? 'rgba(18, 18, 26, 0.95)' : 'rgba(252, 249, 248, 0.95)' }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: styles.tabIcon,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ color }) => <MaterialIcon name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: t('nav.earnings'),
          tabBarIcon: ({ color }) => <MaterialIcon name="account-balance-wallet" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ask-ematix"
        options={{
          title: t('nav.askEmatix'),
          tabBarIcon: ({ color }) => <MaterialIcon name="auto-awesome" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color }) => <MaterialIcon name="account-circle" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 0,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 10,
  },
  tabLabel: {
    ...type.labelSm,
    fontFamily: fonts.semibold,
    marginTop: 4,
  },
  tabIcon: {
    marginTop: 2,
  },
});
