import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  latitude?: number;
  longitude?: number;
}

function createGoogleMapHtml(latitude: number, longitude: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background: #f4efe9;
    }
    .custom-marker {
      background: transparent;
      border: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      var map = null;
      var marker = null;
      var curLat = ${latitude};
      var curLng = ${longitude};

      function initMap() {
        if (typeof L === 'undefined') return;

        map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([curLat, curLng], 16);

        // Google Maps Standard Road Tiles
        L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}', {
          subdomains: ['0', '1', '2', '3'],
          maxZoom: 20
        }).addTo(map);

        var icon = L.divIcon({
          className: 'custom-marker',
          html: '<div style="background-color:#FF6B35;width:24px;height:24px;border-radius:50%;border:3px solid #FFFFFF;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;">🛵</div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        marker = L.marker([curLat, curLng], { icon: icon }).addTo(map);

        window.addEventListener('message', function (e) {
          try {
            var data = JSON.parse(e.data);
            if (data.type === 'UPDATE_LOCATION' && map && marker) {
              var lat = parseFloat(data.latitude);
              var lng = parseFloat(data.longitude);
              if (!isNaN(lat) && !isNaN(lng)) {
                marker.setLatLng([lat, lng]);
                map.panTo([lat, lng], { animate: true, duration: 0.8 });
              }
            }
          } catch (err) {}
        });

        document.addEventListener('message', function (e) {
          try {
            var data = JSON.parse(e.data);
            if (data.type === 'UPDATE_LOCATION' && map && marker) {
              var lat = parseFloat(data.latitude);
              var lng = parseFloat(data.longitude);
              if (!isNaN(lat) && !isNaN(lng)) {
                marker.setLatLng([lat, lng]);
                map.panTo([lat, lng], { animate: true, duration: 0.8 });
              }
            }
          } catch (err) {}
        });
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
  const webViewRef = useRef<any>(null);
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
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#FAF5F0',
  },
  map: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 249, 245, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#8B8289',
    fontSize: 13,
    fontWeight: '600',
  },
});
