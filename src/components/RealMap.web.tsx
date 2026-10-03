import React, { useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
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
  color?: string;
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
  showUserLocation?: boolean;
  children?: React.ReactNode;
}

export default function RealMap({ style, region = CHENNAI_REGION, interactive = false, markers = [], routeCoordinates = [], showUserLocation = false, children }: RealMapProps) {
  const { isDark } = useTheme();
  const theme = useMemo(() => buildMapTheme(isDark), [isDark]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bootRegionRef = useRef(region);
  const regionKey = JSON.stringify(region);
  const markersKey = JSON.stringify(markers);

  const isIframeReady = React.useRef(false);
  const pendingMessages = React.useRef<any[]>([]);

  const safePostMessage = (msg: any) => {
    if (isIframeReady.current && iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify(msg), '*');
    } else {
      pendingMessages.current.push(msg);
    }
  };

  useEffect(() => {
    const zoom = Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2) || 12;
    safePostMessage({ type: 'flyTo', latitude: region.latitude, longitude: region.longitude, zoom });
  }, [regionKey]);

  const markersJs = useMemo(() => {
    return markers.map(marker => {
      if (marker.id === 'me' || marker.id === 'partner') {
        return `
          var el = document.createElement('div');
          el.className = 'pulse-marker';
          new mapboxgl.Marker(el)
            .setLngLat([${marker.longitude}, ${marker.latitude}])
            .addTo(map);
        `;
      } else if (marker.id.startsWith('hotspot')) {
        return `
          var el = document.createElement('div');
          el.className = 'pulse-hotspot';
          new mapboxgl.Marker(el)
            .setLngLat([${marker.longitude}, ${marker.latitude}])
            .addTo(map);
        `;
      } else {
        return `
          new mapboxgl.Marker({ color: '${marker.color || '#000000'}' })
            .setLngLat([${marker.longitude}, ${marker.latitude}])
            .addTo(map);
        `;
      }
    }).join('\n');
  }, [markersKey]);

  useEffect(() => {
    safePostMessage({ type: 'updateMarkers', markersJs });
  }, [markersJs]);

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
          
          map.fitBounds(bounds, { padding: 50, duration: 800 });
        });
      `;
    }

    const geolocateJs = '';

    const zoom = Math.round(Math.log(360 / bootRegionRef.current.longitudeDelta) / Math.LN2) || 12;

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
      body { margin: 0; padding: 0; background: var(--map-base); }
      #map { position: absolute; top: 0; bottom: 0; width: 100%; }
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
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pulse-hotspot::before {
        content: "";
        position: absolute;
        width: 24px;
        height: 24px;
        background-color: rgba(250, 204, 21, 0.4);
        border: 2px solid #FACC15;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(250, 204, 21, 0.5);
        animation: hotspotPulse 2s infinite ease-in-out;
      }
      .pulse-hotspot::after {
        content: "";
        position: absolute;
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
      ${markersJs}
      ${routeJs}
      ${geolocateJs}
      
      window.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'flyTo' && map.isStyleLoaded()) {
            map.flyTo({ center: [data.longitude, data.latitude], zoom: data.zoom, speed: 1.2 });
          }
          if (data.type === 'updateMarkers' && map.isStyleLoaded()) {
             // In a real scenario, we'd clear old markers. For now, we execute the new markers script
             eval(data.markersJs);
          }
        } catch(e) {}
      });

      </script>
      </body>
      </html>
    `;
  }, [interactive, routeCoordinates, showUserLocation, theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.base }, style]}>
      <iframe
        ref={iframeRef}
        onLoad={() => {
          isIframeReady.current = true;
          if (iframeRef.current && iframeRef.current.contentWindow && pendingMessages.current.length > 0) {
            pendingMessages.current.forEach(msg => {
              iframeRef.current!.contentWindow!.postMessage(JSON.stringify(msg), '*');
            });
            pendingMessages.current = [];
          }
        }}
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        marginHeight={0}
        marginWidth={0}
        srcDoc={htmlContent}
        style={{
          border: 0,
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: interactive ? 'auto' : 'none'
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
