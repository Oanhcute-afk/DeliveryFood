import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
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
<<<<<<< HEAD
import { CancelOrderModal } from '@/components/cancel-order-modal';
import {
  ensureConfirmedOrdersHydrated,
  isOrderConfirmedByCustomer,
  isOrderAutoConfirmed,
} from '@/lib/confirmed-orders';
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
=======
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6

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
<<<<<<< HEAD
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
=======
  PENDING: '#D97706',
  CONFIRMED: '#2563EB',
  PREPARING: '#7C3AED',
  READY: '#0891B2',
  PICKED_UP: BURGER_COLORS.primary,
  DELIVERED: BURGER_COLORS.success,
  CANCELLED: BURGER_COLORS.danger,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
  const { tr, isVi } = useLanguage();
  const statusColor = STATUS_COLORS[order.status] ?? BURGER_COLORS.muted;
  const statusIcon = STATUS_ICONS[order.status] ?? 'receipt-outline';

<<<<<<< HEAD
  const date = new Date(order.createdAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const time = new Date(order.createdAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
=======
  const statusLabels: Record<string, string> = {
    PENDING: tr('Chờ thanh toán', 'Pending'),
    CONFIRMED: tr('Đã xác nhận', 'Confirmed'),
    PREPARING: tr('Đang chuẩn bị', 'Preparing'),
    READY: tr('Sẵn sàng lấy món', 'Ready for pickup'),
    PICKED_UP: tr('Đang giao hàng', 'On the way'),
    DELIVERED: tr('Đã giao hàng', 'Delivered'),
    CANCELLED: tr('Đã hủy', 'Cancelled'),
  };

  const statusLabel = statusLabels[order.status] ?? order.status;

  const date = new Date(order.createdAt).toLocaleDateString(
    isVi ? 'vi-VN' : 'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  );
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6

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
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {/* Header nhà hàng + trạng thái */}
      <View style={styles.cardHeader}>
        <View style={styles.restaurantSection}>
          <View style={styles.restaurantIcon}>
<<<<<<< HEAD
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
=======
            <Ionicons
              name="restaurant-outline"
              size={21}
              color={BURGER_COLORS.primary}
            />
          </View>

          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {order.restaurant?.name ?? tr('Nhà hàng', 'Restaurant')}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
            </Text>
          </View>
        </View>

<<<<<<< HEAD
=======
        <Ionicons
          name="chevron-forward"
          size={18}
          color={BURGER_COLORS.faint}
        />
      </View>

      <View style={styles.divider} />

      {/* Status */}
      <View style={styles.statusRow}>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${statusColor}16` },
          ]}
        >
<<<<<<< HEAD
          <Ionicons name={statusIcon} size={14} color={statusColor} />
=======
          <Ionicons name={statusIcon} size={15} color={statusColor} />
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
          🍱 Món đã đặt: {dishNames}
        </Text>
      ) : null}

      {order.status === 'DELIVERED' && (
        <View style={styles.deliveryConfirmTag}>
          <Ionicons
            name={
              isOrderConfirmedByCustomer(order.id) ||
              isOrderAutoConfirmed(order.updatedAt)
                ? 'checkmark-circle'
                : 'time-outline'
            }
            size={13}
            color={
              isOrderConfirmedByCustomer(order.id) ||
              isOrderAutoConfirmed(order.updatedAt)
                ? '#16A34A'
                : '#D97706'
            }
          />
          <Text
            style={[
              styles.deliveryConfirmTagText,
              (isOrderConfirmedByCustomer(order.id) ||
                isOrderAutoConfirmed(order.updatedAt)) && {
                color: '#16A34A',
              },
            ]}
          >
            {isOrderConfirmedByCustomer(order.id)
              ? 'Khách đã xác nhận nhận đơn'
              : isOrderAutoConfirmed(order.updatedAt)
              ? 'Hệ thống tự động xác nhận sau 24h'
              : 'Chờ xác nhận đã nhận đơn'}
          </Text>
        </View>
      )}

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
<<<<<<< HEAD
            <Ionicons name="bag-handle" size={15} color="#FF6B35" />
          </View>
          <Text style={styles.items}>{itemCount} phần ăn</Text>
        </View>

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Tổng thanh toán</Text>
=======
            <Ionicons
              name="bag-handle-outline"
              size={16}
              color={BURGER_COLORS.muted}
            />
          </View>

          <Text style={styles.items}>
            {itemCount}{' '}
            {tr(
              'món',
              itemCount === 1 ? 'item' : 'items',
            )}
          </Text>
        </View>

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>
            {tr('Tổng cộng', 'Total amount')}
          </Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<FilterTab>('ALL');
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );

=======
  const { tr } = useLanguage();
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<OrderWithRestaurant[]>({
    queryKey: ['my-orders'],
    queryFn: async () => {
      await Promise.all([ensureCancelledOrdersHydrated(), ensureConfirmedOrdersHydrated()]);
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

  // Lịch sử đơn hàng của khách chỉ lưu và hiển thị trong vòng 3 tuần (21 ngày)
  const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;
  const recentOrders = useMemo(() => {
    const cutoff = Date.now() - THREE_WEEKS_MS;
    return orders.filter((o) => {
      const orderTime = new Date(o.createdAt).getTime();
      return isNaN(orderTime) || orderTime >= cutoff;
    });
  }, [orders]);

  const pendingCount = useMemo(
    () => recentOrders.filter((o) => o.status === 'PENDING').length,
    [recentOrders],
  );
  const activeCount = useMemo(
    () => recentOrders.filter((o) => ACTIVE_STEPS.includes(o.status)).length,
    [recentOrders],
  );

  const filteredOrders = useMemo(() => {
    switch (selectedTab) {
      case 'ACTIVE':
        return recentOrders.filter((o) => ACTIVE_STEPS.includes(o.status));
      case 'PENDING':
        return recentOrders.filter((o) => o.status === 'PENDING');
      case 'HISTORY':
        return recentOrders.filter(
          (o) => o.status === 'DELIVERED' || o.status === 'CANCELLED',
        );
      default:
        return recentOrders;
    }
  }, [recentOrders, selectedTab]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={BURGER_COLORS.background} />
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color={BURGER_COLORS.primary} />
          </View>
<<<<<<< HEAD
          <Text style={styles.loadingText}>Đang tải đơn hàng của bạn...</Text>
=======
          <Text style={styles.loadingText}>
            {tr('Đang tải đơn hàng của bạn...', 'Loading your orders...')}
          </Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BURGER_COLORS.background} />

      {/* Page header */}
      <View style={styles.header}>
<<<<<<< HEAD
        <View>
          <Text style={styles.headerCaption}>LƯU ĐƠN 3 TUẦN GẦN NHẤT</Text>
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
=======
        <View style={styles.headerLeft}>
          <Text style={styles.headerCaption}>
            {tr('HÀNH TRÌNH ẨM THỰC', 'YOUR FOOD JOURNEY')}
          </Text>
          <Text style={styles.title}>{tr('Đơn hàng của tôi', 'My Orders')}</Text>
          <Text style={styles.subtitle}>
            {tr('Theo dõi trạng thái các bữa ăn của bạn.', 'Keep track of your delicious moments.')}
          </Text>
        </View>

        <LanguageSwitch />
      </View>

      {/* Order count */}
      {!isError && orders.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryDot} />
          <Text style={styles.summaryText}>
            {tr(
              `${orders.length} đơn hàng trong lịch sử`,
              `${orders.length} ${orders.length === 1 ? 'order' : 'orders'} in your history`,
            )}
          </Text>
        </View>
      )}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6

      {isError ? (
        <ScrollView
          contentContainerStyle={styles.centered}
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
            <Ionicons
              name="cloud-offline-outline"
              size={34}
              color={BURGER_COLORS.primary}
            />
          </View>

<<<<<<< HEAD
          <Text style={styles.emptyText}>Không thể tải đơn hàng</Text>
          <Text style={styles.emptySubText}>
            Vui lòng kiểm tra kết nối mạng và thử lại.
=======
          <Text style={styles.emptyText}>
            {tr('Không thể tải đơn hàng', 'Unable to load orders')}
          </Text>
          <Text style={styles.emptySubText}>
            {tr(
              'Vui lòng kiểm tra kết nối mạng và thử lại.',
              'Please check your connection and try again.',
            )}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.cardPressed,
            ]}
            onPress={() => {
              void refetch();
            }}
          >
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
<<<<<<< HEAD
            <Text style={styles.retryText}>Thử lại</Text>
=======
            <Text style={styles.retryText}>{tr('Thử lại', 'Try again')}</Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
          </Pressable>
        </ScrollView>
      ) : filteredOrders.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centered}
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
          <View style={styles.emptyIllustration}>
            <View style={styles.emptyIcon}>
              <Ionicons
<<<<<<< HEAD
                name="fast-food-outline"
                size={39}
                color="#FF6B35"
=======
                name="receipt-outline"
                size={38}
                color={BURGER_COLORS.primary}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
              />
            </View>
          </View>

          <Text style={styles.emptyText}>
<<<<<<< HEAD
            {selectedTab === 'ALL'
              ? 'Chưa có đơn hàng nào'
              : 'Không có đơn hàng ở mục này'}
          </Text>
          <Text style={styles.emptySubText}>
            {selectedTab === 'ALL'
              ? 'Khám phá thực đơn hấp dẫn và đặt ngay bữa ăn nóng hổi giao tận nhà!'
              : 'Hãy chuyển sang tab khác hoặc đặt thêm món mới nhé.'}
=======
            {tr('Chưa có đơn hàng nào', 'No orders yet')}
          </Text>
          <Text style={styles.emptySubText}>
            {tr(
              'Khám phá thực đơn hấp dẫn và đặt bữa ăn đầu tiên của bạn ngay!',
              'Explore the menu and place your first order!',
            )}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.shopButton,
              pressed && styles.cardPressed,
            ]}
<<<<<<< HEAD
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
=======
            onPress={() => router.push('/(customer)/(tabs)/(home)')}
          >
            <Ionicons name="fast-food-outline" size={18} color="#FFFFFF" />
            <Text style={styles.shopButtonText}>
              {tr('Khám phá món ngon', 'Explore food')}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
          </Pressable>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
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
    backgroundColor: BURGER_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
<<<<<<< HEAD
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerCaption: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF6B35',
    letterSpacing: 1.3,
=======
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerCaption: {
    fontSize: 10,
    fontWeight: '800',
    color: BURGER_COLORS.primary,
    letterSpacing: 1.2,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
<<<<<<< HEAD
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
=======
    color: BURGER_COLORS.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 12,
    color: BURGER_COLORS.muted,
    marginTop: 4,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
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
=======
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  summaryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: BURGER_COLORS.primary,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  tabPillText: {
    fontSize: 12,
<<<<<<< HEAD
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
=======
    color: BURGER_COLORS.muted,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 6,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    paddingBottom: 30,
    gap: 12,
  },
  card: {
<<<<<<< HEAD
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
=======
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    padding: 15,
  },
  cardPressed: {
    opacity: 0.88,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF0E7',
=======
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BURGER_COLORS.primaryLight,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
    fontWeight: '900',
    color: '#29232A',
    flexShrink: 1,
  },
  date: {
    fontSize: 11,
    color: '#9B9097',
    marginTop: 3,
=======
    fontWeight: '800',
    color: BURGER_COLORS.text,
    marginBottom: 3,
  },
  date: {
    fontSize: 11,
    color: BURGER_COLORS.muted,
  },
  divider: {
    height: 1,
    backgroundColor: BURGER_COLORS.border,
    marginVertical: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
<<<<<<< HEAD
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
  deliveryConfirmTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  deliveryConfirmTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
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
=======
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  orderReference: {
    fontSize: 11,
    color: BURGER_COLORS.muted,
    fontWeight: '700',
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
<<<<<<< HEAD
    backgroundColor: '#FFFAF7',
    borderRadius: 14,
=======
    backgroundColor: BURGER_COLORS.surfaceMuted,
    borderRadius: 12,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
    backgroundColor: '#FFF0E8',
=======
    backgroundColor: BURGER_COLORS.surface,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    alignItems: 'center',
    justifyContent: 'center',
  },
  items: {
    fontSize: 12,
<<<<<<< HEAD
    color: '#574E54',
=======
    color: BURGER_COLORS.muted,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    fontWeight: '700',
  },
  totalSection: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 10,
<<<<<<< HEAD
    color: '#A49AA0',
    marginBottom: 2,
  },
  total: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FF6B35',
=======
    color: BURGER_COLORS.muted,
    marginBottom: 2,
  },
  total: {
    fontSize: 16,
    fontWeight: '900',
    color: BURGER_COLORS.primary,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
<<<<<<< HEAD
    paddingVertical: 32,
=======
    paddingBottom: 40,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
    fontWeight: '600',
    color: BURGER_COLORS.muted,
  },
  emptyIllustration: {
<<<<<<< HEAD
    position: 'relative',
    marginBottom: 18,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#FFF0E7',
=======
    marginBottom: 18,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: BURGER_COLORS.primaryLight,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 20,
<<<<<<< HEAD
    fontWeight: '900',
    color: '#29232A',
=======
    fontWeight: '800',
    color: BURGER_COLORS.text,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 13,
    color: BURGER_COLORS.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
<<<<<<< HEAD
    backgroundColor: '#FF6B35',
    borderRadius: 15,
    paddingHorizontal: 19,
=======
    backgroundColor: BURGER_COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 18,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
    backgroundColor: BURGER_COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
    marginTop: 20,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
