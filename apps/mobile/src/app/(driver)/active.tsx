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

const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FFF0E8',
  green: '#16A34A',
  greenLight: '#DCFCE7',
  text: '#29232A',
  muted: '#8B8289',
  border: '#F0E8E3',
  background: '#FFF9F5',
  white: '#FFFFFF',
  card: '#FFFFFF',
};

export default function DriverActiveScreen() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_OFFSET = 88;

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const socketRef = useRef<Socket | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const [driverCoords, setDriverCoords] = useState(DEFAULT_COORDS);

  // Khung chat với Nhà hàng (Chặng 1) & Khách hàng (Chặng 2)
  const [isRestaurantChatVisible, setIsRestaurantChatVisible] = useState(false);
  const [isCustomerChatVisible, setIsCustomerChatVisible] = useState(false);

  // Lấy danh sách các đơn đang hoạt động (gồm READY - Chặng 1 lấy món & PICKED_UP - Chặng 2 giao khách)
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
        .then((r) =>
          r.data.filter((o) => ['READY', 'PICKED_UP'].includes(o.status)),
        ),
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

  // Chặng 1: Xác nhận đã lấy hàng tại quán (READY -> PICKED_UP)
  const { mutate: markPickedUp, isPending: isPickingUp } = useMutation({
    mutationFn: (orderId: string) =>
      api.patch(`/orders/${orderId}/status`, {
        status: 'PICKED_UP',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['driver-active-orders'],
      });
      queryClient.invalidateQueries({
        queryKey: ['driver-orders'],
      });
      Alert.alert(
        'Đã nhận món từ quán!',
        'Chặng 1 hoàn tất. Bây giờ bạn đang trong Chặng 2: Giao hàng cho khách!',
      );
    },
    onError: (e: any) =>
      Alert.alert(
        'Không thể cập nhật',
        e?.response?.data?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.',
      ),
  });

  // Chặng 2 (Chặng cuối): Xác nhận đã giao hàng cho khách (PICKED_UP -> DELIVERED)
  const { mutate: markDelivered, isPending: isDelivering } = useMutation({
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
        'Giao hàng thành công!',
        'Đơn hàng đã được xác nhận giao thành công cho khách hàng.',
      );
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

  const isReady = activeOrder?.status === 'READY';
  const isPickedUp = activeOrder?.status === 'PICKED_UP';

  // Thông tin nhà hàng (Chặng 1)
  const restaurant = (activeOrder as any)?.restaurant;
  const restaurantName = restaurant?.name || 'Nhà hàng đối tác';
  const restaurantAddress = restaurant?.address || 'Chưa có địa chỉ quán';
  const restaurantPhone = restaurant?.phone ?? null;

  // Thông tin khách hàng (Chặng 2)
  const customer = (activeOrder as any)?.customer;
  const customerName = customer
    ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || 'Khách hàng'
    : 'Khách hàng';
  const customerPhone = customer?.phone ?? null;
  const deliveryAddress = activeOrder?.deliveryAddress || 'Chưa có địa chỉ giao';

  const items = activeOrder?.items ?? [];
  const note = activeOrder?.note;
  const isCash = activeOrder?.paymentMethod === 'CASH';

  function handleCallRestaurant() {
    if (!restaurantPhone?.trim()) {
      Alert.alert(
        'Chưa có số điện thoại',
        'Nhà hàng chưa cập nhật số điện thoại. Bạn có thể bấm nút "Nhắn tin với quán" để trao đổi nhé!',
      );
      return;
    }
    const cleanPhone = restaurantPhone.trim().replace(/\s+/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở ứng dụng cuộc gọi.');
    });
  }

  function handleCallCustomer() {
    if (!customerPhone?.trim()) {
      Alert.alert(
        'Chưa có số điện thoại',
        'Khách hàng chưa cập nhật số điện thoại. Bạn có thể bấm nút "Nhắn tin với khách" để trao đổi nhé!',
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
        'Bạn có chắc chắn đơn hàng đã được giao thành công cho khách hàng không?',
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
          <Text style={styles.emptyTitle}>Chưa có đơn đang nhận</Text>
          <Text style={styles.emptyText}>
            Khi bạn nhận đơn hàng ở trạng thái sẵn sàng, đơn hàng sẽ hiển thị tại
            đây theo hành trình 2 chặng: lấy hàng tại quán và giao cho khách.
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
          { paddingBottom: insets.bottom + TAB_BAR_OFFSET + 24 },
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>TÀI XẾ ĐANG HOẠT ĐỘNG</Text>
            <Text style={styles.title}>Đơn giao hàng</Text>
            <Text style={styles.subtitle}>
              {isReady
                ? 'Chặng 1: Đến quán nhận món và kiểm tra đơn hàng.'
                : 'Chặng 2: Đang giao món ăn đến địa chỉ khách hàng.'}
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerEmoji}>{isReady ? '🏪' : '🛵'}</Text>
          </View>
        </View>

        {/* Bộ chọn đơn khi tài xế có nhiều đơn */}
        {activeOrders.length > 1 && (
          <View style={styles.orderSelectorContainer}>
            <Text style={styles.orderSelectorLabel}>
              Đơn đang hoạt động ({activeOrders.length} đơn) - Chạm để chọn:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.orderSelectorScroll}
            >
              {activeOrders.map((ord) => {
                const isSelected = ord.id === activeOrder?.id;
                const ordReady = ord.status === 'READY';
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
                      name={ordReady ? 'storefront' : 'bicycle'}
                      size={15}
                      color={isSelected ? '#FFFFFF' : '#FF6B35'}
                    />
                    <Text
                      style={[
                        styles.orderSelectorTabText,
                        isSelected && styles.orderSelectorTabTextActive,
                      ]}
                    >
                      #{ord.id.slice(0, 8).toUpperCase()}{' '}
                      {ordReady ? '(Chờ lấy)' : '(Đang giao)'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ======================================================= */}
        {/* THANH TIẾN TRÌNH 2 CHẶNG TRỰC QUAN                      */}
        {/* ======================================================= */}
        <View style={styles.twoStageCard}>
          <Text style={styles.twoStageHeaderLabel}>HÀNH TRÌNH 2 CHẶNG GIAO NHẬN</Text>
          <View style={styles.stagesRow}>
            {/* Chặng 1 */}
            <View style={[styles.stageBox, isReady && styles.stageBoxActive]}>
              <View
                style={[
                  styles.stageBadge,
                  isPickedUp
                    ? styles.badgeCompleted
                    : isReady
                      ? styles.badgeActive
                      : styles.badgePending,
                ]}
              >
                {isPickedUp ? (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                ) : (
                  <Text style={styles.badgeNumberText}>1</Text>
                )}
              </View>
              <View style={styles.stageTextCol}>
                <Text
                  style={[
                    styles.stageTitle,
                    (isReady || isPickedUp) && styles.stageTitleActive,
                  ]}
                >
                  Lấy tại quán
                </Text>
                <Text style={styles.stageStatusDesc}>
                  {isPickedUp ? '✓ Đã nhận món' : 'Đang đến quán lấy'}
                </Text>
              </View>
            </View>

            {/* Mũi tên kết nối */}
            <View style={styles.stageConnector}>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={isPickedUp ? COLORS.green : '#C9BFB9'}
              />
            </View>

            {/* Chặng 2 */}
            <View style={[styles.stageBox, isPickedUp && styles.stageBoxActive]}>
              <View
                style={[
                  styles.stageBadge,
                  isPickedUp ? styles.badgeActive : styles.badgePending,
                ]}
              >
                <Text style={styles.badgeNumberText}>2</Text>
              </View>
              <View style={styles.stageTextCol}>
                <Text
                  style={[
                    styles.stageTitle,
                    isPickedUp && styles.stageTitleActive,
                  ]}
                >
                  Giao cho khách
                </Text>
                <Text style={styles.stageStatusDesc}>
                  {isPickedUp ? 'Đang đi giao' : 'Chờ nhận món'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ======================================================= */}
        {/* CHẶNG 1: THÔNG TIN NHÀ HÀNG & LIÊN HỆ QUÁN             */}
        {/* ======================================================= */}
        {isReady ? (
          <View style={[styles.sectionCard, styles.sectionCardHighlight]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIconBox}>
                <Ionicons name="restaurant" size={20} color="#FF6B35" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardEyebrowRow}>
                  <Text style={styles.cardEyebrow}>CHẶNG 1 · ĐIỂM LẤY HÀNG</Text>
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>ĐANG THỰC HIỆN</Text>
                  </View>
                </View>
                <Text style={styles.cardMainTitle}>{restaurantName}</Text>
                <Text style={styles.cardSubText} numberOfLines={2}>
                  📍 {restaurantAddress}
                </Text>
              </View>
            </View>

            {/* Hàng nút Gọi & Nhắn tin với Nhà hàng */}
            <View style={styles.contactRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.contactBtn,
                  styles.callBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={handleCallRestaurant}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
                <Text style={styles.callBtnText}>Gọi quán</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.contactBtn,
                  styles.chatBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => setIsRestaurantChatVisible(true)}
              >
                <Ionicons
                  name="chatbubble-ellipses"
                  size={16}
                  color="#FF6B35"
                />
                <Text style={styles.chatBtnText}>Nhắn tin với quán</Text>
              </Pressable>
            </View>

            {/* Nút hành động hoàn thành Chặng 1 */}
            <View style={styles.stageActionContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryActionButton,
                  styles.pickupActionButton,
                  isPickingUp && styles.btnDisabled,
                  pressed && !isPickingUp && styles.btnPressed,
                ]}
                disabled={isPickingUp}
                onPress={() => {
                  Alert.alert(
                    'Xác nhận đã lấy hàng',
                    `Bạn đã nhận đủ ${items.length || 'các'} món từ "${restaurantName}" và chuẩn bị đi giao chưa?`,
                    [
                      { text: 'Chưa', style: 'cancel' },
                      {
                        text: 'Đã nhận đủ món',
                        onPress: () => markPickedUp(activeOrder.id),
                      },
                    ],
                  );
                }}
              >
                {isPickingUp ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="bag-check" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryActionButtonText}>
                      ✓ Xác nhận đã lấy hàng tại quán
                    </Text>
                  </>
                )}
              </Pressable>
              <Text style={styles.stageActionHint}>
                Bấm xác nhận sau khi quán đã bàn giao đủ món cho bạn để chuyển sang Chặng 2.
              </Text>
            </View>
          </View>
        ) : (
          /* Chặng 1 đã hoàn thành */
          <View style={styles.stageCompletedCard}>
            <View style={styles.stageCompletedIcon}>
              <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stageCompletedEyebrow}>CHẶNG 1: ĐÃ LẤY HÀNG XONG</Text>
              <Text style={styles.stageCompletedName}>{restaurantName}</Text>
              <Text style={styles.stageCompletedAddress} numberOfLines={1}>
                📍 {restaurantAddress}
              </Text>
            </View>
            {restaurantPhone ? (
              <Pressable style={styles.miniCallBtn} onPress={handleCallRestaurant}>
                <Ionicons name="call" size={12} color="#FFFFFF" />
                <Text style={styles.miniCallText}>Gọi quán</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {/* ======================================================= */}
        {/* CHẶNG 2: THÔNG TIN KHÁCH HÀNG & GIAO HÀNG (CHẶNG CUỐI) */}
        {/* ======================================================= */}
        {isPickedUp ? (
          <View style={[styles.sectionCard, styles.sectionCardHighlight]}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.cardHeaderIconBox,
                  { backgroundColor: '#DCFCE7' },
                ]}
              >
                <Ionicons name="person" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardEyebrowRow}>
                  <Text style={styles.cardEyebrow}>CHẶNG 2 · ĐIỂM GIAO KHÁCH</Text>
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>ĐANG GIAO HÀNG</Text>
                  </View>
                </View>
                <Text style={styles.cardMainTitle}>{customerName}</Text>
                <Text style={styles.cardSubText} numberOfLines={2}>
                  📍 {deliveryAddress}
                </Text>
                {customerPhone ? (
                  <Text style={styles.customerPhoneText}>
                    📞 {customerPhone}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Hàng nút Gọi & Nhắn tin với Khách hàng */}
            <View style={styles.contactRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.contactBtn,
                  styles.callBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={handleCallCustomer}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
                <Text style={styles.callBtnText}>Gọi khách hàng</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.contactBtn,
                  styles.chatBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => setIsCustomerChatVisible(true)}
              >
                <Ionicons
                  name="chatbubble-ellipses"
                  size={16}
                  color="#FF6B35"
                />
                <Text style={styles.chatBtnText}>Nhắn tin với khách</Text>
              </Pressable>
            </View>

            {/* Thông tin phương thức thanh toán */}
            <View
              style={[
                styles.paymentBanner,
                isCash ? styles.paymentBannerCash : styles.paymentBannerStripe,
              ]}
            >
              <Ionicons
                name={isCash ? 'cash-outline' : 'card-outline'}
                size={20}
                color={isCash ? '#16A34A' : '#FF6B35'}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.paymentTitle,
                    { color: isCash ? '#16A34A' : '#FF6B35' },
                  ]}
                >
                  {isCash
                    ? `THU TIỀN MẶT KHI GIAO: $${Number(activeOrder.totalAmount).toFixed(2)}`
                    : 'ĐÃ THANH TOÁN TRỰC TUYẾN (STRIPE)'}
                </Text>
                <Text style={styles.paymentSubtitle}>
                  {isCash
                    ? 'Vui lòng thu đủ tiền mặt từ khách hàng trước khi bàn giao món ăn.'
                    : 'Khách đã thanh toán trực tuyến qua thẻ, không thu thêm tiền mặt.'}
                </Text>
              </View>
            </View>

            {/* Nút hành động hoàn thành Chặng 2 (Chặng cuối) */}
            <View style={styles.stageActionContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryActionButton,
                  styles.deliveredActionButton,
                  isDelivering && styles.btnDisabled,
                  pressed && !isDelivering && styles.btnPressed,
                ]}
                disabled={isDelivering}
                onPress={handleConfirmDelivered}
              >
                {isDelivering ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.primaryActionButtonText}>
                      ✓ Xác nhận đã giao cho khách {isCash ? '(& Thu tiền)' : ''}
                    </Text>
                  </>
                )}
              </Pressable>
              <Text style={styles.stageActionHint}>
                {isCash
                  ? 'Chỉ bấm xác nhận sau khi đã nhận đủ tiền mặt và trao món cho khách.'
                  : 'Chỉ bấm xác nhận khi khách đã nhận được đầy đủ đơn hàng.'}
              </Text>
            </View>
          </View>
        ) : (
          /* Chặng 2 khi đang ở Chặng 1 (Khoá/Chờ hoàn thành Chặng 1) */
          <View style={styles.stageLockedCard}>
            <View style={styles.stageLockedIcon}>
              <Ionicons name="lock-closed" size={20} color="#A1989E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stageLockedEyebrow}>CHẶNG 2 · GIAO CHO KHÁCH</Text>
              <Text style={styles.stageLockedTitle}>Chưa mở chặng giao hàng</Text>
              <Text style={styles.stageLockedDesc}>
                Bạn cần đến lấy món tại quán và bấm "Xác nhận đã lấy hàng tại quán" ở Chặng 1 trước để mở thông tin giao hàng và liên hệ khách.
              </Text>
            </View>
          </View>
        )}

        {/* ======================================================= */}
        {/* CHI TIẾT ĐƠN HÀNG ĐỐI SOÁT (MÓN ĂN & GHI CHÚ)            */}
        {/* ======================================================= */}
        <View style={styles.dishesCard}>
          <View style={styles.dishesCardHeader}>
            <View style={styles.dishesHeaderIcon}>
              <Ionicons name="fast-food-outline" size={19} color="#FF6B35" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dishesCardTitle}>
                Chi tiết món ăn đối soát ({items.length} món)
              </Text>
              <Text style={styles.dishesCardSubtitle}>
                Kiểm tra đúng số lượng món khi nhận tại quán & khi giao khách
              </Text>
            </View>
          </View>

          {/* Danh sách từng món */}
          <View style={styles.dishesList}>
            {items.map((it: any, index: number) => {
              const q = Number(it.quantity ?? 1);
              const name =
                it.menuItem?.name ?? it.name ?? `Món ăn #${index + 1}`;
              const price = Number(it.unitPrice ?? it.menuItem?.price ?? 0);
              return (
                <View key={it.id ?? index} style={styles.dishItemRow}>
                  <View style={styles.dishQuantityBadge}>
                    <Text style={styles.dishQuantityText}>{q}x</Text>
                  </View>
                  <Text style={styles.dishNameText} numberOfLines={2}>
                    {name}
                  </Text>
                  <Text style={styles.dishPriceText}>
                    ${(q * price).toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Ghi chú của khách */}
          {note ? (
            <View style={styles.driverNoteBox}>
              <Ionicons name="alert-circle" size={18} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={styles.driverNoteLabel}>
                  Ghi chú của khách hàng:
                </Text>
                <Text style={styles.driverNoteText}>"{note}"</Text>
              </View>
            </View>
          ) : null}

          {/* Tổng giá trị đơn hàng */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng giá trị đơn hàng:</Text>
            <Text style={styles.totalValue}>
              ${Number(activeOrder.totalAmount).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* ======================================================= */}
        {/* BẢN ĐỒ VÀ GPS THEO DÕI TRỰC TIẾP (KHI ĐANG ĐI GIAO)     */}
        {/* ======================================================= */}
        {isPickedUp ? (
          <>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionHeadingTitle}>Vị trí và GPS trực tiếp</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>GPS LIVE</Text>
              </View>
            </View>

            <View style={styles.mapContainer}>
              <DeliveryMap
                latitude={driverCoords.latitude}
                longitude={driverCoords.longitude}
              />
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Khung chat CHẶNG 1: Tài xế và Nhà hàng */}
      <OrderChatModal
        visible={isRestaurantChatVisible}
        onClose={() => setIsRestaurantChatVisible(false)}
        orderId={activeOrder.id}
        currentUserName={
          user
            ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
            : 'Tài xế'
        }
        currentUserRole="DRIVER"
        currentUserId={user?.id}
        otherPartyName={restaurantName}
        otherPartyPhone={restaurantPhone}
        otherPartyRoleTitle="Nhà hàng đối tác"
        chatMode="RESTAURANT"
      />

      {/* Khung chat CHẶNG 2: Tài xế và Khách hàng */}
      <OrderChatModal
        visible={isCustomerChatVisible}
        onClose={() => setIsCustomerChatVisible(false)}
        orderId={activeOrder.id}
        currentUserName={
          user
            ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
            : 'Tài xế'
        }
        currentUserRole="DRIVER"
        currentUserId={user?.id}
        otherPartyName={customerName}
        otherPartyPhone={customerPhone}
        otherPartyRoleTitle="Khách nhận món"
        chatMode="CUSTOMER"
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
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 14,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  emptyScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 34,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 28,
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
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
    lineHeight: 18,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: {
    fontSize: 22,
  },

  // Selector
  orderSelectorContainer: {
    gap: 8,
  },
  orderSelectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  orderSelectorScroll: {
    gap: 8,
  },
  orderSelectorTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
  },
  orderSelectorTabActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  orderSelectorTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
  },
  orderSelectorTabTextActive: {
    color: '#FFFFFF',
  },

  // Two-Stage Progress Card
  twoStageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    shadowColor: '#29232A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  twoStageHeaderLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#8B8289',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  stagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 12,
  },
  stageBoxActive: {
    backgroundColor: '#FFF9F5',
  },
  stageBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: '#FF6B35',
  },
  badgeCompleted: {
    backgroundColor: COLORS.green,
  },
  badgePending: {
    backgroundColor: '#E7DDD8',
  },
  badgeNumberText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stageTextCol: {
    flex: 1,
  },
  stageTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B8289',
  },
  stageTitleActive: {
    color: COLORS.text,
  },
  stageStatusDesc: {
    fontSize: 10,
    color: '#8B8289',
    marginTop: 1,
  },
  stageConnector: {
    paddingHorizontal: 4,
  },

  // Section Cards (Nhà hàng / Khách hàng)
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    gap: 12,
    shadowColor: '#29232A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionCardHighlight: {
    borderColor: '#FFD3C0',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  cardHeaderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF6B35',
    letterSpacing: 0.6,
  },
  activePill: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  donePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  donePillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#16A34A',
  },
  waitingPill: {
    backgroundColor: '#F3ECEA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  waitingPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8B8289',
  },
  cardMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  cardSubText: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
    lineHeight: 17,
  },
  customerPhoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.green,
    marginTop: 3,
  },

  // Contact Buttons (Gọi / Nhắn tin)
  contactRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE7',
  },
  contactBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callBtn: {
    backgroundColor: COLORS.green,
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chatBtn: {
    backgroundColor: '#FFF0E8',
    borderWidth: 1,
    borderColor: '#FCD8C8',
  },
  chatBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B35',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Primary Action Buttons for Stages
  stageActionContainer: {
    gap: 6,
    marginTop: 4,
  },
  primaryActionButton: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickupActionButton: {
    backgroundColor: '#16A34A',
  },
  deliveredActionButton: {
    backgroundColor: '#FF6B35',
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  stageActionHint: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
  },

  // Payment banner
  paymentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  paymentBannerCash: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  paymentBannerStripe: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  paymentSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
    lineHeight: 15,
  },

  // Dishes Card
  dishesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    gap: 12,
    shadowColor: '#29232A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  dishesCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dishesHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishesCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  dishesCardSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  dishesList: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE7',
    paddingTop: 10,
  },
  dishItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dishQuantityBadge: {
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dishQuantityText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B35',
  },
  dishNameText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  dishPriceText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  driverNoteBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  driverNoteLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  driverNoteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    marginTop: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE7',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.muted,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FF6B35',
  },

  // Map & Live
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeadingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#16A34A',
  },
  mapContainer: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0E8E3',
  },

  // Chặng 1 đã hoàn thành (thu gọn)
  stageCompletedCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stageCompletedIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageCompletedEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    color: '#16A34A',
    letterSpacing: 0.8,
  },
  stageCompletedName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  stageCompletedAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  miniCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  miniCallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Chặng 2 chưa mở (Locked)
  stageLockedCard: {
    backgroundColor: '#F8F6F4',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAE2DC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stageLockedIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECE5E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageLockedEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    color: '#8B8289',
    letterSpacing: 0.8,
  },
  stageLockedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#60585E',
    marginTop: 2,
  },
  stageLockedDesc: {
    fontSize: 11,
    color: '#8B8289',
    marginTop: 2,
    lineHeight: 16,
  },
});
