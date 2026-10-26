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

const COLORS = {
  background: '#FFF9F5',
  surface: '#FFFFFF',
  primary: '#FF6B35',
  primaryLight: '#FFF0E8',
  text: '#29232A',
  muted: '#8B8289',
  border: '#F0E8E3',
  green: '#16A36A',
  greenLight: '#E8F8F0',
  blue: '#3478F6',
  blueLight: '#EAF1FF',
  yellow: '#D99000',
  yellowLight: '#FFF4D6',
  purple: '#8256D0',
  purpleLight: '#F0E9FF',
  red: '#E5484D',
  redLight: '#FDEBEC',
  gray: '#77717A',
  grayLight: '#F0EEF1',
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

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang chuẩn bị',
  READY: 'Chờ tài xế',
  PICKED_UP: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

const TAB_BAR_OFFSET = 88;

export default function OwnerHomeScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

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
        'Không thể cập nhật',
        error?.response?.data?.message ??
          'Không thể thay đổi trạng thái nhà hàng. Vui lòng thử lại.',
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
        'Lỗi cập nhật đơn hàng',
        error?.response?.data?.message ??
          'Không thể cập nhật trạng thái đơn hàng.',
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
            ? 'Đang tải thông tin nhà hàng...'
            : 'Đang chuyển đến trang tạo nhà hàng...'}
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
            {isUpdating ? 'Đang cập nhật...' : 'Bắt đầu chuẩn bị'}
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
            {isUpdating ? 'Đang cập nhật...' : 'Đánh dấu đã chuẩn bị xong'}
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
            <Text style={styles.orderLabel}>ĐƠN HÀNG</Text>
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
              {STATUS_LABELS[order.status] ?? order.status}
            </Text>
          </View>
        </View>

        <View style={styles.orderDivider} />

        <View style={styles.addressRow}>
          <View style={styles.addressIcon}>
            <Text style={styles.addressIconText}>⌖</Text>
          </View>

          <View style={styles.addressContent}>
            <Text style={styles.detailLabel}>Địa chỉ giao hàng</Text>
            <Text style={styles.orderAddress} numberOfLines={2}>
              {order.deliveryAddress}
            </Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.detailLabel}>Nhà hàng nhận</Text>
            <Text style={styles.orderTotal}>
              ${restaurantAmount(order).toFixed(2)}
            </Text>
            {voucherSubsidy(order) > 0 ? (
              <Text style={styles.subsidyNote}>
                Khách dùng voucher {order.voucherCode ?? ''} · app bù $
                {voucherSubsidy(order).toFixed(2)}
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
                <Text style={styles.greeting}>KÊNH NHÀ HÀNG</Text>
                <Text style={styles.pageTitle}>Quản lý đơn hàng</Text>
                <Text style={styles.pageSubtitle}>
                  Theo dõi và xử lý đơn hàng của bạn
                </Text>
              </View>

              <View style={styles.headerIcon}>
                <Text style={styles.headerEmoji}>🍽️</Text>
              </View>
            </View>

            <View style={styles.restaurantCard}>
              <View style={styles.restaurantTopRow}>
                <View style={styles.restaurantAvatar}>
                  <Text style={styles.restaurantAvatarText}>
                    {restaurant.name?.trim()?.charAt(0)?.toUpperCase() || 'R'}
                  </Text>
                </View>

                <View style={styles.restaurantInfo}>
                  <Text style={styles.restaurantLabel}>NHÀ HÀNG CỦA BẠN</Text>
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
                        ? 'Đang nhận đơn'
                        : 'Đang tạm đóng cửa'}
                    </Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    restaurant.isOpen
                      ? 'Đóng cửa nhà hàng'
                      : 'Mở cửa nhà hàng'
                  }
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
                        ? 'Tạm đóng cửa nhà hàng?'
                        : 'Mở cửa nhà hàng?',
                      restaurant.isOpen
                        ? 'Nhà hàng sẽ tạm ngừng nhận đơn mới.'
                        : 'Nhà hàng sẽ có thể nhận đơn hàng mới.',
                      [
                        { text: 'Hủy', style: 'cancel' },
                        {
                          text: restaurant.isOpen ? 'Đóng cửa' : 'Mở cửa',
                          onPress: () => toggleOpen(),
                        },
                      ],
                    );
                  }}
                >
                  <Text style={styles.openToggleText}>
                    {isTogglingOpen
                      ? 'Đang lưu...'
                      : restaurant.isOpen
                        ? 'Đóng cửa'
                        : 'Mở cửa'}
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
                  Chỉnh sửa thông tin nhà hàng
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
                <Text style={styles.statLabel}>Đơn đang xử lý</Text>
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
                <Text style={styles.statLabel}>Đơn đã kết thúc</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Đơn hàng hiện tại</Text>
                <Text style={styles.sectionSubtitle}>
                  Các đơn cần theo dõi và xử lý
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
              <Text style={styles.emptyEmoji}>🛍️</Text>
            </View>
            <Text style={styles.emptyTitle}>Chưa có đơn hàng mới</Text>
            <Text style={styles.emptyDescription}>
              Khi khách hàng đặt món, đơn hàng sẽ xuất hiện tại đây.
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
                  <Text style={styles.sectionTitle}>Đơn hàng trước đây</Text>
                  <Text style={styles.sectionSubtitle}>
                    Tối đa 5 đơn gần nhất trong danh sách
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
    paddingHorizontal: 20,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  greeting: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: {
    fontSize: 27,
  },
  restaurantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  restaurantTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restaurantAvatar: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantAvatarText: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  restaurantName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 5,
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
    paddingVertical: 10,
    borderRadius: 12,
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
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 9,
  },
  editButtonIcon: {
    color: COLORS.primary,
    fontSize: 20,
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
    fontSize: 25,
    lineHeight: 27,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 19,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },
  statEmoji: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.green,
  },
  statNumber: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '800',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  countBadge: {
    minWidth: 33,
    height: 33,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    paddingHorizontal: 25,
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 23,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyEmoji: {
    fontSize: 30,
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
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 7,
  },
  orderSeparator: {
    height: 12,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
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
    letterSpacing: 1.1,
    marginBottom: 4,
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
    paddingVertical: 7,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  orderDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  addressIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressIconText: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 25,
  },
  addressContent: {
    flex: 1,
    paddingTop: 1,
  },
  detailLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 5,
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
    marginTop: 14,
    paddingTop: 12,
  },
  subsidyNote: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  orderTotal: {
    color: COLORS.primary,
    fontSize: 19,
    fontWeight: '800',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 13,
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
    fontSize: 17,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
  disabledButton: {
    opacity: 0.55,
  },
  pastOrdersSection: {
    marginTop: 15,
  },
});
