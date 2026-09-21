import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import RealMap from '../components/RealMap';
import MaterialIcon from '../components/MaterialIcon';
import SwipeButton from '../components/SwipeButton';

// Mock passenger data
const PASSENGER = {
  name: 'Anita S.',
  rating: '4.8',
  pickup: 'Phoenix Marketcity, Velachery',
  dropoff: 'Anna Nagar Tower Park',
  eta: '12 mins',
  distance: '4.2 km',
};

type RideState = 'EN_ROUTE_PICKUP' | 'ARRIVED' | 'EN_ROUTE_DROPOFF';

export default function ActiveRideScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const [rideState, setRideState] = useState<RideState>('EN_ROUTE_PICKUP');

  const handleSlideAction = () => {
    if (rideState === 'EN_ROUTE_PICKUP') {
      setRideState('ARRIVED');
    } else if (rideState === 'ARRIVED') {
      setRideState('EN_ROUTE_DROPOFF');
    } else {
      // Complete ride and go back to home
      router.replace('/');
    }
  };

  const getButtonText = () => {
    if (rideState === 'EN_ROUTE_PICKUP') return 'Slide to Arrive';
    if (rideState === 'ARRIVED') return 'Slide to Start Trip';
    return 'Slide to Dropoff';
  };

  const getButtonColor = () => {
    if (rideState === 'EN_ROUTE_PICKUP') return colors.primary;
    if (rideState === 'ARRIVED') return '#10B981';
    return colors.accentRed;
  };

  const getTargetColor = () => {
    if (rideState === 'EN_ROUTE_PICKUP') return '#10B981';
    if (rideState === 'ARRIVED') return colors.accentRed;
    return colors.surfaceGray; // Last state fades to grey
  };

  const getStatusText = () => {
    if (rideState === 'EN_ROUTE_PICKUP') return `Picking up ${PASSENGER.name}`;
    if (rideState === 'ARRIVED') return `Waiting for ${PASSENGER.name}`;
    return `Dropping off ${PASSENGER.name}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Floating Header */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity style={styles.roundBtn} onPress={() => router.replace('/')}>
          <MaterialIcon name="close" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
        <TouchableOpacity style={styles.roundBtn}>
          <MaterialIcon name="format-list-bulleted" size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <RealMap interactive={true} style={styles.mapImage} />

        {/* Floating Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapBtn}>
            <MaterialIcon name="volume-up" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapBtn}>
            <MaterialIcon name="my-location" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Sheet Details */}
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />

        {/* ETA & Nav Info */}
        <View style={styles.etaRow}>
          <Text style={styles.etaText}>{PASSENGER.eta}</Text>
          <View style={styles.etaDivider} />
          <Text style={styles.distText}>{PASSENGER.distance}</Text>
          <View style={styles.etaDivider} />
          <Text style={styles.distText}>via Inner Ring Rd</Text>
        </View>

        {/* Location Info */}
        <View style={styles.locationRow}>
          <View style={styles.locIconWrap}>
            <MaterialIcon
              name={rideState === 'EN_ROUTE_DROPOFF' ? 'place' : 'person-pin-circle'}
              size={24}
              color={rideState === 'EN_ROUTE_DROPOFF' ? colors.accentRed : colors.primary}
            />
          </View>
          <View style={styles.locTextWrap}>
            <Text style={styles.locLabel}>
              {rideState === 'EN_ROUTE_DROPOFF' ? 'Dropoff' : 'Pickup'}
            </Text>
            <Text style={styles.locValue} numberOfLines={1}>
              {rideState === 'EN_ROUTE_DROPOFF' ? PASSENGER.dropoff : PASSENGER.pickup}
            </Text>
          </View>
          <TouchableOpacity style={styles.navBtn}>
            <MaterialIcon name="navigation" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>

        {/* Passenger Info (Hide during dropoff for space if needed, but keeping it is fine) */}
        <View style={styles.passengerRow}>
          <View style={styles.avatarWrap}>
            <MaterialIcon name="person" size={24} color={colors.onSurfaceVariant} />
          </View>
          <View style={styles.passengerTextWrap}>
            <Text style={styles.passengerName}>{PASSENGER.name}</Text>
            <View style={styles.ratingWrap}>
              <MaterialIcon name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>{PASSENGER.rating}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.circleBtn}>
              <MaterialIcon name="call" size={20} color={colors.onSurface} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.circleBtn}>
              <MaterialIcon name="chat" size={20} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Interactive Swipe Button */}
        <SwipeButton 
          key={rideState}
          title={getButtonText()} 
          onComplete={handleSlideAction} 
          color={getButtonColor()}
          targetColor={getTargetColor()}
        />
      </View>

    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surfaceContainerLowest },
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.surfaceContainer,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  floatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 40 : 50,
    left: spacing.marginMobile,
    right: spacing.marginMobile,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  statusPill: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  statusText: {
    ...type.labelMd,
    color: colors.onSurface,
    fontFamily: fonts.bold,
  },
  mapControls: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    gap: 12,
  },
  mapBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomSheet: {
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
    marginTop: -20, // Overlap the map slightly
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  etaText: {
    ...type.headlineXl,
    fontSize: 28,
    color: colors.primary,
    fontFamily: fonts.extrabold,
  },
  distText: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
  },
  etaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceContainerHigh,
    marginHorizontal: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    padding: 16,
    borderRadius: radius.lg,
    marginBottom: 16,
  },
  locIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locTextWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  locLabel: {
    ...type.labelSm,
    color: colors.textMuted,
  },
  locValue: {
    ...type.labelMd,
    color: colors.onSurface,
    marginTop: 2,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 24,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerTextWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  passengerName: {
    ...type.labelLg,
    color: colors.onSurface,
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    ...type.labelSm,
    color: colors.onSurfaceVariant,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
