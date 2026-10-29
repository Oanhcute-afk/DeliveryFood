import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/axios';
import { Order } from '@food-delivery/types';
import { CancelOrderModal } from '@/components/cancel-order-modal';
import {
  applyLocalCancellation,
  cancelPendingOrder,
  ensureCancelledOrdersHydrated,
  type CancelOrderReason,
} from '@/lib/cancelled-orders';

type OrderItemDetail = {
  id: string;
  quantity?: number;
  unitPrice?: string;
  menuItem?: { id: string; name: string };
};

type OrderWithRestaurant = Order & {
  restaurant: { id: string; name: string };
  items: OrderItemDetail[];
};

type FilterTab = 'ALL' | 'ACTIVE' | 'PENDING' | 'HISTORY';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'ACTIVE', label: 'Đang giao' },
  { key: 'PENDING', label: 'Chờ thanh toán' },
  { key: 'HISTORY', label: 'Lịch sử' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  CONFIRMED: '#3B82F6',
  PREPARING: '#8B5CF6',
  READY: '#06B6D4',
  PICKED_UP: '#FF6B35',
  DELIVERED: '#16A34A',
  CANCELLED: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  CONFIRMED: 'Quán đã nhận đơn',
  PREPARING: 'Đang chế biến món',
  READY: 'Chờ tài xế lấy món',
  PICKED_UP: 'Tài xế đang giao',
  DELIVERED: 'Đã giao thành công',
  CANCELLED: 'Đã hủy đơn',
};

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  PENDING: 'card-outline',
  CONFIRMED: 'checkmark-circle-outline',
  PREPARING: 'flame-outline',
  READY: 'bag-check-outline',
  PICKED_UP: 'bicycle-outline',
  DELIVERED: 'checkmark-done-circle-outline',
  CANCELLED: 'close-circle-outline',
};

const ACTIVE_STEPS = ['CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP'];

function OrderCard({
  order,
  onPress,
  onCancelPress,
}: {
  order: OrderWithRestaurant;
  onPress: () => void;
  onCancelPress: () => void;
}) {
  const statusColor = STATUS_COLORS[order.status] ?? '#999999';
  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  const statusIcon = STATUS_ICONS[order.status] ?? 'receipt-outline';

  const date = new Date(order.createdAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const time = new Date(order.createdAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const itemCount =
    order.items?.reduce((sum, it) => sum + (it.quantity ?? 1), 0) ?? 0;
  const dishNames = (order.items ?? [])
    .map((it) =>
      it.menuItem?.name
        ? `${it.quantity && it.quantity > 1 ? `${it.quantity}x ` : ''}${it.menuItem.name}`
        : null,
    )
    .filter(Boolean)
    .join(', ');

  const activeStepIndex = ACTIVE_STEPS.indexOf(order.status);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      {/* Header nhà hàng + trạng thái */}
      <View style={styles.cardHeader}>
        <View style={styles.restaurantSection}>
          <View style={styles.restaurantIcon}>
            <Ionicons name="restaurant" size={20} color="#FF6B35" />
          </View>

          <View style={styles.restaurantInfo}>
            <View style={styles.restaurantNameRow}>
              <Text style={styles.restaurantName} numberOfLines={1}>
                {order.restaurant?.name ?? 'Nhà hàng đối tác'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#B8ADA6" />
            </View>
            <Text style={styles.date}>
              {time} • {date} • #{String(order.id).slice(-6).toUpperCase()}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${statusColor}16` },
          ]}
        >
          <Ionicons name={statusIcon} size={14} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Thanh tiến trình trực quan cho đơn đang xử lý */}
      {activeStepIndex >= 0 && (
        <View style={styles.miniTrackerWrap}>
          <View style={styles.miniTrackerBars}>
            {ACTIVE_STEPS.map((step, idx) => (
              <View
                key={step}
                style={[
                  styles.miniTrackerBar,
                  idx <= activeStepIndex && { backgroundColor: statusColor },
                ]}
              />
            ))}
          </View>
          <Text style={styles.miniTrackerHint}>
            {order.status === 'PICKED_UP'
              ? '🛵 Tài xế đang trên đường giao đến bạn • Nhấn để xem bản đồ'
              : '🍳 Đơn hàng đang được chuẩn bị nóng hổi'}
          </Text>
        </View>
      )}

      {order.status === 'CANCELLED' && order.cancelReason ? (
        <View style={styles.cancelReasonBanner}>
          <Ionicons
            name="information-circle-outline"
            size={15}
            color="#EF4444"
          />
          <Text style={styles.cancelReasonText}>
            Lý do hủy: {order.cancelReason}
          </Text>
        </View>
      ) : null}

      <View style={styles.divider} />

      {/* Tóm tắt món ăn & địa chỉ */}
      {dishNames ? (
        <Text style={styles.dishSummaryText} numberOfLines={2}>
          🍱 {dishNames}
        </Text>
      ) : null}

      {order.deliveryAddress ? (
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color="#8B8289" />
          <Text style={styles.addressText} numberOfLines={1}>
            Giao đến: {order.deliveryAddress}
          </Text>
        </View>
      ) : null}

      {/* Tổng tiền */}
      <View style={styles.cardFooter}>
        <View style={styles.itemsSection}>
          <View style={styles.itemsIcon}>
            <Ionicons name="bag-handle" size={15} color="#FF6B35" />
          </View>
          <Text style={styles.items}>{itemCount} phần ăn</Text>
        </View>

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Tổng thanh toán</Text>
          <Text style={styles.total}>
            ${Number(order.totalAmount).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Nút hành động cho đơn chờ thanh toán */}
      {order.status === 'PENDING' && (
        <View style={styles.pendingActionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelPendingBtn,
              pressed && styles.cardPressed,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onCancelPress();
            }}
          >
            <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
            <Text style={styles.cancelPendingBtnText}>Hủy đơn</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.payPendingBtn,
              pressed && styles.cardPressed,
            ]}
            onPress={onPress}
          >
            <Ionicons name="card-outline" size={16} color="#FFFFFF" />
            <Text style={styles.payPendingBtnText}>Thanh toán ngay</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

export default function CustomerOrdersScreen() {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<FilterTab>('ALL');
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );

  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<OrderWithRestaurant[]>({
    queryKey: ['my-orders'],
    queryFn: async () => {
      await ensureCancelledOrdersHydrated();
      const r = await api.get<OrderWithRestaurant[]>('/orders/mine');
      return r.data.map((o) => applyLocalCancellation(o));
    },
    refetchInterval: 4000,
  });

  const { mutate: cancelOrder, isPending: isSubmittingCancel } = useMutation({
    mutationFn: ({
      orderId,
      reason,
    }: {
      orderId: string;
      reason: CancelOrderReason;
    }) => cancelPendingOrder(orderId, reason),
    onSuccess: (result) => {
      setCancellingOrderId(null);
      queryClient.setQueryData<OrderWithRestaurant[]>(
        ['my-orders'],
        (old = []) =>
          old.map((o) =>
            o.id === result.id
              ? {
                  ...o,
                  status: 'CANCELLED',
                  cancelReason: result.cancelReason,
                }
              : o,
          ),
      );
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', result.id] });
      Alert.alert(
        'Hủy đơn thành công',
        `Đơn hàng chờ thanh toán đã được hủy thành công.\nLý do: ${result.cancelReason}`,
      );
    },
    onError: (e: any) => {
      Alert.alert(
        'Không thể hủy đơn',
        e?.response?.data?.message ?? 'Vui lòng thử lại sau.',
      );
    },
  });

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === 'PENDING').length,
    [orders],
  );
  const activeCount = useMemo(
    () => orders.filter((o) => ACTIVE_STEPS.includes(o.status)).length,
    [orders],
  );

  const filteredOrders = useMemo(() => {
    switch (selectedTab) {
      case 'ACTIVE':
        return orders.filter((o) => ACTIVE_STEPS.includes(o.status));
      case 'PENDING':
        return orders.filter((o) => o.status === 'PENDING');
      case 'HISTORY':
        return orders.filter(
          (o) => o.status === 'DELIVERED' || o.status === 'CANCELLED',
        );
      default:
        return orders;
    }
  }, [orders, selectedTab]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
          <Text style={styles.loadingText}>Đang tải đơn hàng của bạn...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />

      {/* Page header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerCaption}>THEO DÕI GIAO ĐỒ ĂN</Text>
          <Text style={styles.title}>Đơn hàng của tôi</Text>
        </View>

        <Pressable
          style={styles.headerIcon}
          onPress={() => void refetch()}
        >
          <Ionicons name="refresh" size={22} color="#FF6B35" />
        </Pressable>
      </View>

      {/* Bộ lọc trạng thái đơn hàng */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {FILTER_TABS.map((tab) => {
            const active = selectedTab === tab.key;
            const badgeCount =
              tab.key === 'PENDING'
                ? pendingCount
                : tab.key === 'ACTIVE'
                  ? activeCount
                  : 0;

            return (
              <Pressable
                key={tab.key}
                style={[styles.tabPill, active && styles.tabPillActive]}
                onPress={() => setSelectedTab(tab.key)}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    active && styles.tabPillTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {badgeCount > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      active && styles.tabBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBadgeText,
                        active && styles.tabBadgeTextActive,
                      ]}
                    >
                      {badgeCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isError ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={35}
              color="#FF6B35"
            />
          </View>

          <Text style={styles.emptyText}>Không thể tải đơn hàng</Text>
          <Text style={styles.emptySubText}>
            Vui lòng kiểm tra kết nối mạng và thử lại.
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => {
              void refetch();
            }}
          >
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIllustration}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="fast-food-outline"
                size={39}
                color="#FF6B35"
              />
            </View>
          </View>

          <Text style={styles.emptyText}>
            {selectedTab === 'ALL'
              ? 'Chưa có đơn hàng nào'
              : 'Không có đơn hàng ở mục này'}
          </Text>
          <Text style={styles.emptySubText}>
            {selectedTab === 'ALL'
              ? 'Khám phá thực đơn hấp dẫn và đặt ngay bữa ăn nóng hổi giao tận nhà!'
              : 'Hãy chuyển sang tab khác hoặc đặt thêm món mới nhé.'}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.shopButton,
              pressed && styles.cardPressed,
            ]}
            onPress={() =>
              selectedTab === 'ALL'
                ? router.push('/(customer)/(tabs)/(home)')
                : setSelectedTab('ALL')
            }
          >
            <Ionicons name="restaurant-outline" size={18} color="#FFFFFF" />
            <Text style={styles.shopButtonText}>
              {selectedTab === 'ALL' ? 'Đặt món ngay' : 'Xem tất cả đơn hàng'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => router.push(`/(customer)/order/${item.id}`)}
              onCancelPress={() => setCancellingOrderId(item.id)}
            />
          )}
        />
      )}

      <CancelOrderModal
        visible={!!cancellingOrderId}
        isSubmitting={isSubmittingCancel}
        onClose={() => setCancellingOrderId(null)}
        onConfirm={(reason) => {
          if (cancellingOrderId) {
            cancelOrder({ orderId: cancellingOrderId, reason });
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerCaption: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF6B35',
    letterSpacing: 1.3,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#29232A',
    letterSpacing: -0.6,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#FFEEE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsWrapper: {
    paddingBottom: 8,
  },
  tabsScroll: {
    paddingHorizontal: 18,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE2DA',
  },
  tabPillActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6E656C',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF6B35',
  },
  tabBadgeTextActive: {
    color: '#FF6B35',
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 30,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFE5DE',
    padding: 16,
    shadowColor: '#29232A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  restaurantSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  restaurantIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF0E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#29232A',
    flexShrink: 1,
  },
  date: {
    fontSize: 11,
    color: '#9B9097',
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  miniTrackerWrap: {
    marginTop: 12,
    backgroundColor: '#FFF9F5',
    borderRadius: 13,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F3E8E0',
  },
  miniTrackerBars: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 6,
  },
  miniTrackerBar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E9DFD8',
  },
  miniTrackerHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#574E54',
  },
  cancelReasonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 11,
  },
  cancelReasonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3EEEA',
    marginVertical: 12,
  },
  dishSummaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#433A40',
    marginBottom: 7,
    lineHeight: 18,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 11,
  },
  addressText: {
    flex: 1,
    fontSize: 11,
    color: '#8B8289',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFAF7',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  itemsIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  items: {
    fontSize: 12,
    color: '#574E54',
    fontWeight: '700',
  },
  totalSection: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 10,
    color: '#A49AA0',
    marginBottom: 2,
  },
  total: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FF6B35',
  },
  pendingActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  cancelPendingBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cancelPendingBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  payPendingBtn: {
    flex: 1.2,
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  payPendingBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 45,
  },
  loadingIcon: {
    width: 75,
    height: 75,
    borderRadius: 25,
    backgroundColor: '#FFF0E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B8289',
  },
  emptyIllustration: {
    position: 'relative',
    marginBottom: 18,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#FFF0E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#29232A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 12,
    color: '#8B8289',
    textAlign: 'center',
    lineHeight: 19,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    borderRadius: 15,
    paddingHorizontal: 19,
    paddingVertical: 13,
    marginTop: 20,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 22,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
