import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
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
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { Order } from '@food-delivery/types';
import DeliveryMap from '@/components/DeliveryMap';
import { OrderChatModal } from '@/components/OrderChatModal';

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
  const [isChatVisible, setIsChatVisible] = useState(false);

  const {
    data: activeOrders = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Order[]>({
    queryKey: ['driver-active-orders'],
    queryFn: () =>
      api
        .get<Order[]>('/orders/mine')
        .then((r) => r.data.filter((o) => o.status === 'PICKED_UP')),
    refetchInterval: 4000,
  });

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const activeOrder = useMemo(() => {
    if (selectedOrderId) {
      const found = activeOrders.find((o) => o.id === selectedOrderId);
      if (found) return found;
    }
    return activeOrders[0] ?? null;
  }, [activeOrders, selectedOrderId]);

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

  const customer = (activeOrder as any)?.customer;
  const customerName = customer
    ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || 'Khách hàng'
    : 'Khách hàng';
  const customerPhone = customer?.phone ?? null;
  const isCash = activeOrder?.paymentMethod === 'CASH';

  function handleCallCustomer() {
    if (!customerPhone?.trim()) {
      Alert.alert(
        'Chưa có số điện thoại',
        'Khách hàng chưa cập nhật số điện thoại. Bạn có thể bấm nút "Nhắn tin" để nhắn tin trao đổi điểm đón nhé!',
      );
      return;
    }
    const cleanPhone = customerPhone.trim().replace(/\s+/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở ứng dụng cuộc gọi.');
    });
  }

  function handleConfirmDelivered() {
    if (!activeOrder) return;

    if (isCash && !activeOrder.isPaid) {
      Alert.alert(
        'Thu tiền mặt & Giao hàng',
        `Đơn này thanh toán tiền mặt (COD).\n\nSố tiền cần thu: $${Number(activeOrder.totalAmount).toFixed(2)}\n\nBạn đã nhận đủ tiền mặt từ khách hàng chưa?`,
        [
          { text: 'Chưa thu', style: 'cancel' },
          {
            text: 'Đã nhận đủ tiền & Giao xong',
            onPress: () => markDelivered(activeOrder.id),
          },
        ],
      );
    } else {
      Alert.alert(
        'Xác nhận giao hàng',
        'Bạn có chắc chắn đơn hàng đã được giao cho khách hàng không?',
        [
          { text: 'Chưa', style: 'cancel' },
          {
            text: 'Đã giao hàng',
            onPress: () => markDelivered(activeOrder.id),
          },
        ],
      );
    }
  }

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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            styles.emptyScrollContent,
            { paddingBottom: insets.bottom + TAB_BAR_OFFSET },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor="#FF6B35"
              colors={['#FF6B35']}
            />
          }
        >
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyEmoji}>🛵</Text>
          </View>
          <Text style={styles.emptyTitle}>Chưa có đơn giao hàng</Text>
          <Text style={styles.emptyText}>
            Khi nhận và lấy hàng từ nhà hàng, đơn hàng đang giao sẽ xuất hiện
            tại đây.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + TAB_BAR_OFFSET + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor="#FF6B35"
            colors={['#FF6B35']}
          />
        }
      >
        {/* Tiêu đề */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>TÀI XẾ ĐANG HOẠT ĐỘNG</Text>
            <Text style={styles.title}>Đơn giao hàng</Text>
            <Text style={styles.subtitle}>
              Theo dõi hành trình và liên hệ khách để giao hàng.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerEmoji}>🛵</Text>
          </View>
        </View>

        {/* Bộ chọn đơn khi tài xế có nhiều đơn đang giao */}
        {activeOrders.length > 1 && (
          <View style={styles.orderSelectorContainer}>
            <Text style={styles.orderSelectorLabel}>
              Đang giao ({activeOrders.length} đơn) - Chạm để chọn đơn:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.orderSelectorScroll}
            >
              {activeOrders.map((ord) => {
                const isSelected = ord.id === activeOrder?.id;
                return (
                  <Pressable
                    key={ord.id}
                    style={[
                      styles.orderSelectorTab,
                      isSelected && styles.orderSelectorTabActive,
                    ]}
                    onPress={() => setSelectedOrderId(ord.id)}
                  >
                    <Ionicons
                      name={isSelected ? 'bicycle' : 'bicycle-outline'}
                      size={16}
                      color={isSelected ? '#FFFFFF' : '#FF6B35'}
                    />
                    <Text
                      style={[
                        styles.orderSelectorTabText,
                        isSelected && styles.orderSelectorTabTextActive,
                      ]}
                    >
                      Đơn #{ord.id.slice(0, 8).toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

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

        {/* Thẻ liên hệ khách hàng & Gọi/Nhắn tin */}
        <View style={styles.customerCard}>
          <View style={styles.customerCardHeader}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>
                {customerName[0]?.toUpperCase() ?? 'K'}
              </Text>
            </View>

            <View style={styles.customerInfo}>
              <Text style={styles.customerEyebrow}>KHÁCH HÀNG NHẬN MÓN</Text>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.customerPhone}>
                {customerPhone ? `📞 ${customerPhone}` : 'Chưa có SĐT'}
              </Text>
            </View>
          </View>

          <View style={styles.contactButtonsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.contactButton,
                styles.callButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleCallCustomer}
            >
              <Ionicons name="call" size={18} color="#FFFFFF" />
              <Text style={styles.contactButtonTextWhite}>Gọi khách hàng</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.contactButton,
                styles.chatButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => setIsChatVisible(true)}
            >
              <Ionicons name="chatbubbles" size={18} color="#FF6B35" />
              <Text style={styles.contactButtonTextOrange}>Nhắn tin hẹn gặp</Text>
            </Pressable>
          </View>
        </View>

        {/* Thông tin phương thức thanh toán */}
        <View
          style={[
            styles.paymentCard,
            isCash ? styles.paymentCardCash : styles.paymentCardStripe,
          ]}
        >
          <View style={styles.paymentCardIcon}>
            <Ionicons
              name={isCash ? 'cash' : 'card'}
              size={24}
              color={isCash ? '#16A34A' : '#FF6B35'}
            />
          </View>

          <View style={styles.paymentCardContent}>
            <Text
              style={[
                styles.paymentCardTitle,
                { color: isCash ? '#16A34A' : '#FF6B35' },
              ]}
            >
              {isCash
                ? 'ĐƠN HÀNG THU TIỀN MẶT (COD)'
                : 'ĐÃ THANH TOÁN TRỰC TUYẾN (STRIPE)'}
            </Text>
            <Text style={styles.paymentCardSubtitle}>
              {isCash
                ? `Cần thu: $${Number(activeOrder.totalAmount).toFixed(2)} từ khách`
                : 'Khách đã thanh toán qua thẻ, không thu thêm tiền mặt.'}
            </Text>
          </View>

          {isCash && (
            <View style={styles.cashAmountBadge}>
              <Text style={styles.cashAmountText}>
                ${Number(activeOrder.totalAmount).toFixed(2)}
              </Text>
            </View>
          )}
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
              <Text style={styles.label}>Địa chỉ cụ thể</Text>
              <Text style={styles.value}>
                {activeOrder.deliveryAddress}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>💵</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.label}>Tổng tiền đơn hàng</Text>
              <Text style={styles.amountValue}>
                ${Number(activeOrder.totalAmount).toFixed(2)}
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
            <Text style={styles.trackingTitle}>Theo dõi vị trí</Text>
            <Text style={styles.trackingDescription}>
              Ứng dụng đang phát sóng GPS trực tiếp để khách hàng theo dõi.
            </Text>
          </View>
          <View style={styles.trackingIndicator} />
        </View>

        {/* Xác nhận giao hàng */}
        <View style={styles.actionSection}>
          <Text style={styles.actionTitle}>Đã giao hàng thành công?</Text>
          <Text style={styles.actionDescription}>
            {isCash
              ? 'Thu đủ tiền mặt và bàn giao món cho khách trước khi xác nhận.'
              : 'Chỉ xác nhận sau khi khách hàng đã nhận được đơn hàng.'}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.deliveredButton,
              isPending && styles.disabledButton,
              pressed && !isPending && styles.buttonPressed,
            ]}
            onPress={handleConfirmDelivered}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.deliveredButtonText}>
                ✓  Xác nhận đã giao hàng {isCash ? '(& Đã thu tiền)' : ''}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* Khung chat với khách hàng */}
      <OrderChatModal
        visible={isChatVisible}
        onClose={() => setIsChatVisible(false)}
        orderId={activeOrder?.id ?? ''}
        currentUserName={user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Tài xế'}
        currentUserRole="DRIVER"
        currentUserId={user?.id}
        otherPartyName={customerName}
        otherPartyPhone={customerPhone}
        otherPartyRoleTitle="Khách nhận món"
      />
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
    gap: 16,
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
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: {
    fontSize: 30,
  },

  // Trạng thái banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 20,
    padding: 16,
    gap: 13,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusEmoji: {
    fontSize: 23,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#29232A',
  },
  statusSubtitle: {
    fontSize: 11,
    color: '#8B8289',
    marginTop: 3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0E9FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8256D0',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8256D0',
    letterSpacing: 0.5,
  },

  // Khách hàng Card
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  customerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF6B35',
  },
  customerInfo: {
    flex: 1,
  },
  customerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B8289',
    letterSpacing: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#29232A',
    marginTop: 2,
  },
  customerPhone: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '700',
    marginTop: 2,
  },
  contactButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  contactButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  callButton: {
    backgroundColor: '#16A34A',
  },
  chatButton: {
    backgroundColor: '#FFF0E8',
    borderWidth: 1,
    borderColor: '#FCD8C8',
  },
  contactButtonTextWhite: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  contactButtonTextOrange: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '800',
  },

  // Phương thức thanh toán Card
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 12,
  },
  paymentCardCash: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  paymentCardStripe: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  paymentCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  paymentCardContent: {
    flex: 1,
  },
  paymentCardTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  paymentCardSubtitle: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  cashAmountBadge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  cashAmountText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },

  // Bản đồ
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#29232A',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A36A',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A36A',
    letterSpacing: 0.8,
  },
  mapContainer: {
    height: 250,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    backgroundColor: '#FFFFFF',
  },

  // Chi tiết đơn
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 22,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6B35',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#29232A',
  },
  packageIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageEmoji: {
    fontSize: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#F5ECE7',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 12,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoEmoji: {
    fontSize: 15,
  },
  infoContent: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: '#8B8289',
    marginBottom: 3,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#29232A',
  },
  amountValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FF6B35',
  },

  // Tracking
  trackingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 18,
    padding: 15,
    gap: 12,
  },
  trackingIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF0E8',
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
    color: '#29232A',
  },
  trackingDescription: {
    fontSize: 11,
    color: '#8B8289',
    marginTop: 2,
    lineHeight: 16,
  },
  trackingIndicator: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#16A36A',
  },

  // Action
  actionSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#29232A',
  },
  actionDescription: {
    fontSize: 12,
    color: '#8B8289',
    textAlign: 'center',
    marginBottom: 6,
  },
  deliveredButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#16A36A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A36A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  deliveredButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // Empty state
  emptyScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#29232A',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#8B8289',
    textAlign: 'center',
    maxWidth: 280,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIcon: {
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 14,
    color: '#8B8289',
  },
  orderSelectorContainer: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0E8E3',
  },
  orderSelectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B8289',
    marginBottom: 8,
  },
  orderSelectorScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  orderSelectorTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFF0E8',
    borderWidth: 1,
    borderColor: '#FCD8C8',
  },
  orderSelectorTabActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  orderSelectorTabText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B35',
  },
  orderSelectorTabTextActive: {
    color: '#FFFFFF',
  },
});