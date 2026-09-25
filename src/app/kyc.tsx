import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
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
import { uploadDocument } from '../utils/upload';

const REQUIRED_DOCS = [
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

export default function KYCScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { user } = useAuth();

  const [documents, setDocuments] = useState<Record<string, string>>({});
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

  const allDocsUploaded = REQUIRED_DOCS.every((d) => !!documents[d.key]);
  const bankFilled =
    (ifsc.trim().length >= 6 && acctNo.replace(/\D/g, '').length >= 6) ||
    upiId.includes('@');
  const isFormValid =
    allDocsUploaded &&
    aadhaarNumber.replace(/\D/g, '').length === 12 &&
    panNumber.trim().length === 10 &&
    acctName.trim().length > 1 &&
    bankFilled &&
    ecName.trim().length > 1 &&
    ecPhone.replace(/\D/g, '').length === 10 &&
    consent;

  const pickAndUpload = useCallback(async (key: string) => {
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
    const url = await uploadDocument(uri);
    setUploadingKey(null);
    if (url) {
      setDocuments((prev) => ({ ...prev, [key]: url, [`${key}_local`]: uri }));
      Alert.alert('Uploaded', 'Document uploaded successfully.');
    } else {
      Alert.alert('Upload failed', 'Could not upload the document. Please try again.');
    }
  }, []);

  const handleSubmit = async () => {
    if (!isFormValid) return;
    if (!user?.phone) {
      setErrorMsg('Session expired. Please login again.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch('http://192.168.1.34:4000/api/auth/partner/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: user.phone,
          documents: {
            aadhaarNumber,
            panNumber,
            aadhaarFront: documents.aadhaarFront,
            aadhaarBack: documents.aadhaarBack,
            panCard: documents.panCard,
            licenseFront: documents.licenseFront,
            licenseBack: documents.licenseBack,
            rcBook: documents.rcBook,
            insurance: documents.insurance,
            puc: documents.puc,
            vehiclePhoto: documents.vehiclePhoto,
          },
          bankDetails: {
            accountName: acctName,
            ifsc,
            accountNumber: acctNo,
            upiId,
            cancelledCheque: documents.cancelledCheque || '',
          },
          emergencyContact: { name: ecName, phone: ecPhone },
          availability: { workType, hours: hours || 'Flexible' },
          backgroundCheckConsent: consent,
        }),
      });
      const data = await response.json();
      if (data.success) {
        router.replace('/pending-approval');
      } else {
        setErrorMsg(data.error || 'KYC submission failed');
      }
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
    const uploaded = !!documents[item.key];
    const localUri = documents[`${item.key}_local`];
    const uploading = uploadingKey === item.key;
    return (
      <View style={styles.docRow}>
        <TouchableOpacity
          style={[styles.docThumb, !uploaded && styles.docThumbEmpty]}
          onPress={() => pickAndUpload(item.key)}
          activeOpacity={0.8}
          disabled={uploading}
        >
          {uploaded && localUri ? (
            <Image source={{ uri: localUri }} style={styles.docThumbImage} />
          ) : uploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcon name="add-a-photo" size={22} color={colors.textMuted} />
          )}
        </TouchableOpacity>
        <View style={styles.docInfo}>
          <Text style={styles.docLabel}>
            {item.label}
            {optional && <Text style={styles.docOptional}>  (optional)</Text>}
          </Text>
          <Text style={styles.docHint}>{uploading ? 'Uploading...' : uploaded ? 'Uploaded' : item.hint}</Text>
        </View>
        {uploaded && <MaterialIcon name="check-circle" size={22} color={colors.primary} />}
      </View>
    );
  }, [styles, colors, documents, uploadingKey, pickAndUpload]);

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

          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {REQUIRED_DOCS.filter((d) => !!documents[d.key]).length}/{REQUIRED_DOCS.length} documents uploaded
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(REQUIRED_DOCS.filter((d) => !!documents[d.key]).length / REQUIRED_DOCS.length) * 100}%` },
                ]}
              />
            </View>
          </View>

          <SectionHeader icon="badge" title="Personal & Identity" subtitle="Your ID details and documents" />
          <Field label="Aadhaar Number" value={aadhaarNumber} onChange={(t) => setAadhaarNumber(t.replace(/\D/g, '').slice(0, 12))} placeholder="XXXX XXXX XXXX" keyboard="number-pad" />
          <Field label="PAN Number" value={panNumber} onChange={(t) => setPanNumber(t.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" autoCap="characters" maxLength={10} />
          {REQUIRED_DOCS.slice(0, 3).map((d) => (
            <DocRow key={d.key} item={d} />
          ))}

          <SectionHeader icon="credit-card" title="Driving License" subtitle="Front and back photos" />
          {REQUIRED_DOCS.slice(3, 5).map((d) => (
            <DocRow key={d.key} item={d} />
          ))}

          <SectionHeader icon="description" title="Vehicle Documents" subtitle="RC, insurance, PUC and photo" />
          {REQUIRED_DOCS.slice(5).map((d) => (
            <DocRow key={d.key} item={d} />
          ))}

          <SectionHeader icon="account-balance" title="Payout Details" subtitle="Where your earnings go" />
          <Field label="Account Holder Name" value={acctName} onChange={setAcctName} placeholder="As per bank records" />
          <Field label="IFSC Code" value={ifsc} onChange={(t) => setIfsc(t.toUpperCase())} placeholder="e.g. HDFC0001234" autoCap="characters" />
          <Field label="Account Number" value={acctNo} onChange={(t) => setAcctNo(t.replace(/\D/g, ''))} placeholder="Your bank account number" keyboard="number-pad" />
          <Field label="UPI ID (alternative)" value={upiId} onChange={setUpUpiId} placeholder="yourname@upi" />
          <DocRow item={{ key: 'cancelledCheque', label: 'Cancelled Cheque', hint: 'Optional - helps verify bank details' }} optional />

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
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Submit for Verification</Text>
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