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
import { restaurantAmount, voucherSubsidy } from '@/lib/order-amounts';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

type RestaurantOrder = Order & { items: { id: string }[] };

const COLORS = {
  primary: BURGER_COLORS.primary,
  background: BURGER_COLORS.background,
  surface: BURGER_COLORS.surface,
  text: BURGER_COLORS.text,
  muted: BURGER_COLORS.muted,
  border: BURGER_COLORS.border,
  green: BURGER_COLORS.success,
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#2563EB',
  PREPARING: '#7C3AED',
  READY: '#0891B2',
  PICKED_UP: BURGER_COLORS.primary,
  DELIVERED: BURGER_COLORS.success,
  CANCELLED: BURGER_COLORS.danger,
};

function formatMoney(value: number | string) {
  return `$${Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function OwnerAnalyticsScreen() {
  const { tr, isVi } = useLanguage();

  const statusLabels: Record<string, string> = {
    PENDING: tr('Chờ xác nhận', 'Pending'),
    CONFIRMED: tr('Đã xác nhận', 'Confirmed'),
    PREPARING: tr('Đang chuẩn bị', 'Preparing'),
    READY: tr('Sẵn sàng', 'Ready'),
    PICKED_UP: tr('Đang giao', 'Delivering'),
    DELIVERED: tr('Đã giao', 'Delivered'),
    CANCELLED: tr('Đã hủy', 'Cancelled'),
  };

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
        .reduce((sum, order) => sum + restaurantAmount(order), 0),
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
          <Text style={styles.loadingText}>
            {tr('Đang tải thống kê...', 'Loading analytics...')}
          </Text>
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
              <View style={styles.headerLeft}>
                <Text style={styles.eyebrow}>
                  {tr('TỔNG QUAN NHÀ HÀNG', 'RESTAURANT ANALYTICS')}
                </Text>
                <Text style={styles.title}>
                  {tr('Thống kê hôm nay', "Today's Performance")}
                </Text>
                <Text style={styles.date}>
                  {new Date().toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              <LanguageSwitch />
            </View>

            {isError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>
                  {tr('Không tải được thống kê', 'Unable to load analytics')}
                </Text>
                <Text style={styles.errorDescription}>
                  {tr(
                    'Vui lòng kéo xuống để thử tải lại dữ liệu.',
                    'Pull down to refresh and try again.',
                  )}
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
                        {tr('DOANH THU HÔM NAY', "TODAY'S REVENUE")}
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
                        {tr('Tổng số đơn', 'Total orders')}
                      </Text>
                      <Text style={styles.revenueSmallValue}>
                        {todayOrders.length} {tr('đơn', 'orders')}
                      </Text>
                    </View>

                    <View style={styles.revenueBottomDivider} />

                    <View>
                      <Text style={styles.revenueSmallLabel}>
                        {tr('Đơn đã giao', 'Delivered')}
                      </Text>
                      <Text style={styles.revenueSmallValue}>
                        {
                          todayOrders.filter(
                            (order) => order.status === 'DELIVERED',
                          ).length
                        }{' '}
                        {tr('đơn', 'orders')}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {tr('Trạng thái đơn hàng', 'Order Breakdown')}
                  </Text>
                  <Text style={styles.sectionCount}>
                    {statusCounts.length} {tr('trạng thái', 'statuses')}
                  </Text>
                </View>

                {statusCounts.length > 0 ? (
                  <View style={styles.statusCard}>
                    {statusCounts.map(([status, count], index) => {
                      const color = STATUS_COLORS[status] ?? BURGER_COLORS.muted;

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
                            {statusLabels[status] ?? status}
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
                      {tr('Chưa có đơn hàng nào hôm nay.', 'No orders recorded today.')}
                    </Text>
                  </View>
                )}

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {tr('Đơn hàng hôm nay', "Today's Orders")}
                  </Text>
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
          const color = STATUS_COLORS[item.status] ?? BURGER_COLORS.muted;

          return (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderIdContainer}>
                  <View style={styles.orderIcon}>
                    <Text style={styles.orderEmoji}>🧾</Text>
                  </View>
                  <View>
                    <Text style={styles.orderId}>
                      {tr('Đơn', 'Order')} #{item.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={styles.orderItemCount}>
                      {item.items.length} {tr('món', 'items')}
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
                    {statusLabels[item.status] ?? item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDivider} />

              <View style={styles.orderFooter}>
                <View>
                  <Text style={styles.orderTotalLabel}>
                    {tr('Nhà hàng nhận', 'Restaurant payout')}
                  </Text>
                  {voucherSubsidy(item) > 0 ? (
                    <Text style={styles.subsidyNote}>
                      {tr(
                        `Khách dùng voucher ${item.voucherCode ?? ''} · app bù ${formatMoney(voucherSubsidy(item))}`,
                        `Voucher ${item.voucherCode ?? ''} · platform subsidy ${formatMoney(voucherSubsidy(item))}`,
                      )}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.orderTotal}>
                  {formatMoney(restaurantAmount(item))}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !isError ? (
            <View style={styles.emptyOrders}>
              <View style={styles.emptyIllustration}>
                <Text style={styles.emptyEmoji}>🍔</Text>
              </View>
              <Text style={styles.emptyTitle}>
                {tr('Chưa có đơn hàng', 'No orders today')}
              </Text>
              <Text style={styles.emptyDescription}>
                {tr(
                  'Đơn hàng phát sinh hôm nay sẽ xuất hiện tại đây.',
                  'Orders placed today will appear here.',
                )}
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
    paddingHorizontal: 18,
    paddingTop: 14,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.6,
  },
  date: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  revenueCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 20,
    marginBottom: 24,
  },
  revenueTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  revenueIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revenueEmoji: {
    fontSize: 24,
  },
  revenueHeading: {
    flex: 1,
  },
  revenueCaption: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  revenueAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  revenueDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: 16,
  },
  revenueBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  revenueSmallLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginBottom: 4,
  },
  revenueSmallValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  revenueBottomDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
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
  sectionCount: {
    color: COLORS.muted,
    fontSize: 12,
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  statusRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  statusCountBadge: {
    minWidth: 30,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCount: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyStatusCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
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
    backgroundColor: BURGER_COLORS.primaryLight,
  },
  orderCountText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
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
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderEmoji: {
    fontSize: 19,
  },
  orderId: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  orderItemCount: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  subsidyNote: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  orderTotal: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  emptyOrders: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 32,
  },
  emptyIllustration: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyEmoji: {
    fontSize: 34,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyDescription: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  errorCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.dangerLight,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  errorTitle: {
    color: BURGER_COLORS.danger,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 5,
  },
  errorDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
