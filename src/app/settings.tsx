import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon, { MaterialIconName } from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../utils/api';

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

import { useTranslation } from 'react-i18next';
import { changeAppLanguage } from '../i18n';
import { SUPPORTED_LANGUAGES, type AppLanguage, resolveAppLanguage } from '../i18n/languages';

const VEHICLE_LABELS: Record<string, string> = {
  bike: 'Two-wheeler',
  auto: 'Auto',
  mini_truck: 'Mini Truck',
  car: 'Economic Car',
  premium_car: 'Premium Taxi',
};

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, user, token, login, refresh } = useAuth();
  const { t, i18n } = useTranslation();
  const vehicleLabel = VEHICLE_LABELS[user?.vehicleType || ''] || 'Vehicle';
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [navPrefs, setNavPrefs] = useState({
    avoidTolls: user?.preferences?.avoidTolls ?? true,
    autoNavigate: user?.preferences?.autoNavigate ?? false,
  });

  useEffect(() => {
    refresh();
  }, [refresh]);

  const [syncedPreferences, setSyncedPreferences] = useState(user?.preferences);
  if (user?.preferences !== syncedPreferences) {
    setSyncedPreferences(user?.preferences);
    const p = user?.preferences;
    if (p) {
      setNavPrefs({
        avoidTolls: p.avoidTolls,
        autoNavigate: p.autoNavigate,
      });
    }
  }

  const persistPrefs = async (patch: Record<string, unknown>) => {
    if (!token) return;
    try {
      const data = await authedFetch('/api/profile/partner/preferences', token, {
        method: 'PUT',
        body: patch,
      });
      if (data?.user) await login(data.user, token);
    } catch {
      refresh();
    }
  };

  const setNavPref = (key: 'avoidTolls' | 'autoNavigate', value: boolean) => {
    setNavPrefs((s) => {
      const next = { ...s, [key]: value };
      persistPrefs({ [key]: value });
      return next;
    });
  };

  const handleLanguageSelect = async (code: AppLanguage) => {
    await changeAppLanguage(code);
    persistPrefs({ language: code });
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account?',
      'Are you sure you want to delete your partner account? All your KYC documents, bank details, and personal records will be permanently removed. You can register afresh anytime with your phone number.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            setIsDeleting(true);
            try {
              const res = await authedFetch('/api/profile/partner', token, {
                method: 'DELETE',
              });
              if (res?.success) {
                Alert.alert('Account Deleted', 'Your partner account has been deleted successfully.', [
                  {
                    text: 'OK',
                    onPress: async () => {
                      await logout();
                      router.replace('/login');
                    },
                  },
                ]);
              } else {
                Alert.alert('Error', res?.message || 'Could not delete account. Please try again.');
              }
            } catch (err: any) {
              Alert.alert('Cannot Delete Account', err?.message || 'Something went wrong. Please ensure no rides are active.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="settings" title={t('settings.title')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Vehicle */}
        <Text style={styles.groupTitle}>{t('settings.vehicle')}</Text>
        <View style={styles.group}>
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleIconWrap}>
              <MaterialIcon name="directions-car" size={22} color={colors.onPrimary} />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>
                {user?.vehicleModel || vehicleLabel}
              </Text>
              <Text style={styles.vehicleReg}>{user?.vehicleNumber || 'No number added'}</Text>
            </View>
            <View style={styles.vehicleBadge}>
              <MaterialIcon name="check-circle" size={14} color={colors.primary} />
              <Text style={styles.vehicleBadgeText}>Active</Text>
            </View>
          </View>
        </View>

        {/* Verification */}
        <Text style={styles.groupTitle}>{t('settings.verification')}</Text>
        <View style={styles.group}>
          <Row icon="directions-car" label={t('settings.vehicleDocuments')} sublabel={t('settings.vehicleDocsSub')} onPress={() => router.push('/documents')} />
          <Row icon="verified-user" label={t('settings.kycVerification')} sublabel={t('settings.kycSub')} onPress={() => router.push('/kyc')} last />
        </View>

        {/* Payout */}
        <Text style={styles.groupTitle}>{t('settings.payout')}</Text>
        <View style={styles.group}>
          <Row icon="account-balance" label={t('settings.payoutBankAccount')} sublabel="HDFC Bank •••• 1234" onPress={() => router.back()} last />
        </View>

        {/* Navigation */}
        <Text style={styles.groupTitle}>{t('settings.navigation')}</Text>
        <View style={styles.group}>
          <Row icon="toll" label={t('settings.avoidTolls')} sublabel={t('settings.avoidTollsSub')} value={navPrefs.avoidTolls} onValueChange={(v) => setNavPref('avoidTolls', v)} />
          <Row icon="navigation" label={t('settings.autoNavigate')} sublabel={t('settings.autoNavigateSub')} value={navPrefs.autoNavigate} onValueChange={(v) => setNavPref('autoNavigate', v)} last />
        </View>

        {/* Language */}
        <Text style={styles.groupTitle}>{t('settings.language')}</Text>
        <View style={styles.group}>
          <View style={styles.langRow}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const currentLang = resolveAppLanguage(i18n.language) ?? 'en';
              const active = currentLang === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langChip, active && styles.langChipActive]}
                  activeOpacity={0.85}
                  onPress={() => handleLanguageSelect(lang.code)}
                >
                  <Text style={[styles.langChipText, active && styles.langChipTextActive]}>{lang.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Support & Legal */}
        <Text style={styles.groupTitle}>{t('settings.supportAndLegal')}</Text>
        <View style={styles.group}>
          <Row icon="support-agent" label={t('settings.helpAndSupport')} onPress={() => router.push('/support')} />
          <Row icon="description" label={t('settings.partnerAgreement')} onPress={() => router.back()} />
          <Row icon="privacy-tip" label={t('settings.privacyPolicy')} onPress={() => router.back()} />
          <Row icon="verified-user" label={t('settings.about')} sublabel="Ematix Partner v1.0.0" onPress={() => router.back()} last />
        </View>

        {/* Account Management */}
        <Text style={styles.groupTitle}>{t('settings.account')}</Text>
        <View style={styles.group}>
          <TouchableOpacity
            style={[styles.optionRow, styles.optionRowLast]}
            activeOpacity={0.7}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            <View style={[styles.optionIconWrap, { backgroundColor: '#FEE2E2' }]}>
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.accentRed} />
              ) : (
                <MaterialIcon name="delete-forever" size={20} color={colors.accentRed} />
              )}
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionText, { color: colors.accentRed }]}>{t('settings.deleteAccount')}</Text>
              <Text style={styles.optionSub}>{t('settings.deleteAccountSub')}</Text>
            </View>
            <MaterialIcon name="chevron-right" size={20} color={colors.outlineVariant} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={async () => {
          await logout();
          router.replace('/login');
        }}>
          <MaterialIcon name="logout" size={18} color={colors.accentRed} />
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
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