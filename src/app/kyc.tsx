import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import MaterialIcon from '../components/MaterialIcon';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../utils/api';
import { uploadDocument } from '../utils/upload';

/**
 * Fallback list used only until GET /api/kyc/required resolves. The server owns
 * the canonical list in models/documentFields.js -- this previously drifted and
 * was the reason a renamed key silently stopped being saved.
 */
const FALLBACK_DOCS: { key: string; label: string; hint: string }[] = [
  { key: 'aadhaarFront', label: 'Aadhaar Card - Front', hint: 'Clear photo, all 4 corners visible' },
  { key: 'aadhaarBack', label: 'Aadhaar Card - Back', hint: 'QR code must be clearly visible' },
  { key: 'panCard', label: 'PAN Card', hint: 'Clear photo of the card' },
  { key: 'licenseFront', label: 'Driving License - Front', hint: 'License details must be readable' },
  { key: 'licenseBack', label: 'Driving License - Back', hint: 'Clear photo of the back side' },
  { key: 'rcBook', label: 'RC Book', hint: 'Vehicle registration certificate' },
  { key: 'insurance', label: 'Insurance Policy', hint: 'Currently valid policy document' },
  { key: 'puc', label: 'PUC Certificate', hint: 'Pollution under control certificate' },
  { key: 'vehiclePhoto', label: 'Vehicle Photo', hint: 'Front 3/4 view with visible number plate' },
];

/** Per-document state as the server reports it. */
type ServerDocState = {
  uploaded: boolean;
  /** The file exists on the server, not just as a row. */
  onDisk: boolean;
  status: 'none' | 'uploaded' | 'under_review' | 'approved' | 'rejected';
  rejectionReason: string;
};

const EMPTY_DOC_STATE: ServerDocState = {
  uploaded: false,
  onDisk: false,
  status: 'none',
  rejectionReason: '',
};

const STATUS_TEXT: Record<ServerDocState['status'], string> = {
  none: '',
  uploaded: 'Uploaded — not submitted yet',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function KYCScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { user, token, refresh } = useAuth();

  // Server-driven document list; FALLBACK_DOCS is only used before it resolves.
  const [requiredDocs, setRequiredDocs] = useState(FALLBACK_DOCS);
  /**
   * docKey -> the server's own view of that document.
   *
   * This is what the progress bar, the Submit gate and the per-row status are
   * derived from. The screen previously keyed completion off local image URIs,
   * which meant a partner who uploaded on another device, or before reinstalling
   * the app, saw an empty form with Submit permanently disabled even though the
   * server already had all nine documents.
   */
  const [docState, setDocState] = useState<Record<string, ServerDocState>>({});
  // docKey -> local image URI, purely so a freshly picked photo shows a preview.
  // Never used to decide whether a document is on file.
  const [localUris, setLocalUris] = useState<Record<string, string>>({});
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [acctName, setAcctName] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [acctNo, setAcctNo] = useState('');
  const [upiId, setUpUpiId] = useState('');
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [workType, setWorkType] = useState('Full-time');
  const [hours, setHours] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [hydrating, setHydrating] = useState(true);

  /**
   * A document counts as on file only when the server has both the row and the
   * bytes. `onDisk` is what stops this screen claiming a step is done when a
   * file was lost or cleaned up out of band.
   */
  const isOnFile = useCallback(
    (key: string) => docState[key]?.onDisk === true,
    [docState]
  );

  const uploadedCount = requiredDocs.filter((d) => isOnFile(d.key)).length;
  const allDocsUploaded = requiredDocs.length > 0 && uploadedCount === requiredDocs.length;

  const rejectedCount = requiredDocs.filter((d) => docState[d.key]?.status === 'rejected').length;

  /**
   * Approval is terminal server-side: /api/kyc/submit and /api/upload both
   * refuse with 409. Mirroring that here avoids offering a submit button that
   * can only fail.
   */
  const isApproved = kycStatus === 'approved';

  const bankFilled =
    (ifsc.trim().length >= 6 && acctNo.replace(/\D/g, '').length >= 6) ||
    upiId.includes('@');
  const isFormValid =
    !isApproved &&
    allDocsUploaded &&
    aadhaarNumber.replace(/\D/g, '').length === 12 &&
    panNumber.trim().length === 10 &&
    acctName.trim().length > 1 &&
    bankFilled &&
    ecName.trim().length > 1 &&
    ecPhone.replace(/\D/g, '').length === 10 &&
    consent;

  /**
   * Re-reads the server's document state.
   *
   * Called after hydration and again after every upload, rather than patching
   * local state optimistically. The upload response only describes the one
   * document it wrote; it says nothing about the other eight, and it cannot
   * report whether a rejection was cleared. Re-fetching is one small request and
   * it keeps the screen honest about what the server actually holds.
   */
  const loadServerDocs = useCallback(async () => {
    const mine = await authedFetch('/api/kyc/me', token);
    const next: Record<string, ServerDocState> = {};
    for (const doc of mine?.documents || []) {
      next[doc.docKey] = {
        uploaded: doc.uploaded === true,
        onDisk: doc.onDisk === true,
        status: doc.status || 'none',
        rejectionReason: doc.rejectionReason || '',
      };
    }
    setDocState(next);
    setKycStatus(mine?.kycStatus || null);
    return mine;
  }, [token]);

  // Hydrate from the server on mount. Without this the form always started
  // blank, so a partner returning to finish a partial KYC could not tell which
  // documents were already stored.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [required, mine] = await Promise.all([
          authedFetch('/api/kyc/required', token),
          authedFetch('/api/kyc/me', token),
        ]);
        if (cancelled) return;

        if (Array.isArray(required?.documents) && required.documents.length) {
          setRequiredDocs(required.documents);
        }

        const next: Record<string, ServerDocState> = {};
        for (const doc of mine?.documents || []) {
          next[doc.docKey] = {
            uploaded: doc.uploaded === true,
            onDisk: doc.onDisk === true,
            status: doc.status || 'none',
            rejectionReason: doc.rejectionReason || '',
          };
        }
        setDocState(next);
        setKycStatus(mine?.kycStatus || null);

        setAadhaarNumber(mine?.aadhaarNumber || '');
        setPanNumber(mine?.panNumber || '');
        setAcctName(mine?.bankDetails?.accountName || '');
        setIfsc(mine?.bankDetails?.ifsc || '');
        setAcctNo(mine?.bankDetails?.accountNumber || '');
        setUpUpiId(mine?.bankDetails?.upiId || '');
        setEcName(mine?.emergencyContact?.name || '');
        setEcPhone(mine?.emergencyContact?.phone || '');
        setWorkType(mine?.availability?.workType || 'Full-time');
        setHours(mine?.availability?.hours || '');
        setConsent(mine?.backgroundCheckConsent === true);
      } catch {
        // Fall back to the bundled list; the form stays usable offline.
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const pickAndUpload = useCallback(async (key: string) => {
    if (!token) {
      Alert.alert('Session expired', 'Please login again.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Photo library access is needed to upload documents.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled || !result.assets?.length) return;
    const uri = result.assets[0].uri;
    setUploadingKey(key);
    const record = await uploadDocument(uri, key, token);
    setUploadingKey(null);
    if (record) {
      // Preview only. The row's real status comes from the refresh below.
      setLocalUris((prev) => ({ ...prev, [key]: uri }));
      try {
        await loadServerDocs();
      } catch {
        // The upload landed; a failed refresh just leaves the previous state on
        // screen, which self-corrects on the next visit.
      }
      Alert.alert('Uploaded', 'Document uploaded successfully.');
    } else {
      Alert.alert('Upload failed', 'Could not upload the document. Please try again.');
    }
  }, [token, loadServerDocs]);

  const handleSubmit = async () => {
    if (!isFormValid) return;
    if (!user?.phone || !token) {
      setErrorMsg('Session expired. Please login again.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      // Document files are already stored and recorded against this partner by
      // the upload endpoint. Submitting only sends the non-file fields; the
      // server re-checks that every required docKey has a stored record.
      const data = await authedFetch('/api/kyc/submit', token, {
        method: 'POST',
        body: {
          aadhaarNumber,
          panNumber,
          bankDetails: {
            accountName: acctName,
            ifsc,
            accountNumber: acctNo,
            upiId,
          },
          emergencyContact: { name: ecName, phone: ecPhone },
          availability: { workType, hours: hours || 'Flexible' },
          backgroundCheckConsent: consent,
        },
      });

      // Refresh so AuthContext carries the new kycStatus. Without this the app
      // kept the stale pre-KYC user and Documents showed nothing uploaded.
      await refresh();
      try {
        // Pull the post-submit document state too, so returning to this screen
        // shows `under_review` rather than the pre-submit statuses.
        await loadServerDocs();
      } catch {
        // The submit succeeded; a failed refresh does not change that.
      }
      router.replace('/pending-approval');
      return data;
    } catch (e: any) {
      setErrorMsg(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const Field = useCallback(({ label, value, onChange, placeholder, keyboard, autoCap, maxLength }: {
    label: string;
    value: string;
    onChange: (t: string) => void;
    placeholder?: string;
    keyboard?: 'default' | 'phone-pad' | 'number-pad' | 'email-address';
    autoCap?: 'none' | 'characters';
    maxLength?: number;
  }) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboard || 'default'}
        autoCapitalize={autoCap || 'none'}
        maxLength={maxLength}
        value={value}
        onChangeText={onChange}
      />
    </View>
  ), [styles, colors]);

  const DocRow = useCallback(({ item, optional }: { item: { key: string; label: string; hint: string }; optional?: boolean }) => {
    const state = docState[item.key] || EMPTY_DOC_STATE;
    const onFile = state.onDisk;
    const localUri = localUris[item.key];
    const uploading = uploadingKey === item.key;
    const rejected = state.status === 'rejected';
    // Approved documents are final. Letting the partner re-pick one would upload
    // bytes the server then refuses with a 409.
    const locked = isApproved || state.status === 'approved';

    const statusText = uploading
      ? 'Uploading...'
      : rejected
        ? state.rejectionReason || 'Rejected — please upload again'
        : onFile
          ? STATUS_TEXT[state.status]
          : state.uploaded
            ? 'Missing on server — please upload again'
            : item.hint;

    return (
      <View style={[styles.docRow, rejected && styles.docRowRejected]}>
        <TouchableOpacity
          style={[styles.docThumb, !onFile && styles.docThumbEmpty]}
          onPress={() => pickAndUpload(item.key)}
          activeOpacity={0.8}
          disabled={uploading || locked}
        >
          {localUri && !locked ? (
            <Image source={{ uri: localUri }} style={styles.docThumbImage} />
          ) : uploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcon
              name={onFile ? 'description' : 'add-a-photo'}
              size={22}
              color={locked ? colors.primary : colors.textMuted}
            />
          )}
        </TouchableOpacity>
        <View style={styles.docInfo}>
          <Text style={styles.docLabel}>
            {item.label}
            {optional && <Text style={styles.docOptional}>  (optional)</Text>}
          </Text>
          <Text style={[styles.docHint, rejected && styles.docHintRejected]}>{statusText}</Text>
        </View>
        {state.status === 'approved' && <MaterialIcon name="verified" size={22} color={colors.primary} />}
        {onFile && state.status !== 'approved' && (
          <MaterialIcon name={rejected ? 'cancel' : 'check-circle'} size={22} color={rejected ? colors.error : colors.primary} />
        )}
      </View>
    );
  }, [styles, colors, docState, localUris, uploadingKey, pickAndUpload, isApproved]);

  const SectionHeader = useCallback(({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <MaterialIcon name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  ), [styles, colors]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <MaterialIcon name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.alertBox}>
            <MaterialIcon name="security" size={20} color={colors.primary} />
            <Text style={styles.alertText}>
              Your documents are securely uploaded and only used for identity verification.
            </Text>
          </View>

          {isApproved ? (
            <View style={[styles.statusBanner, styles.statusBannerOk]}>
              <MaterialIcon name="verified" size={18} color="#047857" />
              <Text style={styles.statusBannerText}>
                Your KYC is verified. These documents are locked and cannot be changed.
              </Text>
            </View>
          ) : rejectedCount > 0 ? (
            <View style={[styles.statusBanner, styles.statusBannerBad]}>
              <MaterialIcon name="error-outline" size={18} color="#B91C1C" />
              <Text style={styles.statusBannerText}>
                {rejectedCount} document{rejectedCount === 1 ? '' : 's'} need
                {rejectedCount === 1 ? 's' : ''} attention. Fix the reason shown below and submit
                again.
              </Text>
            </View>
          ) : kycStatus === 'under_review' ? (
            <View style={[styles.statusBanner, styles.statusBannerInfo]}>
              <MaterialIcon name="schedule" size={18} color={colors.primary} />
              <Text style={styles.statusBannerText}>
                Your documents are with our verification team. You can still replace anything they
                flag.
              </Text>
            </View>
          ) : null}

          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {hydrating
                ? 'Checking your uploads...'
                : `${uploadedCount}/${requiredDocs.length} documents uploaded`}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: hydrating
                      ? '0%'
                      : `${(uploadedCount / Math.max(requiredDocs.length, 1)) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>

          <SectionHeader icon="badge" title="Personal & Identity" subtitle="Your ID details and documents" />
          <Field label="Aadhaar Number" value={aadhaarNumber} onChange={(t) => setAadhaarNumber(t.replace(/\D/g, '').slice(0, 12))} placeholder="XXXX XXXX XXXX" keyboard="number-pad" />
          <Field label="PAN Number" value={panNumber} onChange={(t) => setPanNumber(t.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" autoCap="characters" maxLength={10} />
          {requiredDocs.slice(0, 3).map((d) => (
            <DocRow key={d.key} item={d} />
          ))}

          <SectionHeader icon="credit-card" title="Driving License" subtitle="Front and back photos" />
          {requiredDocs.slice(3, 5).map((d) => (
            <DocRow key={d.key} item={d} />
          ))}

          <SectionHeader icon="description" title="Vehicle Documents" subtitle="RC, insurance, PUC and photo" />
          {requiredDocs.slice(5).map((d) => (
            <DocRow key={d.key} item={d} />
          ))}

          <SectionHeader icon="account-balance" title="Payout Details" subtitle="Where your earnings go" />
          <Field label="Account Holder Name" value={acctName} onChange={setAcctName} placeholder="As per bank records" />
          <Field label="IFSC Code" value={ifsc} onChange={(t) => setIfsc(t.toUpperCase())} placeholder="e.g. HDFC0001234" autoCap="characters" />
          <Field label="Account Number" value={acctNo} onChange={(t) => setAcctNo(t.replace(/\D/g, ''))} placeholder="Your bank account number" keyboard="number-pad" />
          <Field label="UPI ID (alternative)" value={upiId} onChange={setUpUpiId} placeholder="yourname@upi" />
          {/* Cancelled cheque was an optional DocRow keyed on 'cancelledCheque',
              which is not a member of DOCUMENT_FIELDS and would have been
              rejected by the upload route's docKey validation. Removed until
              the server grows a proper optional-document key for it. */}

          <SectionHeader icon="emergency" title="Emergency Contact" subtitle="Someone we can reach if needed" />
          <Field label="Contact Name" value={ecName} onChange={setEcName} placeholder="e.g. Sita Sharma" />
          <Field label="Contact Phone" value={ecPhone} onChange={(t) => setEcPhone(t.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" keyboard="phone-pad" />

          <SectionHeader icon="schedule" title="Availability" subtitle="When do you plan to deliver?" />
          <View style={styles.chipRow}>
            {['Full-time', 'Part-time'].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, workType === opt && styles.chipSelected]}
                onPress={() => setWorkType(opt)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, workType === opt && styles.chipTextSelected]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="Preferred Hours (optional)" value={hours} onChange={setHours} placeholder="e.g. 9 AM - 6 PM" />

          <TouchableOpacity style={styles.consentRow} onPress={() => setConsent(!consent)} activeOpacity={0.8}>
            <MaterialIcon
              name={consent ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={consent ? colors.primary : colors.textMuted}
            />
            <Text style={styles.consentText}>
              I authorize Ematix to perform a background &amp; criminal record check and verify my documents.
            </Text>
          </TouchableOpacity>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, (!isFormValid || loading) && styles.primaryBtnDisabled]}
            activeOpacity={0.85}
            disabled={!isFormValid || loading}
            onPress={handleSubmit}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : isApproved ? (
              <>
                <Text style={styles.primaryBtnText}>KYC Verified</Text>
                <MaterialIcon name="verified" size={18} color={colors.onPrimary} />
              </>
            ) : (
              <>
                <Text style={styles.primaryBtnText}>
                  {rejectedCount > 0 ? 'Resubmit for Verification' : 'Submit for Verification'}
                </Text>
                <MaterialIcon name="check" size={18} color={colors.onPrimary} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.stackLg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  backBtn: {
    padding: spacing.stackXs,
    marginLeft: -spacing.stackXs,
  },
  headerTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
  },
  scrollContent: {
    padding: spacing.marginMobile,
    paddingBottom: 40,
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: colors.lightBlueTint,
    padding: spacing.stackMd,
    borderRadius: radius.lg,
    gap: spacing.stackSm,
    marginBottom: spacing.stackLg,
    alignItems: 'flex-start',
  },
  alertText: {
    ...type.bodySm,
    color: colors.onSurface,
    flex: 1,
    lineHeight: 18,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.stackSm,
    padding: spacing.stackMd,
    borderRadius: radius.lg,
    marginBottom: spacing.stackLg,
  },
  statusBannerOk: {
    backgroundColor: '#ECFDF5',
  },
  statusBannerBad: {
    backgroundColor: '#FEE2E2',
  },
  statusBannerInfo: {
    backgroundColor: colors.lightBlueTint,
  },
  statusBannerText: {
    ...type.bodySm,
    color: colors.onSurface,
    flex: 1,
    lineHeight: 18,
  },
  progressRow: {
    marginBottom: spacing.stackXl,
  },
  progressText: {
    ...type.labelMd,
    color: colors.onSurface,
    marginBottom: spacing.stackSm,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceGray,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    marginTop: spacing.stackXl,
    marginBottom: spacing.stackLg,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
  },
  sectionSubtitle: {
    ...type.bodySm,
    color: colors.textMuted,
  },
  formGroup: {
    marginBottom: spacing.stackLg,
  },
  label: {
    ...type.labelMd,
    color: colors.onSurface,
    marginBottom: spacing.stackSm,
  },
  input: {
    ...type.bodyLg,
    color: colors.onSurface,
    backgroundColor: colors.surfaceGray,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackMd,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceGray,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    marginBottom: spacing.stackMd,
    gap: spacing.stackMd,
  },
  docThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  docThumbEmpty: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.surfaceContainerHigh,
  },
  docRowRejected: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  docHintRejected: {
    color: colors.error,
  },
  docThumbImage: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  docInfo: {
    flex: 1,
  },
  docLabel: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  docOptional: {
    ...type.bodySm,
    color: colors.textMuted,
  },
  docHint: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.stackMd,
    marginBottom: spacing.stackLg,
  },
  chip: {
    paddingHorizontal: spacing.stackLg,
    paddingVertical: spacing.stackMd,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceGray,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.lightBlueTint,
    borderColor: colors.primary,
  },
  chipText: {
    ...type.labelMd,
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: colors.primary,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.stackSm,
    marginTop: spacing.stackMd,
    marginBottom: spacing.stackMd,
  },
  consentText: {
    ...type.bodySm,
    color: colors.onSurface,
    flex: 1,
    lineHeight: 18,
  },
  errorText: {
    ...type.bodySm,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.stackSm,
  },
  footer: {
    padding: spacing.marginMobile,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    backgroundColor: colors.surface,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.stackMd,
    borderRadius: radius.lg,
  },
  primaryBtnDisabled: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  primaryBtnText: {
    ...type.labelLg,
    color: colors.onPrimary,
  },
});
