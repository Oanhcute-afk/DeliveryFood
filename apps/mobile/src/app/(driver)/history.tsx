import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api } from '@/lib/axios';
import { Order } from '@food-delivery/types';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

type DeliveryFilter = 'ALL' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';

type DriverOrder = Order & {
  restaurant: { id: string; name: string };
};

function DeliveryCard({
  order,
  onPress,
}: {
  order: DriverOrder;
  onPress?: () => void;
}) {
  const { tr, isVi } = useLanguage();

  const statusConfig: Record<
    string,
    { label: string; color: string; background: string; emoji: string }
  > = {
    READY: {
      label: tr('Chờ lấy hàng', 'Ready for Pickup'),
      color: '#B45309',
      background: BURGER_COLORS.cheeseLight,
      emoji: '📦',
    },
    PICKED_UP: {
      label: tr('Đang giao', 'Delivering'),
      color: BURGER_COLORS.primary,
      background: BURGER_COLORS.primaryLight,
      emoji: '🛵',
    },
    DELIVERED: {
      label: tr('Đã giao', 'Delivered'),
      color: BURGER_COLORS.success,
      background: BURGER_COLORS.successLight,
      emoji: '✓',
    },
    CANCELLED: {
      label: tr('Đã hủy', 'Cancelled'),
      color: BURGER_COLORS.danger,
      background: BURGER_COLORS.dangerLight,
      emoji: '×',
    },
  };

  const status = statusConfig[order.status] ?? {
    label: order.status,
    color: BURGER_COLORS.muted,
    background: BURGER_COLORS.surfaceMuted,
    emoji: '•',
  };

  const date = new Date(order.createdAt).toLocaleDateString(
    isVi ? 'vi-VN' : 'en-US',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  );

  const isActive = order.status === 'PICKED_UP';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isActive && styles.cardActive,
        pressed && isActive && styles.cardPressed,
      ]}
      onPress={onPress}
      disabled={!isActive}
      accessibilityRole={isActive ? 'button' : undefined}
    >
      {isActive ? <View style={styles.activeAccent} /> : null}

      <View style={styles.cardHeader}>
        <View style={styles.restaurantIcon}>
          <Text style={styles.restaurantEmoji}>🍔</Text>
        </View>

        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantLabel}>
            {tr('NHÀ HÀNG', 'RESTAURANT')}
          </Text>
          <Text style={styles.restaurant} numberOfLines={1}>
            {order.restaurant?.name ?? tr('Nhà hàng', 'Restaurant')}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: status.background },
          ]}
        >
          <Text style={[styles.statusEmoji, { color: status.color }]}>
            {status.emoji}
          </Text>
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.addressRow}>
        <View style={styles.addressIcon}>
          <Text style={styles.addressEmoji}>📍</Text>
        </View>
        <View style={styles.addressContent}>
          <Text style={styles.addressLabel}>
            {tr('GIAO ĐẾN', 'DELIVER TO')}
          </Text>
          <Text style={styles.address} numberOfLines={2}>
            {order.deliveryAddress}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateIcon}>🗓</Text>
          <Text style={styles.date}>{date}</Text>
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>
            {tr('Tổng đơn', 'Order total')}
          </Text>
          <Text style={styles.total}>
            ${Number(order.totalAmount).toFixed(2)}
          </Text>
        </View>
      </View>

      {isActive ? (
        <View style={styles.tapHintContainer}>
          <Text style={styles.tapHint}>
            {tr('Xem hành trình giao hàng', 'View active delivery route')}
          </Text>
          <Text style={styles.tapArrow}>›</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function DriverHistoryScreen() {
  const { tr } = useLanguage();
  const [selectedFilter, setSelectedFilter] = useState<DeliveryFilter>('ALL');
  const { data: orders = [], isLoading } = useQuery<DriverOrder[]>({
    queryKey: ['driver-orders'],
    queryFn: () => api.get<DriverOrder[]>('/orders/mine').then((r) => r.data),
  });

  const deliveredCount = orders.filter(
    (order) => order.status === 'DELIVERED',
  ).length;

  const inProgressCount = orders.filter((order) =>
    ['READY', 'PICKED_UP'].includes(order.status),
  ).length;

  const activeCount = orders.filter(
    (order) => order.status === 'PICKED_UP',
  ).length;

  // Bộ lọc chỉ thay đổi danh sách hiển thị, không ảnh hưởng dữ liệu/API.
  const cancelledCount = orders.filter(
    (order) => order.status === 'CANCELLED',
  ).length;
  const filters: { key: DeliveryFilter; label: string; count: number }[] = [
    { key: 'ALL', label: tr('Tất cả', 'All'), count: orders.length },
    {
      key: 'IN_PROGRESS',
      label: tr('Đang xử lý', 'In progress'),
      count: inProgressCount,
    },
    {
      key: 'DELIVERED',
      label: tr('Đã giao', 'Delivered'),
      count: deliveredCount,
    },
    {
      key: 'CANCELLED',
      label: tr('Đã hủy', 'Cancelled'),
      count: cancelledCount,
    },
  ];
  const filteredOrders = orders.filter((order) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'IN_PROGRESS') {
      return order.status === 'READY' || order.status === 'PICKED_UP';
    }
    return order.status === selectedFilter;
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color={BURGER_COLORS.primary} />
          </View>
          <Text style={styles.loadingText}>
            {tr('Đang tải lịch sử giao hàng...', 'Loading delivery history...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.eyebrow}>
                  {tr('TRUNG TÂM TÀI XẾ', 'DRIVER HUB')}
                </Text>
                <Text style={styles.title}>
                  {tr('Lịch sử giao hàng', 'Delivery History')}
                </Text>
                <Text style={styles.subtitle}>
                  {tr(
                    'Theo dõi các đơn hàng và thành quả giao hàng của bạn.',
                    'Track your completed trips and delivery performance.',
                  )}
                </Text>
              </View>

              <LanguageSwitch />
            </View>

            {/* Thống kê */}
            <View style={styles.statsHeader}>
              <Text style={styles.sectionTitle}>
                {tr('Tổng quan', 'Overview')}
              </Text>
              <Text style={styles.statsCaption}>
                {orders.length} {tr('đơn hàng', 'orders')}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, styles.progressCard]}>
                <View style={styles.summaryIcon}>
                  <Text style={styles.summaryEmoji}>🚚</Text>
                </View>
                <Text style={styles.summaryValueLight}>
                  {inProgressCount}
                </Text>
                <Text style={styles.summaryLabelLight}>
                  {tr('Đang xử lý', 'In Progress')}
                </Text>
              </View>

              <View style={[styles.summaryCard, styles.completedCard]}>
                <View style={styles.summaryIconCompleted}>
                  <Text style={styles.summaryEmoji}>✓</Text>
                </View>
                <Text style={styles.summaryValue}>{deliveredCount}</Text>
                <Text style={styles.summaryLabel}>
                  {tr('Đã hoàn thành', 'Completed')}
                </Text>
              </View>
            </View>

            {/* Bộ lọc trực quan theo trạng thái đơn giao */}
            <View style={styles.filtersRow}>
              {filters.map((filter) => {
                const isSelected = selectedFilter === filter.key;
                return (
                  <Pressable
                    key={filter.key}
                    onPress={() => setSelectedFilter(filter.key)}
                    style={({ pressed }) => [
                      styles.filterChip,
                      isSelected && styles.filterChipSelected,
                      pressed && styles.filterChipPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${filter.label}: ${filter.count}`}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextSelected,
                      ]}
                    >
                      {filter.label}
                    </Text>
                    <Text
                      style={[
                        styles.filterCount,
                        isSelected && styles.filterCountSelected,
                      ]}
                    >
                      {filter.count}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Danh sách đơn */}
            <View style={styles.listHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  {tr('Các đơn hàng', 'All Deliveries')}
                </Text>
                <Text style={styles.listSubtitle}>
                  {activeCount > 0
                    ? tr(
                        `${activeCount} đơn đang trên đường giao`,
                        `${activeCount} active delivery in progress`,
                      )
                    : tr(
                        'Danh sách các đơn được giao cho bạn',
                        'Orders assigned to your account',
                      )}
                </Text>
              </View>

              <View style={styles.orderCountBadge}>
                <Text style={styles.orderCountText}>{filteredOrders.length}</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
              <Text style={styles.emptyEmoji}>📦</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {orders.length === 0
                ? tr('Chưa có đơn giao hàng', 'No deliveries yet')
                : tr('Không có đơn phù hợp', 'No matching deliveries')}
            </Text>
            <Text style={styles.emptySubText}>
              {orders.length === 0
                ? tr(
                    'Các đơn hàng được giao cho bạn sẽ xuất hiện tại đây.',
                    'Orders assigned to you will appear here.',
                  )
                : tr(
                    'Hãy chọn trạng thái khác để xem các đơn hàng.',
                    'Select another status to see your deliveries.',
                  )}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <DeliveryCard
            order={item}
            onPress={
              item.status === 'PICKED_UP'
                ? () => router.push('/(driver)/active')
                : undefined
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BURGER_COLORS.background,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 32,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 22,
  },
  headerTextContainer: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: BURGER_COLORS.primary,
    letterSpacing: 1.4,
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
    lineHeight: 18,
    color: BURGER_COLORS.muted,
    marginTop: 4,
  },
  statsHeader: {
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
  statsCaption: {
    fontSize: 12,
    color: BURGER_COLORS.muted,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    padding: 15,
  },
  progressCard: {
    backgroundColor: BURGER_COLORS.primary,
  },
  completedCard: {
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryIconCompleted: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: BURGER_COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryEmoji: {
    fontSize: 17,
    color: BURGER_COLORS.success,
    fontWeight: '900',
  },
  summaryValueLight: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  summaryLabelLight: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
    marginTop: 2,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '900',
    color: BURGER_COLORS.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: BURGER_COLORS.muted,
    fontWeight: '600',
    marginTop: 2,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
  },
  filterChipSelected: {
    backgroundColor: BURGER_COLORS.primary,
    borderColor: BURGER_COLORS.primary,
  },
  filterChipPressed: {
    opacity: 0.8,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: BURGER_COLORS.textSoft,
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  filterCount: {
    fontSize: 11,
    fontWeight: '900',
    color: BURGER_COLORS.primary,
  },
  filterCountSelected: {
    color: '#FFFFFF',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  listSubtitle: {
    fontSize: 12,
    color: BURGER_COLORS.muted,
    marginTop: 3,
    padding:1
  },
  orderCountBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 9,
    borderRadius: 11,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderCountText: {
    color: BURGER_COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  card: {
    position: 'relative',
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    overflow: 'hidden',
  },
  cardActive: {
    borderColor: BURGER_COLORS.primary,
  },
  cardPressed: {
    opacity: 0.88,
  },
  activeAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    backgroundColor: BURGER_COLORS.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  restaurantIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantEmoji: {
    fontSize: 19,
  },
  restaurantInfo: {
    flex: 1,
    minWidth: 0,
  },
  restaurantLabel: {
    fontSize: 9,
    color: BURGER_COLORS.muted,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  restaurant: {
    fontSize: 14,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusEmoji: {
    fontSize: 11,
    fontWeight: '900',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
  },
  addressIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: BURGER_COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressEmoji: {
    fontSize: 14,
  },
  addressContent: {
    flex: 1,
    paddingTop: 1,
  },
  addressLabel: {
    fontSize: 9,
    color: BURGER_COLORS.muted,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  address: {
    fontSize: 12,
    color: BURGER_COLORS.textSoft,
    lineHeight: 18,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: BURGER_COLORS.border,
    marginTop: 13,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateIcon: {
    fontSize: 13,
  },
  date: {
    fontSize: 11,
    color: BURGER_COLORS.muted,
    fontWeight: '600',
  },
  totalContainer: {
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
  tapHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BURGER_COLORS.primaryLight,
    borderRadius: 10,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tapHint: {
    fontSize: 11,
    fontWeight: '800',
    color: BURGER_COLORS.primary,
  },
  tapArrow: {
    fontSize: 20,
    lineHeight: 21,
    color: BURGER_COLORS.primary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
    color: BURGER_COLORS.muted,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 36,
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 18,
  },
  emptyIllustration: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyEmoji: {
    fontSize: 38,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BURGER_COLORS.text,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 12,
    color: BURGER_COLORS.muted,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
});
