import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon, { MaterialIconName } from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../utils/api';

type DocStatus = 'verified' | 'in_review' | 'rejected' | 'none';

type KycDocumentRecord = {
  docKey: string;
  uploaded: boolean;
  /** The bytes exist server-side, not just the row. */
  onDisk?: boolean;
  status: 'none' | 'uploaded' | 'under_review' | 'approved' | 'rejected';
  rejectionReason: string;
};

interface VehicleDoc {
  id: string;
  title: string;
  subtitle: string;
  icon: MaterialIconName;
  status: DocStatus;
}

const VEHICLE_LABELS: Record<string, string> = {
  bike: 'Two-wheeler',
  auto: 'Auto',
  mini_truck: 'Mini Truck',
  car: 'Economic Car',
  premium_car: 'Premium Taxi',
};

/**
 * Builds the document list from the partner's real PartnerDocument rows.
 *
 * Per-document status comes from GET /api/kyc/me, which reads the server's
 * `status` field directly, so a rejected card shows as rejected with its
 * reason instead of being flattened into "in review".
 */
function buildDocs(
  records: KycDocumentRecord[] | undefined,
  vehicleNumber: string | undefined,
  licenseNumber: string | undefined
): VehicleDoc[] {
  const byKey: Record<string, KycDocumentRecord> = {};
  for (const record of records || []) {
    byKey[record.docKey] = record;
  }

  const statusOf = (key: string): DocStatus => {
    const record = byKey[key];
    if (!record || !record.uploaded) return 'none';
    if (record.status === 'approved') return 'verified';
    if (record.status === 'rejected') return 'rejected';
    // `uploaded` means stored but not yet submitted; `under_review` means
    // submitted and waiting. Both read the same to the partner.
    return 'in_review';
  };

  /**
   * A row whose bytes are gone needs a re-upload even though a record exists.
   * Treated as `none` so the Upload button appears and the KYC screen asks for
   * the photo again, instead of the partner believing it is filed.
   */
  const missingOnDisk = (key: string): boolean => {
    const record = byKey[key];
    return Boolean(record?.uploaded) && record?.onDisk === false;
  };

  const reasonOf = (key: string): string | undefined => byKey[key]?.rejectionReason || undefined;

  const rcSub = statusOf('rcBook') === 'none'
    ? 'Not uploaded yet'
    : vehicleNumber || 'Uploaded';
  const insuranceSub = statusOf('insurance') === 'none' ? 'Not uploaded yet' : 'Uploaded';
  const licenseStatus = byKey.licenseFront?.uploaded
    ? statusOf('licenseFront')
    : statusOf('licenseBack');
  const licenseSub = licenseStatus === 'none'
    ? 'Not uploaded yet'
    : licenseNumber || 'Uploaded';
  const permitSub = statusOf('puc') === 'none' ? 'Not uploaded yet' : 'Uploaded';

  const rows: VehicleDoc[] = [
    { id: 'rc', title: 'RC Book', subtitle: rcSub, icon: 'directions-car', status: statusOf('rcBook') },
    { id: 'insurance', title: 'Insurance', subtitle: insuranceSub, icon: 'shield', status: statusOf('insurance') },
    {
      id: 'license',
      title: 'Driving License',
      subtitle: licenseSub,
      icon: 'badge',
      status: licenseStatus,
    },
    { id: 'permit', title: 'State Permit', subtitle: permitSub, icon: 'event', status: statusOf('puc') },
  ];

  return rows.map((doc) => {
    const key = { rc: 'rcBook', insurance: 'insurance', license: 'licenseFront', permit: 'puc' }[doc.id] || '';
    if (missingOnDisk(key)) {
      return { ...doc, status: 'none' as DocStatus, subtitle: 'Missing on server — upload again' };
    }
    return reasonOf(key) ? { ...doc, subtitle: reasonOf(key)! } : doc;
  });
}

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
  if (status === 'in_review') {
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
        <MaterialIcon name="cancel" size={12} color={merged.red} />
        <Text style={merged.chipRejectedText}>Rejected</Text>
      </View>
    );
  }
  return null;
}

export default function DocumentsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  const { user, token, refresh } = useAuth();
  const [toast, setToast] = useState<string | null>(null);
  // Per-document status comes from GET /api/kyc/me, which reads the server's
  // PartnerDocument rows. user.documents only carries presence booleans.
  const [records, setRecords] = useState<KycDocumentRecord[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await authedFetch('/api/kyc/me', token);
        if (!cancelled) setRecords(data?.documents);
      } catch {
        // Leave records undefined; the rows fall back to "not uploaded".
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const docs = buildDocs(records, user?.vehicleNumber, user?.licenseNumber);
  const vehicleLabel = VEHICLE_LABELS[user?.vehicleType || ''] || 'Vehicle';

  const verifiedCount = docs.filter((d) => d.status === 'verified').length;
  const total = docs.length;
  const progress = Math.round((verifiedCount / total) * 100);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // Uploading lives on the KYC screen; this screen only reports real state, so
  // tapping an unuploaded or rejected document routes there instead of faking a
  // status flip.
  const handlePress = (doc: VehicleDoc) => {
    if (doc.status === 'verified') {
      showToast(`${doc.title} verified`);
      return;
    }
    if (doc.status === 'in_review') {
      showToast(`${doc.title} is under review — we'll notify you`);
      return;
    }
    if (doc.status === 'rejected') {
      // Show the reason, then take them where they can actually fix it. A toast
      // alone left the partner stuck, since the re-upload lives on /kyc.
      showToast(doc.subtitle);
      router.push('/kyc');
      return;
    }
    router.push('/kyc');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="documents" title="Vehicle Documents" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary progress */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>DOCUMENT STATUS</Text>
          <Text style={styles.summaryValue}>
            {loading ? 'Loading…' : `${verifiedCount} of ${total} verified`}
          </Text>
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
              <Text style={styles.vehicleName}>{user?.vehicleModel || vehicleLabel}</Text>
              <Text style={styles.vehicleReg}>{user?.vehicleNumber || 'No number added'}</Text>
            </View>
            {user?.kycStatus === 'approved' ? (
              <View style={styles.verifiedBadge}>
                <MaterialIcon name="check" size={12} color={colors.onPrimary} />
              </View>
            ) : null}
        </View>

        {/* Documents */}
        {docs.map((doc) => (
          <TouchableOpacity
            key={doc.id}
            style={styles.docCard}
            activeOpacity={0.8}
            onPress={() => handlePress(doc)}
          >
            <View style={styles.docIconWrap}>
              <MaterialIcon name={doc.icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docTitle}>{doc.title}</Text>
              <Text style={styles.docSub}>{doc.subtitle}</Text>
            </View>
            <View style={styles.docAction}>
              {doc.status === 'none' ? (
                <TouchableOpacity style={styles.uploadBtn} activeOpacity={0.85} onPress={() => handlePress(doc)}>
                  <MaterialIcon name="upload" size={14} color={colors.primary} />
                  <Text style={styles.uploadBtnText}>Upload</Text>
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
  red: '#B91C1C',
  chipRejected: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: '#FEE2E2', paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackXs, borderRadius: radius.full },
  chipRejectedText: { color: '#B91C1C', fontSize: 11, fontFamily: fonts.medium },
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
  uploadBtnText: {
    ...type.labelSm,
    color: colors.primary,
    fontSize: 11,
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