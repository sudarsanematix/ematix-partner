import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../../theme/typography';
import RealMap from '../../components/RealMap';
import MaterialIcon from '../../components/MaterialIcon';
import SwipeButton from '../../components/SwipeButton';
import AnimatedWifiIcon from '../../components/AnimatedWifiIcon';
import { socketService } from '../../utils/socket';
import { useAuth } from '../../context/AuthContext';
import { formatFare } from '../../utils/phone';

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { user, logout, isOnline, setIsOnline } = useAuth();
  const [hasRequest, setHasRequest] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<any>(null);
  const requestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef<any>(null);

  useEffect(() => {
    requestRef.current = currentRequest;
  }, [currentRequest]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const closeRequest = () => {
    setHasRequest(false);
    setCurrentRequest(null);
    setAccepting(false);
  };

  // Keep socket connection and request listeners active whenever partner is online
  useEffect(() => {
    if (isOnline) {
      socketService.connect();

      const handleNewRideRequest = (data: any) => {
        console.log('[Partner App] Received ride request:', data);
        setCurrentRequest(data);
        setHasRequest(true);
      };

      const handleRideUnavailable = (data: any) => {
        if (requestRef.current && requestRef.current.id === data.rideId) {
          closeRequest();
        }
      };

      const handleRideAssigned = (data: any) => {
        console.log('[Partner App] Ride assigned:', data);
        closeRequest();
        if (data?.id) {
          router.push(`/active-ride?rideId=${data.id}`);
        }
      };

      const handleRideError = (data: any) => {
        if (requestRef.current && requestRef.current.id === data?.rideId) {
          closeRequest();
          Alert.alert('Ride unavailable', data?.message || 'This ride is no longer available.');
        }
      };

      socketService.on('new_ride_request', handleNewRideRequest);
      socketService.on('ride_unavailable', handleRideUnavailable);
      socketService.on('ride_assigned', handleRideAssigned);
      socketService.on('ride_error', handleRideError);

      return () => {
        socketService.off('new_ride_request', handleNewRideRequest);
        socketService.off('ride_unavailable', handleRideUnavailable);
        socketService.off('ride_assigned', handleRideAssigned);
        socketService.off('ride_error', handleRideError);
      };
    } else {
      closeRequest();
      socketService.off('new_ride_request');
      socketService.off('ride_unavailable');
      socketService.off('ride_assigned');
      socketService.off('ride_error');
      socketService.disconnect();
    }
  }, [isOnline, router]);

  // Toggle online state explicitly requested by user
  const handleToggleOnline = async () => {
    await setIsOnline(!isOnline);
  };

  const acceptRide = () => {
    if (!currentRequest?.id || accepting) return;
    setAccepting(true);
    socketService.emit('accept_ride', { rideId: currentRequest.id, partnerId: user?.id });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{`${greeting()}, ${user?.name || user?.phone || 'Partner'}`}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn} accessibilityLabel="Notifications" accessibilityRole="button" hitSlop={8} onPress={() => router.push('/notifications')}>
              <MaterialIcon name="notifications" size={24} color={colors.onSurface} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileBtn} 
              accessibilityLabel="Profile" 
              accessibilityRole="button" 
              hitSlop={8}
              onPress={async () => {
                await logout();
              }}
            >
              <MaterialIcon name="account-circle" size={32} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Toggle (Slide-like design) */}
        {isOnline ? (
          <TouchableOpacity
            style={[styles.toggleBtn, styles.toggleOnline]}
            activeOpacity={0.9}
            onPress={handleToggleOnline}
          >
            <View style={[styles.toggleThumb, styles.thumbOnline]}>
              <AnimatedWifiIcon isOnline={true} color={colors.primary} />
            </View>
            <Text style={[styles.toggleText, styles.textOnline]}>
              You're Online - Finding rides...
            </Text>
          </TouchableOpacity>
        ) : (
          <SwipeButton 
            key="offline-slider"
            title="Slide to Go Online"
            onComplete={handleToggleOnline}
            color={colors.surfaceContainerHigh}
            targetColor={colors.primary}
            textColor={colors.onSurfaceVariant}
            renderThumbIcon={(progress) => (
              <AnimatedWifiIcon progress={progress} isOnline={false} color={colors.textMuted} size={28} />
            )}
          />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Map Card */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <MaterialIcon name="local-fire-department" size={20} color={colors.accentRed} />
            <Text style={styles.mapTitle}>Live Hotspots</Text>
          </View>
          <View style={styles.mapContainer}>
            <RealMap interactive={false} style={styles.mapImage} />

            {/* Mock Hotspot Overlay */}
            {isOnline && (
              <View style={styles.hotspotPill}>
                <View style={styles.hotspotDot} />
                <Text style={styles.hotspotText}>High demand in T. Nagar</Text>
              </View>
            )}
          </View>
        </View>

        {/* Verification banner */}
        <TouchableOpacity style={styles.kycBanner} activeOpacity={0.85} onPress={() => router.push('/kyc')}>
          <View style={styles.kycBannerIcon}>
            <MaterialIcon name="verified-user" size={22} color={colors.onPrimary} />
          </View>
          <View style={styles.kycBannerText}>
            <Text style={styles.kycBannerTitle}>Complete your KYC</Text>
            <Text style={styles.kycBannerSub}>2 of 5 steps done · unlock your first payout</Text>
          </View>
          <MaterialIcon name="chevron-right" size={20} color={colors.onPrimaryContainer} />
        </TouchableOpacity>

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>Today's Progress</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
          <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
            <Text style={[styles.statLabel, { color: colors.onPrimaryContainer }]}>Earnings</Text>
            <Text style={[styles.statValue, { color: colors.onPrimary }]}>₹ 1,240</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Trips Done</Text>
            <Text style={styles.statValue}>8</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Acceptance</Text>
            <Text style={styles.statValue}>94%</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Online Time</Text>
            <Text style={styles.statValue}>4h 12m</Text>
          </View>
        </ScrollView>

        {/* Upcoming / Reserved */}
        <Text style={styles.sectionTitle}>Upcoming Reserved Trips</Text>
        <View style={styles.reservedCard}>
          <View style={styles.reservedTimeWrap}>
            <Text style={styles.reservedTime}>02:30 PM</Text>
            <Text style={styles.reservedDate}>Today</Text>
          </View>
          <View style={styles.reservedInfo}>
            <Text style={styles.reservedRoute}>Airport Drop</Text>
            <Text style={styles.reservedSub}>Guindy → Chennai Intl Airport</Text>
          </View>
          <Text style={styles.reservedPayout}>₹450</Text>
        </View>

      </ScrollView>

      {/* Incoming Request Bottom Sheet Overlay */}
      <Modal transparent={true} visible={hasRequest} animationType="fade" onRequestClose={() => setHasRequest(false)}>
        <View style={styles.requestSheetOverlay}>
          <View style={styles.requestSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.requestTitle}>New Ride Request</Text>
            {currentRequest?.customer?.name ? (
              <Text style={styles.requestCustomer}>from {currentRequest.customer.name}</Text>
            ) : null}

            <View style={styles.requestRow}>
              <View style={styles.timeBox}>
                <Text style={styles.timeMins}>{currentRequest?.eta ? parseInt(currentRequest.eta) : 2}</Text>
                <Text style={styles.timeUnit}>min away</Text>
              </View>
              <View style={styles.requestRoute}>
                <Text style={styles.pickupText}>{currentRequest?.pickup?.address || 'Phoenix Marketcity'}</Text>
                <Text style={styles.dropoffText}>→ {currentRequest?.dropoff?.address || 'Anna Nagar Tower'}</Text>
              </View>
              <View style={styles.fareBox}>
                <Text style={styles.fareAmt}>{formatFare(currentRequest?.price)}</Text>
                <Text style={styles.fareLabel}>{currentRequest?.type === 'parcel' ? 'Delivery' : 'Ride'}</Text>
              </View>
            </View>

            <View style={styles.requestActions}>
<TouchableOpacity style={styles.declineBtn} onPress={closeRequest}>
                <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptBtn} onPress={acceptRide} disabled={accepting}>
                  <Text style={styles.acceptText}>{accepting ? 'Accepting...' : 'Accept Ride'}</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surfaceContainerLowest },
  header: {
    padding: spacing.marginMobile,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    backgroundColor: colors.surfaceContainerLowest,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 4,
  },
  greeting: {
    ...type.headlineSm,
    color: colors.onSurface,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    position: 'relative',
    padding: 4,
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentRed,
    borderWidth: 1,
    borderColor: colors.surfaceContainerLowest,
  },
  profileBtn: {
    padding: 0,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 32,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleOffline: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  toggleOnline: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  thumbOffline: {
    transform: [{ translateX: 0 }],
  },
  thumbOnline: {
    transform: [{ translateX: 0 }],
  },
  toggleText: {
    ...type.headlineSm,
    marginLeft: 16,
    flex: 1,
    textAlign: 'center',
    paddingRight: 48,
  },
  textOffline: {
    color: colors.onSurfaceVariant,
  },
  textOnline: {
    color: colors.onPrimary,
  },
  scrollContent: {
    padding: spacing.marginMobile,
    paddingBottom: 120, // space for tabs
  },
  mapCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.stackLg,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  mapTitle: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  mapContainer: {
    height: 220,
    width: '100%',
    position: 'relative',
    backgroundColor: colors.surfaceContainer,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  hotspotPill: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  hotspotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentRed,
  },
  hotspotText: {
    ...type.labelSm,
    color: colors.onSurface,
  },

  sectionTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
    marginBottom: 12,
  },
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    gap: spacing.stackMd,
    marginBottom: spacing.stackLg,
  },
  kycBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kycBannerText: {
    flex: 1,
    minWidth: 0,
  },
  kycBannerTitle: {
    ...type.labelLg,
    color: colors.onPrimary,
    fontFamily: fonts.bold,
  },
  kycBannerSub: {
    ...type.bodySm,
    color: colors.onPrimaryContainer,
    marginTop: 2,
  },
  statsScroll: {
    gap: 12,
    marginBottom: spacing.stackXl,
  },
  statCard: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: radius.lg,
    minWidth: 110,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  statLabel: {
    ...type.labelSm,
    color: colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    ...type.headlineMd,
    color: colors.onSurface,
  },
  reservedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  reservedTimeWrap: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: colors.outlineVariant,
  },
  reservedTime: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  reservedDate: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  reservedInfo: {
    flex: 1,
    paddingLeft: 16,
  },
  reservedRoute: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  reservedSub: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  reservedPayout: {
    ...type.labelLg,
    color: colors.primary,
  },
  requestSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  requestSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  requestTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 24,
  },
  requestCustomer: {
    ...type.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: -18,
    marginBottom: 16,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  timeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    width: 64,
    height: 64,
    borderRadius: radius.md,
  },
  timeMins: {
    ...type.headlineMd,
    color: colors.onPrimary,
    lineHeight: 28,
  },
  timeUnit: {
    ...type.labelSm,
    fontSize: 10,
    color: colors.onPrimary,
  },
  requestRoute: {
    flex: 1,
    paddingHorizontal: 16,
  },
  pickupText: {
    ...type.labelMd,
    color: colors.onSurface,
    marginBottom: 4,
  },
  dropoffText: {
    ...type.bodyMd,
    color: colors.onSurfaceVariant,
  },
  fareBox: {
    alignItems: 'flex-end',
  },
  fareAmt: {
    ...type.headlineXl,
    color: colors.onSurface,
    fontSize: 28,
    fontFamily: fonts.extrabold,
  },
  fareLabel: {
    ...type.labelSm,
    color: colors.textMuted,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
  },
  declineText: {
    ...type.labelLg,
    color: colors.onSurfaceVariant,
  },
  acceptBtn: {
    flex: 2,
    paddingVertical: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  acceptText: {
    ...type.labelLg,
    color: colors.onPrimary,
  },
});
