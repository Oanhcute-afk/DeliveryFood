import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/axios';
import { useCartStore } from '@/store/cart-store';
import {
  MenuCategory,
  MenuItem,
  RestaurantType,
} from '@food-delivery/types';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tr } = useLanguage();
  const { addItem, restaurantId, clearCart, items } = useCartStore();

  const { data: restaurant, isLoading: loadingRestaurant } =
    useQuery<RestaurantType>({
      queryKey: ['restaurant', id],
      queryFn: () =>
        api.get<RestaurantType>(`/restaurants/${id}`).then((r) => r.data),
      enabled: !!id,
    });

  const { data: categories = [] } = useQuery<MenuCategory[]>({
    queryKey: ['categories', id],
    queryFn: () =>
      api.get<MenuCategory[]>(`/menu/categories/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ['menu-items', id],
    queryFn: () => api.get<MenuItem[]>(`/menu/items/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  function handleAddItem(item: MenuItem) {
    if (!restaurant) return;

    if (restaurantId && restaurantId !== item.restaurantId) {
      Alert.alert(
        tr('Bắt đầu giỏ hàng mới?', 'Start a new cart?'),
        tr(
          `Giỏ hàng hiện có món từ ${
            useCartStore.getState().restaurantName
          }. Bạn có muốn xóa giỏ hàng và thêm món từ ${restaurant.name} không?`,
          `Your cart currently has items from ${
            useCartStore.getState().restaurantName
          }. Clear cart and add items from ${restaurant.name}?`,
        ),
        [
          { text: tr('Hủy', 'Cancel'), style: 'cancel' },
          {
            text: tr('Xóa và thêm', 'Clear & Add'),
            style: 'destructive',
            onPress: () => {
              clearCart();
              addItem({
                id: item.id,
                name: item.name,
                price: item.price,
                imageUrl: item.imageUrl,
                restaurantId: item.restaurantId,
                restaurantName: restaurant.name,
              });
            },
          },
        ],
      );
      return;
    }

    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      restaurantId: item.restaurantId,
      restaurantName: restaurant.name,
    });
  }

  function getItemQuantity(itemId: string) {
    return items.find((i) => i.id === itemId)?.quantity ?? 0;
  }

  if (loadingRestaurant) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color={BURGER_COLORS.primary} />
          </View>
          <Text style={styles.loadingTitle}>
            {tr('Đang mở thực đơn', 'Loading menu')}
          </Text>
          <Text style={styles.loadingSubtitle}>
            {tr('Vui lòng chờ một chút nhé...', 'Please wait a moment...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) return null;

  const availableItems = menuItems.filter((item) => item.isAvailable);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Ảnh bìa nhà hàng */}
        <View style={styles.heroContainer}>
          {restaurant.imageUrl ? (
            <Image
              source={{ uri: restaurant.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderEmoji}>🍔</Text>
              <Text style={styles.heroPlaceholderText}>
                {tr('Nhà hàng', 'Restaurant')}
              </Text>
            </View>
          )}
        </View>

        {/* Thông tin nhà hàng */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{restaurant.name}</Text>
              <Text style={styles.cuisine}>
                {restaurant.cuisineType ||
                  tr('Burger & Món ngon', 'Burgers & Comfort Food')}
              </Text>
            </View>

            <View style={styles.ratingBadge}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingValue}>
                {restaurant.rating ?? '—'}
              </Text>
            </View>
          </View>

          {restaurant.description ? (
            <Text style={styles.description}>{restaurant.description}</Text>
          ) : null}

          <View style={styles.infoDivider} />

          <View style={styles.addressRow}>
            <Text style={styles.addressEmoji}>📍</Text>
            <Text style={styles.address} numberOfLines={2}>
              {restaurant.address ||
                tr('Chưa cập nhật địa chỉ', 'Address not provided')}
            </Text>
          </View>
        </View>

        {/* Thực đơn */}
        <View style={styles.menuSection}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuHeading}>
              {tr('Thực đơn', 'Menu')}
            </Text>
            <View style={styles.menuCountBadge}>
              <Text style={styles.menuCountText}>
                {availableItems.length} {tr('món', 'items')}
              </Text>
            </View>
          </View>

          {categories.map((category) => {
            const categoryItems = menuItems.filter(
              (item) => item.categoryId === category.id && item.isAvailable,
            );

            if (categoryItems.length === 0) return null;

            return (
              <View key={category.id} style={styles.categoryBlock}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryAccent} />
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryCount}>
                    {categoryItems.length} {tr('món', 'items')}
                  </Text>
                </View>

                {categoryItems.map((item) => {
                  const qty = getItemQuantity(item.id);

                  return (
                    <View key={item.id} style={styles.itemCard}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>

                        {item.description ? (
                          <Text
                            style={styles.itemDescription}
                            numberOfLines={2}
                          >
                            {item.description}
                          </Text>
                        ) : (
                          <Text style={styles.itemDescriptionFallback}>
                            {tr(
                              'Chế biến nóng hổi mỗi ngày',
                              'Freshly prepared daily',
                            )}
                          </Text>
                        )}

                        <View style={styles.itemBottom}>
                          <Text style={styles.itemPrice}>
                            ${Number(item.price).toFixed(2)}
                          </Text>

                          {qty > 0 ? (
                            <View style={styles.qtyControls}>
                              <Pressable
                                style={({ pressed }) => [
                                  styles.qtyButton,
                                  styles.qtyMinusButton,
                                  pressed && styles.buttonPressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`${tr('Giảm', 'Decrease')} ${item.name}`}
                                onPress={() =>
                                  useCartStore
                                    .getState()
                                    .decrementItem(item.id)
                                }
                              >
                                <Text style={styles.qtyMinusText}>−</Text>
                              </Pressable>

                              <Text style={styles.qtyCount}>{qty}</Text>

                              <Pressable
                                style={({ pressed }) => [
                                  styles.qtyButton,
                                  styles.qtyPlusButton,
                                  pressed && styles.buttonPressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`${tr('Tăng', 'Increase')} ${item.name}`}
                                onPress={() => handleAddItem(item)}
                              >
                                <Text style={styles.qtyPlusText}>+</Text>
                              </Pressable>
                            </View>
                          ) : (
                            <Pressable
                              style={({ pressed }) => [
                                styles.addButton,
                                pressed && styles.buttonPressed,
                              ]}
                              accessibilityRole="button"
                              onPress={() => handleAddItem(item)}
                            >
                              <Text style={styles.addButtonPlus}>+</Text>
                              <Text style={styles.addButtonText}>
                                {tr('Thêm', 'Add')}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </View>

                      <View style={styles.itemImageContainer}>
                        {item.imageUrl ? (
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.itemImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.itemImagePlaceholder}>
                            <Text style={styles.itemPlaceholderEmoji}>🍔</Text>
                          </View>
                        )}

                        {qty > 0 ? (
                          <View style={styles.itemSelectedBadge}>
                            <Text style={styles.itemSelectedBadgeText}>
                              {qty}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}

          {availableItems.length === 0 ? (
            <View style={styles.emptyMenu}>
              <Text style={styles.emptyMenuEmoji}>🍔</Text>
              <Text style={styles.emptyMenuTitle}>
                {tr('Thực đơn đang cập nhật', 'Menu is being updated')}
              </Text>
              <Text style={styles.emptyMenuText}>
                {tr(
                  'Nhà hàng chưa có món ăn nào sẵn sàng. Bạn hãy quay lại sau nhé!',
                  'No items are available right now. Please check back soon!',
                )}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {totalQuantity > 0 ? (
        <View style={styles.cartSummary}>
          <View style={styles.cartSummaryInfo}>
            <View style={styles.cartCountBadge}>
              <Text style={styles.cartCountText}>{totalQuantity}</Text>
            </View>
            <View style={styles.cartTextContainer}>
              <Text style={styles.cartTitle}>
                {tr('Giỏ hàng của bạn', 'Your Cart')}
              </Text>
              <Text style={styles.cartSubtitle}>
                {totalQuantity} {tr('món đã chọn', 'items selected')}
              </Text>
            </View>
          </View>

          <Text style={styles.cartSummaryHint}>
            {tr('Sẵn sàng đặt ✓', 'Ready ✓')}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BURGER_COLORS.background,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  loadingSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: BURGER_COLORS.muted,
  },
  heroContainer: {
    height: 200,
    width: '100%',
    backgroundColor: BURGER_COLORS.surfaceMuted,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BURGER_COLORS.surfaceMuted,
  },
  heroPlaceholderEmoji: {
    fontSize: 48,
    marginBottom: 6,
  },
  heroPlaceholderText: {
    color: BURGER_COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  infoSection: {
    marginHorizontal: 16,
    marginTop: -18,
    padding: 16,
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    color: BURGER_COLORS.text,
    letterSpacing: -0.4,
  },
  cuisine: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: BURGER_COLORS.muted,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BURGER_COLORS.cheeseLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ratingStar: {
    fontSize: 14,
    color: BURGER_COLORS.cheese,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '800',
    color: BURGER_COLORS.cheeseDark,
  },
  description: {
    fontSize: 13,
    color: BURGER_COLORS.textSoft,
    lineHeight: 20,
    marginTop: 10,
  },
  infoDivider: {
    height: 1,
    backgroundColor: BURGER_COLORS.border,
    marginVertical: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressEmoji: {
    fontSize: 15,
  },
  address: {
    flex: 1,
    fontSize: 13,
    color: BURGER_COLORS.textSoft,
    fontWeight: '600',
  },
  menuSection: {
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  menuHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: BURGER_COLORS.text,
  },
  menuCountBadge: {
    backgroundColor: BURGER_COLORS.cheeseLight,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  menuCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: BURGER_COLORS.cheeseDark,
  },
  categoryBlock: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  categoryAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: BURGER_COLORS.primary,
  },
  categoryName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  categoryCount: {
    fontSize: 11,
    fontWeight: '700',
    color: BURGER_COLORS.muted,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  itemDescription: {
    fontSize: 12,
    color: BURGER_COLORS.muted,
    marginTop: 4,
    lineHeight: 17,
  },
  itemDescriptionFallback: {
    fontSize: 12,
    color: BURGER_COLORS.faint,
    marginTop: 4,
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: BURGER_COLORS.primary,
  },
  itemImageContainer: {
    width: 92,
    height: 92,
    borderRadius: 14,
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: BURGER_COLORS.surfaceMuted,
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: BURGER_COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPlaceholderEmoji: {
    fontSize: 30,
  },
  itemSelectedBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BURGER_COLORS.lettuce,
    borderWidth: 2,
    borderColor: BURGER_COLORS.surface,
  },
  itemSelectedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: BURGER_COLORS.primary,
  },
  addButtonPlus: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyMinusButton: {
    backgroundColor: BURGER_COLORS.primaryLight,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
  },
  qtyPlusButton: {
    backgroundColor: BURGER_COLORS.primary,
  },
  qtyMinusText: {
    fontSize: 17,
    lineHeight: 20,
    color: BURGER_COLORS.primary,
    fontWeight: '800',
  },
  qtyPlusText: {
    fontSize: 17,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  qtyCount: {
    minWidth: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  emptyMenu: {
    alignItems: 'center',
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  emptyMenuEmoji: {
    fontSize: 38,
    marginBottom: 10,
  },
  emptyMenuTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BURGER_COLORS.text,
    textAlign: 'center',
  },
  emptyMenuText: {
    fontSize: 13,
    lineHeight: 19,
    color: BURGER_COLORS.muted,
    textAlign: 'center',
    marginTop: 6,
  },
  cartSummary: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: BURGER_COLORS.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cartSummaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartCountBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: BURGER_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cartCountText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  cartTextContainer: {
    justifyContent: 'center',
  },
  cartTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  cartSubtitle: {
    color: '#D7C4B6',
    fontSize: 11,
    marginTop: 2,
  },
  cartSummaryHint: {
    color: BURGER_COLORS.cheese,
    fontSize: 12,
    fontWeight: '800',
  },
});
