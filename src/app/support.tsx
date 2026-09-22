import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';

const CONTACT_OPTIONS = [
  { icon: 'call', label: 'Call Support', sub: '9 AM - 9 PM, all days', danger: false },
  { icon: 'chat', label: 'Live Chat', sub: 'Averaging 2 min response', danger: false },
  { icon: 'whatsapp', label: 'WhatsApp Support', sub: 'Message us anytime', danger: false },
  { icon: 'email', label: 'Email Support', sub: 'partner@ematix.in', danger: false },
];

const FAQS = [
  {
    q: 'When will my trip earnings show up?',
    a: 'Trip earnings are added to your wallet instantly at trip completion. Weekday incentive payouts settle within 24 hours on your payout bank account.',
  },
  {
    q: 'What are the daily incentives and zones?',
    a: 'Peak bonuses by zone, time and trip count appear on your Earnings screen. Today\'s active bonus will also show in your notifications.',
  },
  {
    q: 'Why was a service fee deducted?',
    a: 'A small commission covers insurance, support and app services. It is applied before net earnings are added to your wallet.',
  },
  {
    q: 'How do I update my vehicle or documents?',
    a: 'Open Settings from your profile, review the Documents & KYC section and upload a fresh copy. Verified documents go live within a few hours.',
  },
];

export default function SupportScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="support" title="Help & Support" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact options */}
        <View style={styles.optionsGroup}>
          {CONTACT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={styles.optionRow}
              activeOpacity={0.7}
              onPress={() => showToast(`Launching ${opt.label}…`)}
            >
              <View style={styles.optionIconWrap}>
                <MaterialIcon name={opt.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionText}>{opt.label}</Text>
                <Text style={styles.optionSub}>{opt.sub}</Text>
              </View>
              <MaterialIcon name="chevron-right" size={20} color={colors.outlineVariant} />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ */}
        <Text style={styles.groupTitle}>Frequently Asked</Text>
        <View style={styles.optionsGroup}>
          {FAQS.map((f, i) => {
            const open = faqOpen === i;
            return (
              <View key={f.q} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  activeOpacity={0.7}
                  onPress={() => setFaqOpen(open ? null : i)}
                >
                  <Text style={styles.faqQ}>{f.q}</Text>
                  <MaterialIcon name={open ? 'expand-less' : 'expand-more'} size={20} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
                {open ? <Text style={styles.faqA}>{f.a}</Text> : null}
              </View>
            );
          })}
        </View>

        {/* Report issue */}
        <TouchableOpacity
          style={styles.reportBtn}
          activeOpacity={0.85}
          onPress={() => showToast('Issue submitted — ticket #EMX-3412')}
        >
          <MaterialIcon name="flag" size={18} color={colors.onPrimary} />
          <Text style={styles.reportBtnText}>Report a Problem</Text>
        </TouchableOpacity>

        <Text style={styles.responseTime}>We usually respond within 2 business hours.</Text>
      </ScrollView>

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
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
  optionsGroup: {
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
  groupTitle: {
    ...type.labelSm,
    color: colors.textMuted,
    letterSpacing: 0.4,
    marginBottom: spacing.stackSm,
    marginTop: spacing.stackXl,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.stackMd,
    gap: spacing.stackSm,
  },
  faqQ: {
    flex: 1,
    ...type.labelMd,
    color: colors.onSurface,
  },
  faqA: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    paddingBottom: spacing.stackMd,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.primary,
    padding: spacing.stackMd,
    borderRadius: radius.lg,
    marginTop: spacing.stackXl,
  },
  reportBtnText: {
    ...type.labelLg,
    color: colors.onPrimary,
  },
  responseTime: {
    ...type.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.stackMd,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: colors.inverseSurface,
    paddingHorizontal: spacing.stackLg,
    paddingVertical: spacing.stackMd,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    ...type.labelMd,
    color: colors.inverseOnSurface,
  },
});