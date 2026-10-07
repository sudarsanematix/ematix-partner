import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { type, spacing, radius } from '../theme/typography';
import MaterialIcon from '../components/MaterialIcon';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../utils/api';

/**
 * Post-submission status screen.
 *
 * Reads the server rather than assuming "under review" forever. Three outcomes
 * are reachable and each needs different words and a different next step:
 *   approved     -> approved, send them into the app
 *   rejected     -> tell them what to fix and send them back to /kyc
 *   under_review -> what it always said, plus a manual refresh
 *
 * `useFocusEffect` rather than a mount-only fetch: this is where a partner lands
 * right after submitting, and an approval can land while they sit here. A
 * one-shot fetch on mount would leave them staring at "under verification" with
 * an approved account.
 */
export default function PendingApprovalScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { token, refresh } = useAuth();

  const [status, setStatus] = useState<string | null>(null);
  const [rejected, setRejected] = useState<{ docKey: string; label: string; reason: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const me = await authedFetch('/api/kyc/me', token);
      setStatus(me?.kycStatus || null);
      setRejected(
        (me?.documents || [])
          .filter((doc: any) => doc.status === 'rejected')
          .map((doc: any) => ({
            docKey: doc.docKey,
            label: doc.label || doc.docKey,
            reason: doc.rejectionReason || 'Please upload this document again',
          }))
      );
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not reach the server');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Re-check on mount and on every focus. One hook rather than a mount effect
  // plus a focus effect, which would fire the same request twice on arrival.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const approved = status === 'approved';

  const handleContinue = async () => {
    await refresh();
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, approved && styles.iconCircleOk]}>
          <MaterialIcon
            name={approved ? 'verified' : 'hourglass-empty'}
            size={64}
            color={approved ? '#047857' : colors.primary}
          />
        </View>

        <Text style={styles.title}>
          {loading ? 'Checking status' : approved ? 'You are verified' : 'Under Verification'}
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.stackLg }} />
        ) : (
          <Text style={styles.subtitle}>
            {approved
              ? 'Your documents have been approved. You can now accept rides and start earning.'
              : rejected.length > 0
                ? 'We could not approve every document. Fix the items below and submit again.'
                : 'We have received your documents. Our team is currently reviewing your profile to ensure everything is correct.'}
          </Text>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {rejected.length > 0 && !loading && (
          <View style={styles.rejectCard}>
            <View style={styles.rejectHeader}>
              <MaterialIcon name="error-outline" size={18} color="#B91C1C" />
              <Text style={styles.rejectHeaderText}>
                {rejected.length} document{rejected.length === 1 ? '' : 's'} to fix
              </Text>
            </View>
            {rejected.map((doc) => (
              <View key={doc.docKey} style={styles.rejectRow}>
                <Text style={styles.rejectLabel}>{doc.label}</Text>
                <Text style={styles.rejectReason}>{doc.reason}</Text>
              </View>
            ))}
          </View>
        )}

        {!approved && !loading && rejected.length === 0 && (
          <View style={styles.infoCard}>
            <MaterialIcon name="info" size={20} color={colors.textMuted} />
            <Text style={styles.infoText}>
              This usually takes 24-48 hours. Pull down or tap Refresh to check again.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {approved ? (
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={handleContinue}>
            <Text style={styles.primaryBtnText}>Start accepting rides</Text>
          </TouchableOpacity>
        ) : rejected.length > 0 ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => router.replace('/kyc')}
          >
            <Text style={styles.primaryBtnText}>Fix and resubmit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, styles.secondaryBtn]}
              activeOpacity={0.85}
              onPress={() => {
                setLoading(true);
                load();
              }}
            >
              <Text style={styles.secondaryBtnText}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, styles.ghostBtn]}
              activeOpacity={0.85}
              onPress={() => router.replace('/login')}
            >
              <Text style={styles.secondaryBtnText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        )}
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
  iconCircleOk: {
    backgroundColor: '#ECFDF5',
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
  rejectCard: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    padding: spacing.stackLg,
    borderRadius: radius.lg,
    gap: spacing.stackMd,
  },
  rejectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  rejectHeaderText: {
    ...type.labelMd,
    color: '#B91C1C',
  },
  rejectRow: {
    gap: 2,
  },
  rejectLabel: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  rejectReason: {
    ...type.bodySm,
    color: colors.textMuted,
    lineHeight: 18,
  },
  errorText: {
    ...type.bodySm,
    color: colors.error,
    textAlign: 'center',
  },
  footer: {
    padding: spacing.marginMobile,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    backgroundColor: colors.surface,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.stackMd,
  },
  primaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.stackMd,
    borderRadius: radius.lg,
  },
  secondaryBtn: {
    backgroundColor: colors.surfaceGray,
  },
  ghostBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  secondaryBtnText: {
    ...type.labelLg,
    color: colors.onSurface,
  },
  primaryBtnText: {
    ...type.labelLg,
    color: colors.onPrimary,
  },
});
