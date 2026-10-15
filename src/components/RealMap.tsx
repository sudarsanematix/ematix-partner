import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Mapbox, {
  Camera,
  LineLayer,
  MapView,
  MarkerView,
  PointAnnotation,
  ShapeSource,
  UserLocation,
} from '@rnmapbox/maps';
import { useTheme } from '../theme/ThemeProvider';
import { buildMapTheme } from '../theme/mapTheme';

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  color?: string; // Hex color or basic string like 'red', 'green'
};

export const CHENNAI_REGION: MapRegion = {
  latitude: 13.0316,
  longitude: 80.2341,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

if (MAPBOX_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
} else if (__DEV__) {
  console.warn('[RealMap] EXPO_PUBLIC_MAPBOX_TOKEN is not set; the native map will render blank.');
}

export type MapPadding = { top?: number; bottom?: number; left?: number; right?: number } | number;

interface RealMapProps {
  style?: StyleProp<ViewStyle>;
  region?: MapRegion;
  interactive?: boolean;
  markers?: MapMarker[];
  routeCoordinates?: [number, number][]; // [longitude, latitude][]
  showUserLocation?: boolean;
  mapPadding?: MapPadding;
  children?: React.ReactNode;
}

function zoomFromDelta(longitudeDelta: number): number {
  const zoom = Math.round(Math.log(360 / longitudeDelta) / Math.LN2);
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 12;
}

function paddingValue(mapPadding?: MapPadding): number {
  if (typeof mapPadding === 'number') return mapPadding;
  if (mapPadding) {
    const values = [mapPadding.top, mapPadding.bottom, mapPadding.left, mapPadding.right].filter(
      (n): n is number => typeof n === 'number'
    );
    if (values.length > 0) return Math.max(...values);
  }
  return 50;
}

/** Blue location dot with an upward pointer and a pulsing ring, matching the web map. */
function PulseMarker() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, [progress]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.6 + progress.value }],
    opacity: 0.8 * (1 - progress.value),
  }));

  return (
    <View style={pulseStyles.container}>
      <View style={pulseStyles.pointer} />
      <Animated.View style={[pulseStyles.ring, ringStyle]} />
      <View style={pulseStyles.dot} />
    </View>
  );
}

/** Translucent yellow hotspot halo that pulses, matching the web map. */
function HotspotMarker() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.8 + 0.5 * progress.value }],
    opacity: 0.8 - 0.5 * progress.value,
  }));

  return (
    <Animated.View style={[hotspotStyles.pulse, style]}>
      <View style={hotspotStyles.dot} />
    </Animated.View>
  );
}

export default function RealMap({
  style,
  region = CHENNAI_REGION,
  interactive = false,
  markers = [],
  routeCoordinates = [],
  showUserLocation = false,
  mapPadding,
  children,
}: RealMapProps) {
  const { isDark } = useTheme();
  const theme = useMemo(() => buildMapTheme(isDark), [isDark]);
  const cameraRef = useRef<React.ComponentRef<typeof Camera>>(null);
  const [bootRegion] = useState(region);

  const regionKey = JSON.stringify(region);
  const routeKey = JSON.stringify(routeCoordinates);

  const initialZoom = zoomFromDelta(bootRegion.longitudeDelta);
  const hasRoute = routeCoordinates.length > 1;

  useEffect(() => {
    cameraRef.current?.setCamera({
      centerCoordinate: [region.longitude, region.latitude],
      zoomLevel: zoomFromDelta(region.longitudeDelta),
      animationDuration: 800,
      animationMode: 'easeTo',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionKey]);

  useEffect(() => {
    if (routeCoordinates.length < 2) return;
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const [lng, lat] of routeCoordinates) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    cameraRef.current?.fitBounds([maxLng, maxLat], [minLng, minLat], paddingValue(mapPadding), 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  return (
    <View style={[styles.container, { backgroundColor: theme.base }, style]}>
      <MapView
        style={StyleSheet.absoluteFill}
        styleURL={theme.styleUrl}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        requestDisallowInterceptTouchEvent={interactive}
        pointerEvents={interactive ? 'auto' : 'none'}
        onMapLoadingError={(error) => console.warn('[RealMap] map loading error', error)}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [bootRegion.longitude, bootRegion.latitude],
            zoomLevel: initialZoom,
          }}
        />

        {showUserLocation ? <UserLocation visible /> : null}

        {hasRoute ? (
          <ShapeSource
            id="route"
            shape={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: routeCoordinates },
            }}
          >
            <LineLayer
              id="route-line"
              style={{
                lineColor: theme.routeDone,
                lineWidth: 4,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </ShapeSource>
        ) : null}

        {markers.map((marker) => {
          const coordinate: [number, number] = [marker.longitude, marker.latitude];

          if (marker.id === 'me' || marker.id === 'partner') {
            return (
              <MarkerView
                key={marker.id}
                coordinate={coordinate}
                anchor={{ x: 0.5, y: 0.706 }}
                allowOverlap
              >
                <PulseMarker />
              </MarkerView>
            );
          }

          if (marker.id.startsWith('hotspot')) {
            return (
              <MarkerView key={marker.id} coordinate={coordinate} allowOverlap>
                <HotspotMarker />
              </MarkerView>
            );
          }

          return (
            <PointAnnotation
              key={marker.id}
              id={marker.id}
              coordinate={coordinate}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.dot, { backgroundColor: marker.color || '#000000' }]} />
            </PointAnnotation>
          );
        })}
      </MapView>

      {children ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});

const pulseStyles = StyleSheet.create({
  container: {
    width: 20,
    height: 34,
    alignItems: 'center',
  },
  pointer: {
    position: 'absolute',
    top: 0,
    left: 3,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#4285F4',
  },
  ring: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4285F4',
  },
  dot: {
    position: 'absolute',
    bottom: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
});

const hotspotStyles = StyleSheet.create({
  pulse: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(250, 204, 21, 0.4)',
    borderWidth: 2,
    borderColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FACC15',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FACC15',
  },
});
