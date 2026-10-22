import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../../theme/typography';
import SharedHeader from '../../components/SharedHeader';
import MaterialIcon from '../../components/MaterialIcon';
import { useAuth } from '../../context/AuthContext';



import { useTranslation } from 'react-i18next';
import { getDisplayLabel, resolveAppLanguage } from '../../i18n/languages';

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
  const { user, logout, refresh } = useAuth();
  const { t, i18n } = useTranslation();

  // Pull the authoritative record so KYC status and document state are real
  // rather than whatever was cached at login.
  useEffect(() => {
    refresh();
  }, [refresh]);

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

  const docCount = Object.values(user?.documents || {}).filter(Boolean).length;

  const kycSubtitle = (status?: string) => {
    if (status === 'approved') return `${t('kyc.statusVerified')} · payouts enabled`;
    if (status === 'under_review') return t('kyc.statusPending');
    if (status === 'rejected') return `${t('kyc.statusRejected')} · resubmit required`;
    return 'Aadhaar, PAN, Bank, Selfie';
  };

  const MENU_ITEMS = [
    {
      key: 'Documents',
      icon: 'description',
      title: t('settings.vehicleDocuments'),
      subtitle: docCount ? `${docCount} uploaded` : t('settings.vehicleDocsSub'),
    },
    {
      key: 'KYC Verification',
      icon: 'fingerprint',
      title: t('settings.kycVerification'),
      subtitle: kycSubtitle(user?.kycStatus),
    },
    { key: 'Payout Methods', icon: 'account-balance', title: t('settings.payout'), subtitle: 'Add bank / UPI for payouts' },
    { key: 'Help & Support', icon: 'support-agent', title: t('settings.helpAndSupport'), subtitle: 'Contact partner support' },
  ];

  const handleMenuPress = (key: string) => {
    router.push(MENU_ROUTES[key] ?? '/settings');
  };

  const currentLangCode = resolveAppLanguage(i18n.language) ?? 'en';
  const currentLangLabel = getDisplayLabel(currentLangCode);

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
        <View style={styles.kycBanner}>
          <MaterialIcon
            name={user?.kycStatus === 'approved' ? 'verified' : 'info'}
            size={16}
            color={user?.kycStatus === 'approved' ? '#047857' : '#B45309'}
          />
          <Text style={styles.kycBannerText}>{kycSubtitle(user?.kycStatus)}</Text>
        </View>

        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} activeOpacity={0.8} onPress={() => handleMenuPress(item.key)}>
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
          <Text style={styles.sectionTitle}>{t('settings.title')}</Text>
          <TouchableOpacity style={styles.settingsItem} activeOpacity={0.8} onPress={() => router.push('/settings')}>
            <Text style={styles.settingsItemText}>{t('settings.navigation')}</Text>
            <MaterialIcon name="map" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} activeOpacity={0.8} onPress={() => router.push('/settings')}>
            <Text style={styles.settingsItemText}>{t('settings.language')}</Text>
            <Text style={styles.settingsValue}>{currentLangLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={async () => {
          await logout();
          router.replace('/login');
        }}>
          <MaterialIcon name="logout" size={20} color={colors.accentRed} />
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
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
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.surfaceGray,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackSm,
  },
  kycBannerText: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
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
