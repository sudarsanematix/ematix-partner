import React, { useMemo, useEffect, useRef } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { buildMapTheme } from '../theme/mapTheme';
import { StyleSheet, View, StyleProp, ViewStyle, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

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

export type MapPadding = { top?: number; bottom?: number; left?: number; right?: number } | number;

interface RealMapProps {
  style?: StyleProp<ViewStyle>;
  region?: MapRegion;
  interactive?: boolean;
  markers?: MapMarker[];
  routeCoordinates?: [number, number][]; // [longitude, latitude][]
  showUserLocation?: boolean; // NEW PROP
  mapPadding?: MapPadding;
  children?: React.ReactNode;
}

export default function RealMap({ style, region = CHENNAI_REGION, interactive = false, markers = [], routeCoordinates = [], showUserLocation = false, mapPadding, children }: RealMapProps) {
  const { isDark } = useTheme();
  const theme = useMemo(() => buildMapTheme(isDark), [isDark]);
  const webViewRef = useRef<WebView>(null);
  const bootRegionRef = useRef(region);
  
  const markersKey = JSON.stringify(markers);
  const routeKey = JSON.stringify(routeCoordinates);
  const regionKey = JSON.stringify(region);
  const paddingKey = JSON.stringify(mapPadding);

  const isWebViewReady = useRef(false);
  const pendingInjections = useRef<string[]>([]);

  const safeInject = (js: string) => {
    if (isWebViewReady.current && webViewRef.current) {
      webViewRef.current.injectJavaScript(js);
    } else {
      pendingInjections.current.push(js);
    }
  };

  const markersJs = useMemo(() => {
    return `
      if (!window.appMarkers) window.appMarkers = [];
      window.appMarkers.forEach(m => m.remove());
      window.appMarkers = [];
      ${markers.map(marker => {
        if (marker.id === 'me' || marker.id === 'partner') {
          return `
            var el = document.createElement('div');
            el.className = 'pulse-marker';
            window.appMarkers.push(new mapboxgl.Marker(el).setLngLat([${marker.longitude}, ${marker.latitude}]).addTo(map));
          `;
        } else if (marker.id.startsWith('hotspot')) {
          return `
            var el = document.createElement('div');
            el.className = 'pulse-hotspot';
            window.appMarkers.push(new mapboxgl.Marker(el).setLngLat([${marker.longitude}, ${marker.latitude}]).addTo(map));
          `;
        } else {
          return `
            window.appMarkers.push(new mapboxgl.Marker({ color: '${marker.color || '#000000'}' }).setLngLat([${marker.longitude}, ${marker.latitude}]).addTo(map));
          `;
        }
      }).join('\n')}
    `;
  }, [markersKey]);

  useEffect(() => {
    safeInject(`
      if (window.updateMarkers) {
         window.updateMarkers(\`${markersJs.replace(/`/g, '\\`')}\`);
      }
      true;
    `);
  }, [markersJs]);

  useEffect(() => {
    const zoom = Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2) || 12;
    safeInject(`
      if (window.flyToRegion) {
         window.flyToRegion(${region.longitude}, ${region.latitude}, ${zoom});
      }
      true;
    `);
  }, [regionKey]);

  const htmlContent = useMemo(() => {
    // Generate Route JS
    let routeJs = '';
    if (routeCoordinates && routeCoordinates.length > 0) {
      routeJs = `
        map.on('load', () => {
          map.addSource('route', {
            'type': 'geojson',
            'data': {
              'type': 'Feature',
              'properties': {},
              'geometry': {
                'type': 'LineString',
                'coordinates': ${JSON.stringify(routeCoordinates)}
              }
            }
          });
          map.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': {
              'line-join': 'round',
              'line-cap': 'round'
            },
            'paint': {
              'line-color': '${theme.routeDone}',
              'line-width': 4
            }
          });

          // Automatically fit the map to the route bounds
          const coordinates = ${JSON.stringify(routeCoordinates)};
          const bounds = coordinates.reduce(function(bounds, coord) {
            return bounds.extend(coord);
          }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
          
          map.fitBounds(bounds, { padding: ${mapPadding ? JSON.stringify(mapPadding) : 50}, duration: 800 });
        });
      `;
    }

    const zoom = Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2) || 12;

    return `
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="utf-8">
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
      <link href="https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css" rel="stylesheet">
      <script src="https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.js"></script>
      <style>
        :root {
          --map-base: ${theme.base};
          --map-attr: ${theme.attributionFg};
        }
        body { margin: 0; padding: 0; background: var(--map-base); touch-action: none; overflow: hidden; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; touch-action: none; }
        .mapboxgl-ctrl-attrib { opacity: 0.65; background: transparent !important; }
        .mapboxgl-ctrl-attrib a { color: var(--map-attr) !important; }
        
        .pulse-marker {
          width: 20px;
          height: 20px;
          background-color: #4285F4;
          border: 4px solid white;
          border-radius: 50%;
          position: relative;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .pulse-marker::before {
          content: "";
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-bottom: 12px solid #4285F4;
        }
        .pulse-marker::after {
          content: "";
          position: absolute;
          top: -8px;
          left: -8px;
          right: -8px;
          bottom: -8px;
          background-color: #4285F4;
          border-radius: 50%;
          opacity: 0.3;
          animation: pulse 2s infinite ease-in-out;
        }
        @keyframes pulse {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        
        .pulse-hotspot {
          width: 24px;
          height: 24px;
          background-color: rgba(250, 204, 21, 0.4); /* FACC15 but translucent */
          border: 2px solid #FACC15;
          border-radius: 50%;
          position: relative;
          box-shadow: 0 0 10px rgba(250, 204, 21, 0.5);
          animation: hotspotPulse 2s infinite ease-in-out;
        }
        .pulse-hotspot::after {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background-color: #FACC15;
          border-radius: 50%;
        }
        @keyframes hotspotPulse {
          0% { transform: scale(0.8); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 0.3; }
          100% { transform: scale(0.8); opacity: 0.8; }
        }
      </style>
      </head>
      <body>
      <div id="map"></div>
      <script>
      mapboxgl.accessToken = '${MAPBOX_TOKEN}';
      const map = new mapboxgl.Map({
          container: 'map',
          style: '${theme.styleUrl}',
          center: [${bootRegionRef.current.longitude}, ${bootRegionRef.current.latitude}],
          zoom: ${zoom},
          interactive: ${interactive}
      });
      
      let targetCenter = null;
      let targetZoom = null;
      window.flyToRegion = function(lng, lat, zoom) {
        if (typeof map !== 'undefined' && map.isStyleLoaded()) {
           map.flyTo({ center: [lng, lat], zoom: zoom, speed: 1.2 });
        } else {
           targetCenter = [lng, lat];
           targetZoom = zoom;
        }
      };

      window.updateMarkers = function(script) {
        if (typeof map !== 'undefined' && map.isStyleLoaded()) {
          try { eval(script); } catch(e) {}
        }
      };

      map.on('load', () => {
         if (targetCenter) {
            map.flyTo({ center: targetCenter, zoom: targetZoom, speed: 1.2 });
            targetCenter = null;
         }
      });

      ${markersJs}
      ${routeJs}
      </script>
      </body>
      </html>
    `;
  }, [interactive, routeKey, paddingKey, theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.base }, style]}>
      <WebView 
        ref={webViewRef}
        key={isDark ? 'dark' : 'light'}
        source={{ html: htmlContent, baseUrl: 'https://localhost/' }} 
        style={StyleSheet.absoluteFill}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        pointerEvents={interactive ? 'auto' : 'none'}
        bounces={false}
        scrollEnabled={false}
        overScrollMode="never"
        geolocationEnabled={true}
        onLoadEnd={() => {
          isWebViewReady.current = true;
          if (webViewRef.current && pendingInjections.current.length > 0) {
            pendingInjections.current.forEach(js => webViewRef.current?.injectJavaScript(js));
            pendingInjections.current = [];
          }
        }}
      />
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
  }
});
