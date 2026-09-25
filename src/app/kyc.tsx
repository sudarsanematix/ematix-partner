import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import MaterialIcon from '../components/MaterialIcon';

export default function KYCScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  const [personalDone, setPersonalDone] = useState(false);
  const [licenseDone, setLicenseDone] = useState(false);
  const [vehicleDone, setVehicleDone] = useState(false);

  const allDone = personalDone && licenseDone && vehicleDone;

  const handleSubmit = () => {
    if (!allDone) return;
    router.push('/pending-approval');
  };

  const DocumentStep = ({ 
    title, 
    subtitle, 
    isDone, 
    onPress, 
    icon 
  }: { 
    title: string; 
    subtitle: string; 
    isDone: boolean; 
    onPress: () => void; 
    icon: string; 
  }) => {
    return (
      <TouchableOpacity 
        style={[styles.stepCard, isDone && styles.stepCardDone]} 
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.stepIconWrap, isDone && styles.stepIconWrapDone]}>
          <MaterialIcon name={icon as any} size={24} color={isDone ? colors.onPrimary : colors.primary} />
        </View>
        
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{title}</Text>
          <Text style={styles.stepSubtitle}>{isDone ? 'Document Uploaded' : subtitle}</Text>
        </View>

        {isDone ? (
          <MaterialIcon name="check-circle" size={24} color={colors.primary} />
        ) : (
          <View style={styles.uploadBtn}>
            <Text style={styles.uploadBtnText}>Upload</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <MaterialIcon name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.alertBox}>
          <MaterialIcon name="security" size={20} color={colors.primary} />
          <Text style={styles.alertText}>
            Your documents are securely encrypted and only used for identity verification.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Required Documents</Text>

        <DocumentStep 
          title="Personal Identity" 
          subtitle="Aadhar Card or PAN Card" 
          icon="badge" 
          isDone={personalDone} 
          onPress={() => setPersonalDone(!personalDone)} // Toggling for simulation
        />

        <DocumentStep 
          title="Driving License" 
          subtitle="Front and Back photos" 
          icon="credit-card" 
          isDone={licenseDone} 
          onPress={() => setLicenseDone(!licenseDone)}
        />

        <DocumentStep 
          title="Vehicle Documents" 
          subtitle="RC Book & Insurance" 
          icon="description" 
          isDone={vehicleDone} 
          onPress={() => setVehicleDone(!vehicleDone)}
        />

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, !allDone && styles.primaryBtnDisabled]}
          activeOpacity={0.85}
          disabled={!allDone}
          onPress={handleSubmit}
        >
          <Text style={styles.primaryBtnText}>Submit for Verification</Text>
          <MaterialIcon name="check" size={18} color={colors.onPrimary} />
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
    marginBottom: spacing.stackXl,
    alignItems: 'flex-start',
  },
  alertText: {
    ...type.bodySm,
    color: colors.onSurface,
    flex: 1,
    lineHeight: 18,
  },
  sectionTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
    marginBottom: spacing.stackLg,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceGray,
    padding: spacing.stackLg,
    borderRadius: radius.lg,
    marginBottom: spacing.stackMd,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  stepCardDone: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  stepIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.stackMd,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepIconWrapDone: {
    backgroundColor: colors.primary,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...type.labelLg,
    color: colors.onSurface,
    marginBottom: 4,
  },
  stepSubtitle: {
    ...type.bodySm,
    color: colors.textMuted,
  },
  uploadBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackSm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  uploadBtnText: {
    ...type.labelSm,
    color: colors.onSurface,
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