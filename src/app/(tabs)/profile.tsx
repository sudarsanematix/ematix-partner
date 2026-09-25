import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../../theme/typography';
import SharedHeader from '../../components/SharedHeader';
import MaterialIcon from '../../components/MaterialIcon';
import { useAuth } from '../../context/AuthContext';



const MENU_ROUTES: Record<string, Href> = {
  Documents: '/documents',
  'KYC Verification': '/kyc',
  'Payout Methods': '/settings',
  'Help & Support': '/support',
};

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { user, logout } = useAuth();

  const displayType = user?.vehicleType 
    ? user.vehicleType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) 
    : 'Vehicle';

  const joinDate = user?.createdAt ? new Date(user.createdAt) : null;
  const joinedText = joinDate && !isNaN(joinDate.getTime())
    ? `Partner since ${joinDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
    : null;

  const maskPhone = (phone?: string) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) return phone;
    return `+91 ${digits.replace(/\d(?=\d{4})/g, '*')}`;
  };

  const MENU_ITEMS = [
    { icon: 'description', title: 'Documents', subtitle: 'RC Book, Insurance, License' },
    { icon: 'fingerprint', title: 'KYC Verification', subtitle: 'Aadhaar, PAN, Bank, Selfie' },
    { icon: 'account-balance', title: 'Payout Methods', subtitle: 'Add bank / UPI for payouts' },
    { icon: 'support-agent', title: 'Help & Support', subtitle: 'Contact partner support' },
  ];

  const handleMenuPress = (title: string) => {
    router.push(MENU_ROUTES[title] ?? '/settings');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar hidden />
      <SharedHeader currentScreen="profile" />
      
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <MaterialIcon name="account-circle" size={80} color={colors.primary} />
          </View>
          <Text style={styles.driverName}>{user?.name || user?.phone || 'Partner'}</Text>
          {user?.email ? <Text style={styles.contactText}>{user.email}</Text> : null}
          {maskPhone(user?.phone) ? <Text style={styles.contactText}>{maskPhone(user?.phone)}</Text> : null}
          <Text style={styles.joinedText}>
            {joinedText ? `${joinedText} • ${displayType}` : displayType}
          </Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} activeOpacity={0.8} onPress={() => handleMenuPress(item.title)}>
              <View style={styles.menuLeft}>
                <View style={styles.menuIconWrap}>
                  <MaterialIcon name={item.icon as any} size={22} color={colors.primary} />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <MaterialIcon name="chevron-right" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <TouchableOpacity style={styles.settingsItem} activeOpacity={0.8} onPress={() => router.push('/settings')}>
            <Text style={styles.settingsItemText}>Navigation Preferences</Text>
            <MaterialIcon name="map" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} activeOpacity={0.8} onPress={() => router.push('/settings')}>
            <Text style={styles.settingsItemText}>Language</Text>
            <Text style={styles.settingsValue}>English</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={async () => {
          await logout();
          router.replace('/login');
        }}>
          <MaterialIcon name="logout" size={20} color={colors.accentRed} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  container: {
    padding: spacing.marginMobile,
    paddingBottom: 132,
    gap: spacing.stackLg,
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: spacing.stackMd,
  },
  avatarWrap: {
    marginBottom: spacing.stackSm,
  },
  driverName: {
    ...type.headlineMd,
    color: colors.onSurface,
  },
  contactText: {
    ...type.bodyMd,
    color: colors.textMuted,
    marginTop: 2,
  },
  joinedText: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  menuSection: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.stackSm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.stackMd,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextWrap: {
    flexDirection: 'column',
  },
  menuTitle: {
    ...type.labelLg,
    color: colors.onSurface,
  },
  menuSubtitle: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  settingsSection: {
    marginTop: spacing.stackMd,
  },
  sectionTitle: {
    ...type.labelMd,
    color: colors.textMuted,
    marginBottom: spacing.stackSm,
    paddingHorizontal: spacing.stackXs,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.stackMd,
    marginBottom: 2, // Tiny gap to look like a list
  },
  settingsItemText: {
    ...type.bodyMd,
    color: colors.onSurface,
  },
  settingsValue: {
    ...type.bodySm,
    color: colors.primary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.stackLg,
    paddingVertical: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)', // Light red border
  },
  logoutText: {
    ...type.labelLg,
    color: colors.accentRed,
  },
});
