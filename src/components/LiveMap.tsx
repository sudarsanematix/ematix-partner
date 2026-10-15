import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import Mapbox, {
  Camera,
  LineLayer,
  MapView,
  MarkerView,
  ShapeSource,
} from '@rnmapbox/maps';
import { useTheme } from '../theme/ThemeProvider';
import { buildMapTheme } from '../theme/mapTheme';

import {
  CHENNAI_REGION,
  vehicleColor,
  zoomFromRegion,
  type LiveMapCamera,
  type LiveMapFitOptions,
  type LivePin,
  type LiveRoute,
  type LiveVehicle,
  type LiveVehicleKind,
  type LngLat,
  type MapRegion,
} from './liveMapTypes';

export type {
  LivePin,
  LiveRoute,
  LiveVehicle,
  LiveVehicleKind,
  LngLat,
  MapRegion,
} from './liveMapTypes';
export { CHENNAI_REGION, LIVE_MAP_STYLE, VEHICLE_COLORS } from './liveMapTypes';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

if (MAPBOX_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
} else if (__DEV__) {
  console.warn('[LiveMap] EXPO_PUBLIC_MAPBOX_TOKEN is not set; the native map will render blank.');
}

export type LiveMapHandle = {
  flyTo: (target?: LiveMapCamera | null) => void;
  fitAll: (options?: LiveMapFitOptions | null) => void;
  focusVehicle: () => void;
  setFollow: (value: boolean) => void;
};

export type LiveMapProps = {
  style?: StyleProp<ViewStyle>;
  region?: MapRegion;
  interactive?: boolean;
  /** Initial camera. Later changes animate instead of remounting the map. */
  center?: LngLat;
  zoom?: number;
  mapStyle?: string;
  route?: LiveRoute | null;
  pins?: LivePin[];
  vehicle?: LiveVehicle | null;
  follow?: boolean;
  edgePadding?: number;
  /** Fit the camera when a new route endpoint pair arrives. Defaults to true. */
  fitOnRouteChange?: boolean;
  onPress?: (lngLat: LngLat) => void;
  onUserMove?: () => void;
  onReady?: () => void;
  onError?: (message: string) => void;
  children?: React.ReactNode;
};

type MapPressLike = { geometry?: { coordinates?: number[] } };
type RegionWillChangeLike = { properties?: { isUserInteraction?: boolean } };
type MapErrorLike = { error?: string } | undefined;

function isValidPair(value: unknown): value is LngLat {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    isFinite(value[0]) &&
    isFinite(value[1])
  );
}

function lineFeature(coordinates: LngLat[]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates },
  };
}

function boundsOf(points: LngLat[]): { ne: LngLat; sw: LngLat } {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of points) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { ne: [maxLng, maxLat], sw: [minLng, minLat] };
}

/** Circular pin with a pulsing halo, matching the web `.ematix-pin--dot`. */
function DotPin({ color, ringColor, shadow }: { color: string; ringColor: string; shadow: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1900, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, [progress]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.7 + 1.2 * progress.value }],
    opacity: 0.32 * (1 - progress.value),
  }));

  return (
    <View style={pinStyles.dotWrap}>
      <Animated.View style={[pinStyles.dotHalo, { backgroundColor: color }, haloStyle]} />
      <View style={[pinStyles.dotRing, { backgroundColor: ringColor, shadowColor: shadow }]} />
      <View style={[pinStyles.dotCore, { backgroundColor: color }]} />
    </View>
  );
}

/** Teardrop pin anchored at its tip, matching the web `.ematix-pin--end`. */
function EndPin({ color, coreColor, shadow }: { color: string; coreColor: string; shadow: string }) {
  return (
    <View style={pinStyles.endWrap}>
      <View style={[pinStyles.endBody, { backgroundColor: color, shadowColor: shadow }]}>
        <View style={[pinStyles.endCore, { backgroundColor: coreColor }]} />
      </View>
    </View>
  );
}

function VehicleIcon({ kind, color }: { kind?: LiveVehicleKind; color: string }) {
  if (kind === 'car') {
    return (
      <Svg width={17} height={17} viewBox="0 0 24 24">
        <Rect x={6} y={2} width={12} height={20} rx={4} fill={color} />
        <Rect x={7} y={6} width={10} height={5} rx={1} fill="#000" opacity={0.4} />
        <Rect x={7} y={15} width={10} height={4} rx={1} fill="#000" opacity={0.4} />
      </Svg>
    );
  }
  if (kind === 'auto') {
    return (
      <Svg width={17} height={17} viewBox="0 0 24 24">
        <Rect x={6} y={2} width={12} height={20} rx={3} fill={color} />
        <Rect x={7} y={4} width={10} height={4} rx={1} fill="#000" opacity={0.4} />
        <Rect x={6} y={11} width={12} height={11} rx={1} fill={color} />
        <Path d="M5 14L5 18L19 18L19 14Z" fill="#000" opacity={0.2} />
      </Svg>
    );
  }
  // bike / default
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24">
      <Rect x={10} y={2} width={4} height={20} rx={2} fill={color} />
      <Circle cx={12} cy={14} r={4} fill={color} />
      <Rect x={7} y={7} width={10} height={2} rx={1} fill={color} />
    </Svg>
  );
}

function VehicleMarker({
  vehicle,
  isDark,
  onBase,
  shadow,
}: {
  vehicle: LiveVehicle;
  isDark: boolean;
  onBase: string;
  shadow: string;
}) {
  const rotation = useSharedValue(0);
  const lastBearing = useRef<number | null>(null);
  const bearing = vehicle.bearing;

  useEffect(() => {
    if (typeof bearing !== 'number' || !isFinite(bearing)) return;
    const previous = lastBearing.current;
    let target = bearing;
    if (previous != null) {
      const delta = ((bearing - previous + 540) % 360) - 180;
      target = previous + delta;
    }
    lastBearing.current = target;
    rotation.value = withTiming(target, { duration: 1100, easing: Easing.linear });
  }, [bearing, rotation]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={vehicleStyles.wrap}>
      <Animated.View
        style={[
          vehicleStyles.body,
          {
            backgroundColor: vehicleColor(vehicle.kind, isDark),
            borderColor: onBase,
            shadowColor: shadow,
          },
          bodyStyle,
        ]}
      >
        <VehicleIcon kind={vehicle.kind} color={onBase} />
      </Animated.View>
    </View>
  );
}

const LiveMap = forwardRef<LiveMapHandle, LiveMapProps>(function LiveMap(props, ref) {
  const { isDark } = useTheme();
  const theme = useMemo(() => buildMapTheme(isDark), [isDark]);

  const {
    style,
    region = CHENNAI_REGION,
    interactive = false,
    center,
    zoom,
    mapStyle,
    route = null,
    pins = [],
    vehicle = null,
    follow = false,
    edgePadding = 72,
    fitOnRouteChange = true,
    onPress,
    onUserMove,
    onReady,
    onError,
    children,
  } = props;

  const cameraRef = useRef<React.ComponentRef<typeof Camera>>(null);
  const followRef = useRef(follow);
  const readyRef = useRef(false);
  const cameraStateRef = useRef<{ center: LngLat; zoom: number } | null>(null);
  const fittedRouteRef = useRef('');
  const vehicleRef = useRef(vehicle);

  // Boot camera is frozen on first render so later prop changes animate instead
  // of resetting the native camera.
  const [boot] = useState<{ center: LngLat; zoom: number }>(() => ({
    center: (center ?? [region.longitude, region.latitude]) as LngLat,
    zoom: zoom ?? zoomFromRegion(region),
  }));

  const initialCenter = useMemo<LngLat>(
    () => center ?? [region.longitude, region.latitude],
    [center, region.longitude, region.latitude]
  );
  const initialZoom = useMemo(() => zoom ?? zoomFromRegion(region), [zoom, region]);

  const styleURL = mapStyle ?? theme.styleUrl;

  const routeCoords = useMemo(
    () => (route?.coordinates ?? []).filter(isValidPair),
    [route]
  );
  const hasRoute = routeCoords.length >= 2;
  const traveledCount = typeof route?.traveledCount === 'number' ? route.traveledCount : 0;
  const split = traveledCount > 0 && traveledCount < routeCoords.length;

  useEffect(() => {
    vehicleRef.current = vehicle;
  }, [vehicle]);

  useEffect(() => {
    followRef.current = follow;
  }, [follow]);

  const fitAll = useCallback(
    (options?: LiveMapFitOptions | null) => {
      const points: LngLat[] = [...routeCoords];
      pins.forEach((pin) => {
        if (isValidPair(pin.lngLat)) points.push(pin.lngLat);
      });
      if (vehicle && isValidPair(vehicle.lngLat)) points.push(vehicle.lngLat);
      if (points.length === 0) return;

      const padding = typeof options?.padding === 'number' ? options.padding : edgePadding;
      const duration = typeof options?.duration === 'number' ? options.duration : 700;

      if (points.length === 1) {
        cameraRef.current?.setCamera({
          centerCoordinate: points[0],
          zoomLevel: 15,
          animationDuration: duration,
          animationMode: 'easeTo',
        });
        return;
      }
      const { ne, sw } = boundsOf(points);
      cameraRef.current?.fitBounds(ne, sw, padding, duration);
    },
    [routeCoords, pins, vehicle, edgePadding]
  );

  const flyTo = useCallback((target?: LiveMapCamera | null) => {
    if (!target) return;
    const centerCoordinate = isValidPair(target.lngLat) ? target.lngLat : undefined;
    if (!centerCoordinate && typeof target.zoom !== 'number') return;
    cameraRef.current?.setCamera({
      centerCoordinate,
      zoomLevel: target.zoom,
      heading: target.bearing,
      pitch: target.pitch,
      animationDuration: typeof target.duration === 'number' ? target.duration : 800,
      animationMode: 'easeTo',
    });
  }, []);

  const focusVehicle = useCallback(() => {
    followRef.current = true;
    const lngLat = vehicleRef.current?.lngLat;
    if (!isValidPair(lngLat)) return;
    cameraRef.current?.setCamera({
      centerCoordinate: lngLat,
      zoomLevel: 15,
      animationDuration: 700,
      animationMode: 'easeTo',
    });
  }, []);

  const setFollow = useCallback((value: boolean) => {
    followRef.current = value;
    if (!value) return;
    const lngLat = vehicleRef.current?.lngLat;
    if (!isValidPair(lngLat)) return;
    cameraRef.current?.setCamera({
      centerCoordinate: lngLat,
      animationDuration: 700,
      animationMode: 'easeTo',
    });
  }, []);

  useImperativeHandle(ref, () => ({ flyTo, fitAll, focusVehicle, setFollow }), [
    flyTo,
    fitAll,
    focusVehicle,
    setFollow,
  ]);

  // Recenter when the requested camera changes; the first run only seeds state.
  useEffect(() => {
    const previous = cameraStateRef.current;
    cameraStateRef.current = { center: initialCenter, zoom: initialZoom };
    if (!previous) return;
    if (
      previous.center[0] === initialCenter[0] &&
      previous.center[1] === initialCenter[1] &&
      previous.zoom === initialZoom
    ) {
      return;
    }
    cameraRef.current?.setCamera({
      centerCoordinate: initialCenter,
      zoomLevel: initialZoom,
      animationDuration: 800,
      animationMode: 'easeTo',
    });
  }, [initialCenter, initialZoom]);

  // Follow the vehicle only while follow mode is on.
  useEffect(() => {
    if (!follow) return;
    const lngLat = vehicle?.lngLat;
    if (!isValidPair(lngLat)) return;
    cameraRef.current?.setCamera({
      centerCoordinate: lngLat,
      animationDuration: 900,
      animationMode: 'easeTo',
    });
  }, [vehicle, follow]);

  useEffect(() => {
    if (!fitOnRouteChange || routeCoords.length < 2) return;
    const first = routeCoords[0];
    const last = routeCoords[routeCoords.length - 1];
    const key = `${first[0]},${first[1]}|${last[0]},${last[1]}`;
    if (fittedRouteRef.current === key) return;
    fittedRouteRef.current = key;
    fitAll({ padding: edgePadding, duration: 700 });
  }, [routeCoords, fitOnRouteChange, edgePadding, fitAll]);

  const handleMapPress = useCallback(
    (feature: MapPressLike) => {
      if (!onPress) return;
      const coordinates = feature?.geometry?.coordinates;
      if (!isValidPair(coordinates)) return;
      onPress(coordinates);
    },
    [onPress]
  );

  const handleRegionWillChange = useCallback(
    (feature: RegionWillChangeLike) => {
      if (!feature?.properties?.isUserInteraction) return;
      if (!followRef.current) return;
      followRef.current = false;
      onUserMove?.();
    },
    [onUserMove]
  );

  const handleMapLoaded = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReady?.();
  }, [onReady]);

  const handleMapError = useCallback(
    (payload: MapErrorLike) => {
      onError?.(payload?.error ?? 'map error');
    },
    [onError]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.base }, style]}>
      <MapView
        style={StyleSheet.absoluteFill}
        styleURL={styleURL}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        pointerEvents={interactive ? 'auto' : 'none'}
        onPress={onPress ? handleMapPress : undefined}
        onRegionWillChange={onUserMove ? handleRegionWillChange : undefined}
        onDidFinishLoadingMap={onReady ? handleMapLoaded : undefined}
        onMapLoadingError={onError ? handleMapError : undefined}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: boot.center, zoomLevel: boot.zoom }}
        />

        {hasRoute ? (
          <ShapeSource id="live-route-casing" shape={lineFeature(routeCoords)}>
            <LineLayer
              id="live-route-casing-line"
              style={{
                lineColor: theme.routeCasing,
                lineWidth: 9,
                lineOpacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </ShapeSource>
        ) : null}

        {hasRoute ? (
          <ShapeSource id="live-route-base" shape={lineFeature(routeCoords)}>
            <LineLayer
              id="live-route-base-line"
              style={{
                lineColor: theme.routeBase,
                lineWidth: 6,
                lineOpacity: split ? 0.9 : 0,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </ShapeSource>
        ) : null}

        {hasRoute ? (
          <ShapeSource
            id="live-route-done"
            shape={lineFeature(split ? routeCoords.slice(0, traveledCount + 1) : routeCoords)}
          >
            <LineLayer
              id="live-route-done-line"
              style={{
                lineColor: theme.routeDone,
                lineWidth: 6,
                lineOpacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </ShapeSource>
        ) : null}

        {hasRoute && split ? (
          <ShapeSource id="live-route-rest" shape={lineFeature(routeCoords.slice(traveledCount))}>
            <LineLayer
              id="live-route-rest-line"
              style={{
                lineColor: theme.routeRest,
                lineWidth: 6,
                lineOpacity: 0.5,
                lineCap: 'round',
                lineJoin: 'round',
                lineDasharray: [1.4, 1.1],
              }}
            />
          </ShapeSource>
        ) : null}

        {pins.map((pin) => {
          if (!isValidPair(pin.lngLat)) return null;
          const color = pin.color ?? theme.routeDone;
          const isEnd = pin.variant === 'end';
          return (
            <MarkerView
              key={pin.id}
              coordinate={pin.lngLat}
              anchor={isEnd ? { x: 0.5, y: 1 } : { x: 0.5, y: 0.5 }}
              allowOverlap
            >
              {isEnd ? (
                <EndPin color={color} coreColor={theme.onBase} shadow={theme.shadow} />
              ) : (
                <DotPin color={color} ringColor={theme.onBase} shadow={theme.shadow} />
              )}
            </MarkerView>
          );
        })}

        {vehicle && isValidPair(vehicle.lngLat) ? (
          <MarkerView coordinate={vehicle.lngLat} allowOverlap>
            <VehicleMarker
              vehicle={vehicle}
              isDark={theme.isDark}
              onBase={theme.onBase}
              shadow={theme.shadow}
            />
          </MarkerView>
        ) : null}
      </MapView>

      {children ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {children}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
});

const pinStyles = StyleSheet.create({
  dotWrap: {
    width: 21,
    height: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotHalo: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 15,
    height: 15,
    borderRadius: 7.5,
  },
  dotRing: {
    position: 'absolute',
    width: 21,
    height: 21,
    borderRadius: 10.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },
  dotCore: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 7.5,
  },
  endWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBody: {
    width: 17,
    height: 17,
    borderTopLeftRadius: 8.5,
    borderTopRightRadius: 8.5,
    borderBottomRightRadius: 8.5,
    borderBottomLeftRadius: 0,
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },
  endCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

const vehicleStyles = StyleSheet.create({
  wrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 5,
  },
});

export default LiveMap;
