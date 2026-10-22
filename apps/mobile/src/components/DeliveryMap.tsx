import { useState } from 'react';
import MapView, {
  UrlTile,
  Marker,
  PROVIDER_DEFAULT,
} from 'react-native-maps';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
} from 'react-native';

type Props = {
  latitude?: number;
  longitude?: number;
};

export default function DeliveryMap({
  latitude = 10.0452,
  longitude = 105.7469,
}: Props) {
  const [mapReady, setMapReady] = useState(false);

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        onMapReady={() => setMapReady(true)}
        mapType="none"
        loadingEnabled
        toolbarEnabled={false}
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={1}
        />

        <Marker
          coordinate={{ latitude, longitude }}
          title="Vị trí giao hàng"
          description="Vị trí mặc định"
        />
      </MapView>

      {!mapReady && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
        </View>
      )}

      <View style={styles.attribution}>
        <Text style={styles.attributionText}>
          © OpenStreetMap contributors
        </Text>
      </View>
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
    ...StyleSheet.absoluteFillObject,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EEF0',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#444',
  },
  attribution: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
  },
  attributionText: {
    fontSize: 9,
    color: '#333',
  },
});