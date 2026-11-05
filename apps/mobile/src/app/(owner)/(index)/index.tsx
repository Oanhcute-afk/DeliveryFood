import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { api } from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { RestaurantType, Order } from '@food-delivery/types';
import { useRestaurantSocket } from '@/hooks/use-order-socket';
import { restaurantAmount, voucherSubsidy } from '@/lib/order-amounts';
import { OrderChatModal } from '@/components/OrderChatModal';

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [chatTargetOrder, setChatTargetOrder] = useState<Order | null>(null);
  const [driverChatOrder, setDriverChatOrder] = useState<Order | null>(null);
  const [declineTargetOrder, setDeclineTargetOrder] = useState<Order | null>(null);
  const [selectedDeclineReason, setSelectedDeclineReason] =
    useState<string>('Quán đã hết món');
  const [customDeclineReason, setCustomDeclineReason] = useState<string>('');

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
        setSelectedOrder((prev) =>
          prev?.id === restaurantUpdate.id
            ? ({ ...prev, ...restaurantUpdate } as Order)
            : prev,
        );
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
    mutationFn: ({
      id,
      status,
      cancelReason,
    }: {
      id: string;
      status: Order['status'];
      cancelReason?: string;
    }) => api.patch<Order>(`/orders/${id}/status`, { status, cancelReason }),
    onMutate: async ({ id, status, cancelReason }) => {
      await queryClient.cancelQueries({ queryKey: ['restaurant-orders'] });
      const previousOrders =
        queryClient.getQueryData<Order[]>(['restaurant-orders']);

      queryClient.setQueryData<Order[]>(['restaurant-orders'], (old = []) =>
        old.map((order) =>
          order.id === id ? { ...order, status, cancelReason } : order,
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

  useEffect(() => {
    if (!chatTargetOrder) return;
    const current = orders.find((o) => o.id === chatTargetOrder.id);
    if (current && !['CONFIRMED', 'PREPARING'].includes(current.status)) {
      setChatTargetOrder(null);
    }
  }, [orders, chatTargetOrder]);

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
        <View style={styles.actionButtonContainer}>
          <View style={styles.actionRowPrimary}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.prepareButton,
                { flex: 1 },
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

            <Pressable
              style={({ pressed }) => [
                styles.declineButton,
                pressed && styles.pressed,
                isUpdating && styles.disabledButton,
              ]}
              disabled={isUpdating}
              onPress={() => {
                setDeclineTargetOrder(order);
                setSelectedDeclineReason('Quán đã hết món');
                setCustomDeclineReason('');
              }}
            >
              <Ionicons name="close-circle-outline" size={17} color="#E34D4D" />
              <Text style={styles.declineButtonText}>Từ chối</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.chatWithCustomerButton,
              pressed && styles.pressed,
            ]}
            onPress={() => setChatTargetOrder(order)}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.chatWithCustomerText}>
              Nhắn tin trao đổi với khách
            </Text>
          </Pressable>
        </View>
      );
    }

    if (order.status === 'PREPARING') {
      return (
        <View style={styles.actionButtonContainer}>
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

          <Pressable
            style={({ pressed }) => [
              styles.chatWithCustomerButton,
              pressed && styles.pressed,
            ]}
            onPress={() => setChatTargetOrder(order)}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.chatWithCustomerText}>
              Nhắn tin trao đổi với khách
            </Text>
          </Pressable>
        </View>
      );
    }

    if (order.status === 'READY') {
      return (
        <View style={styles.actionButtonContainer}>
          <View style={styles.waitingDriverBanner}>
            <Ionicons name="bicycle" size={15} color="#D97706" />
            <Text style={styles.waitingDriverText}>
              {order.driver
                ? `Tài xế ${order.driver.firstName ?? ''} đang đến lấy món`
                : 'Đã sẵn sàng • Đang chờ tài xế đến lấy món'}
            </Text>
          </View>

          {order.driver ? (
            <Pressable
              style={({ pressed }) => [
                styles.chatWithCustomerButton,
                pressed && styles.pressed,
              ]}
              onPress={() => setDriverChatOrder(order)}
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.chatWithCustomerText}>
                Nhắn tin trao đổi với tài xế
              </Text>
            </Pressable>
          ) : null}
        </View>
      );
    }

    return null;
  }

  function renderOrderCard(order: Order, isPast = false) {
    const statusColor = STATUS_COLORS[order.status] ?? COLORS.gray;
    const statusBackground =
      STATUS_BACKGROUNDS[order.status] ?? COLORS.grayLight;

    const dishSummary = (order.items ?? [])
      .map((it: any) => {
        const q = Number(it.quantity ?? 1);
        const name = it.menuItem?.name ?? it.name ?? 'Món ăn';
        return `${q > 1 ? `${q}x ` : ''}${name}`;
      })
      .filter(Boolean)
      .join(', ');

    const customerName = order.customer
      ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || 'Khách hàng'
      : 'Khách hàng';
    const customerPhone = order.customer?.phone ?? null;

    return (
      <Pressable
        key={order.id}
        style={({ pressed }) => [
          styles.orderCard,
          isPast && styles.pastOrderCard,
          pressed && { opacity: 0.95, transform: [{ scale: 0.995 }] },
        ]}
        onPress={() => setSelectedOrder(order)}
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

        {/* Món khách đặt */}
        {dishSummary ? (
          <View style={styles.cardDishesBox}>
            <Ionicons name="fast-food-outline" size={15} color={COLORS.primary} />
            <Text style={styles.cardDishesText} numberOfLines={2}>
              {dishSummary}
            </Text>
          </View>
        ) : null}

        {/* Ghi chú của khách nếu có */}
        {order.note ? (
          <View style={styles.cardNoteBox}>
            <Ionicons name="alert-circle" size={15} color="#D97706" />
            <Text style={styles.cardNoteText} numberOfLines={2}>
              Ghi chú: "{order.note}"
            </Text>
          </View>
        ) : null}

        {/* Khách hàng */}
        <View style={styles.cardCustomerRow}>
          <Ionicons name="person-outline" size={14} color={COLORS.muted} />
          <Text style={styles.cardCustomerText}>
            Khách: <Text style={{ fontWeight: '700', color: COLORS.text }}>{customerName}</Text>
            {customerPhone ? ` • 📞 ${customerPhone}` : ''}
          </Text>
        </View>

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
          <View style={styles.orderRevenueLeft}>
            <Text style={styles.detailLabel}>Nhà hàng nhận</Text>
            <Text style={styles.orderTotal} numberOfLines={1}>
              ${restaurantAmount(order).toFixed(2)}
            </Text>
          </View>

          <View style={styles.viewDetailsPrompt}>
            <Text style={styles.viewDetailsPromptText}>Xem chi tiết món</Text>
            <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
          </View>
        </View>

        {voucherSubsidy(order) > 0 ? (
          <View style={styles.subsidyContainer}>
            <Text style={styles.subsidyNote} numberOfLines={2}>
              Khách dùng voucher {order.voucherCode ?? ''} · app bù $
              {voucherSubsidy(order).toFixed(2)}
            </Text>
          </View>
        ) : null}

        {!isPast && (
          <View style={{ marginTop: 12 }}>
            {renderActionButton(order)}
          </View>
        )}
      </Pressable>
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
          { paddingBottom: 32 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
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

      {/* Modal chi tiết đơn hàng cho Chủ nhà hàng */}
      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedOrder(null)}
      >
        {selectedOrder && (
          <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>CHI TIẾT ĐƠN HÀNG</Text>
                <Text style={styles.modalTitle}>
                  #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </Text>
              </View>

              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setSelectedOrder(null)}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Trạng thái đơn */}
              <View
                style={[
                  styles.modalStatusBanner,
                  {
                    backgroundColor:
                      STATUS_BACKGROUNDS[selectedOrder.status] ?? COLORS.grayLight,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        STATUS_COLORS[selectedOrder.status] ?? COLORS.gray,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.modalStatusText,
                    {
                      color: STATUS_COLORS[selectedOrder.status] ?? COLORS.gray,
                    },
                  ]}
                >
                  Trạng thái: {STATUS_LABELS[selectedOrder.status] ?? selectedOrder.status}
                </Text>
              </View>

              {/* GHI CHÚ TỪ KHÁCH HÀNG (Nếu có) */}
              {selectedOrder.note ? (
                <View style={styles.modalNoteCard}>
                  <View style={styles.modalNoteHeader}>
                    <Ionicons name="alert-circle" size={18} color="#D97706" />
                    <Text style={styles.modalNoteTitle}>GHI CHÚ CỦA KHÁCH</Text>
                  </View>
                  <Text style={styles.modalNoteBody}>{selectedOrder.note}</Text>
                </View>
              ) : null}

              {/* Danh sách món ăn */}
              <View style={styles.modalSectionCard}>
                <View style={styles.modalSectionHeader}>
                  <Ionicons
                    name="restaurant-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.modalSectionTitle}>
                    Danh sách món ăn ({selectedOrder.items?.length ?? 0})
                  </Text>
                </View>

                {Array.isArray(selectedOrder.items) &&
                selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((it: any, idx: number) => {
                    const qty = Number(it.quantity ?? 1);
                    const unitPrice = Number(
                      it.unitPrice ?? it.menuItem?.price ?? 0,
                    );
                    const name =
                      it.menuItem?.name ?? it.name ?? `Món #${idx + 1}`;
                    return (
                      <View
                        key={it.id ?? idx}
                        style={[
                          styles.modalItemRow,
                          idx > 0 && styles.modalItemDivider,
                        ]}
                      >
                        <View style={styles.modalItemQtyBadge}>
                          <Text style={styles.modalItemQtyText}>{qty}x</Text>
                        </View>
                        <View style={{ flex: 1, marginHorizontal: 10 }}>
                          <Text style={styles.modalItemName}>{name}</Text>
                          <Text style={styles.modalItemUnitPrice}>
                            ${unitPrice.toFixed(2)} / phần
                          </Text>
                        </View>
                        <Text style={styles.modalItemTotalPrice}>
                          ${(unitPrice * qty).toFixed(2)}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.modalEmptyText}>
                    Không có thông tin chi tiết món.
                  </Text>
                )}
              </View>

              {/* Thông tin khách hàng & Giao hàng */}
              <View style={styles.modalSectionCard}>
                <View style={styles.modalSectionHeader}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.modalSectionTitle}>
                    Thông tin khách hàng
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Người nhận:</Text>
                  <Text style={styles.modalInfoValue}>
                    {selectedOrder.customer
                      ? `${selectedOrder.customer.firstName ?? ''} ${selectedOrder.customer.lastName ?? ''}`.trim() ||
                        'Khách hàng'
                      : 'Khách hàng'}
                  </Text>
                </View>

                {selectedOrder.customer?.phone ? (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Số điện thoại:</Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Text
                        style={[
                          styles.modalInfoValue,
                          { color: COLORS.green, fontWeight: '700' },
                        ]}
                      >
                        {selectedOrder.customer.phone}
                      </Text>
                      <Pressable
                        style={styles.modalCallSmallBtn}
                        onPress={() => {
                          const clean = selectedOrder.customer!.phone!.replace(
                            /\s+/g,
                            '',
                          );
                          Linking.openURL(`tel:${clean}`);
                        }}
                      >
                        <Ionicons name="call" size={12} color="#FFFFFF" />
                        <Text style={styles.modalCallSmallText}>Gọi</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {['CONFIRMED', 'PREPARING'].includes(selectedOrder.status) && (
                  <View style={[styles.modalInfoRow, { marginTop: 4 }]}>
                    <Text style={styles.modalInfoLabel}>Trò chuyện:</Text>
                    <Pressable
                      style={styles.modalChatSmallBtn}
                      onPress={() => setChatTargetOrder(selectedOrder)}
                    >
                      <Ionicons
                        name="chatbubble-ellipses"
                        size={13}
                        color="#FFFFFF"
                      />
                      <Text style={styles.modalCallSmallText}>
                        Nhắn tin với khách
                      </Text>
                    </Pressable>
                  </View>
                )}

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Địa chỉ giao:</Text>
                  <Text style={[styles.modalInfoValue, { flex: 1 }]}>
                    {selectedOrder.deliveryAddress}
                  </Text>
                </View>
              </View>

              {/* Thông tin tài xế (nếu có) */}
              <View style={styles.modalSectionCard}>
                <View style={styles.modalSectionHeader}>
                  <Ionicons
                    name="bicycle-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.modalSectionTitle}>
                    Tài xế giao hàng
                  </Text>
                </View>

                {selectedOrder.driver ? (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Tài xế:</Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Text style={styles.modalInfoValue}>
                        {`${selectedOrder.driver.firstName ?? ''} ${selectedOrder.driver.lastName ?? ''}`.trim() ||
                          'Tài xế'}
                      </Text>
                      {selectedOrder.driver.phone ? (
                        <Pressable
                          style={styles.modalCallSmallBtn}
                          onPress={() => {
                            const clean = selectedOrder.driver!.phone!.replace(
                              /\s+/g,
                              '',
                            );
                            Linking.openURL(`tel:${clean}`);
                          }}
                        >
                          <Ionicons name="call" size={12} color="#FFFFFF" />
                          <Text style={styles.modalCallSmallText}>Gọi</Text>
                        </Pressable>
                      ) : null}

                      <Pressable
                        style={styles.modalChatDriverBtn}
                        onPress={() => setDriverChatOrder(selectedOrder)}
                      >
                        <Ionicons
                          name="chatbubble-ellipses"
                          size={12}
                          color="#FFFFFF"
                        />
                        <Text style={styles.modalCallSmallText}>Nhắn tin</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.modalEmptyText}>
                    {selectedOrder.status === 'READY'
                      ? 'Đang tìm tài xế nhận đơn...'
                      : 'Chưa có tài xế nhận đơn.'}
                  </Text>
                )}
              </View>

              {/* Doanh thu & Thanh toán */}
              <View style={styles.modalSectionCard}>
                <View style={styles.modalSectionHeader}>
                  <Ionicons
                    name="wallet-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.modalSectionTitle}>
                    Doanh thu & Thanh toán
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Tổng tiền đơn hàng:</Text>
                  <Text style={styles.modalInfoValue}>
                    ${Number(selectedOrder.totalAmount).toFixed(2)}
                  </Text>
                </View>

                {voucherSubsidy(selectedOrder) > 0 ? (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>
                      Voucher app tài trợ:
                    </Text>
                    <Text
                      style={[
                        styles.modalInfoValue,
                        { color: COLORS.green, fontWeight: '700' },
                      ]}
                    >
                      +${voucherSubsidy(selectedOrder).toFixed(2)}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.modalDivider} />

                <View style={styles.modalInfoRow}>
                  <Text
                    style={[
                      styles.modalInfoLabel,
                      { fontWeight: '800', color: COLORS.text, fontSize: 15 },
                    ]}
                  >
                    Nhà hàng thực nhận:
                  </Text>
                  <Text
                    style={[
                      styles.modalInfoValue,
                      {
                        fontWeight: '800',
                        fontSize: 18,
                        color: COLORS.primary,
                      },
                    ]}
                  >
                    ${restaurantAmount(selectedOrder).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Hình thức thanh toán:</Text>
                  <Text style={styles.modalInfoValue}>
                    {selectedOrder.paymentMethod === 'CASH'
                      ? 'Tiền mặt khi nhận (COD)'
                      : 'Trực tuyến (Stripe)'}
                  </Text>
                </View>
              </View>

              {/* Nút hành động đổi trạng thái trong Modal */}
              {selectedOrder.status === 'CONFIRMED' && (
                <View style={{ gap: 10 }}>
                  <Pressable
                    style={[
                      styles.modalActionBtn,
                      styles.prepareButton,
                      isUpdatingStatus && styles.disabledButton,
                    ]}
                    disabled={isUpdatingStatus}
                    onPress={() => {
                      updateStatus({
                        id: selectedOrder.id,
                        status: 'PREPARING',
                      });
                      setSelectedOrder((prev) =>
                        prev ? { ...prev, status: 'PREPARING' } : null,
                      );
                    }}
                  >
                    <Text style={styles.modalActionBtnText}>
                      {isUpdatingStatus
                        ? 'Đang cập nhật...'
                        : 'Bắt đầu chuẩn bị món'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.modalActionBtn,
                      styles.modalDeclineBtn,
                      isUpdatingStatus && styles.disabledButton,
                    ]}
                    disabled={isUpdatingStatus}
                    onPress={() => {
                      setDeclineTargetOrder(selectedOrder);
                      setSelectedDeclineReason('Quán đã hết món');
                      setCustomDeclineReason('');
                    }}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={18}
                      color="#E34D4D"
                    />
                    <Text style={styles.modalDeclineBtnText}>
                      Từ chối nhận đơn
                    </Text>
                  </Pressable>
                </View>
              )}

              {selectedOrder.status === 'PREPARING' && (
                <Pressable
                  style={[
                    styles.modalActionBtn,
                    styles.readyButton,
                    isUpdatingStatus && styles.disabledButton,
                  ]}
                  disabled={isUpdatingStatus}
                  onPress={() => {
                    updateStatus({
                      id: selectedOrder.id,
                      status: 'READY',
                    });
                    setSelectedOrder((prev) =>
                      prev ? { ...prev, status: 'READY' } : null,
                    );
                  }}
                >
                  <Text style={styles.modalActionBtnText}>
                    {isUpdatingStatus
                      ? 'Đang cập nhật...'
                      : 'Đánh dấu đã chuẩn bị xong (Chờ shipper)'}
                  </Text>
                </Pressable>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Modal Từ chối đơn hàng */}
      <Modal
        visible={!!declineTargetOrder}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeclineTargetOrder(null)}
      >
        <KeyboardAvoidingView
          style={styles.declineModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.declineModalBox}>
            <View style={styles.declineModalHeader}>
              <View style={styles.declineModalIconBox}>
                <Ionicons name="warning-outline" size={24} color="#E34D4D" />
              </View>
              <Text style={styles.declineModalTitle}>
                Từ chối nhận đơn hàng
              </Text>
              <Text style={styles.declineModalSubtitle}>
                Vui lòng chọn lý do từ chối để thông báo đến khách hàng
              </Text>
            </View>

            <View style={styles.declineReasonsList}>
              {[
                'Quán đã hết món',
                'Quán đang quá tải, không kịp làm món',
                'Quán sắp đến giờ đóng cửa',
                'Khách yêu cầu huỷ đơn',
                'Lý do khác',
              ].map((reason) => {
                const isSelected = selectedDeclineReason === reason;
                return (
                  <Pressable
                    key={reason}
                    style={[
                      styles.declineReasonOption,
                      isSelected && styles.declineReasonOptionSelected,
                    ]}
                    onPress={() => setSelectedDeclineReason(reason)}
                  >
                    <Ionicons
                      name={
                        isSelected ? 'radio-button-on' : 'radio-button-off'
                      }
                      size={18}
                      color={isSelected ? COLORS.primary : COLORS.muted}
                    />
                    <Text
                      style={[
                        styles.declineReasonText,
                        isSelected && styles.declineReasonTextSelected,
                      ]}
                    >
                      {reason}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {selectedDeclineReason === 'Lý do khác' && (
              <TextInput
                style={styles.declineCustomInput}
                placeholder="Nhập lý do từ chối cụ thể..."
                placeholderTextColor="#A89EA6"
                value={customDeclineReason}
                onChangeText={setCustomDeclineReason}
                maxLength={200}
                multiline
              />
            )}

            <View style={styles.declineModalActions}>
              <Pressable
                style={[styles.declineModalButton, styles.declineBackBtn]}
                onPress={() => setDeclineTargetOrder(null)}
                disabled={isUpdatingStatus}
              >
                <Text style={styles.declineBackBtnText}>Quay lại</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.declineModalButton,
                  styles.declineConfirmBtn,
                  isUpdatingStatus && styles.disabledButton,
                ]}
                disabled={isUpdatingStatus}
                onPress={() => {
                  if (!declineTargetOrder) return;
                  const finalReason =
                    selectedDeclineReason === 'Lý do khác'
                      ? customDeclineReason.trim() || 'Quán từ chối nhận đơn'
                      : selectedDeclineReason;

                  updateStatus({
                    id: declineTargetOrder.id,
                    status: 'CANCELLED',
                    cancelReason: finalReason,
                  });
                  setDeclineTargetOrder(null);
                  if (selectedOrder?.id === declineTargetOrder.id) {
                    setSelectedOrder(null);
                  }
                }}
              >
                {isUpdatingStatus ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.declineConfirmBtnText}>
                    Xác nhận từ chối
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Khung chat trực tuyến với khách hàng (chỉ hoạt động khi CONFIRMED hoặc PREPARING) */}
      {chatTargetOrder &&
        ['CONFIRMED', 'PREPARING'].includes(chatTargetOrder.status) && (
          <OrderChatModal
            visible={!!chatTargetOrder}
            onClose={() => setChatTargetOrder(null)}
            orderId={chatTargetOrder.id}
            currentUserRole="RESTAURANT_OWNER"
            currentUserId={user?.id}
            currentUserName={restaurant?.name || 'Nhà hàng'}
            otherPartyName={
              chatTargetOrder.customer
                ? `${chatTargetOrder.customer.firstName ?? ''} ${chatTargetOrder.customer.lastName ?? ''}`.trim() ||
                  'Khách hàng'
                : 'Khách hàng'
            }
            otherPartyPhone={chatTargetOrder.customer?.phone ?? null}
            otherPartyRoleTitle="Khách đặt món"
          />
        )}

      {/* Khung chat trực tuyến với tài xế khi đơn READY hoặc PICKED_UP */}
      {driverChatOrder && (
        <OrderChatModal
          visible={!!driverChatOrder}
          onClose={() => setDriverChatOrder(null)}
          orderId={driverChatOrder.id}
          currentUserRole="RESTAURANT_OWNER"
          currentUserId={user?.id}
          currentUserName={restaurant?.name || 'Nhà hàng'}
          otherPartyName={
            driverChatOrder.driver
              ? `${driverChatOrder.driver.firstName ?? ''} ${driverChatOrder.driver.lastName ?? ''}`.trim() ||
                'Tài xế'
              : 'Tài xế'
          }
          otherPartyPhone={driverChatOrder.driver?.phone ?? null}
          otherPartyRoleTitle="Tài xế giao hàng"
          chatMode="DRIVER"
        />
      )}
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
  orderRevenueLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  subsidyContainer: {
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  subsidyNote: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
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
  cardDishesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardDishesText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D94D20',
    flex: 1,
  },
  cardNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cardNoteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    flex: 1,
  },
  cardCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardCustomerText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  viewDetailsPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  viewDetailsPromptText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 0.8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0EEF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    gap: 14,
  },
  modalStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  modalStatusText: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalNoteCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  modalNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalNoteTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  modalNoteBody: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78350F',
    lineHeight: 20,
  },
  modalSectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F1EE',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalItemDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F8F6F4',
  },
  modalItemQtyBadge: {
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalItemQtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  modalItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalItemUnitPrice: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  modalItemTotalPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalInfoLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  modalInfoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalCallSmallBtn: {
    backgroundColor: COLORS.green,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalChatDriverBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  waitingDriverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  waitingDriverText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  modalCallSmallText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F0E8E3',
    marginVertical: 4,
  },
  modalActionBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalEmptyText: {
    fontSize: 13,
    color: COLORS.muted,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  actionButtonContainer: {
    gap: 8,
    marginTop: 14,
  },
  actionRowPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  declineButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E34D4D',
  },
  chatWithCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: '#FCD8C8',
  },
  chatWithCustomerText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalChatSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modalDeclineBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalDeclineBtnText: {
    color: '#E34D4D',
    fontSize: 15,
    fontWeight: '700',
  },
  declineModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  declineModalBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
  },
  declineModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  declineModalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  declineModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#29232A',
    marginBottom: 4,
    textAlign: 'center',
  },
  declineModalSubtitle: {
    fontSize: 13,
    color: '#8B8289',
    textAlign: 'center',
    lineHeight: 18,
  },
  declineReasonsList: {
    gap: 8,
    marginBottom: 12,
  },
  declineReasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FBF8F6',
    borderWidth: 1,
    borderColor: '#F0E8E3',
  },
  declineReasonOptionSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  declineReasonText: {
    fontSize: 14,
    color: '#29232A',
    fontWeight: '500',
    flex: 1,
  },
  declineReasonTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  declineCustomInput: {
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: '#FBF8F6',
    borderWidth: 1,
    borderColor: '#E6DCD6',
    padding: 12,
    fontSize: 14,
    color: '#29232A',
    marginBottom: 14,
    textAlignVertical: 'top',
  },
  declineModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  declineModalButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBackBtn: {
    backgroundColor: '#F3ECEA',
  },
  declineBackBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#554C53',
  },
  declineConfirmBtn: {
    backgroundColor: '#E34D4D',
  },
  declineConfirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});