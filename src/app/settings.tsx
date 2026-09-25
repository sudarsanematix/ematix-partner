import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon, { MaterialIconName } from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import { useAuth } from '../context/AuthContext';

function Row({
  icon,
  label,
  sublabel,
  onPress,
  value,
  onValueChange,
  last,
}: {
  icon: MaterialIconName;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  value?: boolean;
  onValueChange?: (v: boolean) => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const content = (
    <>
      <View style={styles.optionIconWrap}>
        <MaterialIcon name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.optionTextWrap}>
        <Text style={styles.optionText}>{label}</Text>
        {sublabel ? <Text style={styles.optionSub}>{sublabel}</Text> : null}
      </View>
      {typeof value === 'boolean' && onValueChange ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ true: colors.primaryContainer, false: colors.surfaceContainerHigh }}
          thumbColor={value ? colors.onPrimary : colors.surfaceContainerLowest}
        />
      ) : (
        <MaterialIcon name="chevron-right" size={20} color={colors.outlineVariant} />
      )}
    </>
  );

  if (typeof value === 'boolean' && onValueChange) {
    return <View style={[styles.optionRow, last && styles.optionRowLast]}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={[styles.optionRow, last && styles.optionRowLast]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
    >
      {content}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [navPrefs, setNavPrefs] = useState({
    avoidTolls: true,
    autoNavigate: false,
    language: 'English',
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="settings" title="Settings" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Vehicle */}
        <Text style={styles.groupTitle}>Vehicle</Text>
        <View style={styles.group}>
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleIconWrap}>
              <MaterialIcon name="directions-car" size={22} color={colors.onPrimary} />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>Bajaj RE Compact</Text>
              <Text style={styles.vehicleReg}>TN 01 AB 1234</Text>
            </View>
            <View style={styles.vehicleBadge}>
              <MaterialIcon name="check-circle" size={14} color={colors.primary} />
              <Text style={styles.vehicleBadgeText}>Active</Text>
            </View>
          </View>
        </View>

        {/* Verification */}
        <Text style={styles.groupTitle}>Verification</Text>
        <View style={styles.group}>
          <Row icon="directions-car" label="Vehicle Documents" sublabel="RC Book · Insurance · License · Permit" onPress={() => router.push('/documents')} />
          <Row icon="verified-user" label="KYC Verification" sublabel="Aadhaar · PAN · Bank · Selfie" onPress={() => router.push('/kyc')} last />
        </View>

        {/* Payout */}
        <Text style={styles.groupTitle}>Payout</Text>
        <View style={styles.group}>
          <Row icon="account-balance" label="Payout Bank Account" sublabel="HDFC Bank •••• 1234" onPress={() => router.back()} last />
        </View>

        {/* Navigation */}
        <Text style={styles.groupTitle}>Navigation</Text>
        <View style={styles.group}>
          <Row icon="toll" label="Avoid toll roads" sublabel="Prefer toll-free routes on trips" value={navPrefs.avoidTolls} onValueChange={(v) => setNavPrefs((s) => ({ ...s, avoidTolls: v }))} />
          <Row icon="navigation" label="Auto-start navigation" sublabel="Launch maps as soon as a trip is accepted" value={navPrefs.autoNavigate} onValueChange={(v) => setNavPrefs((s) => ({ ...s, autoNavigate: v }))} last />
        </View>

        {/* Language */}
        <Text style={styles.groupTitle}>Language</Text>
        <View style={styles.group}>
          <View style={styles.langRow}>
            {['English', 'தமிழ்', 'हिन्दी'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langChip, navPrefs.language === lang && styles.langChipActive]}
                activeOpacity={0.85}
                onPress={() => setNavPrefs((s) => ({ ...s, language: lang }))}
              >
                <Text style={[styles.langChipText, navPrefs.language === lang && styles.langChipTextActive]}>{lang}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Support & Legal */}
        <Text style={styles.groupTitle}>Support & Legal</Text>
        <View style={styles.group}>
          <Row icon="support-agent" label="Help & Support" onPress={() => router.push('/support')} />
          <Row icon="description" label="Partner Agreement" onPress={() => router.back()} />
          <Row icon="privacy-tip" label="Privacy Policy" onPress={() => router.back()} />
          <Row icon="verified-user" label="About" sublabel="Ematix Partner v1.0.0" onPress={() => router.back()} last />
        </View>

        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={async () => {
          await logout();
          router.replace('/login');
        }}>
          <MaterialIcon name="logout" size={18} color={colors.accentRed} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.marginMobile,
    paddingBottom: 100,
  },
  groupTitle: {
    ...type.labelSm,
    color: colors.textMuted,
    letterSpacing: 0.4,
    marginBottom: spacing.stackSm,
    marginTop: spacing.stackXl,
  },
  group: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: spacing.stackXs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
    gap: spacing.stackMd,
  },
  optionRowLast: {
    borderBottomWidth: 0,
    paddingBottom: spacing.stackMd,
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  optionText: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  optionSub: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    paddingVertical: spacing.stackMd,
  },
  vehicleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  vehicleReg: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackXs,
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackXs,
    borderRadius: radius.full,
  },
  vehicleBadgeText: {
    ...type.labelSm,
    color: colors.primary,
    fontSize: 10,
  },
  langRow: {
    flexDirection: 'row',
    gap: spacing.stackSm,
    flexWrap: 'wrap',
    paddingVertical: spacing.stackMd,
  },
  langChip: {
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackSm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceGray,
  },
  langChipActive: {
    backgroundColor: colors.primaryContainer,
  },
  langChipText: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
  },
  langChipTextActive: {
    color: colors.onPrimary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.accentRed,
    padding: spacing.stackMd,
    borderRadius: radius.lg,
    marginTop: spacing.stackXl,
  },
  logoutText: {
    color: colors.accentRed,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
});