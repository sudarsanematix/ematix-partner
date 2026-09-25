import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { fonts, type, spacing, radius } from '../theme/typography';
import MaterialIcon from '../components/MaterialIcon';

type VehicleType = 'Bike' | 'Auto' | 'Cab';

type FieldProps = {
  icon: string;
  label: string;
  hint?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  autoCap?: 'none' | 'words' | 'characters';
  maxLength?: number;
  prefix?: React.ReactNode;
};

const VEHICLES: { type: VehicleType; icon: string; label: string; desc: string }[] = [
  { type: 'Bike', icon: 'two-wheeler', label: 'Bike', desc: 'Perfect for food & parcels' },
  { type: 'Auto', icon: 'electric-rickshaw', label: 'Auto', desc: 'Bigger cargo capacity' },
  { type: 'Cab', icon: 'local-taxi', label: 'Cab', desc: 'Comfortable rides & cargo' },
];

const Field = ({
  icon,
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCap,
  maxLength,
  prefix,
}: FieldProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createFieldStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        {prefix}
        <MaterialIcon
          name={icon as any}
          size={20}
          color={focused ? colors.primary : colors.textMuted}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCap || 'none'}
          maxLength={maxLength}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
};

export default function SignupScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState((params.phone as string) || '');
  const [vehicle, setVehicle] = useState<VehicleType | null>(null);
  const [dob, setDob] = useState('');
  const [city, setCity] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const phoneValid = phone.replace(/\D/g, '').length === 10;
  const dobValid = (() => {
    const match = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return false;
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const date = new Date(year, month - 1, day);
    if (
      date.getDate() !== day ||
      date.getMonth() !== month - 1 ||
      date.getFullYear() !== year
    ) return false;
    const eighteen = new Date();
    eighteen.setFullYear(eighteen.getFullYear() - 18);
    return date <= eighteen;
  })();
  const isFormValid =
    name.trim().length > 2 &&
    email.includes('@') &&
    phoneValid &&
    vehicle !== null &&
    dobValid &&
    city.trim().length > 1 &&
    licenseNumber.trim().length >= 8 &&
    licenseExpiry.trim().length >= 10 &&
    vehicleNumber.trim().length >= 6 &&
    vehicleModel.trim().length > 1;

  const formatDate = (t: string, setter: (s: string) => void) => {
    const digits = t.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setter(formatted);
  };

  const handleSignup = async () => {
    if (!isFormValid) return;
    setLoading(true);
    setErrorMsg('');
    try {
      // Map frontend vehicle types to backend enum
      let dbVehicleType = 'bike';
      if (vehicle === 'Auto') dbVehicleType = 'auto';
      if (vehicle === 'Cab') dbVehicleType = 'prime_sedan';

      const response = await fetch('http://192.168.1.34:4000/api/auth/partner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          name,
          email,
          vehicleType: dbVehicleType,
          dob,
          city,
          serviceArea: city,
          licenseNumber,
          licenseExpiry,
          vehicleNumber,
          vehicleModel
        })
      });
      const data = await response.json();
      if (data.success) {
        await login(data.user, data.token);
        router.replace('/kyc');
      } else {
        setErrorMsg(data.error || 'Registration failed');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <MaterialIcon name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign up</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroIcon}>
              <MaterialIcon name="two-wheeler" size={36} color={colors.primary} />
            </View>
            <Text style={styles.heroEyebrow}>EMATIX DELIVERY</Text>
            <Text style={styles.heroTitle}>Become a delivery partner</Text>
            <Text style={styles.heroSubtitle}>
              Deliver with your own vehicle. Earn per order, on your schedule.
            </Text>
          </LinearGradient>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBadge}>
                <MaterialIcon name="person-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Account details</Text>
                <Text style={styles.sectionSubtitle}>Your basic information</Text>
              </View>
            </View>

            <Field
              icon="person-outline"
              label="Full Name (as per DL)"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Rahul Sharma"
              autoCap="words"
            />
            <Field
              icon="mail-outline"
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
            />
            <Field
              icon="phone"
              label="Mobile Number"
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
              placeholder="98765 43210"
              keyboardType="phone-pad"
              maxLength={10}
              prefix={
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
              }
            />
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBadge}>
                <MaterialIcon name="directions-car" size={18} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Choose your vehicle</Text>
                <Text style={styles.sectionSubtitle}>What will you use to deliver?</Text>
              </View>
            </View>

            <View style={styles.vehicleRow}>
              {VEHICLES.map((v) => {
                const isSelected = vehicle === v.type;
                return (
                  <TouchableOpacity
                    key={v.type}
                    style={[styles.vehicleOption, isSelected && styles.vehicleOptionSelected]}
                    onPress={() => setVehicle(v.type)}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <MaterialIcon name="check-circle" size={20} color={colors.primary} />
                      </View>
                    )}
                    <View style={[styles.vehicleIcon, isSelected && styles.vehicleIconSelected]}>
                      <MaterialIcon
                        name={v.icon as any}
                        size={28}
                        color={isSelected ? colors.onPrimary : colors.textMuted}
                      />
                    </View>
                    <Text style={[styles.vehicleLabel, isSelected && styles.vehicleLabelSelected]}>
                      {v.label}
                    </Text>
                    <Text style={styles.vehicleDesc}>{v.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Field
              icon="directions-car"
              label="Vehicle Registration Number"
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              placeholder="e.g. TN10 AB 1234"
              autoCap="characters"
            />
            <Field
              icon="emoji-transportation"
              label="Vehicle Model"
              value={vehicleModel}
              onChangeText={setVehicleModel}
              placeholder="e.g. Honda Activa 6G"
            />
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBadge}>
                <MaterialIcon name="badge" size={18} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>License & personal</Text>
                <Text style={styles.sectionSubtitle}>Required for verification</Text>
              </View>
            </View>

            <Field
              icon="cake"
              label="Date of Birth"
              value={dob}
              onChangeText={(t) => formatDate(t, setDob)}
              placeholder="DD/MM/YYYY"
              keyboardType="number-pad"
              maxLength={10}
              hint="You must be 18 or older to partner with Ematix."
            />
            <Field
              icon="location-city"
              label="City of Operation"
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Chennai"
              autoCap="words"
            />
            <Field
              icon="badge"
              label="Driving License Number"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="e.g. TN04 20240001234"
              autoCap="characters"
            />
            <Field
              icon="event"
              label="License Valid Till"
              value={licenseExpiry}
              onChangeText={(t) => formatDate(t, setLicenseExpiry)}
              placeholder="DD/MM/YYYY"
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!isFormValid || loading}
            onPress={handleSignup}
          >
            <LinearGradient
              colors={
                isFormValid
                  ? [colors.primary, colors.secondary]
                  : [colors.surfaceContainerHigh, colors.surfaceContainerHigh]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? 'Creating account...' : 'Continue to Verification'}
              </Text>
              <MaterialIcon name="arrow-forward" size={18} color={colors.onPrimary} />
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.termsText}>
            By continuing you agree to Ematix{'\u2019'}s{' '}
            <Text style={styles.termsLink}>Partner Terms</Text> &amp; <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
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
    paddingTop: spacing.stackXs,
    paddingBottom: spacing.stackXl,
  },
  hero: {
    borderRadius: radius.xxl,
    padding: spacing.stackXl,
    marginBottom: spacing.stackXl,
    overflow: 'hidden',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.onPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.stackLg,
  },
  heroEyebrow: {
    ...type.labelSm,
    color: colors.inversePrimary,
    letterSpacing: 2,
    marginBottom: spacing.stackXs,
  },
  heroTitle: {
    ...type.headlineLg,
    color: colors.onPrimary,
    marginBottom: spacing.stackSm,
  },
  heroSubtitle: {
    ...type.bodyMd,
    color: colors.inversePrimary,
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    marginBottom: spacing.stackLg,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    marginBottom: spacing.stackLg,
  },
  sectionBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  countryCode: {
    marginRight: spacing.stackXs,
  },
  countryCodeText: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: spacing.stackMd,
    marginBottom: spacing.stackLg,
  },
  vehicleOption: {
    flex: 1,
    backgroundColor: colors.surfaceGray,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative',
  },
  vehicleOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.lightBlueTint,
  },
  vehicleIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.stackSm,
  },
  vehicleIconSelected: {
    backgroundColor: colors.primary,
  },
  vehicleLabel: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  vehicleLabelSelected: {
    color: colors.primary,
  },
  vehicleDesc: {
    ...type.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.stackXs,
    lineHeight: 14,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  errorText: {
    ...type.bodySm,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.stackSm,
  },
  footer: {
    padding: spacing.marginMobile,
    paddingBottom: Platform.OS === 'ios' ? spacing.stackXl : spacing.marginMobile,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    paddingVertical: spacing.stackMd,
    borderRadius: radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: {
    ...type.labelLg,
    color: colors.onPrimary,
  },
  termsText: {
    ...type.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.stackLg,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
});

const createFieldStyles = (colors: any) => StyleSheet.create({
  fieldGroup: {
    marginBottom: spacing.stackLg,
  },
  fieldLabel: {
    ...type.labelMd,
    color: colors.onSurface,
    marginBottom: spacing.stackSm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.surfaceGray,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.stackMd,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    ...type.bodyLg,
    color: colors.onSurface,
    paddingVertical: spacing.stackMd,
  },
  fieldHint: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: spacing.stackXs,
  },
});