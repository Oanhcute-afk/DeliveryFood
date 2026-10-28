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
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

const DEFAULT_COORDS = {
  latitude: 10.7769,
  longitude: 106.7009,
};

export default function DriverActiveScreen() {
  const { tr } = useLanguage();
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

      Alert.alert(
        tr('Thành công', 'Success'),
        tr(
          'Đơn hàng đã được xác nhận giao thành công.',
          'Order has been marked as delivered.',
        ),
      );
    },
    onError: (e: any) =>
      Alert.alert(
        tr('Không thể cập nhật', 'Unable to update'),
        e?.response?.data?.message ??
          tr('Đã xảy ra lỗi. Vui lòng thử lại.', 'An error occurred. Please try again.'),
      ),
  });

  async function startTracking(orderId: string) {
    stopTracking();

    const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL;
    if (!serverUrl) {
      console.warn('Chưa cấu hình EXPO_PUBLIC_SERVER_URL.');
      return;
    }

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
        emitPosition(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
        return;
      }

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
            <ActivityIndicator size="large" color={BURGER_COLORS.primary} />
          </View>
          <Text style={styles.loadingText}>
            {tr('Đang tải đơn giao hàng...', 'Loading active delivery...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeOrder) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyTopBar}>
          <LanguageSwitch />
        </View>
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyEmoji}>🛵</Text>
          </View>
          <Text style={styles.emptyTitle}>
            {tr('Chưa có đơn giao hàng', 'No Active Delivery')}
          </Text>
          <Text style={styles.emptyText}>
            {tr(
              'Khi nhận và lấy hàng từ nhà hàng, đơn hàng đang giao sẽ xuất hiện tại đây.',
              'When you accept and pick up an order, your active delivery trip will appear here.',
            )}
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
            <Text style={styles.eyebrow}>
              {tr('TÀI XẾ ĐANG HOẠT ĐỘNG', 'ACTIVE DELIVERY')}
            </Text>
            <Text style={styles.title}>
              {tr('Đơn giao hàng', 'Current Trip')}
            </Text>
            <Text style={styles.subtitle}>
              {tr(
                'Theo dõi hành trình và hoàn tất giao hàng.',
                'Follow the route and complete the delivery.',
              )}
            </Text>
          </View>

          <LanguageSwitch />
        </View>

        {/* Trạng thái giao hàng */}
        <View style={styles.statusBanner}>
          <View style={styles.statusIcon}>
            <Text style={styles.statusEmoji}>📦</Text>
          </View>
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>
              {tr('Đang giao hàng', 'Out for Delivery')}
            </Text>
            <Text style={styles.statusSubtitle}>
              {tr(
                'Đơn hàng đã được lấy từ nhà hàng.',
                'Order picked up from the restaurant.',
              )}
            </Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>
              {tr('ĐANG GIAO', 'ACTIVE')}
            </Text>
          </View>
        </View>

        {/* Bản đồ */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>
            {tr('Vị trí giao hàng', 'Live Location')}
          </Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
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
              <Text style={styles.cardEyebrow}>
                {tr('THÔNG TIN ĐƠN HÀNG', 'ORDER INFO')}
              </Text>
              <Text style={styles.cardTitle}>
                {tr('Chi tiết giao hàng', 'Delivery Details')}
              </Text>
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
              <Text style={styles.label}>
                {tr('Mã đơn hàng', 'Order ID')}
              </Text>
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
              <Text style={styles.label}>
                {tr('Địa chỉ giao hàng', 'Delivery address')}
              </Text>
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
              <Text style={styles.label}>
                {tr('Trạng thái đơn', 'Order status')}
              </Text>
              <Text style={styles.statusValue}>
                {tr('Đã lấy hàng', 'Picked up')}
              </Text>
            </View>
          </View>
        </View>

        {/* Trạng thái gửi vị trí */}
        <View style={styles.trackingCard}>
          <View style={styles.trackingIcon}>
            <Text style={styles.trackingEmoji}>📡</Text>
          </View>
          <View style={styles.trackingContent}>
            <Text style={styles.trackingTitle}>
              {tr('Theo dõi vị trí', 'GPS Location Sharing')}
            </Text>
            <Text style={styles.trackingDescription}>
              {tr(
                'Ứng dụng đang gửi cập nhật vị trí trực tiếp cho khách hàng.',
                'Sharing real-time location updates with the customer.',
              )}
            </Text>
          </View>
          <View style={styles.trackingIndicator} />
        </View>

        {/* Xác nhận giao hàng */}
        <View style={styles.actionSection}>
          <Text style={styles.actionTitle}>
            {tr('Đã giao hàng thành công?', 'Completed the delivery?')}
          </Text>
          <Text style={styles.actionDescription}>
            {tr(
              'Chỉ xác nhận sau khi khách hàng đã nhận được đơn hàng.',
              'Only confirm after the customer has received their order.',
            )}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.deliveredButton,
              isPending && styles.disabledButton,
              pressed && !isPending && styles.buttonPressed,
            ]}
            onPress={() => {
              Alert.alert(
                tr('Xác nhận giao hàng', 'Confirm Delivery'),
                tr(
                  'Bạn có chắc chắn đơn hàng đã được giao cho khách hàng không?',
                  'Are you sure this order has been delivered to the customer?',
                ),
                [
                  {
                    text: tr('Chưa', 'Not yet'),
                    style: 'cancel',
                  },
                  {
                    text: tr('Đã giao hàng', 'Mark Delivered'),
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
              <Text style={styles.deliveredButtonText}>
                {tr('✓  Xác nhận đã giao hàng', '✓  Mark as Delivered')}
              </Text>
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
    backgroundColor: BURGER_COLORS.background,
    padding:1
  },
  emptyTopBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: BURGER_COLORS.primary,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: BURGER_COLORS.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: BURGER_COLORS.muted,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 18,
    padding: 14,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BURGER_COLORS.primaryLight,
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
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  statusSubtitle: {
    fontSize: 11,
    color: BURGER_COLORS.muted,
    marginTop: 3,
    lineHeight: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: BURGER_COLORS.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BURGER_COLORS.primary,
  },
  statusPillText: {
    color: BURGER_COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: -4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BURGER_COLORS.successLight,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BURGER_COLORS.success,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '900',
    color: BURGER_COLORS.success,
  },
  mapContainer: {
    width: '100%',
    minHeight: 240,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: BURGER_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
  },
  card: {
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: BURGER_COLORS.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  packageIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageEmoji: {
    fontSize: 19,
  },
  divider: {
    height: 1,
    backgroundColor: BURGER_COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: BURGER_COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoEmoji: {
    fontSize: 16,
    color: BURGER_COLORS.primary,
    fontWeight: '900',
  },
  infoContent: {
    flex: 1,
    paddingTop: 1,
  },
  label: {
    fontSize: 11,
    color: BURGER_COLORS.muted,
    fontWeight: '600',
    marginBottom: 3,
  },
  value: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '800',
    color: BURGER_COLORS.success,
  },
  trackingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: BURGER_COLORS.successLight,
  },
  trackingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BURGER_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingEmoji: {
    fontSize: 19,
  },
  trackingContent: {
    flex: 1,
  },
  trackingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: BURGER_COLORS.success,
  },
  trackingDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: BURGER_COLORS.textSoft,
    marginTop: 2,
  },
  trackingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BURGER_COLORS.success,
  },
  actionSection: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    gap: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  actionDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: BURGER_COLORS.muted,
  },
  deliveredButton: {
    backgroundColor: BURGER_COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  deliveredButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: BURGER_COLORS.muted,
  },
  emptyIcon: {
    width: 92,
    height: 92,
    borderRadius: 30,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyEmoji: {
    fontSize: 44,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: BURGER_COLORS.text,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: BURGER_COLORS.muted,
    textAlign: 'center',
    marginTop: 8,
  },
});
