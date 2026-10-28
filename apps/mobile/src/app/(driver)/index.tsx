import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { Order } from '@food-delivery/types';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

type DriverOrder = Order & {
  restaurant?: { id: string; name: string };
};

let socket: Socket | null = null;

export default function DriverHomeScreen() {
  const { user } = useAuth();
  const { tr } = useLanguage();
  const queryClient = useQueryClient();
  const [incomingOrder, setIncomingOrder] = useState<DriverOrder | null>(null);

  const { data: status, isLoading } = useQuery<{ isOnline: boolean }>({
    queryKey: ['driver-status'],
    queryFn: () =>
      api.get<{ isOnline: boolean }>('/driver/status').then((r) => r.data),
  });

  const {
    data: driverOrders = [],
    isRefetching: isRefetchingOrders,
    refetch: refetchDriverOrders,
  } = useQuery<DriverOrder[]>({
    queryKey: ['driver-orders'],
    queryFn: () => api.get<DriverOrder[]>('/orders/mine').then((r) => r.data),
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const { mutate: toggleOnline, isPending: toggling } = useMutation({
    mutationFn: () => api.patch('/driver/online'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-status'] });
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
      queryClient.invalidateQueries({ queryKey: ['driver-active-orders'] });
    },
    onError: (e: any) =>
      Alert.alert(
        tr('Không thể cập nhật trạng thái', 'Unable to update status'),
        e?.response?.data?.message ?? tr('Vui lòng thử lại.', 'Please try again.'),
      ),
  });

  const {
    mutate: declineOrder,
    isPending: declining,
    variables: decliningOrderId,
  } = useMutation({
    mutationFn: (orderId: string) =>
      api.post(`/driver/orders/${orderId}/decline`),
    onSuccess: (_data, orderId) => {
      setIncomingOrder((prev) => (prev?.id === orderId ? null : prev));
      queryClient.setQueryData<DriverOrder[]>(['driver-orders'], (old = []) =>
        old.filter((o) => o.id !== orderId),
      );
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
      queryClient.invalidateQueries({ queryKey: ['driver-active-orders'] });
    },
    onError: (e: any) =>
      Alert.alert(
        tr('Không thể từ chối đơn', 'Unable to decline order'),
        e?.response?.data?.message ?? tr('Vui lòng thử lại.', 'Please try again.'),
      ),
  });

  const {
    mutate: acceptOrder,
    isPending: accepting,
    variables: acceptingOrderId,
  } = useMutation({
    mutationFn: (orderId: string) =>
      api.patch<DriverOrder>(`/orders/${orderId}/status`, {
        status: 'PICKED_UP',
      }),
    onSuccess: (response, orderId) => {
      const updatedOrder = response?.data;
      queryClient.setQueryData<DriverOrder[]>(['driver-orders'], (old = []) => {
        const exists = old.some((o) => o.id === orderId);
        if (exists) {
          return old.map((o) =>
            o.id === orderId
              ? { ...o, ...(updatedOrder ?? {}), status: 'PICKED_UP' }
              : o,
          );
        }
        if (incomingOrder && incomingOrder.id === orderId) {
          return [
            { ...incomingOrder, ...(updatedOrder ?? {}), status: 'PICKED_UP' },
            ...old,
          ];
        }
        return old;
      });
      setIncomingOrder(null);
      queryClient.invalidateQueries({ queryKey: ['driver-active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
    },
    onError: (e: any) =>
      Alert.alert(
        tr('Không thể nhận đơn', 'Unable to accept order'),
        e?.response?.data?.message ?? tr('Vui lòng thử lại.', 'Please try again.'),
      ),
  });

  useEffect(() => {
    if (!user?.id) return;

    const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL;

    if (!serverUrl) {
      console.warn('Missing EXPO_PUBLIC_SERVER_URL');
      return;
    }

    const driverSocket: Socket = io(`${serverUrl}/orders`, {
      transports: ['websocket'],
    });

    socket = driverSocket;

    const handleConnect = () => {
      driverSocket.emit('join:driver', user.id);
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
    };

    handleConnect();
    driverSocket.on('connect', handleConnect);

    driverSocket.on('driver:assigned', (order: DriverOrder) => {
      setIncomingOrder(order);
      queryClient.setQueryData<DriverOrder[]>(['driver-orders'], (old = []) => {
        const exists = old.some((o) => o.id === order.id);
        if (exists) {
          return old.map((o) => (o.id === order.id ? { ...o, ...order } : o));
        }
        return [order, ...old];
      });
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
      queryClient.invalidateQueries({ queryKey: ['driver-active-orders'] });
    });

    return () => {
      driverSocket.off('connect', handleConnect);
      driverSocket.disconnect();

      if (socket === driverSocket) {
        socket = null;
      }
    };
  }, [user?.id, queryClient]);

  const notificationOrders = useMemo(() => {
    const map = new Map<string, DriverOrder>();
    if (incomingOrder) {
      map.set(incomingOrder.id, incomingOrder);
    }
    for (const order of driverOrders) {
      const existing = map.get(order.id);
      map.set(order.id, existing ? { ...existing, ...order } : order);
    }

    const priority: Record<string, number> = {
      READY: 0,
      PICKED_UP: 1,
      DELIVERED: 2,
    };

    return Array.from(map.values())
      .filter((o) => ['READY', 'PICKED_UP', 'DELIVERED'].includes(o.status))
      .sort((a, b) => {
        const pa = priority[a.status] ?? 99;
        const pb = priority[b.status] ?? 99;
        if (pa !== pb) return pa - pb;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [incomingOrder, driverOrders]);

  const readyOrders = useMemo(
    () => notificationOrders.filter((o) => o.status === 'READY'),
    [notificationOrders],
  );

  const activeModalOrder = useMemo(() => {
    if (incomingOrder) {
      const synced = notificationOrders.find((o) => o.id === incomingOrder.id);
      if (!synced || synced.status === 'READY') {
        return synced ?? incomingOrder;
      }
    }
    return readyOrders[0] ?? null;
  }, [incomingOrder, notificationOrders, readyOrders]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BURGER_COLORS.primary} />
          <Text style={styles.loadingText}>
            {tr('Đang tải thông tin tài xế...', 'Loading driver dashboard...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOnline = status?.isOnline ?? false;
  const isProcessing = accepting || declining;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingOrders}
            onRefresh={() => {
              void refetchDriverOrders();
            }}
            tintColor={BURGER_COLORS.primary}
            colors={[BURGER_COLORS.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.eyebrow}>
              {tr('ĐỐI TÁC GIAO HÀNG', 'DELIVERY PARTNER')}
            </Text>
            <Text style={styles.driverName}>
              {tr('Xin chào,', 'Hello,')} {user?.firstName || tr('Tài xế', 'Driver')} 👋
            </Text>
            <Text style={styles.subtitle}>
              {tr(
                'Sẵn sàng cho chuyến giao hàng tiếp theo?',
                'Ready for your next delivery trip?',
              )}
            </Text>
          </View>

          <LanguageSwitch />
        </View>

        {/* Trạng thái trực tuyến */}
        <View style={styles.statusCard}>
          <View style={styles.statusTopRow}>
            <View style={styles.statusIcon}>
              <Text style={styles.statusIconText}>
                {isOnline ? '🛵' : '🌙'}
              </Text>
            </View>

            <View style={styles.statusInfo}>
              <Text style={styles.statusCaption}>
                {tr('TRẠNG THÁI HOẠT ĐỘNG', 'WORKING STATUS')}
              </Text>
              <View style={styles.statusTitleRow}>
                <View
                  style={[
                    styles.statusDot,
                    isOnline ? styles.onlineDot : styles.offlineDot,
                  ]}
                />
                <Text
                  style={[
                    styles.statusTitle,
                    { color: isOnline ? BURGER_COLORS.success : BURGER_COLORS.muted },
                  ]}
                >
                  {isOnline
                    ? tr('Đang trực tuyến', 'Online & Active')
                    : tr('Đang ngoại tuyến', 'Offline')}
                </Text>
              </View>
            </View>

            <Switch
              value={isOnline}
              onValueChange={() => toggleOnline()}
              disabled={toggling}
              trackColor={{
                false: BURGER_COLORS.border,
                true: BURGER_COLORS.successLight,
              }}
              thumbColor={isOnline ? BURGER_COLORS.success : BURGER_COLORS.faint}
              accessibilityLabel={tr(
                'Bật hoặc tắt trạng thái trực tuyến',
                'Toggle online status',
              )}
            />
          </View>

          <View style={styles.statusDivider} />

          <View style={styles.statusBottomRow}>
            <Text style={styles.statusDescription}>
              {toggling
                ? tr('Đang cập nhật trạng thái...', 'Updating status...')
                : isOnline
                  ? tr(
                      'Bạn có thể nhận yêu cầu giao hàng mới.',
                      'You are ready to receive new delivery requests.',
                    )
                  : tr(
                      'Bật trực tuyến để bắt đầu nhận đơn hàng.',
                      'Go online to start receiving delivery orders.',
                    )}
            </Text>

            {toggling && (
              <ActivityIndicator size="small" color={BURGER_COLORS.primary} />
            )}
          </View>
        </View>

        {/* Thông báo nhận đơn */}
        <View style={styles.sectionHeader}>
          <View style={styles.notificationTitleRow}>
            <Text style={styles.sectionTitle}>
              {tr('Thông báo nhận đơn', 'Order Notifications')}
            </Text>
            {notificationOrders.length > 0 && (
              <View style={styles.notificationCountBadge}>
                <Text style={styles.notificationCountText}>
                  {notificationOrders.length}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionEmoji}>🔔</Text>
        </View>

        {notificationOrders.length === 0 ? (
          <View style={styles.emptyNotificationCard}>
            <View style={styles.emptyNotificationIcon}>
              <Text style={styles.emptyNotificationEmoji}>📭</Text>
            </View>
            <View style={styles.emptyNotificationContent}>
              <Text style={styles.emptyNotificationTitle}>
                {tr('Chưa có thông báo đơn hàng', 'No order notifications yet')}
              </Text>
              <Text style={styles.emptyNotificationDesc}>
                {tr(
                  'Khi có đơn hàng mới được phân công hoặc đã nhận, thông báo sẽ được lưu giữ tại đây để bạn tiện theo dõi.',
                  'Assigned and accepted delivery orders will stay pinned here for easy tracking.',
                )}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.notificationList}>
            {notificationOrders.map((order) => {
              const isReady = order.status === 'READY';
              const isPickedUp = order.status === 'PICKED_UP';
              const isThisAccepting = accepting && acceptingOrderId === order.id;
              const isThisDeclining = declining && decliningOrderId === order.id;

              return (
                <View
                  key={order.id}
                  style={[
                    styles.notificationCard,
                    isReady && styles.notificationCardReady,
                    isPickedUp && styles.notificationCardActive,
                  ]}
                >
                  <View style={styles.notificationTopRow}>
                    <View
                      style={[
                        styles.notificationBadge,
                        isReady
                          ? styles.badgeReady
                          : isPickedUp
                            ? styles.badgePickedUp
                            : styles.badgeDelivered,
                      ]}
                    >
                      <View
                        style={[
                          styles.badgeDot,
                          {
                            backgroundColor: isReady
                              ? BURGER_COLORS.primary
                              : BURGER_COLORS.success,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.notificationBadgeText,
                          {
                            color: isReady
                              ? BURGER_COLORS.primaryDark
                              : BURGER_COLORS.success,
                          },
                        ]}
                      >
                        {isReady
                          ? tr('ĐƠN HÀNG MỚI • CHỜ NHẬN', 'NEW ORDER • AWAITING ACCEPT')
                          : isPickedUp
                            ? tr('ĐÃ NHẬN ĐƠN • ĐANG GIAO', 'ACCEPTED • DELIVERING')
                            : tr('ĐÃ GIAO THÀNH CÔNG', 'DELIVERED')}
                      </Text>
                    </View>

                    <View style={styles.orderIdBadge}>
                      <Text style={styles.orderIdText}>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {order.restaurant?.name ? (
                    <View style={styles.notificationRestaurantRow}>
                      <Text style={styles.notificationRestaurantLabel}>
                        {tr('NHÀ HÀNG: ', 'RESTAURANT: ')}
                      </Text>
                      <Text
                        style={styles.notificationRestaurantName}
                        numberOfLines={1}
                      >
                        {order.restaurant.name}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.notificationAddressBox}>
                    <View style={styles.addressIcon}>
                      <Text style={styles.addressEmoji}>📍</Text>
                    </View>
                    <View style={styles.notificationAddressContent}>
                      <Text style={styles.notificationAddressLabel}>
                        {tr('ĐỊA CHỈ GIAO HÀNG', 'DELIVERY ADDRESS')}
                      </Text>
                      <Text style={styles.addressText}>
                        {order.deliveryAddress || tr('Chưa có địa chỉ', 'No address')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.notificationFooter}>
                    <View>
                      <Text style={styles.notificationTotalLabel}>
                        {tr('TỔNG GIÁ TRỊ ĐƠN', 'ORDER TOTAL')}
                      </Text>
                      <Text style={styles.notificationTotalValue}>
                        ${Number(order.totalAmount ?? 0).toFixed(2)}
                      </Text>
                    </View>

                    {isReady ? (
                      <View style={styles.notificationActionRow}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.inlineDeclineBtn,
                            pressed && styles.declinePressed,
                            isProcessing && styles.buttonDisabled,
                          ]}
                          disabled={isProcessing}
                          onPress={() => declineOrder(order.id)}
                        >
                          {isThisDeclining ? (
                            <ActivityIndicator size="small" color={BURGER_COLORS.danger} />
                          ) : (
                            <Text style={styles.inlineDeclineText}>
                              {tr('Từ chối', 'Decline')}
                            </Text>
                          )}
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [
                            styles.inlineAcceptBtn,
                            pressed && styles.buttonPressed,
                            isProcessing && styles.buttonDisabled,
                          ]}
                          disabled={isProcessing}
                          onPress={() => acceptOrder(order.id)}
                        >
                          {isThisAccepting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.inlineAcceptText}>
                              {tr('✓ Nhận đơn', '✓ Accept')}
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    ) : isPickedUp ? (
                      <Pressable
                        style={({ pressed }) => [
                          styles.goActiveBtn,
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={() => router.push('/(driver)/active')}
                      >
                        <Text style={styles.goActiveBtnText}>
                          {tr('Theo dõi giao hàng →', 'Track Delivery →')}
                        </Text>
                      </Pressable>
                    ) : (
                      <View style={styles.completedTag}>
                        <Text style={styles.completedTagText}>
                          {tr('✓ Đã hoàn tất', '✓ Completed')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Hướng dẫn */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {tr('Bắt đầu giao hàng', 'Quick Guide')}
          </Text>
          <Text style={styles.sectionEmoji}>🍔</Text>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Text style={styles.tipEmoji}>📦</Text>
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>
              {tr('Nhận đơn hàng mới', 'Accept New Orders')}
            </Text>
            <Text style={styles.tipDescription}>
              {tr(
                'Khi nhà hàng phân công đơn cho bạn, thông báo sẽ xuất hiện ngay trên màn hình. Hãy kiểm tra địa chỉ và tổng tiền trước khi nhận.',
                'When a restaurant assigns an order to you, a notification pops up immediately. Review the address and total before accepting.',
              )}
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Text style={styles.tipEmoji}>📍</Text>
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>
              {tr('Theo dõi chuyến giao', 'Track Active Trip')}
            </Text>
            <Text style={styles.tipDescription}>
              {tr(
                'Sau khi nhận đơn, mở mục Đang giao để theo dõi bản đồ và hoàn tất chuyến giao hàng.',
                'After accepting an order, open the Active tab to view the live map and complete the delivery.',
              )}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal đơn hàng mới */}
      <Modal
        visible={!!activeModalOrder}
        transparent
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeaderIcon}>
              <Text style={styles.modalEmoji}>🛵</Text>
            </View>

            <Text style={styles.modalEyebrow}>
              {tr('CÓ ĐƠN HÀNG MỚI', 'NEW DELIVERY REQUEST')}
            </Text>
            <Text style={styles.modalTitle}>
              {tr('Yêu cầu giao hàng', 'Incoming Delivery')}
            </Text>
            <Text style={styles.modalSubtitle}>
              {tr(
                'Kiểm tra thông tin trước khi xác nhận',
                'Review the order details before confirming',
              )}
            </Text>

            <View style={styles.orderDetails}>
              <View style={styles.orderIdRow}>
                <Text style={styles.orderLabel}>
                  {tr('Mã đơn hàng', 'Order ID')}
                </Text>
                <View style={styles.orderIdBadge}>
                  <Text style={styles.orderIdText}>
                    #{activeModalOrder?.id.slice(0, 8).toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDivider} />

              <Text style={styles.orderLabel}>
                {tr('ĐỊA CHỈ GIAO HÀNG', 'DELIVERY ADDRESS')}
              </Text>
              <View style={styles.addressRow}>
                <View style={styles.addressIcon}>
                  <Text style={styles.addressEmoji}>📍</Text>
                </View>
                <Text style={styles.addressText}>
                  {activeModalOrder?.deliveryAddress ||
                    tr('Chưa có địa chỉ', 'No address')}
                </Text>
              </View>

              <View style={styles.orderDivider} />

              <Text style={styles.orderLabel}>
                {tr('TỔNG GIÁ TRỊ ĐƠN HÀNG', 'ORDER TOTAL')}
              </Text>
              <Text style={styles.orderTotal}>
                ${Number(activeModalOrder?.totalAmount ?? 0).toFixed(2)}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.acceptButton,
                pressed && styles.buttonPressed,
                isProcessing && styles.buttonDisabled,
              ]}
              disabled={isProcessing}
              onPress={() => {
                if (activeModalOrder) acceptOrder(activeModalOrder.id);
              }}
            >
              {accepting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.acceptButtonText}>✓</Text>
                  <Text style={styles.acceptButtonText}>
                    {tr('Nhận đơn hàng', 'Accept Order')}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.declineButton,
                pressed && styles.declinePressed,
                isProcessing && styles.buttonDisabled,
              ]}
              disabled={isProcessing}
              onPress={() => {
                if (activeModalOrder) declineOrder(activeModalOrder.id);
              }}
            >
              {declining ? (
                <ActivityIndicator color={BURGER_COLORS.danger} />
              ) : (
                <Text style={styles.declineButtonText}>
                  {tr('Từ chối đơn', 'Decline Order')}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BURGER_COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: BURGER_COLORS.background,
  },
  loadingText: {
    fontSize: 13,
    color: BURGER_COLORS.muted,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 35,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: BURGER_COLORS.primary,
    marginBottom: 4,
  },
  driverName: {
    fontSize: 25,
    fontWeight: '900',
    color: BURGER_COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: BURGER_COLORS.muted,
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 22,
  },
  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconText: {
    fontSize: 22,
  },
  statusInfo: {
    flex: 1,
  },
  statusCaption: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: BURGER_COLORS.muted,
    marginBottom: 5,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineDot: {
    backgroundColor: BURGER_COLORS.success,
  },
  offlineDot: {
    backgroundColor: BURGER_COLORS.faint,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusDivider: {
    height: 1,
    backgroundColor: BURGER_COLORS.border,
    marginVertical: 14,
  },
  statusBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusDescription: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: BURGER_COLORS.muted,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationCountBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    backgroundColor: BURGER_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  emptyNotificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 18,
    padding: 15,
    marginBottom: 22,
  },
  emptyNotificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotificationEmoji: {
    fontSize: 20,
  },
  emptyNotificationContent: {
    flex: 1,
  },
  emptyNotificationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: BURGER_COLORS.text,
    marginBottom: 3,
  },
  emptyNotificationDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: BURGER_COLORS.muted,
  },
  notificationList: {
    gap: 12,
    marginBottom: 24,
  },
  notificationCard: {
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 18,
    padding: 15,
  },
  notificationCardReady: {
    borderColor: BURGER_COLORS.primary,
    borderWidth: 1.5,
  },
  notificationCardActive: {
    borderColor: BURGER_COLORS.success,
    borderWidth: 1.5,
  },
  notificationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  notificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeReady: {
    backgroundColor: BURGER_COLORS.primaryLight,
  },
  badgePickedUp: {
    backgroundColor: BURGER_COLORS.successLight,
  },
  badgeDelivered: {
    backgroundColor: BURGER_COLORS.successLight,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  notificationRestaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  notificationRestaurantLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: BURGER_COLORS.muted,
  },
  notificationRestaurantName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  notificationAddressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: BURGER_COLORS.surfaceMuted,
    borderRadius: 13,
    padding: 12,
    marginBottom: 12,
  },
  notificationAddressContent: {
    flex: 1,
  },
  notificationAddressLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: BURGER_COLORS.muted,
    marginBottom: 3,
    padding:1
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BURGER_COLORS.border,
  },
  notificationTotalLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: BURGER_COLORS.muted,
    marginBottom: 2,
  },
  notificationTotalValue: {
    fontSize: 19,
    fontWeight: '900',
    color: BURGER_COLORS.primary,
  },
  notificationActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineDeclineBtn: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    backgroundColor: BURGER_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineDeclineText: {
    fontSize: 12,
    fontWeight: '800',
    color: BURGER_COLORS.danger,
  },
  inlineAcceptBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: BURGER_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAcceptText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  goActiveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: BURGER_COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goActiveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  completedTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: BURGER_COLORS.successLight,
  },
  completedTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: BURGER_COLORS.success,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  sectionEmoji: {
    fontSize: 18,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  tipIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipEmoji: {
    fontSize: 20,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: BURGER_COLORS.text,
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: BURGER_COLORS.muted,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(44, 26, 17, 0.5)',
  },
  modal: {
    backgroundColor: BURGER_COLORS.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BURGER_COLORS.border,
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalEmoji: {
    fontSize: 28,
  },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: BURGER_COLORS.primary,
    textAlign: 'center',
    marginBottom: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: BURGER_COLORS.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: BURGER_COLORS.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  orderDetails: {
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 18,
    padding: 15,
    marginBottom: 16,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  orderLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: BURGER_COLORS.muted,
    marginBottom: 6,
  },
  orderIdBadge: {
    backgroundColor: BURGER_COLORS.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  orderIdText: {
    fontSize: 11,
    fontWeight: '800',
    color: BURGER_COLORS.primaryDark,
  },
  orderDivider: {
    height: 1,
    backgroundColor: BURGER_COLORS.border,
    marginVertical: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  addressIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressEmoji: {
    fontSize: 15,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: BURGER_COLORS.text,
    paddingTop: 2,
  },
  orderTotal: {
    fontSize: 24,
    fontWeight: '900',
    color: BURGER_COLORS.primary,
  },
  acceptButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BURGER_COLORS.primary,
    borderRadius: 15,
    padding: 14,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  declineButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 15,
    padding: 13,
    marginTop: 10,
  },
  declinePressed: {
    opacity: 0.88,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: BURGER_COLORS.danger,
  },
});
