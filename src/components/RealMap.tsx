import React, { useMemo } from 'react';
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

interface RealMapProps {
  style?: StyleProp<ViewStyle>;
  region?: MapRegion;
  interactive?: boolean;
  markers?: MapMarker[];
  routeCoordinates?: [number, number][]; // [longitude, latitude][]
  showUserLocation?: boolean; // NEW PROP
  children?: React.ReactNode;
}

export default function RealMap({ style, region = CHENNAI_REGION, interactive = false, markers = [], routeCoordinates = [], showUserLocation = false, children }: RealMapProps) {
  
  const webViewRef = React.useRef<any>(null);

  const htmlContent = useMemo(() => {
    // Generate initial Route JS
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
              'line-color': '#00217C',
              'line-width': 4
            }
          });
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
        body { margin: 0; padding: 0; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; }
      </style>
      </head>
      <body>
      <div id="map"></div>
      <script>
      mapboxgl.accessToken = '${MAPBOX_TOKEN}';
      window.map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/navigation-day-v1',
          center: [${region.longitude}, ${region.latitude}],
          zoom: ${zoom},
          interactive: ${interactive}
      });
      
      // Global array to track markers
      window.currentMarkers = [];

      // Expose a function to update markers
      window.updateMarkers = function(newMarkers) {
        // Remove old markers
        window.currentMarkers.forEach(m => m.remove());
        window.currentMarkers = [];

        // Add new markers
        newMarkers.forEach(m => {
          const marker = new mapboxgl.Marker({ color: m.color || '#000000' })
            .setLngLat([m.longitude, m.latitude])
            .addTo(window.map);
          window.currentMarkers.push(marker);
        });
      };
      
      // Initial set
      window.updateMarkers(${JSON.stringify(markers)});

      ${routeJs}
      </script>
      </body>
      </html>
    `;
  }, [interactive]); // Only re-render full HTML if interactive mode changes

  // Smoothly update markers without reloading the WebView
  React.useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.updateMarkers) {
          window.updateMarkers(${JSON.stringify(markers)});
        }
        true;
      `);
    }
  }, [markers]);

  // Smoothly pan camera without reloading the WebView
  React.useEffect(() => {
    if (webViewRef.current && region) {
      webViewRef.current.injectJavaScript(`
        if (window.map) {
          window.map.flyTo({ center: [${region.longitude}, ${region.latitude}], zoom: 14 });
        }
        true;
      `);
    }
  }, [region]);

  return (
    <View style={[styles.container, style]}>
      <WebView 
        ref={webViewRef}
        source={{ html: htmlContent, baseUrl: 'https://localhost/' }} 
        style={StyleSheet.absoluteFill}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        pointerEvents={interactive ? 'auto' : 'none'}
        bounces={false}
        geolocationEnabled={true}
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
    backgroundColor: '#e8ecef',
  }
});
