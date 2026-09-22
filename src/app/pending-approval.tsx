import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import MaterialIcon from '../components/MaterialIcon';

export default function PendingApprovalScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  const handleDone = () => {
    // For now, let's just route back to login or stay here.
    // In a real app, they would be locked out of the main app until approved.
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        
        <View style={styles.iconCircle}>
          <MaterialIcon name="hourglass-empty" size={64} color={colors.primary} />
        </View>
        
        <Text style={styles.title}>Under Verification</Text>
        <Text style={styles.subtitle}>
          We have received your documents. Our team is currently reviewing your profile to ensure everything is correct.
        </Text>

        <View style={styles.infoCard}>
          <MaterialIcon name="info" size={20} color={colors.textMuted} />
          <Text style={styles.infoText}>
            This usually takes 24-48 hours. We will notify you via SMS once your account is activated.
          </Text>
        </View>

      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={handleDone}
        >
          <Text style={styles.primaryBtnText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    padding: spacing.marginMobile,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.stackXl,
  },
  title: {
    ...type.headlineLg,
    color: colors.onSurface,
    marginBottom: spacing.stackSm,
    textAlign: 'center',
  },
  subtitle: {
    ...type.bodyLg,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.stackXl,
    paddingHorizontal: spacing.stackLg,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceGray,
    padding: spacing.stackLg,
    borderRadius: radius.lg,
    gap: spacing.stackSm,
    width: '100%',
    alignItems: 'flex-start',
  },
  infoText: {
    ...type.bodySm,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    padding: spacing.marginMobile,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    backgroundColor: colors.surface,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceGray,
    paddingVertical: spacing.stackMd,
    borderRadius: radius.lg,
  },
  primaryBtnText: {
    ...type.labelLg,
    color: colors.onSurface,
  },
});
