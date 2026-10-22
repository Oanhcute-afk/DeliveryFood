
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

type OrderWithRestaurant = Order & {
  restaurant: { id: string; name: string };
  items: { id: string }[];
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  CONFIRMED: '#3B82F6',
  PREPARING: '#8B5CF6',
  READY: '#06B6D4',
  PICKED_UP: '#FF6B35',
  DELIVERED: '#22C55E',
  CANCELLED: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready for pickup',
  PICKED_UP: 'On the way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
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
  const statusColor = STATUS_COLORS[order.status] ?? '#999999';
  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  const statusIcon = STATUS_ICONS[order.status] ?? 'receipt-outline';

  const date = new Date(order.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const itemCount = order.items?.length ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      {/* Restaurant header */}
      <View style={styles.cardHeader}>
        <View style={styles.restaurantSection}>
          <View style={styles.restaurantIcon}>
            <Ionicons
              name="restaurant-outline"
              size={22}
              color="#FF6B35"
            />
          </View>

          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {order.restaurant?.name ?? 'Restaurant'}
            </Text>
            <Text style={styles.date}>{date}</Text>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={19}
          color="#B8ADA6"
        />
      </View>

      <View style={styles.divider} />

      {/* Status */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${statusColor}15` },
          ]}
        >
          <Ionicons
            name={statusIcon}
            size={15}
            color={statusColor}
          />
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
              size={17}
              color="#8B8289"
            />
          </View>

          <Text style={styles.items}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total amount</Text>
          <Text style={styles.total}>
            ${Number(order.totalAmount).toFixed(2)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function CustomerOrdersScreen() {
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
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />

      {/* Page header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerCaption}>YOUR FOOD JOURNEY</Text>
          <Text style={styles.title}>My Orders</Text>
          <Text style={styles.subtitle}>
            Keep track of your delicious moments.
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="receipt-outline"
            size={26}
            color="#FF6B35"
          />
        </View>
      </View>

      {/* Order count */}
      {!isError && orders.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryDot} />
          <Text style={styles.summaryText}>
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} in your history
          </Text>
        </View>
      )}

      {isError ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={35}
              color="#FF6B35"
            />
          </View>

          <Text style={styles.emptyText}>Unable to load orders</Text>
          <Text style={styles.emptySubText}>
            Please check your connection and try again.
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => {
              void refetch();
            }}
          >
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIllustration}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="receipt-outline"
                size={39}
                color="#FF6B35"
              />
            </View>

            <View style={styles.emptySparkle}>
              <Ionicons name="sparkles" size={19} color="#FFB38E" />
            </View>
          </View>

          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubText}>
            Your delicious journey starts here.{'\n'}
            Explore the menu and place your first order!
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.shopButton,
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push('/(customer)/search')}
          >
            <Ionicons name="fast-food-outline" size={19} color="#FFFFFF" />
            <Text style={styles.shopButtonText}>Explore food</Text>
            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
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
    backgroundColor: '#FFF9F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22,
  },
  headerCaption: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6B35',
    letterSpacing: 1.5,
    marginBottom: 7,
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#29232A',
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 12,
    color: '#8B8289',
    marginTop: 8,
  },
  headerIcon: {
    width: 53,
    height: 53,
    borderRadius: 18,
    backgroundColor: '#FFEEE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 23,
    marginBottom: 8,
  },
  summaryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
  },
  summaryText: {
    fontSize: 12,
    color: '#8B8289',
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    padding: 16,
  },
  cardPressed: {
    opacity: 0.8,
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
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#FFF0E7',
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
    color: '#29232A',
    marginBottom: 5,
  },
  date: {
    fontSize: 11,
    color: '#A49AA0',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3EEEA',
    marginVertical: 15,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 15,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexShrink: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  orderReference: {
    fontSize: 10,
    color: '#A49AA0',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFAF7',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 12,
  },
  itemsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  itemsIcon: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: '#F2ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  items: {
    fontSize: 12,
    color: '#8B8289',
    fontWeight: '600',
  },
  totalSection: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 10,
    color: '#A49AA0',
    marginBottom: 4,
  },
  total: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FF6B35',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 45,
  },
  loadingIcon: {
    width: 75,
    height: 75,
    borderRadius: 25,
    backgroundColor: '#FFF0E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B8289',
  },
  emptyIllustration: {
    position: 'relative',
    marginBottom: 22,
  },
  emptyIcon: {
    width: 94,
    height: 94,
    borderRadius: 31,
    backgroundColor: '#FFF0E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySparkle: {
    position: 'absolute',
    right: -10,
    top: -8,
    width: 37,
    height: 37,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E8E3',
  },
  emptyText: {
    fontSize: 21,
    fontWeight: '800',
    color: '#29232A',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 12,
    color: '#8B8289',
    textAlign: 'center',
    lineHeight: 20,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FF6B35',
    borderRadius: 15,
    paddingHorizontal: 19,
    paddingVertical: 14,
    marginTop: 24,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 22,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});