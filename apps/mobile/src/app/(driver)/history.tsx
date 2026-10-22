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

type DriverOrder = Order & {
  restaurant: { id: string; name: string };
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; background: string; emoji: string }
> = {
  READY: {
    label: 'Chờ lấy hàng',
    color: '#B7791F',
    background: '#FFF4D9',
    emoji: '📦',
  },
  PICKED_UP: {
    label: 'Đang giao',
    color: '#FF6B35',
    background: '#FFF0E8',
    emoji: '🛵',
  },
  DELIVERED: {
    label: 'Đã giao',
    color: '#168653',
    background: '#E9F8EF',
    emoji: '✓',
  },
  CANCELLED: {
    label: 'Đã hủy',
    color: '#DC2626',
    background: '#FEF2F2',
    emoji: '×',
  },
};

function DeliveryCard({
  order,
  onPress,
}: {
  order: DriverOrder;
  onPress?: () => void;
}) {
  const status =
    STATUS_CONFIG[order.status] ?? {
      label: order.status,
      color: '#8B8289',
      background: '#F5F0EC',
      emoji: '•',
    };

  const date = new Date(order.createdAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

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
      accessibilityLabel={
        isActive
          ? `Mở đơn đang giao từ ${order.restaurant.name}`
          : `Đơn hàng từ ${order.restaurant.name}, ${status.label}`
      }
    >
      {isActive ? <View style={styles.activeAccent} /> : null}

      <View style={styles.cardHeader}>
        <View style={styles.restaurantIcon}>
          <Text style={styles.restaurantEmoji}>🍴</Text>
        </View>

        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantLabel}>NHÀ HÀNG</Text>
          <Text style={styles.restaurant} numberOfLines={1}>
            {order.restaurant.name}
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
          <Text style={styles.addressLabel}>GIAO ĐẾN</Text>
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
          <Text style={styles.totalLabel}>Tổng đơn</Text>
          <Text style={styles.total}>
            ${Number(order.totalAmount).toFixed(2)}
          </Text>
        </View>
      </View>

      {isActive ? (
        <View style={styles.tapHintContainer}>
          <Text style={styles.tapHint}>Xem hành trình giao hàng</Text>
          <Text style={styles.tapArrow}>›</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function DriverHistoryScreen() {
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
          <Text style={styles.loadingText}>Đang tải lịch sử giao hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.eyebrow}>TRUNG TÂM TÀI XẾ</Text>
                <Text style={styles.title}>Lịch sử giao hàng</Text>
                <Text style={styles.subtitle}>
                  Theo dõi các đơn hàng và thành quả giao hàng của bạn.
                </Text>
              </View>

              <View style={styles.headerIcon}>
                <Text style={styles.headerEmoji}>🛵</Text>
              </View>
            </View>

            {/* Thống kê */}
            <View style={styles.statsHeader}>
              <Text style={styles.sectionTitle}>Tổng quan</Text>
              <Text style={styles.statsCaption}>
                {orders.length} đơn hàng
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
                <Text style={styles.summaryLabelLight}>Đang xử lý</Text>
                <View style={styles.summaryBottomLine} />
              </View>

              <View style={[styles.summaryCard, styles.completedCard]}>
                <View style={styles.summaryIconCompleted}>
                  <Text style={styles.summaryEmoji}>✓</Text>
                </View>
                <Text style={styles.summaryValue}>{deliveredCount}</Text>
                <Text style={styles.summaryLabel}>Đã hoàn thành</Text>
                <View style={styles.completedBottomLine} />
              </View>
            </View>

            {/* Danh sách đơn */}
            <View style={styles.listHeader}>
              <View>
                <Text style={styles.sectionTitle}>Các đơn hàng</Text>
                <Text style={styles.listSubtitle}>
                  {activeCount > 0
                    ? `${activeCount} đơn đang trên đường giao`
                    : 'Danh sách các đơn được giao cho bạn'}
                </Text>
              </View>

              <View style={styles.orderCountBadge}>
                <Text style={styles.orderCountText}>{orders.length}</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
              <Text style={styles.emptyEmoji}>📦</Text>
            </View>
            <Text style={styles.emptyTitle}>Chưa có đơn giao hàng</Text>
            <Text style={styles.emptySubText}>
              Các đơn hàng được giao cho bạn sẽ xuất hiện tại đây. Hãy kiểm tra
              lại sau nhé!
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
    backgroundColor: '#FFF9F5',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
    flexGrow: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 27,
  },
  headerTextContainer: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF6B35',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '900',
    color: '#29232A',
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 19,
    color: '#8B8289',
    marginTop: 8,
  },
  headerIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: {
    fontSize: 34,
  },

  // Thống kê
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#29232A',
  },
  statsCaption: {
    fontSize: 11,
    color: '#8B8289',
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 29,
  },
  summaryCard: {
    flex: 1,
    minHeight: 151,
    borderRadius: 20,
    padding: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  progressCard: {
    backgroundColor: '#FF6B35',
  },
  completedCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryIconCompleted: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E9F8EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryEmoji: {
    fontSize: 18,
    color: '#168653',
    fontWeight: '900',
  },
  summaryValueLight: {
    fontSize: 29,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  summaryLabelLight: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginTop: 2,
  },
  summaryValue: {
    fontSize: 29,
    fontWeight: '900',
    color: '#29232A',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#8B8289',
    fontWeight: '600',
    marginTop: 2,
  },
  summaryBottomLine: {
    position: 'absolute',
    height: 4,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  completedBottomLine: {
    position: 'absolute',
    height: 4,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#22A06B',
  },

  // Danh sách
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  listSubtitle: {
    fontSize: 11,
    color: '#8B8289',
    marginTop: 5,
  },
  orderCountBadge: {
    minWidth: 35,
    height: 35,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderCountText: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '900',
  },

  // Thẻ đơn hàng
  card: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    overflow: 'hidden',
  },
  cardActive: {
    borderColor: '#FFB18F',
    backgroundColor: '#FFFEFD',
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  activeAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    backgroundColor: '#FF6B35',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  restaurantIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantEmoji: {
    fontSize: 20,
  },
  restaurantInfo: {
    flex: 1,
    minWidth: 0,
  },
  restaurantLabel: {
    fontSize: 9,
    color: '#A1989E',
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  restaurant: {
    fontSize: 14,
    fontWeight: '900',
    color: '#29232A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  statusEmoji: {
    fontSize: 11,
    fontWeight: '900',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Địa chỉ
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 17,
  },
  addressIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#FFF9F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressEmoji: {
    fontSize: 14,
  },
  addressContent: {
    flex: 1,
    paddingTop: 2,
  },
  addressLabel: {
    fontSize: 9,
    color: '#A1989E',
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  address: {
    fontSize: 12,
    color: '#514850',
    lineHeight: 19,
    fontWeight: '500',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3ECE7',
    marginTop: 15,
    marginBottom: 12,
  },

  // Chân thẻ
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
    color: '#8B8289',
    fontWeight: '600',
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 10,
    color: '#A1989E',
    marginBottom: 3,
  },
  total: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FF6B35',
  },
  tapHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF0E8',
    borderRadius: 10,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  tapHint: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B35',
  },
  tapArrow: {
    fontSize: 22,
    lineHeight: 23,
    color: '#FF6B35',
  },

  // Đang tải
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },
  loadingText: {
    fontSize: 13,
    color: '#8B8289',
    fontWeight: '700',
  },

  // Chưa có đơn
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 20,
  },
  emptyIllustration: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 19,
  },
  emptyEmoji: {
    fontSize: 43,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#29232A',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 12,
    color: '#8B8289',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 9,
  },
});
