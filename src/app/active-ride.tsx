import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Animated,
  BackHandler,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeProvider';
import { buildMapTheme, type MapThemeTokens } from '../theme/mapTheme';
import { fonts, type, spacing, radius } from '../theme/typography';
import RealMap from '../components/RealMap';
import MaterialIcon from '../components/MaterialIcon';
import SwipeButton from '../components/SwipeButton';
import { socketService } from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import { telLink, formatFare } from '../utils/phone';
import { setUnread, getUnread, clearUnread } from '../utils/unread';

type RideState = 'EN_ROUTE_PICKUP' | 'ARRIVED' | 'EN_ROUTE_DROPOFF';

type RideData = {
  id: string;
  status: string;
  // Both fields arrive on `ride_details` for the partner: `serializeRide`
  // includes them (server.js:122, :128) and `join_ride` strips only `otp`
  // before sending (server.js:612-615). Shape mirrors the customer app's
  // package-transit.tsx:18,23-30.
  type?: string;
  vehicleType?: string;
  pickup: { address: string; latitude?: number; longitude?: number };
  dropoff: { address: string; latitude?: number; longitude?: number };
  packageDetails?: {
    category?: string;
    weightTier?: string;
    fragile?: boolean;
    receiverName?: string;
    receiverPhone?: string;
    notes?: string;
  } | null;
  price?: number | string | null;
  customer?: {
    id: string;
    name?: string;
    phone?: string;
    rating?: number | null;
  };
  messages?: any[];
};


export default function ActiveRideScreen() {
  const { colors, isDark } = useTheme();
  const mapTheme = buildMapTheme(isDark);
  const styles = createStyles(colors, mapTheme);
  const router = useRouter();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const { user } = useAuth();
  const [ride, setRide] = useState<RideData | null>(null);
  const [rideState, setRideState] = useState<RideState>('EN_ROUTE_PICKUP');
  const [unread, setUnreadState] = useState(() => getUnread(rideId));
  const [initialized, setInitialized] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showDropoffModal, setShowDropoffModal] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [partnerLocation, setPartnerLocation] = useState<{ latitude: number, longitude: number } | null>(null);

  const pulse = useRef(new Animated.Value(1)).current;
  const focusedRef = useRef(true);
  const verifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getLocCoords = (loc: any) => {
    if (!loc) return null;
    const lat = loc.latitude ?? loc.lat;
    const lng = loc.longitude ?? loc.lng;
    const parsedLat = typeof lat === 'number' ? lat : parseFloat(lat);
    const parsedLng = typeof lng === 'number' ? lng : parseFloat(lng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      return { latitude: parsedLat, longitude: parsedLng };
    }
    return null;
  };

  const pickupCoords = getLocCoords(ride?.pickup);
  const dropoffCoords = getLocCoords(ride?.dropoff);

  const fetchedRoutePhase = useRef<string | null>(null);

  // Dynamic route fetching based on ride phase
  useEffect(() => {
    if (!ride || !partnerLocation || !rideState) return;

    // We only want to fetch the route once per phase (to avoid mapbox API spam as location updates).
    if (fetchedRoutePhase.current === rideState) return;

    const fetchRoute = async () => {
      try {
        const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
        let startLng, startLat, endLng, endLat;

        if (rideState === 'EN_ROUTE_PICKUP' || rideState === 'ARRIVED') {
          // Phase 1: Route from Driver to Pickup
          if (pickupCoords) {
            startLng = partnerLocation.longitude;
            startLat = partnerLocation.latitude;
            endLng = pickupCoords.longitude;
            endLat = pickupCoords.latitude;
          }
        } else if (rideState === 'EN_ROUTE_DROPOFF') {
          // Phase 2: Route from Driver to Dropoff
          if (dropoffCoords) {
            startLng = partnerLocation.longitude;
            startLat = partnerLocation.latitude;
            endLng = dropoffCoords.longitude;
            endLat = dropoffCoords.latitude;
          }
        } else {
          return;
        }

        if (!startLng || !startLat || !endLng || !endLat) return;

        // Immediately set a fallback 2-point line so map frames and draws route instantly
        setRouteCoords([[startLng, startLat], [endLng, endLat]]);

        const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
          setRouteCoords(data.routes[0].geometry.coordinates);
          fetchedRoutePhase.current = rideState; // Mark this phase as fetched
        }
      } catch (err) {
        console.warn('Error fetching dynamic route:', err);
      }
    };
    fetchRoute();
  }, [rideState, partnerLocation, ride, pickupCoords, dropoffCoords]);

  useEffect(() => {
    const onBackPress = () => {
      setShowCancelModal(true);
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const clearVerifyTimer = () => {
    if (verifyTimer.current) {
      clearTimeout(verifyTimer.current);
      verifyTimer.current = null;
    }
  };

  useEffect(() => {
    if (!rideId) return;

    socketService.connect();
    socketService.emit('join_ride', { rideId, role: 'partner', userId: user?.id });

    const getTargetRideId = (data: any) => data?.rideId || data?.id;

    const handleRideDetails = (data: any) => {
      const targetId = getTargetRideId(data);
      if (!data || (targetId && String(targetId) !== String(rideId))) return;
      setRide(data);
      const s = String(data.status || '');
      if (s === 'arrived') setRideState('ARRIVED');
      else if (s === 'en_route_dropoff' || s === 'completed') setRideState('EN_ROUTE_DROPOFF');
      else setRideState('EN_ROUTE_PICKUP');
      setInitialized(true);
    };

    const handleReceiveMessage = (data: any) => {
      const targetId = getTargetRideId(data);
      if (data && String(targetId) === String(rideId) && data.sender === 'customer') {
        if (focusedRef.current) {
          pulse.stopAnimation();
          pulse.setValue(1);
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulse, { toValue: 0.55, duration: 350, useNativeDriver: true }),
              Animated.timing(pulse, { toValue: 1, duration: 350, useNativeDriver: true }),
            ])
          ).start();
        }
        setUnread(rideId, true);
        setUnreadState(true);
      }
    };

    const handleRideError = (data: any) => {
      console.log('[PartnerActiveRide] ride_error:', data);
      if (!data) return;
      clearVerifyTimer();
      setIsVerifying(false);
      if (data.code === 'ride_not_found' || data.code === 'unauthorized') {
        setShowOtpModal(false);
        setOtpError('');
        router.replace('/(tabs)/home');
      } else if (data.code === 'invalid_ride_status') {
        // The server hasn't registered our arrival yet — re-assert + resync
        // instead of hanging the modal in the "Verifying..." state.
        setOtpError('Arrival not confirmed yet. Retrying...');
        socketService.emit('join_ride', { rideId, role: 'partner', userId: user?.id });
        socketService.emit('partner_arrived', { rideId, partnerId: user?.id });
      } else {
        setShowOtpModal(true);
        setOtpError(data?.message || 'Verification failed. Please try again.');
      }
    };

    const handleRideStatus = (data: any) => {
      const targetId = getTargetRideId(data);
      if (!data || (targetId && String(targetId) !== String(rideId))) return;
      if (data.status === 'arrived') setRideState('ARRIVED');
      else if (data.status === 'en_route_dropoff') setRideState('EN_ROUTE_DROPOFF');
    };

    const handleRideStarted = (data: any) => {
      const targetId = getTargetRideId(data);
      if (!data || (targetId && String(targetId) !== String(rideId))) return;
      clearVerifyTimer();
      setShowOtpModal(false);
      setOtpInput('');
      setOtpError('');
      setIsVerifying(false);
      setRideState('EN_ROUTE_DROPOFF');
    };

    const handleRideCompleted = (data: any) => {
      const targetId = getTargetRideId(data);
      if (!data || (targetId && String(targetId) !== String(rideId))) return;
      router.replace('/(tabs)/home');
    };

    const handleRideCancelled = (data: any) => {
      const targetId = getTargetRideId(data);
      if (!data || (targetId && String(targetId) !== String(rideId))) return;
      router.replace('/(tabs)/home');
    };

    const handleOtpError = (data: any) => {
      clearVerifyTimer();
      setOtpError(data?.message || 'Invalid PIN. Please try again.');
      setIsVerifying(false);
      setIsUploading(false);
    };

    socketService.on('ride_details', handleRideDetails);
    socketService.on('receive_message', handleReceiveMessage);
    socketService.on('ride_error', handleRideError);
    socketService.on('ride_status_updated', handleRideStatus);
    socketService.on('ride_started', handleRideStarted);
    socketService.on('ride_completed', handleRideCompleted);
    socketService.on('ride_cancelled', handleRideCancelled);
    socketService.on('otp_error', handleOtpError);

    return () => {
      clearVerifyTimer();
      socketService.off('ride_details', handleRideDetails);
      socketService.off('receive_message', handleReceiveMessage);
      socketService.off('ride_error', handleRideError);
      socketService.off('ride_status_updated', handleRideStatus);
      socketService.off('ride_started', handleRideStarted);
      socketService.off('ride_completed', handleRideCompleted);
      socketService.off('ride_cancelled', handleRideCancelled);
      socketService.off('otp_error', handleOtpError);
    };
  }, [rideId, user?.id]);

  /**
   * Streams this driver's real position for the duration of the trip.
   *
   * This is `ride_location` (trip tracking), not `update_location` (online
   * availability, emitted from the home screen). The server only accepts it
   * from the partner assigned to this ride, only while the ride status is live,
   * and only relays it to sockets in this ride's room — so a customer cannot
   * spoof it and no other customer can observe it.
   */
  useEffect(() => {
    if (!rideId) return;

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (status !== 'granted') {
          console.warn('[Partner App] Location denied: trip position will not be shared.');
          return;
        }

        // Fetch location immediately to unblock routing
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          if (!cancelled) {
            setPartnerLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          }
        } catch (e) {
          console.warn('Initial location fetch failed', e);
        }

        const active = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Highest, timeInterval: 5000, distanceInterval: 5 },
          (loc) => {
            const { latitude, longitude, heading } = loc.coords;
            setPartnerLocation({ latitude, longitude });
            socketService.emit('ride_location', {
              rideId,
              lat: latitude,
              lng: longitude,
              // `heading` is null with no compass fix (indoors, simulators).
              // The server treats null as "unknown" and keeps the last bearing.
              bearing: typeof heading === 'number' && heading >= 0 && heading < 360 ? heading : null,
            });
          }
        );

        // Permission may resolve after the screen was already left.
        if (cancelled) {
          active.remove();
          return;
        }
        subscription = active;
      } catch (error) {
        console.warn('[Partner App] Could not start trip tracking:', error);
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [rideId]);

  const callPassenger = () => {
    const href = telLink(ride?.customer?.phone);
    if (href) {
      Linking.openURL(href).catch(() => { });
    }
  };

  const openChat = () => {
    clearUnread(rideId);
    setUnreadState(false);
    router.push({ pathname: '/chat', params: { rideId: rideId || 'test_ride' } });
  };

  const handleSlideAction = () => {
    if (rideState === 'EN_ROUTE_PICKUP') {
      socketService.emit('partner_arrived', { rideId, partnerId: user?.id });
      setRideState('ARRIVED');
    } else if (rideState === 'ARRIVED') {
      setShowOtpModal(true);
    } else {
      if (ride?.type === 'parcel') {
        setShowDropoffModal(true);
      } else {
        socketService.emit('complete_ride', { rideId, partnerId: user?.id });
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
      setOtpError('');
    }
  };

  const submitDropoff = async () => {
    const otp = otpInput.trim();
    if (otp.length !== 4 || !photoUri || isVerifying || isUploading) {
      setOtpError('Please provide both photo and 4-digit PIN');
      return;
    }
    setOtpError('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      const filename = photoUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('document', { uri: photoUri, name: filename, type } as any);

      const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.34:4000';
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.fileUrl) {
        socketService.emit('verify_dropoff', { rideId, partnerId: user?.id, otp, photoUrl: data.fileUrl });
        setIsVerifying(true);
        clearVerifyTimer();
        verifyTimer.current = setTimeout(() => {
          setIsVerifying(false);
          setIsUploading(false);
          setOtpError('Verification timed out. Please try again.');
        }, 10000);
      } else {
        setOtpError('Failed to upload photo');
        setIsUploading(false);
      }
    } catch (e) {
      console.warn('Upload error', e);
      setOtpError('Network error during upload');
      setIsUploading(false);
    }
  };

  const closeDropoffModal = () => {
    clearVerifyTimer();
    setShowDropoffModal(false);
    setOtpError('');
    setOtpInput('');
    setPhotoUri(null);
    setIsVerifying(false);
    setIsUploading(false);
  };

  const submitOtp = () => {
    const otp = otpInput.trim();
    if (otp.length !== 4 || isVerifying) return;
    setOtpError('');
    setIsVerifying(true);
    socketService.emit('verify_otp', { rideId, partnerId: user?.id, otp });
    clearVerifyTimer();
    verifyTimer.current = setTimeout(() => {
      setIsVerifying(false);
      setOtpError('Verification timed out. Please try again.');
    }, 10000);
  };

  const closeOtpModal = () => {
    clearVerifyTimer();
    setShowOtpModal(false);
    setOtpError('');
    setIsVerifying(false);
  };

  const getButtonText = () => {
    if (ride?.type === 'parcel') {
      if (rideState === 'EN_ROUTE_PICKUP') return 'Slide to Arrive at Pickup';
      if (rideState === 'ARRIVED') return 'Enter Sender OTP';
      return 'Slide to Dropoff Package';
    }
    if (rideState === 'EN_ROUTE_PICKUP') return 'Slide to Arrive';
    if (rideState === 'ARRIVED') return 'Enter OTP to Start Trip';
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
    return colors.surfaceGray;
  };

  const passengerName = ride?.type === 'parcel'
    ? (ride?.packageDetails?.receiverName || 'Receiver')
    : (ride?.customer?.name || 'Passenger');

  const getStatusText = () => {
    if (ride?.type === 'parcel') {
      if (rideState === 'EN_ROUTE_PICKUP') return `Picking up Package`;
      if (rideState === 'ARRIVED') return `Waiting for Sender OTP`;
      return `Delivering to Receiver`;
    }
    if (rideState === 'EN_ROUTE_PICKUP') return `Picking up ${passengerName}`;
    if (rideState === 'ARRIVED') return `Waiting for ${passengerName}`;
    return `Dropping off ${passengerName}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Floating Header */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity style={styles.roundBtn} onPress={() => setShowCancelModal(true)}>
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
        <RealMap
          interactive={true}
          style={styles.mapImage}
          region={
            pickupCoords
              ? { latitude: pickupCoords.latitude, longitude: pickupCoords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
              : partnerLocation
                ? { latitude: partnerLocation.latitude, longitude: partnerLocation.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
                : undefined
          }
          markers={[
            ...(pickupCoords && rideState !== 'EN_ROUTE_DROPOFF' ? [{ id: 'pickup', latitude: pickupCoords.latitude, longitude: pickupCoords.longitude, color: mapTheme.routeDone }] : []),
            ...(dropoffCoords ? [{ id: 'dropoff', latitude: dropoffCoords.latitude, longitude: dropoffCoords.longitude, color: mapTheme.success }] : []),
            ...(partnerLocation ? [{ id: 'partner', latitude: partnerLocation.latitude, longitude: partnerLocation.longitude, color: mapTheme.onBase }] : [])
          ]}
          routeCoordinates={routeCoords}
          mapPadding={{ top: 80, bottom: 420, left: 40, right: 40 }}
        />

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

        {/* Trip Status & Fare */}
        <View style={styles.etaRow}>
          <Text style={styles.etaText}>{rideState === 'EN_ROUTE_PICKUP' ? 'On the way' : rideState === 'ARRIVED' ? 'Arrived' : 'In Trip'}</Text>
          <View style={styles.etaDivider} />
          <Text style={styles.distText}>{formatFare(ride?.price)}</Text>
          <View style={styles.etaDivider} />
          <Text style={styles.distText}>{ride?.customer?.phone ? `+${ride.customer.phone.replace(/\D/g, '').slice(-10)}` : 'Fare'}</Text>
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
              {rideState === 'EN_ROUTE_DROPOFF'
                ? (ride?.dropoff?.address || 'Dropoff location')
                : (ride?.pickup?.address || 'Pickup location')}
            </Text>
          </View>
          <TouchableOpacity style={styles.navBtn}>
            <MaterialIcon name="navigation" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>

        {/* Passenger Info */}
        <View style={styles.passengerRow}>
          <View style={styles.avatarWrap}>
            <MaterialIcon name={ride?.type === 'parcel' ? "inventory-2" : "person"} size={24} color={colors.onSurfaceVariant} />
          </View>
          <View style={styles.passengerTextWrap}>
            <Text style={styles.passengerName}>{passengerName}</Text>
            {ride?.type === 'parcel' ? (
              <View style={styles.ratingWrap}>
                <Text style={styles.ratingText}>
                  {ride?.packageDetails?.weightTier?.toUpperCase() || 'SMALL'} • {ride?.packageDetails?.category || 'Parcel'}
                </Text>
              </View>
            ) : ride?.customer?.rating != null ? (
              <View style={styles.ratingWrap}>
                <MaterialIcon name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>{ride.customer.rating}</Text>
              </View>
            ) : (
              <View style={styles.ratingWrap}>
                <Text style={styles.ratingText}>
                  {ride?.customer?.phone ? `+${ride.customer.phone.replace(/\d(?=\d{4})/g, '*')}` : 'Verified passenger'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.circleBtn} onPress={callPassenger}>
              <MaterialIcon name="call" size={20} color={colors.onSurface} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.circleBtn} onPress={openChat}>
              {unread && <View style={styles.unreadDot} />}
              <MaterialIcon name="chat" size={20} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Interactive Swipe Button */}
        {rideState === 'ARRIVED' ? (
          <TouchableOpacity style={styles.otpStartBtn} onPress={() => setShowOtpModal(true)} activeOpacity={0.9}>
            <MaterialIcon name="pin" size={20} color={colors.onPrimary} />
            <Text style={styles.otpStartBtnText}>{getButtonText()}</Text>
          </TouchableOpacity>
        ) : (
          <SwipeButton
            key={rideState}
            title={getButtonText()}
            onComplete={handleSlideAction}
            color={getButtonColor()}
            targetColor={getTargetColor()}
          />
        )}
      </View>

      {/* OTP Verification Modal */}
      <Modal
        visible={showOtpModal}
        transparent
        animationType="slide"
        onRequestClose={closeOtpModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{ride?.type === 'parcel' ? 'Verify Sender' : 'Start Trip'}</Text>
            <Text style={styles.modalSubtitle}>
              {ride?.type === 'parcel'
                ? 'Ask the sender for their pickup PIN, then enter the 4-digit code to collect the package.'
                : 'Ask the customer for their ride-start PIN, then enter the 4-digit code to start the trip.'}
            </Text>
            <TextInput
              style={styles.otpInput}
              value={otpInput}
              onChangeText={(t) => setOtpInput(t.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder={'\u2022 \u2022 \u2022 \u2022'}
              placeholderTextColor={colors.outlineVariant}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />
            {otpError ? <Text style={styles.otpError}>{otpError}</Text> : null}
            <TouchableOpacity
              style={[styles.submitBtn, isVerifying || otpInput.length !== 4 ? styles.submitBtnDisabled : null]}
              onPress={submitOtp}
              disabled={isVerifying || otpInput.length !== 4}
            >
              <Text style={styles.submitBtnText}>{isVerifying ? 'Verifying...' : 'Start Trip'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={closeOtpModal} disabled={isVerifying}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Dropoff Verification Modal */}
      <Modal visible={showDropoffModal} transparent animationType="slide" onRequestClose={closeDropoffModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Proof of Delivery</Text>
              <Text style={styles.modalSubtitle}>
                Take a picture of the delivered package and enter the receiver's 4-digit PIN.
              </Text>
              <TouchableOpacity style={styles.photoBtn} onPress={pickImage} activeOpacity={0.8}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoBtnContent}>
                    <MaterialIcon name="camera-alt" size={24} color={colors.primary} />
                    <Text style={styles.photoBtnText}>Take Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TextInput
                style={styles.otpInput}
                value={otpInput}
                onChangeText={(t) => setOtpInput(t.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder={'\u2022 \u2022 \u2022 \u2022'}
                placeholderTextColor={colors.outlineVariant}
                keyboardType="number-pad"
                maxLength={4}
              />
              {otpError ? <Text style={styles.otpError}>{otpError}</Text> : null}
              <TouchableOpacity
                style={[styles.submitBtn, isVerifying || isUploading || otpInput.length !== 4 || !photoUri ? styles.submitBtnDisabled : null]}
                onPress={submitDropoff}
                disabled={isVerifying || isUploading || otpInput.length !== 4 || !photoUri}
              >
                <Text style={styles.submitBtnText}>{isVerifying || isUploading ? 'Uploading & Verifying...' : 'Complete Delivery'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeDropoffModal} disabled={isVerifying || isUploading}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Cancel Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.alertIconWrapper}>
                <MaterialIcon name="warning" size={26} color={colors.accentRed} />
              </View>
              <Text style={styles.modalTitle}>Cancel Trip?</Text>
              <Text style={styles.modalSubtitle}>
                Are you sure you want to cancel this trip? Frequent cancellations may affect your rating.
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.keepSearchBtn}
                activeOpacity={0.9}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.keepSearchBtnText}>No, Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                activeOpacity={0.9}
                onPress={() => {
                  setShowCancelModal(false);
                  if (rideId) {
                    socketService.emit('partner_cancel_ride', { rideId });
                  }
                  router.replace('/(tabs)/home');
                }}
              >
                <Text style={styles.confirmCancelBtnText}>Yes, Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: any, mapTheme: MapThemeTokens) => StyleSheet.create({
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
    backgroundColor: mapTheme.glassStrong,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  statusPill: {
    backgroundColor: mapTheme.glassStrong,
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
    backgroundColor: mapTheme.glassStrong,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomSheet: {
    backgroundColor: colors.surface,
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
  unreadDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentRed,
  },
  otpStartBtn: {
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  otpStartBtnText: {
    ...type.labelLg,
    color: colors.onPrimary,
    fontFamily: fonts.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  alertIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: 2,
    marginBottom: 16,
  },
  modalTitle: {
    ...type.headlineMd,
    color: colors.onSurface,
    fontFamily: fonts.bold,
    marginBottom: 8,
  },
  modalSubtitle: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 20,
  },
  otpInput: {
    width: '100%',
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 10,
    fontFamily: fonts.bold,
    color: colors.onSurface,
  },
  otpError: {
    ...type.labelSm,
    color: colors.accentRed,
    marginTop: 10,
  },
  submitBtn: {
    width: '100%',
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    ...type.labelLg,
    color: colors.onPrimary,
    fontFamily: fonts.bold,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  cancelBtnText: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  keepSearchBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepSearchBtnText: {
    ...type.labelLg,
    fontFamily: fonts.semibold,
    color: colors.onSurface,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accentRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtnText: {
    ...type.labelLg,
    fontFamily: fonts.semibold,
    color: colors.onPrimary,
  },
  photoBtn: {
    height: 120,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderGray,
    overflow: 'hidden',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBtnContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoBtnText: {
    ...type.labelMd,
    color: colors.primary,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
