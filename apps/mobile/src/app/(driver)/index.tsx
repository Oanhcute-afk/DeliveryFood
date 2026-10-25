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

type DriverOrder = Order & {
  restaurant?: { id: string; name: string };
};

let socket: Socket | null = null;

export default function DriverHomeScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [incomingOrder, setIncomingOrder] = useState<DriverOrder | null>(null);

  const { data: status, isLoading } = useQuery<{ isOnline: boolean }>({
    queryKey: ['driver-status'],
    queryFn: () =>
      api.get<{ isOnline: boolean }>('/driver/status').then((r) => r.data),
  });

  // Lấy danh sách đơn hàng của tài xế từ server để giữ lại thông báo không bị mất khi tải lại / chuyển tab
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
        'Không thể cập nhật trạng thái',
        e?.response?.data?.message ?? 'Vui lòng thử lại.',
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
        'Không thể từ chối đơn',
        e?.response?.data?.message ?? 'Vui lòng thử lại.',
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
      // Cập nhật đơn sang trạng thái PICKED_UP trong bộ nhớ đệm để thông báo đơn đã nhận luôn được giữ lại trên màn hình
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
        'Không thể nhận đơn',
        e?.response?.data?.message ?? 'Vui lòng thử lại.',
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

  // Hợp nhất thông báo từ socket và danh sách đơn từ server để không bao giờ bị mất thông báo
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

  // Đơn hàng hiển thị trong Modal: ưu tiên đơn vừa nhận qua socket hoặc đơn READY đang chờ xác nhận từ server
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
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Đang tải thông tin tài xế...</Text>
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
            tintColor="#FF6B35"
            colors={['#FF6B35']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.eyebrow}>FOOD DELIVERY</Text>
            <Text style={styles.title}>Xin chào,</Text>
            <Text style={styles.driverName}>
              {user?.firstName || 'Tài xế'} 👋
            </Text>
            <Text style={styles.subtitle}>
              Sẵn sàng cho chuyến giao hàng tiếp theo?
            </Text>
          </View>

          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {user?.firstName?.[0]?.toUpperCase() ?? 'D'}
            </Text>
          </View>
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
              <Text style={styles.statusCaption}>TRẠNG THÁI HOẠT ĐỘNG</Text>
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
                    { color: isOnline ? '#218653' : '#827780' },
                  ]}
                >
                  {isOnline ? 'Đang trực tuyến' : 'Đang ngoại tuyến'}
                </Text>
              </View>
            </View>

            <Switch
              value={isOnline}
              onValueChange={() => toggleOnline()}
              disabled={toggling}
              trackColor={{ false: '#E9DFDA', true: '#A8E5C2' }}
              thumbColor={isOnline ? '#22A566' : '#B7ACB2'}
              accessibilityLabel="Bật hoặc tắt trạng thái trực tuyến"
            />
          </View>

          <View style={styles.statusDivider} />

          <View style={styles.statusBottomRow}>
            <Text style={styles.statusDescription}>
              {toggling
                ? 'Đang cập nhật trạng thái...'
                : isOnline
                  ? 'Bạn có thể nhận yêu cầu giao hàng mới.'
                  : 'Bật trực tuyến để bắt đầu nhận đơn hàng.'}
            </Text>

            {toggling && (
              <ActivityIndicator size="small" color="#FF6B35" />
            )}
          </View>
        </View>

        {/* Thông báo nhận đơn (Giữ lại cố định trên màn hình tài xế) */}
        <View style={styles.sectionHeader}>
          <View style={styles.notificationTitleRow}>
            <Text style={styles.sectionTitle}>Thông báo nhận đơn</Text>
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
                Chưa có thông báo đơn hàng
              </Text>
              <Text style={styles.emptyNotificationDesc}>
                Khi có đơn hàng mới được phân công hoặc đã nhận, thông báo sẽ
                được lưu giữ tại đây để bạn tiện theo dõi.
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
                              ? '#FF6B35'
                              : isPickedUp
                                ? '#22A566'
                                : '#168653',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.notificationBadgeText,
                          {
                            color: isReady
                              ? '#D94D20'
                              : isPickedUp
                                ? '#168653'
                                : '#168653',
                          },
                        ]}
                      >
                        {isReady
                          ? 'ĐƠN HÀNG MỚI • CHỜ NHẬN'
                          : isPickedUp
                            ? 'ĐÃ NHẬN ĐƠN • ĐANG GIAO'
                            : 'ĐÃ NHẬN & GIAO THÀNH CÔNG'}
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
                        NHÀ HÀNG:{' '}
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
                        ĐỊA CHỈ GIAO HÀNG
                      </Text>
                      <Text style={styles.addressText}>
                        {order.deliveryAddress || 'Chưa có địa chỉ'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.notificationFooter}>
                    <View>
                      <Text style={styles.notificationTotalLabel}>
                        TỔNG GIÁ TRỊ ĐƠN
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
                            <ActivityIndicator size="small" color="#D94343" />
                          ) : (
                            <Text style={styles.inlineDeclineText}>
                              Từ chối
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
                              ✓ Nhận đơn
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
                          Theo dõi giao hàng →
                        </Text>
                      </Pressable>
                    ) : (
                      <View style={styles.completedTag}>
                        <Text style={styles.completedTagText}>✓ Đã hoàn tất</Text>
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
          <Text style={styles.sectionTitle}>Bắt đầu giao hàng</Text>
          <Text style={styles.sectionEmoji}>✨</Text>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Text style={styles.tipEmoji}>📦</Text>
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Nhận đơn hàng mới</Text>
            <Text style={styles.tipDescription}>
              Khi nhà hàng phân công đơn cho bạn, thông báo sẽ xuất hiện ngay
              trên màn hình. Hãy kiểm tra địa chỉ và tổng tiền trước khi nhận.
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Text style={styles.tipEmoji}>📍</Text>
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Theo dõi chuyến giao</Text>
            <Text style={styles.tipDescription}>
              Sau khi nhận đơn, mở mục đơn đang giao để theo dõi và hoàn tất
              chuyến giao hàng.
            </Text>
          </View>
        </View>

        {/* Lời nhắc trạng thái */}
        <View
          style={[
            styles.noticeCard,
            isOnline ? styles.noticeOnline : styles.noticeOffline,
          ]}
        >
          <Text style={styles.noticeEmoji}>
            {isOnline ? '🎯' : '💡'}
          </Text>
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>
              {isOnline ? 'Bạn đã sẵn sàng!' : 'Đừng bỏ lỡ đơn hàng'}
            </Text>
            <Text style={styles.noticeText}>
              {isOnline
                ? 'Giữ kết nối mạng để nhận yêu cầu giao hàng kịp thời.'
                : 'Chuyển sang trạng thái trực tuyến khi bạn sẵn sàng làm việc.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal đơn hàng mới */}
      <Modal
        visible={!!activeModalOrder}
        transparent
        animationType="slide"
        onRequestClose={() => {
          // Chỉ đóng modal qua thao tác nhận hoặc từ chối đơn.
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeaderIcon}>
              <Text style={styles.modalEmoji}>🛵</Text>
            </View>

            <Text style={styles.modalEyebrow}>CÓ ĐƠN HÀNG MỚI</Text>
            <Text style={styles.modalTitle}>Yêu cầu giao hàng</Text>
            <Text style={styles.modalSubtitle}>
              Kiểm tra thông tin trước khi xác nhận
            </Text>

            <View style={styles.orderDetails}>
              <View style={styles.orderIdRow}>
                <Text style={styles.orderLabel}>Mã đơn hàng</Text>
                <View style={styles.orderIdBadge}>
                  <Text style={styles.orderIdText}>
                    #{activeModalOrder?.id.slice(0, 8).toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDivider} />

              <Text style={styles.orderLabel}>ĐỊA CHỈ GIAO HÀNG</Text>
              <View style={styles.addressRow}>
                <View style={styles.addressIcon}>
                  <Text style={styles.addressEmoji}>📍</Text>
                </View>
                <Text style={styles.addressText}>
                  {activeModalOrder?.deliveryAddress || 'Chưa có địa chỉ'}
                </Text>
              </View>

              <View style={styles.orderDivider} />

              <Text style={styles.orderLabel}>TỔNG GIÁ TRỊ ĐƠN HÀNG</Text>
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
                  <Text style={styles.acceptButtonText}>Nhận đơn hàng</Text>
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
                <ActivityIndicator color="#D94343" />
              ) : (
                <Text style={styles.declineButtonText}>Từ chối đơn</Text>
              )}
            </Pressable>

            <Text style={styles.modalFooter}>
              Cảm ơn bạn đã đồng hành cùng FoodDelivery
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFF9F5',
  },
  loadingText: {
    fontSize: 13,
    color: '#8B8289',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 35,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: '#FF6B35',
    marginBottom: 8,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#29232A',
  },
  driverName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#29232A',
    marginTop: 1,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8B8289',
    marginTop: 7,
  },
  headerAvatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
  },

  // Trạng thái online
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 22,
    padding: 18,
    marginBottom: 28,
  },
  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconText: {
    fontSize: 24,
  },
  statusInfo: {
    flex: 1,
  },
  statusCaption: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#A1989E',
    marginBottom: 7,
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
    backgroundColor: '#22A566',
  },
  offlineDot: {
    backgroundColor: '#B7ACB2',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  statusDivider: {
    height: 1,
    backgroundColor: '#F3ECE7',
    marginVertical: 16,
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
    color: '#8B8289',
  },

  // Thông báo nhận đơn
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
    backgroundColor: '#FF6B35',
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
    gap: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 18,
    padding: 15,
    marginBottom: 24,
  },
  emptyNotificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF4E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotificationEmoji: {
    fontSize: 21,
  },
  emptyNotificationContent: {
    flex: 1,
  },
  emptyNotificationTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#39313A',
    marginBottom: 4,
  },
  emptyNotificationDesc: {
    fontSize: 11,
    lineHeight: 17,
    color: '#8B8289',
  },
  notificationList: {
    gap: 12,
    marginBottom: 26,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 20,
    padding: 16,
  },
  notificationCardReady: {
    borderColor: '#FF6B35',
    borderWidth: 1.5,
    backgroundColor: '#FFFCFA',
  },
  notificationCardActive: {
    borderColor: '#A8E5C2',
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
    borderRadius: 9,
  },
  badgeReady: {
    backgroundColor: '#FFF0E8',
  },
  badgePickedUp: {
    backgroundColor: '#EAF8EF',
  },
  badgeDelivered: {
    backgroundColor: '#EAF8EF',
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  notificationRestaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  notificationRestaurantLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A1989E',
  },
  notificationRestaurantName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    color: '#29232A',
  },
  notificationAddressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF9F5',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  notificationAddressContent: {
    flex: 1,
  },
  notificationAddressLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
    color: '#A1989E',
    marginBottom: 4,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3ECE7',
  },
  notificationTotalLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#A1989E',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  notificationTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FF6B35',
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
    borderColor: '#F0E8E3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineDeclineText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D94343',
  },
  inlineAcceptBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAcceptText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  goActiveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#22A566',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goActiveBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  completedTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#EAF8EF',
  },
  completedTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#168653',
  },

  // Hướng dẫn
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#29232A',
  },
  sectionEmoji: {
    fontSize: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF4E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipEmoji: {
    fontSize: 21,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#39313A',
    marginBottom: 6,
  },
  tipDescription: {
    fontSize: 11,
    lineHeight: 18,
    color: '#8B8289',
  },

  // Lời nhắc
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 15,
    borderRadius: 18,
    marginTop: 12,
  },
  noticeOnline: {
    backgroundColor: '#EAF8EF',
  },
  noticeOffline: {
    backgroundColor: '#FFF0E8',
  },
  noticeEmoji: {
    fontSize: 22,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#39313A',
    marginBottom: 5,
  },
  noticeText: {
    fontSize: 11,
    lineHeight: 17,
    color: '#756B72',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(35, 26, 31, 0.55)',
  },
  modal: {
    backgroundColor: '#FFF9F5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
  },
  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2D8D2',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeaderIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#FFF0E8',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  modalEmoji: {
    fontSize: 29,
  },
  modalEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#29232A',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#8B8289',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  orderDetails: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  orderLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#A1989E',
    marginBottom: 8,
  },
  orderIdBadge: {
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  orderIdText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#D94D20',
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#F3ECE7',
    marginVertical: 14,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  addressIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#FFF4E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressEmoji: {
    fontSize: 16,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: '#39313A',
    paddingTop: 2,
  },
  orderTotal: {
    fontSize: 25,
    fontWeight: '900',
    color: '#FF6B35',
  },
  acceptButton: {
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: '#FF6B35',
    borderRadius: 15,
    padding: 15,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  declineButton: {
    minHeight: 49,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 15,
    padding: 14,
    marginTop: 10,
  },
  declinePressed: {
    backgroundColor: '#FEF0EF',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#D94343',
  },
  modalFooter: {
    fontSize: 10,
    color: '#A1989E',
    textAlign: 'center',
    marginTop: 17,
  },
});
