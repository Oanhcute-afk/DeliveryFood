import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { Order } from '@food-delivery/types';
import DeliveryMap from '@/components/DeliveryMap';

const DEFAULT_COORDS = {
  latitude: 10.7769,
  longitude: 106.7009,
};

export default function DriverActiveScreen() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_OFFSET = 88;

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const socketRef = useRef<Socket | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const [driverCoords, setDriverCoords] = useState(DEFAULT_COORDS);

  const { data: activeOrders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['driver-active-orders'],
    queryFn: () =>
      api
        .get<Order[]>('/orders/mine')
        .then((r) => r.data.filter((o) => o.status === 'PICKED_UP')),
    refetchInterval: 4000,
  });

  const activeOrder = activeOrders[0] ?? null;

  function stopTracking() {
    locationWatchRef.current?.remove();
    socketRef.current?.disconnect();

    locationWatchRef.current = null;
    socketRef.current = null;
  }

  const { mutate: markDelivered, isPending } = useMutation({
    mutationFn: (orderId: string) =>
      api.patch(`/orders/${orderId}/status`, {
        status: 'DELIVERED',
      }),
    onSuccess: () => {
      stopTracking();

      queryClient.invalidateQueries({
        queryKey: ['driver-active-orders'],
      });

      queryClient.invalidateQueries({
        queryKey: ['driver-orders'],
      });

      Alert.alert('Thành công', 'Đơn hàng đã được xác nhận giao thành công.');
    },
    onError: (e: any) =>
      Alert.alert(
        'Không thể cập nhật',
        e?.response?.data?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.',
      ),
  });

  async function startTracking(orderId: string) {
    stopTracking();

    const serverUrl = (
      process.env.EXPO_PUBLIC_SERVER_URL?.trim() ||
      process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/api\/?$/, '') ||
      'https://deliveryfood-l3dv.onrender.com'
    ).replace(/\/+$/, '');

    const socket = io(`${serverUrl}/orders`, {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    const emitPosition = (latitude: number, longitude: number) => {
      setDriverCoords({ latitude, longitude });
      socket.emit('driver:location', {
        driverId: user?.id,
        orderId,
        latitude,
        longitude,
      });
    };

    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        // Vẫn gửi vị trí mặc định để bản đồ phía khách hàng và tài xế luôn hiển thị
        emitPosition(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
        return;
      }

      // Gửi ngay vị trí ban đầu để khách hàng thấy bản đồ tức thì mà không cần chờ di chuyển 10m
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown?.coords) {
        emitPosition(lastKnown.coords.latitude, lastKnown.coords.longitude);
      } else {
        try {
          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          emitPosition(current.coords.latitude, current.coords.longitude);
        } catch {
          emitPosition(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
        }
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 10,
        },
        (location) => {
          emitPosition(location.coords.latitude, location.coords.longitude);
        },
      );

      if (socketRef.current !== socket) {
        subscription.remove();
        socket.disconnect();
        return;
      }

      locationWatchRef.current = subscription;
    } catch {
      emitPosition(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
    }
  }

  useEffect(() => {
    if (!activeOrder) {
      stopTracking();
      return;
    }

    void startTracking(activeOrder.id);

    return () => {
      stopTracking();
    };
  }, [activeOrder?.id]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
          <Text style={styles.loadingText}>Đang tải đơn giao hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeOrder) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyEmoji}>🛵</Text>
          </View>
          <Text style={styles.emptyTitle}>Chưa có đơn giao hàng</Text>
          <Text style={styles.emptyText}>
            Khi nhận và lấy hàng từ nhà hàng, đơn hàng đang giao sẽ xuất hiện
            tại đây.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + TAB_BAR_OFFSET },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tiêu đề */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>TÀI XẾ ĐANG HOẠT ĐỘNG</Text>
            <Text style={styles.title}>Đơn giao hàng</Text>
            <Text style={styles.subtitle}>
              Theo dõi hành trình và hoàn tất giao hàng.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerEmoji}>🛵</Text>
          </View>
        </View>

        {/* Trạng thái giao hàng */}
        <View style={styles.statusBanner}>
          <View style={styles.statusIcon}>
            <Text style={styles.statusEmoji}>📦</Text>
          </View>
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Đang giao hàng</Text>
            <Text style={styles.statusSubtitle}>
              Đơn hàng đã được lấy từ nhà hàng.
            </Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>ĐANG GIAO</Text>
          </View>
        </View>

        {/* Bản đồ */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Vị trí giao hàng</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>TRỰC TIẾP</Text>
          </View>
        </View>

        <View style={styles.mapContainer}>
          <DeliveryMap
            latitude={driverCoords.latitude}
            longitude={driverCoords.longitude}
          />
        </View>

        {/* Thông tin đơn */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardEyebrow}>THÔNG TIN ĐƠN HÀNG</Text>
              <Text style={styles.cardTitle}>Chi tiết giao hàng</Text>
            </View>
            <View style={styles.packageIcon}>
              <Text style={styles.packageEmoji}>🧾</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>#</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.label}>Mã đơn hàng</Text>
              <Text style={styles.value}>
                #{activeOrder.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>📍</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.label}>Địa chỉ giao hàng</Text>
              <Text style={styles.value}>
                {activeOrder.deliveryAddress}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>🚚</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.label}>Trạng thái đơn</Text>
              <Text style={styles.statusValue}>Đã lấy hàng</Text>
            </View>
          </View>
        </View>

        {/* Trạng thái gửi vị trí */}
        <View style={styles.trackingCard}>
          <View style={styles.trackingIcon}>
            <Text style={styles.trackingEmoji}>📡</Text>
          </View>
          <View style={styles.trackingContent}>
            <Text style={styles.trackingTitle}>Theo dõi vị trí</Text>
            <Text style={styles.trackingDescription}>
              Ứng dụng đang gửi cập nhật vị trí khi GPS hoạt động.
            </Text>
          </View>
          <View style={styles.trackingIndicator} />
        </View>

        {/* Xác nhận giao hàng */}
        <View style={styles.actionSection}>
          <Text style={styles.actionTitle}>Đã giao hàng thành công?</Text>
          <Text style={styles.actionDescription}>
            Chỉ xác nhận sau khi khách hàng đã nhận được đơn hàng.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.deliveredButton,
              isPending && styles.disabledButton,
              pressed && !isPending && styles.buttonPressed,
            ]}
            onPress={() => {
              Alert.alert(
                'Xác nhận giao hàng',
                'Bạn có chắc chắn đơn hàng đã được giao cho khách hàng không?',
                [
                  {
                    text: 'Chưa',
                    style: 'cancel',
                  },
                  {
                    text: 'Đã giao hàng',
                    onPress: () => markDelivered(activeOrder.id),
                  },
                ],
              );
            }}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.deliveredButtonText}>
                  ✓  Xác nhận đã giao hàng
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    gap: 18,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF6B35',
    letterSpacing: 1.5,
    marginBottom: 7,
  },
  title: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '900',
    color: '#29232A',
    letterSpacing: -0.7,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: '#8B8289',
  },
  headerIcon: {
    width: 68,
    height: 68,
    borderRadius: 23,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: {
    fontSize: 35,
  },

  // Trạng thái đơn hàng
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 18,
    padding: 14,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusEmoji: {
    fontSize: 22,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#29232A',
  },
  statusSubtitle: {
    fontSize: 11,
    color: '#8B8289',
    marginTop: 4,
    lineHeight: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF0E8',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B35',
  },
  statusPillText: {
    color: '#FF6B35',
    fontSize: 9,
    fontWeight: '900',
  },

  // Bản đồ
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: -8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#29232A',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E9F8EF',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22A06B',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#168653',
  },
  mapContainer: {
    width: '100%',
    minHeight: 240,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#F0E8E3',
    borderWidth: 1,
    borderColor: '#F0E8E3',
  },

  // Thông tin đơn hàng
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FF6B35',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#29232A',
  },
  packageIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageEmoji: {
    fontSize: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0E8E3',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF9F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoEmoji: {
    fontSize: 17,
    color: '#FF6B35',
    fontWeight: '900',
  },
  infoContent: {
    flex: 1,
    paddingTop: 2,
  },
  label: {
    fontSize: 11,
    color: '#9B9097',
    fontWeight: '600',
    marginBottom: 5,
  },
  value: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '800',
    color: '#29232A',
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#168653',
  },

  // Theo dõi GPS
  trackingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderRadius: 17,
    backgroundColor: '#E9F8EF',
    borderWidth: 1,
    borderColor: '#D4F0DF',
  },
  trackingIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingEmoji: {
    fontSize: 20,
  },
  trackingContent: {
    flex: 1,
  },
  trackingTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#166534',
  },
  trackingDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: '#43805B',
    marginTop: 4,
  },
  trackingIndicator: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#22A06B',
  },

  // Nút xác nhận
  actionSection: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    gap: 10,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#29232A',
  },
  actionDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: '#8B8289',
  },
  deliveredButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    marginTop: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  deliveredButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  // Loading và chưa có đơn
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loadingIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B8289',
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  emptyEmoji: {
    fontSize: 49,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#29232A',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 21,
    color: '#8B8289',
    textAlign: 'center',
    marginTop: 10,
  },
});
