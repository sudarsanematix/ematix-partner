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
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../../theme/typography';
import SharedHeader from '../../components/SharedHeader';
import MaterialIcon from '../../components/MaterialIcon';

const MENU_ITEMS = [
  { icon: 'directions-car', title: 'Vehicle Details', subtitle: 'TN 01 AB 1234 • Bajaj RE' },
  { icon: 'description', title: 'Documents', subtitle: 'RC Book, Insurance, License' },
  { icon: 'account-balance', title: 'Payout Methods', subtitle: 'HDFC Bank ending in 4321' },
  { icon: 'support-agent', title: 'Help & Support', subtitle: 'Contact partner support' },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

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
          <Text style={styles.driverName}>Rajesh Kumar</Text>
          <Text style={styles.joinedText}>Partner since Jan 2024</Text>
          
          <View style={styles.badgesRow}>
            <View style={styles.badge}>
              <MaterialIcon name="star" size={16} color="#F59E0B" />
              <Text style={styles.badgeText}>4.92</Text>
            </View>
            <View style={styles.badge}>
              <MaterialIcon name="verified" size={16} color={colors.primary} />
              <Text style={styles.badgeText}>Platinum Tier</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} activeOpacity={0.8}>
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
          <TouchableOpacity style={styles.settingsItem}>
            <Text style={styles.settingsItemText}>Navigation Preferences</Text>
            <MaterialIcon name="map" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem}>
            <Text style={styles.settingsItemText}>Language</Text>
            <Text style={styles.settingsValue}>English</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8}>
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
  joinedText: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    ...type.labelMd,
    color: colors.onSurface,
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
