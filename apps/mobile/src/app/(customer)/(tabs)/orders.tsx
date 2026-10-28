import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  StatusBar,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/axios';
import { Order } from '@food-delivery/types';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

type OrderWithRestaurant = Order & {
  restaurant: { id: string; name: string };
  items: { id: string }[];
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#D97706',
  CONFIRMED: '#2563EB',
  PREPARING: '#7C3AED',
  READY: '#0891B2',
  PICKED_UP: BURGER_COLORS.primary,
  DELIVERED: BURGER_COLORS.success,
  CANCELLED: BURGER_COLORS.danger,
};

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  PENDING: 'time-outline',
  CONFIRMED: 'checkmark-circle-outline',
  PREPARING: 'restaurant-outline',
  READY: 'bag-check-outline',
  PICKED_UP: 'bicycle-outline',
  DELIVERED: 'checkmark-done-circle-outline',
  CANCELLED: 'close-circle-outline',
};

function OrderCard({
  order,
  onPress,
}: {
  order: OrderWithRestaurant;
  onPress: () => void;
}) {
  const { tr, isVi } = useLanguage();
  const statusColor = STATUS_COLORS[order.status] ?? BURGER_COLORS.muted;
  const statusIcon = STATUS_ICONS[order.status] ?? 'receipt-outline';

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

  const itemCount = order.items?.length ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {/* Restaurant header */}
      <View style={styles.cardHeader}>
        <View style={styles.restaurantSection}>
          <View style={styles.restaurantIcon}>
            <Ionicons
              name="restaurant-outline"
              size={21}
              color={BURGER_COLORS.primary}
            />
          </View>

          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {order.restaurant?.name ?? tr('Nhà hàng', 'Restaurant')}
            </Text>
            <Text style={styles.date}>{date}</Text>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={BURGER_COLORS.faint}
        />
      </View>

      <View style={styles.divider} />

      {/* Status */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${statusColor}16` },
          ]}
        >
          <Ionicons name={statusIcon} size={15} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>

        <Text style={styles.orderReference}>
          #{String(order.id).slice(-8).toUpperCase()}
        </Text>
      </View>

      {/* Order footer */}
      <View style={styles.cardFooter}>
        <View style={styles.itemsSection}>
          <View style={styles.itemsIcon}>
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
          <Text style={styles.total}>
            ${Number(order.totalAmount).toFixed(2)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function CustomerOrdersScreen() {
  const { tr } = useLanguage();
  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<OrderWithRestaurant[]>({
    queryKey: ['my-orders'],
    queryFn: () =>
      api.get<OrderWithRestaurant[]>('/orders/mine').then((r) => r.data),
    refetchInterval: 4000,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={BURGER_COLORS.background} />
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color={BURGER_COLORS.primary} />
          </View>
          <Text style={styles.loadingText}>
            {tr('Đang tải đơn hàng của bạn...', 'Loading your orders...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BURGER_COLORS.background} />

      {/* Page header */}
      <View style={styles.header}>
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

      {isError ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={34}
              color={BURGER_COLORS.primary}
            />
          </View>

          <Text style={styles.emptyText}>
            {tr('Không thể tải đơn hàng', 'Unable to load orders')}
          </Text>
          <Text style={styles.emptySubText}>
            {tr(
              'Vui lòng kiểm tra kết nối mạng và thử lại.',
              'Please check your connection and try again.',
            )}
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
            <Text style={styles.retryText}>{tr('Thử lại', 'Try again')}</Text>
          </Pressable>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIllustration}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="receipt-outline"
                size={38}
                color={BURGER_COLORS.primary}
              />
            </View>
          </View>

          <Text style={styles.emptyText}>
            {tr('Chưa có đơn hàng nào', 'No orders yet')}
          </Text>
          <Text style={styles.emptySubText}>
            {tr(
              'Khám phá thực đơn hấp dẫn và đặt bữa ăn đầu tiên của bạn ngay!',
              'Explore the menu and place your first order!',
            )}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.shopButton,
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push('/(customer)/(tabs)/(home)')}
          >
            <Ionicons name="fast-food-outline" size={18} color="#FFFFFF" />
            <Text style={styles.shopButtonText}>
              {tr('Khám phá món ngon', 'Explore food')}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
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
            />
          )}
        />
      )}
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
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: BURGER_COLORS.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 12,
    color: BURGER_COLORS.muted,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  summaryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: BURGER_COLORS.primary,
  },
  summaryText: {
    fontSize: 12,
    color: BURGER_COLORS.muted,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 30,
    gap: 12,
  },
  card: {
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    padding: 15,
  },
  cardPressed: {
    opacity: 0.88,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restaurantSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  restaurantIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 15,
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
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BURGER_COLORS.surfaceMuted,
    borderRadius: 12,
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
    backgroundColor: BURGER_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  items: {
    fontSize: 12,
    color: BURGER_COLORS.muted,
    fontWeight: '700',
  },
  totalSection: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 10,
    color: BURGER_COLORS.muted,
    marginBottom: 2,
  },
  total: {
    fontSize: 16,
    fontWeight: '900',
    color: BURGER_COLORS.primary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
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
    marginBottom: 18,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '800',
    color: BURGER_COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 13,
    color: BURGER_COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  shopButton: {
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
