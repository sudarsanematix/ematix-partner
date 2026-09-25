import React, { useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { fonts, type, spacing, radius } from '../theme/typography';
import MaterialIcon from '../components/MaterialIcon';

type VehicleType = 'Bike' | 'Auto' | 'Cab';

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
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const phoneValid = phone.replace(/\D/g, '').length === 10;
  const isFormValid = name.trim().length > 2 && email.includes('@') && phoneValid && vehicle !== null;

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
        body: JSON.stringify({ phone, name, email, vehicleType: dbVehicleType })
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

  const VehicleOption = ({ type, icon, label }: { type: VehicleType; icon: string; label: string }) => {
    const isSelected = vehicle === type;
    return (
      <TouchableOpacity
        style={[styles.vehicleOption, isSelected && styles.vehicleOptionSelected]}
        onPress={() => setVehicle(type)}
        activeOpacity={0.7}
      >
        <MaterialIcon
          name={icon as any}
          size={32}
          color={isSelected ? colors.primary : colors.textMuted}
        />
        <Text style={[styles.vehicleLabel, isSelected && styles.vehicleLabelSelected]}>{label}</Text>
        {isSelected && (
          <View style={styles.checkBadge}>
            <MaterialIcon name="check-circle" size={18} color={colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <MaterialIcon name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          <Text style={styles.title}>Join Ematix Delivery</Text>
          <Text style={styles.subtitle}>Tell us a bit about yourself and your vehicle to get started.</Text>

          {/* Form Fields */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name (as per DL)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="98765 43210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
              />
            </View>
          </View>

          {/* Vehicle Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Select your vehicle</Text>
            <View style={styles.vehicleRow}>
              <VehicleOption type="Bike" icon="two-wheeler" label="Bike" />
              <VehicleOption type="Auto" icon="electric-rickshaw" label="Auto" />
              <VehicleOption type="Cab" icon="local-taxi" label="Cab" />
            </View>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, !isFormValid && styles.primaryBtnDisabled]}
            activeOpacity={0.85}
            disabled={!isFormValid}
            onPress={handleSignup}
          >
            <Text style={styles.primaryBtnText}>Continue to Verification</Text>
            <MaterialIcon name="arrow-forward" size={18} color={colors.onPrimary} />
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
  title: {
    ...type.headlineLg,
    color: colors.onSurface,
    marginBottom: spacing.stackXs,
  },
  subtitle: {
    ...type.bodyMd,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.stackXl,
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  countryCode: {
    backgroundColor: colors.surfaceGray,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackMd,
  },
  countryCodeText: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  phoneInput: {
    flex: 1,
    ...type.bodyLg,
    color: colors.onSurface,
    backgroundColor: colors.surfaceGray,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackMd,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: spacing.stackMd,
  },
  vehicleOption: {
    flex: 1,
    backgroundColor: colors.surfaceGray,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  vehicleOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.lightBlueTint,
  },
  vehicleLabel: {
    ...type.labelSm,
    color: colors.textMuted,
    marginTop: spacing.stackSm,
  },
  vehicleLabelSelected: {
    color: colors.primary,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  footer: {
    padding: spacing.marginMobile,
    paddingBottom: Platform.OS === 'ios' ? spacing.stackXl : spacing.marginMobile,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: colors.surfaceContainerHigh,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    ...type.labelLg,
    color: colors.onPrimary,
  },
});
