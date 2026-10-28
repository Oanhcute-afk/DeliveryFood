import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { api } from '@/lib/axios';
import { RestaurantType, Order } from '@food-delivery/types';
import { useRestaurantSocket } from '@/hooks/use-order-socket';
import { restaurantAmount, voucherSubsidy } from '@/lib/order-amounts';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

const COLORS = {
  background: BURGER_COLORS.background,
  surface: BURGER_COLORS.surface,
  primary: BURGER_COLORS.primary,
  primaryLight: BURGER_COLORS.primaryLight,
  text: BURGER_COLORS.text,
  muted: BURGER_COLORS.muted,
  border: BURGER_COLORS.border,
  green: BURGER_COLORS.success,
  greenLight: BURGER_COLORS.successLight,
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  yellow: '#B45309',
  yellowLight: BURGER_COLORS.cheeseLight,
  purple: '#7C3AED',
  purpleLight: '#EDE9FE',
  red: BURGER_COLORS.danger,
  redLight: BURGER_COLORS.dangerLight,
  gray: BURGER_COLORS.muted,
  grayLight: BURGER_COLORS.surfaceMuted,
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: COLORS.blue,
  PREPARING: COLORS.yellow,
  READY: COLORS.green,
  PICKED_UP: COLORS.purple,
  DELIVERED: COLORS.gray,
  CANCELLED: COLORS.red,
};

const STATUS_BACKGROUNDS: Record<string, string> = {
  CONFIRMED: COLORS.blueLight,
  PREPARING: COLORS.yellowLight,
  READY: COLORS.greenLight,
  PICKED_UP: COLORS.purpleLight,
  DELIVERED: COLORS.grayLight,
  CANCELLED: COLORS.redLight,
};

const TAB_BAR_OFFSET = 88;

export default function OwnerHomeScreen() {
  const { tr } = useLanguage();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const statusLabels: Record<string, string> = {
    CONFIRMED: tr('Đã xác nhận', 'Confirmed'),
    PREPARING: tr('Đang chuẩn bị', 'Preparing'),
    READY: tr('Chờ tài xế', 'Ready for Driver'),
    PICKED_UP: tr('Đang giao', 'Delivering'),
    DELIVERED: tr('Đã giao', 'Delivered'),
    CANCELLED: tr('Đã hủy', 'Cancelled'),
  };

  const {
    data: restaurant,
    isLoading,
  } = useQuery<RestaurantType | null>({
    queryKey: ['my-restaurant'],
    queryFn: () =>
      api
        .get<RestaurantType | null>('/restaurants/mine')
        .then((res) => res.data),
  });

  const restaurantUpdate = useRestaurantSocket(restaurant?.id ?? null);

  useEffect(() => {
    if (restaurantUpdate) {
      if (restaurantUpdate.id) {
        queryClient.setQueryData<Order[]>(['restaurant-orders'], (old = []) => {
          const exists = old.some((o) => o.id === restaurantUpdate.id);
          if (exists) {
            return old.map((o) =>
              o.id === restaurantUpdate.id
                ? ({ ...o, ...restaurantUpdate } as Order)
                : o,
            );
          }
          return [restaurantUpdate as unknown as Order, ...old];
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['restaurant-orders'],
      });
    }
  }, [restaurantUpdate, queryClient]);

  const {
    data: orders = [],
    refetch,
    isRefetching,
  } = useQuery<Order[]>({
    queryKey: ['restaurant-orders'],
    queryFn: () =>
      api.get<Order[]>('/orders/restaurant').then((res) => res.data),
    enabled: !!restaurant,
    refetchInterval: 4000,
  });

  const { mutate: toggleOpen, isPending: isTogglingOpen } = useMutation({
    mutationFn: () =>
      api.patch(`/restaurants/${restaurant?.id}`, {
        isOpen: !restaurant?.isOpen,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['my-restaurant'],
      }),
    onError: (error: any) => {
      Alert.alert(
        tr('Không thể cập nhật', 'Unable to update'),
        error?.response?.data?.message ??
          tr(
            'Không thể thay đổi trạng thái nhà hàng. Vui lòng thử lại.',
            'Could not change restaurant status. Please try again.',
          ),
      );
    },
  });

  const {
    mutate: updateStatus,
    isPending: isUpdatingStatus,
    variables: updatingOrder,
  } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order['status'] }) =>
      api.patch<Order>(`/orders/${id}/status`, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['restaurant-orders'] });
      const previousOrders =
        queryClient.getQueryData<Order[]>(['restaurant-orders']);

      queryClient.setQueryData<Order[]>(['restaurant-orders'], (old = []) =>
        old.map((order) =>
          order.id === id ? { ...order, status } : order,
        ),
      );

      return { previousOrders };
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(
          ['restaurant-orders'],
          context.previousOrders,
        );
      }
      Alert.alert(
        tr('Lỗi cập nhật đơn hàng', 'Order update failed'),
        error?.response?.data?.message ??
          tr(
            'Không thể cập nhật trạng thái đơn hàng.',
            'Could not update order status.',
          ),
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ['restaurant-orders'],
      }),
  });

  useEffect(() => {
    if (isLoading) return;

    if (!restaurant) {
      router.replace('/(owner)/(index)/create-restaurant');
    }
  }, [restaurant, isLoading]);

  if (isLoading || !restaurant) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {isLoading
            ? tr('Đang tải thông tin nhà hàng...', 'Loading restaurant info...')
            : tr('Đang chuyển đến trang tạo nhà hàng...', 'Redirecting to setup...')}
        </Text>
      </SafeAreaView>
    );
  }

  const activeOrders = orders.filter((order) =>
    ['CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP'].includes(
      order.status,
    ),
  );

  const pastOrders = orders.filter((order) =>
    ['DELIVERED', 'CANCELLED'].includes(order.status),
  );

  function renderActionButton(order: Order) {
    const isUpdating = isUpdatingStatus && updatingOrder?.id === order.id;

    if (order.status === 'CONFIRMED') {
      return (
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.prepareButton,
            pressed && styles.pressed,
            isUpdating && styles.disabledButton,
          ]}
          disabled={isUpdating}
          onPress={() =>
            updateStatus({
              id: order.id,
              status: 'PREPARING',
            })
          }
        >
          <Text style={styles.actionButtonText}>
            {isUpdating
              ? tr('Đang cập nhật...', 'Updating...')
              : tr('Bắt đầu chuẩn bị', 'Start Preparing')}
          </Text>
          {!isUpdating && <Text style={styles.actionArrow}>→</Text>}
        </Pressable>
      );
    }

    if (order.status === 'PREPARING') {
      return (
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.readyButton,
            pressed && styles.pressed,
            isUpdating && styles.disabledButton,
          ]}
          disabled={isUpdating}
          onPress={() =>
            updateStatus({
              id: order.id,
              status: 'READY',
            })
          }
        >
          <Text style={styles.actionButtonText}>
            {isUpdating
              ? tr('Đang cập nhật...', 'Updating...')
              : tr('Đánh dấu đã chuẩn bị xong', 'Mark as Ready')}
          </Text>
          {!isUpdating && <Text style={styles.actionArrow}>✓</Text>}
        </Pressable>
      );
    }

    return null;
  }

  function renderOrderCard(order: Order, isPast = false) {
    const statusColor = STATUS_COLORS[order.status] ?? COLORS.gray;
    const statusBackground =
      STATUS_BACKGROUNDS[order.status] ?? COLORS.grayLight;

    return (
      <View
        key={order.id}
        style={[styles.orderCard, isPast && styles.pastOrderCard]}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderIdentity}>
            <Text style={styles.orderLabel}>
              {tr('ĐƠN HÀNG', 'ORDER')}
            </Text>
            <Text style={styles.orderId}>
              #{order.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusBackground },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabels[order.status] ?? order.status}
            </Text>
          </View>
        </View>

        <View style={styles.orderDivider} />

        <View style={styles.addressRow}>
          <View style={styles.addressIcon}>
            <Text style={styles.addressIconText}>⌖</Text>
          </View>

          <View style={styles.addressContent}>
            <Text style={styles.detailLabel}>
              {tr('Địa chỉ giao hàng', 'Delivery address')}
            </Text>
            <Text style={styles.orderAddress} numberOfLines={2}>
              {order.deliveryAddress}
            </Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.detailLabel}>
              {tr('Nhà hàng nhận', 'Restaurant payout')}
            </Text>
            <Text style={styles.orderTotal}>
              ${restaurantAmount(order).toFixed(2)}
            </Text>
            {voucherSubsidy(order) > 0 ? (
              <Text style={styles.subsidyNote}>
                {tr(
                  `Khách dùng voucher ${order.voucherCode ?? ''} · app bù $${voucherSubsidy(order).toFixed(2)}`,
                  `Customer voucher ${order.voucherCode ?? ''} · platform subsidy $${voucherSubsidy(order).toFixed(2)}`,
                )}
              </Text>
            ) : null}
          </View>
        </View>

        {!isPast && renderActionButton(order)}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        style={styles.list}
        data={activeOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + TAB_BAR_OFFSET },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.pageHeader}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.greeting}>
                  {tr('KÊNH NHÀ HÀNG', 'MERCHANT PORTAL')}
                </Text>
                <Text style={styles.pageTitle}>
                  {tr('Quản lý đơn hàng', 'Order Management')}
                </Text>
                <Text style={styles.pageSubtitle}>
                  {tr(
                    'Theo dõi và xử lý đơn hàng của bạn',
                    'Track and fulfill incoming food orders',
                  )}
                </Text>
              </View>

              <LanguageSwitch />
            </View>

            <View style={styles.restaurantCard}>
              <View style={styles.restaurantTopRow}>
                <View style={styles.restaurantAvatar}>
                  <Text style={styles.restaurantAvatarText}>
                    {restaurant.name?.trim()?.charAt(0)?.toUpperCase() || 'R'}
                  </Text>
                </View>

                <View style={styles.restaurantInfo}>
                  <Text style={styles.restaurantLabel}>
                    {tr('NHÀ HÀNG CỦA BẠN', 'YOUR RESTAURANT')}
                  </Text>
                  <Text style={styles.restaurantName} numberOfLines={2}>
                    {restaurant.name}
                  </Text>
                  <View style={styles.openStatusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: restaurant.isOpen
                            ? COLORS.green
                            : COLORS.red,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.openStatusText,
                        {
                          color: restaurant.isOpen
                            ? COLORS.green
                            : COLORS.red,
                        },
                      ]}
                    >
                      {restaurant.isOpen
                        ? tr('Đang nhận đơn', 'Accepting Orders')
                        : tr('Đang tạm đóng cửa', 'Temporarily Closed')}
                    </Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={isTogglingOpen}
                  style={({ pressed }) => [
                    styles.openToggle,
                    restaurant.isOpen
                      ? styles.openToggleActive
                      : styles.openToggleInactive,
                    pressed && styles.pressed,
                    isTogglingOpen && styles.disabledButton,
                  ]}
                  onPress={() => {
                    Alert.alert(
                      restaurant.isOpen
                        ? tr('Tạm đóng cửa nhà hàng?', 'Close restaurant?')
                        : tr('Mở cửa nhà hàng?', 'Open restaurant?'),
                      restaurant.isOpen
                        ? tr(
                            'Nhà hàng sẽ tạm ngừng nhận đơn mới.',
                            'Your restaurant will stop receiving new orders.',
                          )
                        : tr(
                            'Nhà hàng sẽ có thể nhận đơn hàng mới.',
                            'Your restaurant will start receiving new orders.',
                          ),
                      [
                        { text: tr('Hủy', 'Cancel'), style: 'cancel' },
                        {
                          text: restaurant.isOpen
                            ? tr('Đóng cửa', 'Close')
                            : tr('Mở cửa', 'Open'),
                          onPress: () => toggleOpen(),
                        },
                      ],
                    );
                  }}
                >
                  <Text style={styles.openToggleText}>
                    {isTogglingOpen
                      ? tr('Đang lưu...', 'Saving...')
                      : restaurant.isOpen
                        ? tr('Đóng cửa', 'Close')
                        : tr('Mở cửa', 'Open')}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.editButton,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  router.push('/(owner)/(index)/edit-restaurant')
                }
              >
                <Text style={styles.editButtonIcon}>✎</Text>
                <Text style={styles.editButtonText}>
                  {tr(
                    'Chỉnh sửa thông tin nhà hàng',
                    'Edit restaurant information',
                  )}
                </Text>
                <Text style={styles.editButtonArrow}>›</Text>
              </Pressable>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: COLORS.primaryLight },
                  ]}
                >
                  <Text style={styles.statEmoji}>📋</Text>
                </View>
                <Text style={styles.statNumber}>{activeOrders.length}</Text>
                <Text style={styles.statLabel}>
                  {tr('Đơn đang xử lý', 'Active orders')}
                </Text>
              </View>

              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: COLORS.greenLight },
                  ]}
                >
                  <Text style={styles.statEmoji}>✓</Text>
                </View>
                <Text style={styles.statNumber}>{pastOrders.length}</Text>
                <Text style={styles.statLabel}>
                  {tr('Đơn đã kết thúc', 'Completed orders')}
                </Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  {tr('Đơn hàng hiện tại', 'Active Orders')}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {tr(
                    'Các đơn cần theo dõi và xử lý',
                    'Orders requiring preparation or pickup',
                  )}
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {activeOrders.length}
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyEmoji}>🍔</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {tr('Chưa có đơn hàng mới', 'No active orders')}
            </Text>
            <Text style={styles.emptyDescription}>
              {tr(
                'Khi khách hàng đặt món, đơn hàng sẽ xuất hiện tại đây.',
                'When customers place an order, it will appear right here.',
              )}
            </Text>
          </View>
        }
        renderItem={({ item }) => renderOrderCard(item)}
        ItemSeparatorComponent={() => <View style={styles.orderSeparator} />}
        ListFooterComponent={
          pastOrders.length > 0 ? (
            <View style={styles.pastOrdersSection}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    {tr('Đơn hàng trước đây', 'Recent Past Orders')}
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    {tr(
                      'Tối đa 5 đơn gần nhất trong danh sách',
                      'Showing up to 5 recent orders',
                    )}
                  </Text>
                </View>
              </View>

              {pastOrders
                .slice(0, 5)
                .map((order) => renderOrderCard(order, true))}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  list: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingHorizontal: 18,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 18,
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  restaurantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  restaurantTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restaurantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantAvatarText: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  restaurantName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  openStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  openStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  openToggle: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openToggleActive: {
    backgroundColor: COLORS.redLight,
  },
  openToggleInactive: {
    backgroundColor: COLORS.greenLight,
  },
  openToggleText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '800',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  editButtonIcon: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  editButtonText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  editButtonArrow: {
    color: COLORS.muted,
    fontSize: 22,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statEmoji: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.green,
  },
  statNumber: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  countBadge: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 9,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 22,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 21,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyEmoji: {
    fontSize: 28,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
  orderSeparator: {
    height: 10,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  pastOrderCard: {
    opacity: 0.92,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  orderIdentity: {
    flex: 1,
  },
  orderLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 3,
  },
  orderId: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  orderDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  addressIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressIconText: {
    color: COLORS.primary,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 22,
  },
  addressContent: {
    flex: 1,
    paddingTop: 1,
  },
  detailLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 3,
  },
  orderAddress: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 12,
    paddingTop: 11,
  },
  subsidyNote: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  orderTotal: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  prepareButton: {
    backgroundColor: COLORS.primary,
  },
  readyButton: {
    backgroundColor: COLORS.green,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  actionArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.88,
  },
  disabledButton: {
    opacity: 0.55,
  },
  pastOrdersSection: {
    marginTop: 14,
  },
});
