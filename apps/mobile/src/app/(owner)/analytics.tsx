import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/axios';
import { Order, RestaurantType } from '@food-delivery/types';

type RestaurantOrder = Order & { items: { id: string }[] };

const COLORS = {
  primary: '#FF6B35',
  background: '#FFF9F5',
  surface: '#FFFFFF',
  text: '#29232A',
  muted: '#8B8289',
  border: '#F0E8E3',
  green: '#22A06B',
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#3B82F6',
  PREPARING: '#8B5CF6',
  READY: '#0891B2',
  PICKED_UP: '#FF6B35',
  DELIVERED: '#22A06B',
  CANCELLED: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang chuẩn bị',
  READY: 'Sẵn sàng',
  PICKED_UP: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

function formatMoney(value: number | string) {
  return `$${Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function OwnerAnalyticsScreen() {
  const {
    data: restaurant,
    isLoading: restaurantLoading,
  } = useQuery<RestaurantType | null>({
    queryKey: ['my-restaurant'],
    queryFn: () =>
      api.get<RestaurantType | null>('/restaurants/mine').then((r) => r.data),
  });

  const {
    data: allOrders = [],
    isLoading: ordersLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<RestaurantOrder[]>({
    queryKey: ['restaurant-orders'],
    queryFn: () =>
      api.get<RestaurantOrder[]>('/orders/restaurant').then((r) => r.data),
    enabled: !!restaurant,
  });

  const todayOrders = useMemo(() => {
    const today = new Date().toDateString();

    return allOrders.filter(
      (order) => new Date(order.createdAt).toDateString() === today,
    );
  }, [allOrders]);

  const totalRevenue = useMemo(
    () =>
      todayOrders
        .filter((order) => order.status !== 'CANCELLED')
        .reduce((sum, order) => sum + Number(order.totalAmount), 0),
    [todayOrders],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    todayOrders.forEach((order) => {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
    });

    return Object.entries(counts).sort(
      ([statusA], [statusB]) =>
        (STATUS_COLORS[statusB] ? 1 : 0) -
        (STATUS_COLORS[statusA] ? 1 : 0),
    );
  }, [todayOrders]);

  const isLoading = restaurantLoading || (!!restaurant && ordersLoading);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải thống kê...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={todayOrders}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>TỔNG QUAN NHÀ HÀNG</Text>
                <Text style={styles.title}>Thống kê hôm nay</Text>
                <Text style={styles.date}>
                  {new Date().toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              <View style={styles.headerIcon}>
                <Text style={styles.headerEmoji}>📊</Text>
              </View>
            </View>

            {isError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Không tải được thống kê</Text>
                <Text style={styles.errorDescription}>
                  Vui lòng kéo xuống để thử tải lại dữ liệu.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.revenueCard}>
                  <View style={styles.revenueTop}>
                    <View style={styles.revenueIcon}>
                      <Text style={styles.revenueEmoji}>💰</Text>
                    </View>
                    <View style={styles.revenueHeading}>
                      <Text style={styles.revenueCaption}>
                        DOANH THU HÔM NAY
                      </Text>
                      <Text style={styles.revenueAmount}>
                        {formatMoney(totalRevenue)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.revenueDivider} />

                  <View style={styles.revenueBottom}>
                    <View>
                      <Text style={styles.revenueSmallLabel}>
                        Tổng số đơn
                      </Text>
                      <Text style={styles.revenueSmallValue}>
                        {todayOrders.length} đơn
                      </Text>
                    </View>

                    <View style={styles.revenueBottomDivider} />

                    <View>
                      <Text style={styles.revenueSmallLabel}>
                        Đơn đã giao
                      </Text>
                      <Text style={styles.revenueSmallValue}>
                        {todayOrders.filter(
                          (order) => order.status === 'DELIVERED',
                        ).length}{' '}
                        đơn
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Trạng thái đơn hàng</Text>
                  <Text style={styles.sectionCount}>
                    {statusCounts.length} trạng thái
                  </Text>
                </View>

                {statusCounts.length > 0 ? (
                  <View style={styles.statusCard}>
                    {statusCounts.map(([status, count], index) => {
                      const color = STATUS_COLORS[status] ?? '#999999';

                      return (
                        <View
                          key={status}
                          style={[
                            styles.statusRow,
                            index !== statusCounts.length - 1 &&
                              styles.statusRowBorder,
                          ]}
                        >
                          <View
                            style={[
                              styles.statusIcon,
                              { backgroundColor: `${color}18` },
                            ]}
                          >
                            <View
                              style={[
                                styles.statusDot,
                                { backgroundColor: color },
                              ]}
                            />
                          </View>

                          <Text style={styles.statusLabel}>
                            {STATUS_LABELS[status] ?? status}
                          </Text>

                          <View
                            style={[
                              styles.statusCountBadge,
                              { backgroundColor: `${color}18` },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusCount,
                                { color },
                              ]}
                            >
                              {count}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyStatusCard}>
                    <Text style={styles.emptyStatusText}>
                      Chưa có đơn hàng nào hôm nay.
                    </Text>
                  </View>
                )}

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Đơn hàng hôm nay</Text>
                  <View style={styles.orderCountBadge}>
                    <Text style={styles.orderCountText}>
                      {todayOrders.length}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const color = STATUS_COLORS[item.status] ?? '#999999';

          return (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderIdContainer}>
                  <View style={styles.orderIcon}>
                    <Text style={styles.orderEmoji}>🧾</Text>
                  </View>
                  <View>
                    <Text style={styles.orderId}>
                      Đơn #{item.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={styles.orderItemCount}>
                      {item.items.length} món
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${color}18` },
                  ]}
                >
                  <Text style={[styles.statusText, { color }]}>
                    {STATUS_LABELS[item.status] ?? item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDivider} />

              <View style={styles.orderFooter}>
                <Text style={styles.orderTotalLabel}>Tổng thanh toán</Text>
                <Text style={styles.orderTotal}>
                  {formatMoney(item.totalAmount)}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !isError ? (
            <View style={styles.emptyOrders}>
              <View style={styles.emptyIllustration}>
                <Text style={styles.emptyEmoji}>🍽️</Text>
              </View>
              <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
              <Text style={styles.emptyDescription}>
                Đơn hàng phát sinh hôm nay sẽ xuất hiện tại đây.
              </Text>
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
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.6,
  },
  date: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 7,
    textTransform: 'capitalize',
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFEBE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: {
    fontSize: 25,
  },
  revenueCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 22,
    marginBottom: 28,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  revenueTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  revenueIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revenueEmoji: {
    fontSize: 25,
  },
  revenueHeading: {
    flex: 1,
  },
  revenueCaption: {
    color: '#FFE9DD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  revenueAmount: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  revenueDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginVertical: 20,
  },
  revenueBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  revenueSmallLabel: {
    color: '#FFE9DD',
    fontSize: 12,
    marginBottom: 6,
  },
  revenueSmallValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  revenueBottomDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionCount: {
    color: COLORS.muted,
    fontSize: 12,
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 28,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  statusRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F6F0EC',
  },
  statusIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  statusLabel: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  statusCountBadge: {
    minWidth: 32,
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCount: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyStatusCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 20,
    marginBottom: 28,
  },
  emptyStatusText: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  orderCountBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBE1',
  },
  orderCountText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 11,
  },
  orderIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderEmoji: {
    fontSize: 20,
  },
  orderId: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  orderItemCount: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: 145,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#F4EDE8',
    marginVertical: 14,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  orderTotalLabel: {
    color: COLORS.muted,
    fontSize: 12,
  },
  orderTotal: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '800',
  },
  emptyOrders: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 36,
  },
  emptyIllustration: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: '#FFEBE1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyEmoji: {
    fontSize: 38,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyDescription: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  errorTitle: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  errorDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});