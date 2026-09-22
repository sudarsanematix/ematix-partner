import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon, { MaterialIconName } from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';

const NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'ride',
    title: 'Trip completed',
    message: 'You earned ₹240 from the T. Nagar → Anna Nagar ride. Keep it up!',
    time: 'Today, 10:48 AM',
    read: false,
  },
  {
    id: 'n2',
    type: 'payout',
    title: 'Payout processed',
    message: 'Your withdrawal of ₹1,500 has been sent to HDFC Bank •••• 1234.',
    time: 'Yesterday, 11:35 PM',
    read: false,
  },
  {
    id: 'n3',
    type: 'delivery',
    title: 'Delivery feedback',
    message: 'A customer gave you a 5-star rating with the compliment "Careful handling".',
    time: 'Yesterday, 06:22 PM',
    read: false,
  },
  {
    id: 'n4',
    type: 'offer',
    title: 'Peak bonus active',
    message: 'Earn an extra ₹30 per trip between 7 PM - 10 PM in T. Nagar zone tonight.',
    time: 'Yesterday, 04:00 PM',
    read: true,
  },
  {
    id: 'n5',
    type: 'safety',
    title: 'Document reminder',
    message: 'Your RC book expires in 25 days. Upload a fresh copy to avoid online blocks.',
    time: 'Sep 18, 09:00 AM',
    read: true,
  },
];

const TYPE_META: Record<string, { icon: MaterialIconName; danger: boolean }> = {
  ride: { icon: 'local-taxi', danger: false },
  delivery: { icon: 'inventory-2', danger: false },
  payout: { icon: 'account-balance', danger: false },
  offer: { icon: 'local-offer', danger: true },
  safety: { icon: 'shield', danger: false },
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [items, setItems] = useState(NOTIFICATIONS);
  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));

  const markRead = (id: string) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="notifications" title="Notifications" />

      <View style={styles.headerRow}>
        <View style={styles.countRow}>
          <Text style={styles.counterValue}>{unreadCount}</Text>
          <Text style={styles.counterLabel}>{unreadCount === 1 ? 'new update' : 'new updates'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.markAll, unreadCount === 0 && styles.markAllDisabled]}
          activeOpacity={0.7}
          disabled={unreadCount === 0}
          onPress={markAllRead}
        >
          <MaterialIcon name="done-all" size={18} color={unreadCount === 0 ? colors.outlineVariant : colors.primary} />
          <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {items.map((n) => {
          const meta = TYPE_META[n.type] || TYPE_META.ride;
          return (
            <TouchableOpacity
              key={n.id}
              style={[styles.card, !n.read && styles.cardUnread]}
              activeOpacity={0.8}
              onPress={() => markRead(n.id)}
            >
              {!n.read && <View style={styles.unreadDot} />}
              <View style={[styles.iconWrap, { backgroundColor: meta.danger ? '#FFEAEA' : colors.lightBlueTint }]}>
                <MaterialIcon
                  name={meta.icon}
                  size={20}
                  color={meta.danger ? colors.accentRed : colors.primary}
                />
              </View>
              <View style={styles.textWrap}>
                <Text style={[styles.title, !n.read && styles.titleUnread]} numberOfLines={2}>
                  {n.title}
                </Text>
                <Text style={styles.message} numberOfLines={3}>
                  {n.message}
                </Text>
                <Text style={styles.time}>{n.time}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    marginBottom: spacing.stackLg,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.stackXs,
  },
  counterValue: {
    ...type.headlineMd,
    color: colors.onSurface,
  },
  counterLabel: {
    ...type.bodyMd,
    color: colors.textMuted,
  },
  markAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackXs,
    paddingVertical: spacing.stackSm,
    paddingHorizontal: spacing.stackMd,
    borderRadius: radius.full,
    backgroundColor: colors.lightBlueTint,
  },
  markAllDisabled: {
    backgroundColor: colors.surfaceGray,
  },
  markAllText: {
    ...type.labelMd,
    color: colors.primary,
  },
  markAllTextDisabled: {
    color: colors.outlineVariant,
  },
  list: {
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: 100,
    gap: spacing.stackSm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    position: 'relative',
  },
  cardUnread: {
    borderColor: colors.primaryContainer,
  },
  unreadDot: {
    position: 'absolute',
    top: spacing.stackSm,
    right: spacing.stackSm,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentRed,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  titleUnread: {
    fontFamily: fonts.bold,
  },
  message: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: spacing.stackXs,
    lineHeight: 18,
  },
  time: {
    ...type.labelSm,
    color: colors.outlineVariant,
    marginTop: spacing.stackSm,
  },
});