import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import MaterialIcon from '../components/MaterialIcon';
import { useAuth } from '../context/AuthContext';
import { auth } from '../utils/firebaseConfig';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { login } = useAuth();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(30);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const phoneValid = phone.replace(/\D/g, '').length === 10;

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const initRecaptcha = () => {
    // Disabled for mock flow
  };

  const sendCode = async () => {
    if (!phoneValid) return;
    setErrorMsg('');
    setLoading(true);
    
    // MOCK FLOW: Skip Firebase, just go to OTP step
    setTimeout(() => {
      setOtp('');
      setResendIn(30);
      setStep('otp');
      setLoading(false);
    }, 500);
  };

  const verifyOtp = async () => {
    if (otp.length < 4) return;
    setErrorMsg('');
    setLoading(true);
    
    try {
      // MOCK FLOW: Send phone and OTP directly to backend
      const response = await fetch('http://192.168.1.34:4000/api/auth/partner/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });
      
      const data = await response.json();
      if (data.success) {
        // Success! Save to global state and local storage
        await login(data.user, data.token);
        router.replace('/(tabs)/home');
      } else if (data.error === 'USER_NOT_FOUND') {
        // Navigate to signup
        router.push({ pathname: '/signup', params: { phone } });
      } else {
        setErrorMsg(data.message || data.error || 'Backend verification failed');
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          {/* Brand */}
          <View style={styles.brandRow}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>E</Text>
            </View>
            <Text style={styles.brandName}>Ematix Partner</Text>
          </View>

          <Text style={styles.title}>Drive with Ematix</Text>
          <Text style={styles.subtitle}>
            {step === 'phone'
              ? 'Enter your registered mobile number to sign in'
              : `Enter the 4-digit code sent to +91 ${phone.replace(/\d(?=\d{4})/g, '*')}`}
          </Text>

          {step === 'phone' ? (
            <>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                  <MaterialIcon name="expand-more" size={16} color={colors.textMuted} />
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="98765 43210"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
                  accessibilityLabel="Mobile number"
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, !phoneValid && styles.primaryBtnDisabled]}
                activeOpacity={0.85}
                disabled={!phoneValid}
                onPress={sendCode}
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
                <MaterialIcon name="arrow-forward" size={18} color={colors.onPrimary} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.signupLinkWrap} 
                activeOpacity={0.8}
                onPress={() => router.push('/signup')}
              >
                <Text style={styles.signupText}>New to Ematix? <Text style={styles.signupLink}>Create an account</Text></Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.otpRow}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={[styles.otpBox, otp.length > i && styles.otpBoxFilled]}>
                    <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
                  </View>
                ))}
                <TextInput
                  style={styles.otpHidden}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus
                  caretHidden
                />
              </View>

              {resendIn > 0 ? (
                <Text style={styles.resendText}>Resend code in 00:{String(resendIn).padStart(2, '0')}</Text>
              ) : (
                <TouchableOpacity onPress={sendCode} hitSlop={8}>
                  <Text style={styles.resendActive}>Resend code</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, otp.length < 4 && styles.primaryBtnDisabled]}
                activeOpacity={0.85}
                disabled={otp.length < 4}
                onPress={verifyOtp}
              >
                <Text style={styles.primaryBtnText}>Verify & Go Online</Text>
                <MaterialIcon name="check" size={18} color={colors.onPrimary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.backLink} onPress={() => setStep('phone')} hitSlop={8}>
                <MaterialIcon name="arrow-back" size={16} color={colors.textMuted} />
                <Text style={styles.backLinkText}>Change number</Text>
              </TouchableOpacity>
            </>
          )}
          {Platform.OS === 'web' && <View nativeID="recaptcha-container" />}

          <Text style={styles.termsText}>
            By continuing you agree to the{' '}
            <Text style={styles.termsLink}>Partner Agreement</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
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
  content: {
    flex: 1,
    padding: spacing.marginMobile,
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.stackXl,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.stackSm,
  },
  logoText: {
    color: colors.onPrimary,
    fontFamily: fonts.bold,
    fontSize: 20,
  },
  brandName: {
    ...type.headlineSm,
    color: colors.primary,
    fontFamily: fonts.semibold,
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackXs,
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
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.stackMd,
    borderRadius: radius.lg,
    marginTop: spacing.stackLg,
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
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.stackLg,
  },
  otpBox: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceGray,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.lightBlueTint,
  },
  otpDigit: {
    ...type.headlineLg,
    color: colors.onSurface,
  },
  otpHidden: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    zIndex: 10,
  },
  resendText: {
    ...type.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  resendActive: {
    ...type.labelMd,
    color: colors.primary,
    textAlign: 'center',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackXs,
    marginTop: spacing.stackXl,
  },
  backLinkText: {
    ...type.labelMd,
    color: colors.textMuted,
  },
  termsText: {
    ...type.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.stackXl,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
  signupLinkWrap: {
    marginTop: spacing.stackLg,
    alignItems: 'center',
    paddingVertical: spacing.stackSm,
  },
  signupText: {
    ...type.bodyMd,
    color: colors.textMuted,
  },
  signupLink: {
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
});