import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../../theme/typography';
import SharedHeader from '../../components/SharedHeader';
import MaterialIcon from '../../components/MaterialIcon';

const RECENT_TRIPS = [
  { id: '1', type: 'ride', date: 'Today, 10:42 AM', from: 'T. Nagar', to: 'Anna Nagar', amount: '₹240', status: 'Completed' },
  { id: '2', type: 'parcel', date: 'Today, 9:15 AM', from: 'Nungambakkam', to: 'Guindy', amount: '₹125', status: 'Completed' },
  { id: '3', type: 'ride', date: 'Yesterday, 8:30 PM', from: 'Phoenix Mall', to: 'Velachery', amount: '₹95', status: 'Completed' },
];

export default function EarningsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="earnings" />
      
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Earnings Overview */}
        <View style={styles.earningsCard}>
          <Text style={styles.periodText}>This Week (Sep 14 - Sep 20)</Text>
          <Text style={styles.totalEarnings}>₹ 4,850.50</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <MaterialIcon name="directions-car" size={20} color={colors.primary} />
              <View style={styles.statInfo}>
                <Text style={styles.statNum}>24</Text>
                <Text style={styles.statLabel}>Trips</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statBox}>
              <MaterialIcon name="schedule" size={20} color={colors.primary} />
              <View style={styles.statInfo}>
                <Text style={styles.statNum}>18h</Text>
                <Text style={styles.statLabel}>Online</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/wallet')}>
            <MaterialIcon name="account-balance" size={20} color={colors.onSurface} />
            <Text style={styles.actionText}>Cash Out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <MaterialIcon name="bar-chart" size={20} color={colors.onSurface} />
            <Text style={styles.actionText}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Trips */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Trips</Text>
          
          <View style={styles.tripsList}>
            {RECENT_TRIPS.map((trip) => (
              <TouchableOpacity key={trip.id} style={styles.tripCard} activeOpacity={0.8} onPress={() => router.push({ pathname: '/trip-details', params: { id: trip.id } })}>
                <View style={styles.tripLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: trip.type === 'parcel' ? colors.surfaceContainerHigh : colors.lightBlueTint }]}>
                    <MaterialIcon 
                      name={trip.type === 'parcel' ? 'inventory-2' : 'local-taxi'} 
                      size={20} 
                      color={trip.type === 'parcel' ? colors.accentRed : colors.primary} 
                    />
                  </View>
                  <View>
                    <Text style={styles.tripRoute}>{trip.from} → {trip.to}</Text>
                    <Text style={styles.tripDate}>{trip.date}</Text>
                  </View>
                </View>
                <View style={styles.tripRight}>
                  <Text style={styles.tripAmount}>{trip.amount}</Text>
                  <Text style={styles.tripStatus}>{trip.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  container: {
    padding: spacing.marginMobile,
    paddingTop: spacing.stackMd,
    paddingBottom: 132,
    gap: spacing.stackLg,
  },
  earningsCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  periodText: {
    ...type.labelMd,
    color: colors.onPrimaryContainer,
    marginBottom: 8,
  },
  totalEarnings: {
    ...type.headlineXl,
    color: colors.onPrimary,
    fontFamily: fonts.extrabold,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 16,
    width: '100%',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statInfo: {
    flexDirection: 'column',
  },
  statNum: {
    ...type.headlineSm,
    color: colors.onSurface,
  },
  statLabel: {
    ...type.labelSm,
    color: colors.textMuted,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.outlineVariant,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  recentSection: {
    gap: 12,
  },
  sectionTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
    marginBottom: 4,
  },
  tripsList: {
    gap: 8,
  },
  tripCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripRoute: {
    ...type.labelMd,
    color: colors.onSurface,
    marginBottom: 2,
  },
  tripDate: {
    ...type.bodySm,
    color: colors.textMuted,
  },
  tripRight: {
    alignItems: 'flex-end',
  },
  tripAmount: {
    ...type.labelLg,
    color: colors.onSurface,
  },
  tripStatus: {
    ...type.labelSm,
    color: colors.primary,
    fontSize: 10,
    marginTop: 2,
  },
});
