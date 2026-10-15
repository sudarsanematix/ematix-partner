import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { type, spacing, radius } from '../theme/typography';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import { authedFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

type Ticket = {
  _id?: string;
  ticketId: string;
  subject: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'sos';
  status: 'new' | 'in_progress' | 'resolved';
  createdAt: string;
};

// Human label + colour key for the SupportTicket.status enum.
const STATUS_META: Record<string, { label: string; tone: 'open' | 'progress' | 'done' }> = {
  new: { label: 'Open', tone: 'open' },
  in_progress: { label: 'In Progress', tone: 'progress' },
  resolved: { label: 'Resolved', tone: 'done' },
};

function formatDate(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SupportTicketsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { token } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await authedFetch('/api/tickets', token);
      setTickets(Array.isArray(data) ? data : []);
      setError(false);
    } catch (e) {
      console.warn('[SupportTickets] load failed', e);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const toneStyles: Record<string, { bg: string; text: string }> = {
    open: { bg: colors.surfaceGray, text: colors.onSurfaceVariant },
    progress: { bg: colors.lightBlueTint, text: colors.primary },
    done: { bg: colors.surfaceGray, text: colors.primary },
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader title="My Tickets" currentScreen="support" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <MaterialIcon name="cloud-off" size={40} color={colors.textMuted} />
            <Text style={styles.stateText}>Couldn&apos;t load your tickets. Pull to refresh.</Text>
          </View>
        ) : tickets.length === 0 ? (
          <View style={styles.centerState}>
            <MaterialIcon name="confirmation-number" size={44} color={colors.textMuted} />
            <Text style={styles.stateTitle}>No tickets yet</Text>
            <Text style={styles.stateText}>When you raise a problem, it will appear here.</Text>
            <TouchableOpacity
              style={styles.stateBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/support-ticket')}
            >
              <MaterialIcon name="add" size={18} color={colors.onPrimary} />
              <Text style={styles.stateBtnText}>Raise a Ticket</Text>
            </TouchableOpacity>
          </View>
        ) : (
          tickets.map((t) => {
            const meta = STATUS_META[t.status] || STATUS_META.new;
            const tone = toneStyles[meta.tone];
            return (
              <View key={t._id || t.ticketId} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardSubject} numberOfLines={1}>
                    {t.subject || t.category}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.badgeText, { color: tone.text }]}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {t.description}
                </Text>
                <View style={styles.cardMetaRow}>
                  <Text style={styles.cardMeta}>{t.ticketId}</Text>
                  <Text style={styles.cardMeta}>{formatDate(t.createdAt)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.marginMobile, paddingBottom: 100, gap: spacing.stackMd },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.stackXl * 2,
    gap: spacing.stackSm,
  },
  stateTitle: { ...type.labelLg, color: colors.onSurface, marginTop: spacing.stackSm },
  stateText: {
    ...type.bodyMd,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.stackLg,
  },
  stateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.stackLg,
    paddingVertical: spacing.stackMd,
    borderRadius: radius.full,
    marginTop: spacing.stackMd,
  },
  stateBtnText: { ...type.labelLg, color: colors.onPrimary },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    padding: spacing.cardPadding,
    gap: spacing.stackSm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.stackSm,
  },
  cardSubject: { flex: 1, ...type.labelLg, color: colors.onSurface },
  badge: {
    paddingHorizontal: spacing.stackSm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: { ...type.labelSm },
  cardDesc: { ...type.bodyMd, color: colors.onSurfaceVariant, lineHeight: 18 },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  cardMeta: { ...type.bodySm, color: colors.textMuted },
});
