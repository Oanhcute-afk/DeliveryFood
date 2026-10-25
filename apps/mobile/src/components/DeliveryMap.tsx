import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  latitude?: number;
  longitude?: number;
};

function createGoogleMapHtml(latitude: number, longitude: number) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background: #e8eef0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .driver-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 21px;
      background: #FF6B35;
      border: 3px solid #FFFFFF;
      box-shadow: 0 3px 10px rgba(0,0,0,0.28);
      font-size: 22px;
    }
    .leaflet-control-attribution {
      font-size: 9px !important;
      background: rgba(255,255,255,0.85) !important;
      padding: 2px 6px !important;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      var currentCoords = [${latitude}, ${longitude}];
      var map = null;
      var marker = null;

      function handleMessage(event) {
        try {
          var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (!data || data.type !== 'UPDATE_LOCATION') return;

          var lat = Number(data.latitude);
          var lng = Number(data.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          currentCoords = [lat, lng];
          if (map && marker) {
            marker.setLatLng(currentCoords);
            map.panTo(currentCoords, { animate: true });
          }
        } catch (e) {}
      }

      window.addEventListener('message', handleMessage);
      document.addEventListener('message', handleMessage);

      function initMap() {
        if (!window.L) return;

        map = L.map('map', {
          zoomControl: true,
          attributionControl: true
        }).setView(currentCoords, 16);

        // Sử dụng Google Maps रोड tiles (hỗ trợ tiếng Việt) với fallback sang OpenStreetMap
        var googleTiles = L.tileLayer(
          'https://{s}.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}',
          {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '© Google Maps'
          }
        );

        var osmFallback = L.tileLayer(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
          }
        );

        var switchedToFallback = false;
        googleTiles.on('tileerror', function () {
          if (!switchedToFallback && map) {
            switchedToFallback = true;
            map.removeLayer(googleTiles);
            osmFallback.addTo(map);
          }
        });

        googleTiles.addTo(map);

        var icon = L.divIcon({
          className: '',
          html: '<div class="driver-marker">🛵</div>',
          iconSize: [42, 42],
          iconAnchor: [21, 21]
        });

        marker = L.marker(currentCoords, { icon: icon })
          .addTo(map)
          .bindPopup('Vị trí giao hàng hiện tại');

        setTimeout(function () {
          map.invalidateSize();
        }, 200);
      }

      function loadScript(src, onSuccess, onError) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = onSuccess;
        s.onerror = onError;
        document.head.appendChild(s);
      }

      loadScript(
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
        initMap,
        function () {
          loadScript(
            'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js',
            initMap,
            function () {}
          );
        }
      );
    })();
  </script>
</body>
</html>`;
}

export default function DeliveryMap({
  latitude = 10.7769,
  longitude = 106.7009,
}: Props) {
  const webViewRef = useRef<WebView | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const safeLat = Number.isFinite(latitude) ? latitude : 10.7769;
  const safeLng = Number.isFinite(longitude) ? longitude : 106.7009;

  // Khởi tạo HTML một lần, các cập nhật tọa độ tiếp theo được đẩy qua postMessage
  const mapHtml = useMemo(() => createGoogleMapHtml(safeLat, safeLng), []);

  useEffect(() => {
    if (!mapReady) return;

    webViewRef.current?.postMessage(
      JSON.stringify({
        type: 'UPDATE_LOCATION',
        latitude: safeLat,
        longitude: safeLng,
      }),
    );
  }, [safeLat, safeLng, mapReady]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml, baseUrl: 'https://maps.google.com' }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        mixedContentMode="always"
        onLoadEnd={() => setMapReady(true)}
      />

      {!mapReady && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Đang tải bản đồ Google Maps...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#E8EEF0',
  },
  map: {
    flex: 1,
    backgroundColor: '#E8EEF0',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EEF0',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
});
