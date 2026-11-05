import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api } from '@/lib/axios';
import { Order } from '@food-delivery/types';

type DriverOrder = Order & {
  restaurant: {
    id: string;
    name: string;
    address?: string;
    phone?: string | null;
  };
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

  const dishSummary = (order.items ?? [])
    .map((it: any) => {
      const q = Number(it.quantity ?? 1);
      const name = it.menuItem?.name ?? it.name ?? 'Món';
      return `${q > 1 ? `${q}x ` : ''}${name}`;
    })
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isActive && styles.cardActive,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Đơn hàng từ ${order.restaurant?.name || 'quán'}, ${status.label}`}
    >
      {isActive ? <View style={styles.activeAccent} /> : null}

      <View style={styles.cardHeader}>
        <View style={styles.restaurantIcon}>
          <Text style={styles.restaurantEmoji}>🍴</Text>
        </View>

        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantLabel}>NHÀ HÀNG</Text>
          <Text style={styles.restaurant} numberOfLines={1}>
            {order.restaurant?.name || 'Nhà hàng đối tác'}
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

      {/* Món ăn */}
      {dishSummary ? (
        <View style={styles.cardDishesBox}>
          <Ionicons name="fast-food-outline" size={13} color="#FF6B35" />
          <Text style={styles.cardDishesText} numberOfLines={1}>
            {dishSummary}
          </Text>
        </View>
      ) : null}

      {/* Ghi chú */}
      {order.note ? (
        <View style={styles.cardNoteBox}>
          <Ionicons name="alert-circle" size={13} color="#D97706" />
          <Text style={styles.cardNoteText} numberOfLines={1}>
            Ghi chú: "{order.note}"
          </Text>
        </View>
      ) : null}

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

      <View style={styles.tapHintContainer}>
        <Text style={styles.tapHint}>
          {isActive ? 'Xem hành trình giao hàng' : 'Xem chi tiết đơn hàng'}
        </Text>
        <Text style={styles.tapArrow}>›</Text>
      </View>
    </Pressable>
  );
}

export default function DriverHistoryScreen() {
  const [selectedOrder, setSelectedOrder] = useState<DriverOrder | null>(null);

  const {
    data: orders = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<DriverOrder[]>({
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
        bounces={true}
        alwaysBounceVertical={true}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
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
            onPress={() => setSelectedOrder(item)}
          />
        )}
      />

      {/* Modal Chi tiết đơn hàng cho Tài xế */}
      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <SafeAreaView
          style={styles.detailModalContainer}
          edges={['top', 'bottom']}
        >
          {selectedOrder && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.detailModalScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              {/* Header Modal */}
              <View style={styles.detailModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailModalEyebrow}>
                    CHI TIẾT ĐƠN HÀNG
                  </Text>
                  <Text style={styles.detailModalTitle}>
                    #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  </Text>
                </View>

                <Pressable
                  style={styles.detailModalCloseBtn}
                  onPress={() => setSelectedOrder(null)}
                >
                  <Ionicons name="close" size={22} color="#29232A" />
                </Pressable>
              </View>

              {/* Trạng thái đơn & nút điều hướng nếu đơn đang hoạt động */}
              <View style={styles.modalStatusRow}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        STATUS_CONFIG[selectedOrder.status]?.background ??
                        '#F5F0EC',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusEmoji,
                      {
                        color:
                          STATUS_CONFIG[selectedOrder.status]?.color ??
                          '#8B8289',
                      },
                    ]}
                  >
                    {STATUS_CONFIG[selectedOrder.status]?.emoji ?? '•'}
                  </Text>
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          STATUS_CONFIG[selectedOrder.status]?.color ??
                          '#8B8289',
                      },
                    ]}
                  >
                    {STATUS_CONFIG[selectedOrder.status]?.label ??
                      selectedOrder.status}
                  </Text>
                </View>

                {['READY', 'PICKED_UP'].includes(selectedOrder.status) && (
                  <Pressable
                    style={styles.detailActiveActionBtn}
                    onPress={() => {
                      setSelectedOrder(null);
                      router.push('/(driver)/active');
                    }}
                  >
                    <Ionicons name="navigate" size={14} color="#FFFFFF" />
                    <Text style={styles.detailActiveActionText}>
                      Theo dõi giao hàng
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Ghi chú của khách */}
              {selectedOrder.note ? (
                <View style={styles.detailModalNoteCard}>
                  <View style={styles.detailModalNoteHeader}>
                    <Ionicons name="alert-circle" size={17} color="#D97706" />
                    <Text style={styles.detailModalNoteTitle}>
                      Ghi chú từ khách hàng
                    </Text>
                  </View>
                  <Text style={styles.detailModalNoteBody}>
                    "{selectedOrder.note}"
                  </Text>
                </View>
              ) : null}

              {/* Danh sách món ăn */}
              <View style={styles.detailModalSection}>
                <View style={styles.detailModalSectionHeader}>
                  <Ionicons
                    name="fast-food-outline"
                    size={18}
                    color="#FF6B35"
                  />
                  <Text style={styles.detailModalSectionTitle}>
                    Danh sách món ăn ({selectedOrder.items?.length ?? 0})
                  </Text>
                </View>

                {Array.isArray(selectedOrder.items) &&
                selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((it: any, idx: number) => {
                    const q = Number(it.quantity ?? 1);
                    const name =
                      it.menuItem?.name ?? it.name ?? `Món ăn #${idx + 1}`;
                    const unitPrice = Number(
                      it.unitPrice ?? it.menuItem?.price ?? 0,
                    );
                    return (
                      <View key={it.id ?? idx} style={styles.detailDishRow}>
                        <View style={styles.detailDishBadge}>
                          <Text style={styles.detailDishQuantity}>{q}x</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailDishName}>{name}</Text>
                          <Text style={styles.detailDishUnitPrice}>
                            ${unitPrice.toFixed(2)}/phần
                          </Text>
                        </View>
                        <Text style={styles.detailDishTotal}>
                          ${(q * unitPrice).toFixed(2)}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.emptyDishesText}>
                    Không có thông tin món ăn chi tiết.
                  </Text>
                )}
              </View>

              {/* Điểm lấy hàng (Nhà hàng) */}
              <View style={styles.detailModalSection}>
                <View style={styles.detailModalSectionHeader}>
                  <Ionicons name="restaurant" size={18} color="#FF6B35" />
                  <Text style={styles.detailModalSectionTitle}>
                    Điểm lấy hàng (Nhà hàng)
                  </Text>
                </View>

                <Text style={styles.detailEntityName}>
                  {selectedOrder.restaurant?.name || 'Nhà hàng đối tác'}
                </Text>
                <Text style={styles.detailEntityAddress}>
                  📍{' '}
                  {selectedOrder.restaurant?.address ||
                    'Chưa cập nhật địa chỉ'}
                </Text>

                {selectedOrder.restaurant?.phone ? (
                  <Pressable
                    style={styles.detailCallRow}
                    onPress={() => {
                      const clean =
                        selectedOrder.restaurant!.phone!.replace(
                          /\s+/g,
                          '',
                        );
                      Linking.openURL(`tel:${clean}`);
                    }}
                  >
                    <Ionicons name="call" size={14} color="#168653" />
                    <Text style={styles.detailCallText}>
                      Gọi quán:{' '}
                      <Text style={{ fontWeight: '700' }}>
                        {selectedOrder.restaurant.phone}
                      </Text>
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Điểm giao hàng (Khách hàng) */}
              <View style={styles.detailModalSection}>
                <View style={styles.detailModalSectionHeader}>
                  <Ionicons name="person" size={18} color="#FF6B35" />
                  <Text style={styles.detailModalSectionTitle}>
                    Khách hàng & Điểm giao
                  </Text>
                </View>

                <Text style={styles.detailEntityName}>
                  👤{' '}
                  {selectedOrder.customer
                    ? `${selectedOrder.customer.firstName ?? ''} ${selectedOrder.customer.lastName ?? ''}`.trim() ||
                      'Khách hàng'
                    : 'Khách hàng'}
                </Text>

                <Text style={styles.detailEntityAddress}>
                  📍 {selectedOrder.deliveryAddress || 'Chưa có địa chỉ'}
                </Text>

                {selectedOrder.customer?.phone ? (
                  <Pressable
                    style={styles.detailCallRow}
                    onPress={() => {
                      const clean =
                        selectedOrder.customer!.phone!.replace(
                          /\s+/g,
                          '',
                        );
                      Linking.openURL(`tel:${clean}`);
                    }}
                  >
                    <Ionicons name="call" size={14} color="#168653" />
                    <Text style={styles.detailCallText}>
                      Gọi khách:{' '}
                      <Text style={{ fontWeight: '700' }}>
                        {selectedOrder.customer.phone}
                      </Text>
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Tổng kết thanh toán */}
              <View style={styles.detailSummaryCard}>
                <View style={styles.detailSummaryRow}>
                  <Text style={styles.detailSummaryLabel}>
                    Hình thức thanh toán
                  </Text>
                  <Text style={styles.detailSummaryValue}>
                    {selectedOrder.paymentMethod === 'CASH'
                      ? '💵 Tiền mặt khi nhận (COD)'
                      : '💳 Thanh toán Online (Đã TT)'}
                  </Text>
                </View>

                <View style={styles.detailSummaryRow}>
                  <Text style={styles.detailSummaryLabel}>Ngày đặt</Text>
                  <Text style={styles.detailSummaryValue}>
                    {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}
                  </Text>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.detailSummaryRow}>
                  <Text
                    style={[
                      styles.detailSummaryLabel,
                      { fontSize: 15, fontWeight: '800' },
                    ]}
                  >
                    Tổng thanh toán
                  </Text>
                  <Text style={styles.detailTotalText}>
                    ${Number(selectedOrder.totalAmount).toFixed(2)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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

  // Card Dish & Note
  cardDishesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  cardDishesText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
  },
  cardNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 8,
  },
  cardNoteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },

  // Modal Status & Action
  modalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailActiveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  detailActiveActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Detail Modal
  detailModalContainer: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  detailModalScrollContent: {
    padding: 20,
    gap: 14,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8E3',
  },
  detailModalEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF6B35',
    letterSpacing: 0.8,
  },
  detailModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#29232A',
    marginTop: 2,
  },
  detailModalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3ECEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalNoteCard: {
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  detailModalNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailModalNoteTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  detailModalNoteBody: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B45309',
    lineHeight: 18,
  },
  detailModalSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    gap: 10,
  },
  detailModalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE7',
  },
  detailModalSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#29232A',
  },
  detailDishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailDishBadge: {
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  detailDishQuantity: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B35',
  },
  detailDishName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#29232A',
  },
  detailDishUnitPrice: {
    fontSize: 11,
    color: '#8B8289',
    marginTop: 1,
  },
  detailDishTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#29232A',
  },
  emptyDishesText: {
    fontSize: 12,
    color: '#8B8289',
    fontStyle: 'italic',
  },
  detailEntityName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#29232A',
  },
  detailEntityAddress: {
    fontSize: 12,
    color: '#8B8289',
    lineHeight: 17,
  },
  detailCallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  detailCallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  detailSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    gap: 10,
  },
  detailSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailSummaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B8289',
  },
  detailSummaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#29232A',
  },
  detailTotalText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF6B35',
  },
});
