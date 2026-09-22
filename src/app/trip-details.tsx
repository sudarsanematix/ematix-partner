import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';

const TRIPS = [
  {
    id: '1',
    type: 'ride',
    date: 'Today, 10:42 AM',
    from: 'T. Nagar',
    to: 'Anna Nagar',
    fare: 240,
    customer: 'Ananya S.',
    rating: 5,
    payout: { base: 190, distance: 50, tip: 0, incentive: 20, fee: 8 },
  },
  {
    id: '2',
    type: 'parcel',
    date: 'Today, 9:15 AM',
    from: 'Nungambakkam',
    to: 'Guindy',
    fare: 125,
    customer: 'Vikram M.',
    rating: 5,
    payout: { base: 125, distance: 0, tip: 10, incentive: 0, fee: 6 },
  },
  {
    id: '3',
    type: 'ride',
    date: 'Yesterday, 8:30 PM',
    from: 'Phoenix Mall',
    to: 'Velachery',
    fare: 95,
    customer: 'Divya R.',
    rating: 4.8,
    payout: { base: 75, distance: 20, tip: 0, incentive: 0, fee: 5 },
  },
];

export default function TripDetailsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const trip = TRIPS.find((t) => t.id === id) || TRIPS[0];

  if (!trip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SharedHeader currentScreen="trip-details" title="Trip Details" />
        <Text style={styles.missing}>Trip not found.</Text>
      </SafeAreaView>
    );
  }

  const p = trip.payout;
  const net = p.base + p.distance + p.tip + p.incentive - p.fee;
  const isParcel = trip.type === 'parcel';

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="trip-details" title="Trip Details" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Net earnings */}
        <View style={styles.summaryCard}>
          <Text style={styles.netLabel}>Net Earnings</Text>
          <Text style={styles.netAmount}>₹{net.toFixed(2)}</Text>
          <Text style={styles.netDate}>{trip.date}</Text>
          <View style={styles.paidPill}>
            <MaterialIcon name="check-circle" size={14} color={colors.onPrimary} />
            <Text style={styles.paidPillText}>Added to your wallet</Text>
          </View>
        </View>

        {/* Route */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcon name={isParcel ? 'inventory-2' : 'local-taxi'} size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{isParcel ? 'Parcel Delivery' : 'Auto Ride'}</Text>
          </View>
          <View style={styles.routeBox}>
            <View style={styles.routeColumn}>
              <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
              <View style={styles.routeLine} />
              <View style={[styles.routeDot, { backgroundColor: colors.accentRed }]} />
            </View>
            <View style={styles.routeTextCol}>
              <Text style={styles.routeLocation}>{trip.from}</Text>
              <Text style={styles.routeLabel}>Pickup</Text>
              <View style={styles.routeSecondPoint}>
                <Text style={styles.routeLocation}>{trip.to}</Text>
                <Text style={styles.routeLabel}>Drop-off</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Earnings breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
          <View style={styles.fareLine}>
            <Text style={styles.fareLabel}>Base Fare</Text>
            <Text style={styles.fareValue}>₹{p.base.toFixed(2)}</Text>
          </View>
          {p.distance > 0 && (
            <View style={styles.fareLine}>
              <Text style={styles.fareLabel}>Distance Fare</Text>
              <Text style={styles.fareValue}>₹{p.distance.toFixed(2)}</Text>
            </View>
          )}
          {p.tip > 0 && (
            <View style={styles.fareLine}>
              <Text style={styles.fareLabelTip}>Customer Tip</Text>
              <Text style={styles.fareValueTip}>₹{p.tip.toFixed(2)}</Text>
            </View>
          )}
          {p.incentive > 0 && (
            <View style={styles.fareLine}>
              <Text style={styles.fareLabelIncentive}>Peak Zone Incentive</Text>
              <Text style={styles.fareValueIncentive}>+₹{p.incentive.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.fareLine}>
            <Text style={styles.fareLabelFee}>Service Fee</Text>
            <Text style={styles.fareValueFee}>-₹{p.fee.toFixed(2)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>NET EARNED</Text>
            <Text style={styles.totalValue}>₹{net.toFixed(2)}</Text>
          </View>
        </View>

        {/* Customer */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.customerRow}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{trip.customer.charAt(0)}</Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{trip.customer}</Text>
              <Text style={styles.customerSub}>Rated this trip</Text>
            </View>
            <View style={styles.ratingBadge}>
              <MaterialIcon name="star" size={13} color="#FFB800" />
              <Text style={styles.ratingText}>{trip.rating}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.helpRow}
          activeOpacity={0.75}
          onPress={() => router.back()}
        >
          <MaterialIcon name="help-outline" size={18} color={colors.textMuted} />
          <Text style={styles.helpText}>Issue with this trip's earnings?</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.marginMobile,
    paddingBottom: 100,
    gap: spacing.stackLg,
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.sheetPadding,
    alignItems: 'center',
  },
  netLabel: {
    ...type.labelSm,
    color: colors.onPrimaryContainer,
    letterSpacing: 0.6,
  },
  netAmount: {
    ...type.headlineXl,
    fontSize: 40,
    color: colors.onPrimary,
    fontFamily: fonts.extrabold,
    marginTop: spacing.stackXs,
  },
  netDate: {
    ...type.bodySm,
    color: colors.onPrimaryContainer,
    marginTop: spacing.stackXs,
  },
  paidPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackXs,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackXs,
    borderRadius: radius.full,
    marginTop: spacing.stackLg,
  },
  paidPillText: {
    ...type.labelSm,
    color: colors.onPrimary,
    fontSize: 11,
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    marginBottom: spacing.stackLg,
  },
  sectionTitle: {
    ...type.labelLg,
    color: colors.onSurface,
    marginBottom: spacing.stackMd,
  },
  routeBox: {
    backgroundColor: colors.surfaceGray,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    flexDirection: 'row',
    gap: spacing.stackMd,
  },
  routeColumn: {
    alignItems: 'center',
    marginTop: spacing.stackXs,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.outlineVariant,
    marginVertical: 2,
  },
  routeTextCol: {
    flex: 1,
  },
  routeLocation: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  routeLabel: {
    ...type.labelSm,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  routeSecondPoint: {
    marginTop: spacing.stackMd,
  },
  fareLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.stackSm,
  },
  fareLabel: {
    ...type.bodyMd,
    color: colors.textMuted,
  },
  fareValue: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  fareLabelTip: {
    ...type.bodyMd,
    color: colors.primary,
    fontFamily: fonts.medium,
  },
  fareValueTip: {
    ...type.labelMd,
    color: colors.primary,
  },
  fareLabelIncentive: {
    ...type.bodyMd,
    color: '#047857',
    fontFamily: fonts.medium,
  },
  fareValueIncentive: {
    ...type.labelMd,
    color: '#047857',
  },
  fareLabelFee: {
    ...type.bodyMd,
    color: colors.accentRed,
    fontFamily: fonts.medium,
  },
  fareValueFee: {
    ...type.labelMd,
    color: colors.accentRed,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceGray,
    padding: spacing.cardPadding,
    borderRadius: radius.lg,
    marginTop: spacing.stackSm,
  },
  totalLabel: {
    ...type.labelSm,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  totalValue: {
    ...type.headlineMd,
    color: colors.onSurface,
    fontFamily: fonts.extrabold,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.onPrimary,
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  customerInfo: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  customerSub: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceGray,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackXs,
    borderRadius: radius.full,
  },
  ratingText: {
    ...type.labelSm,
    color: colors.onSurface,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackXs,
    paddingVertical: spacing.stackMd,
  },
  helpText: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
  },
  missing: {
    ...type.bodyMd,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.stackXl,
  },
});