import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon, { MaterialIconName } from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';

type DocStatus = 'verified' | 'pending' | 'rejected' | 'none';

interface VehicleDoc {
  id: string;
  title: string;
  subtitle: string;
  icon: MaterialIconName;
  status: DocStatus;
}

const INITIAL_DOCS: VehicleDoc[] = [
  {
    id: 'rc',
    title: 'RC Book',
    subtitle: 'TN 01 AB 1234 · valid till Mar 2028',
    icon: 'directions-car',
    status: 'verified',
  },
  {
    id: 'insurance',
    title: 'Insurance',
    subtitle: 'Policy EMX-88231 · valid till Nov 2026',
    icon: 'shield',
    status: 'verified',
  },
  {
    id: 'license',
    title: 'Driving License',
    subtitle: 'LMV · DL TN 01 2022 00123',
    icon: 'badge',
    status: 'rejected',
  },
  {
    id: 'permit',
    title: 'State Permit',
    subtitle: 'Not uploaded yet',
    icon: 'event',
    status: 'none',
  },
];

function StatusChip({ status }: { status: DocStatus }) {
  const { colors } = useTheme();
  const merged = mergedColors(colors);

  if (status === 'verified') {
    return (
      <View style={merged.chipVerified}>
        <MaterialIcon name="check-circle" size={12} color={merged.green} />
        <Text style={merged.chipVerifiedText}>Verified</Text>
      </View>
    );
  }
  if (status === 'pending') {
    return (
      <View style={merged.chipPending}>
        <MaterialIcon name="schedule" size={12} color={merged.amber} />
        <Text style={merged.chipPendingText}>In Review</Text>
      </View>
    );
  }
  if (status === 'rejected') {
    return (
      <View style={merged.chipRejected}>
        <MaterialIcon name="error" size={12} color={colors.accentRed} />
        <Text style={merged.chipRejectedText}>Rejected</Text>
      </View>
    );
  }
  return null;
}

export default function DocumentsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [docs, setDocs] = useState(INITIAL_DOCS);
  const [toast, setToast] = useState<string | null>(null);

  const verifiedCount = docs.filter((d) => d.status === 'verified').length;
  const total = docs.length;
  const progress = Math.round((verifiedCount / total) * 100);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handlePress = (doc: VehicleDoc) => {
    if (doc.status === 'verified') {
      showToast(`${doc.title} verified · viewing copy`);
      return;
    }
    if (doc.status === 'pending') {
      showToast(`${doc.title} is under review — we'll notify you`);
      return;
    }
    setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: 'pending' } : d)));
    showToast(`${doc.title} received — being reviewed`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="documents" title="Vehicle Documents" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary progress */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>DOCUMENT STATUS</Text>
          <Text style={styles.summaryValue}>{verifiedCount} of {total} verified</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.summaryHint}>Every document is reviewed within 2 hours</Text>
        </View>

        {/* Vehicle identity */}
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleIconWrap}>
            <MaterialIcon name="directions-car" size={20} color={colors.onPrimary} />
          </View>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>Bajaj RE Compact</Text>
            <Text style={styles.vehicleReg}>TN 01 AB 1234</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <MaterialIcon name="check" size={12} color={colors.onPrimary} />
          </View>
        </View>

        {/* Documents */}
        {docs.map((doc) => (
          <TouchableOpacity
            key={doc.id}
            style={styles.docCard}
            activeOpacity={0.8}
            onPress={() => handlePress(doc)}
          >
            <View style={[styles.docIconWrap, doc.status === 'rejected' && styles.docIconWrapRejected]}>
              <MaterialIcon
                name={doc.icon}
                size={20}
                color={doc.status === 'rejected' ? colors.accentRed : colors.primary}
              />
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docTitle}>{doc.title}</Text>
              <Text style={styles.docSub}>{doc.subtitle}</Text>
            </View>
            <View style={styles.docAction}>
              {doc.status === 'none' || doc.status === 'rejected' ? (
                <TouchableOpacity
                  style={[styles.uploadBtn, doc.status === 'rejected' && styles.reuploadBtn]}
                  activeOpacity={0.85}
                  onPress={() => handlePress(doc)}
                >
                  <MaterialIcon
                    name="upload"
                    size={14}
                    color={doc.status === 'rejected' ? colors.accentRed : colors.primary}
                  />
                  <Text style={[styles.uploadBtnText, doc.status === 'rejected' && styles.reuploadBtnText]}>
                    {doc.status === 'rejected' ? 'Re-upload' : 'Upload'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <StatusChip status={doc.status} />
              )}
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.helpCard} activeOpacity={0.75}>
          <MaterialIcon name="help-outline" size={18} color={colors.textMuted} />
          <Text style={styles.helpText}>Need help uploading a document?</Text>
        </TouchableOpacity>
      </ScrollView>

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const mergedColors = (colors: any) => ({
  green: '#047857',
  amber: '#B45309',
  chipVerified: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackXs, borderRadius: radius.full },
  chipVerifiedText: { color: '#047857', fontSize: 11, fontFamily: fonts.medium },
  chipPending: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackXs, borderRadius: radius.full },
  chipPendingText: { color: '#B45309', fontSize: 11, fontFamily: fonts.medium },
  chipRejected: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: '#FFEAEA', paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackXs, borderRadius: radius.full },
  chipRejectedText: { color: colors.accentRed, fontSize: 11, fontFamily: fonts.medium },
});

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.marginMobile,
    paddingBottom: 100,
    gap: spacing.stackLg,
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.sheetPadding,
  },
  summaryLabel: {
    ...type.labelSm,
    color: colors.onPrimaryContainer,
    letterSpacing: 0.6,
  },
  summaryValue: {
    ...type.headlineLg,
    color: colors.onPrimary,
    fontFamily: fonts.extrabold,
    marginTop: spacing.stackXs,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: spacing.stackMd,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.onPrimary,
  },
  summaryHint: {
    ...type.bodySm,
    color: colors.onPrimaryContainer,
    marginTop: spacing.stackMd,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    padding: spacing.cardPadding,
    gap: spacing.stackMd,
  },
  vehicleIconWrap: {
    width: 40,
    height: 40,
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
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#047857',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    padding: spacing.cardPadding,
    gap: spacing.stackMd,
  },
  docIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docIconWrapRejected: {
    backgroundColor: '#FFEAEA',
  },
  docInfo: {
    flex: 1,
    minWidth: 0,
  },
  docTitle: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  docSub: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  docAction: {
    alignItems: 'flex-end',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackXs,
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackXs,
    borderRadius: radius.full,
  },
  reuploadBtn: {
    backgroundColor: '#FFEAEA',
  },
  uploadBtnText: {
    ...type.labelSm,
    color: colors.primary,
    fontSize: 11,
  },
  reuploadBtnText: {
    color: colors.accentRed,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackXs,
    paddingVertical: spacing.stackMd,
  },
  helpText: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
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