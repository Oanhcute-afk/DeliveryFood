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

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

    // Giỏ hàng đang có món từ nhà hàng khác: xác nhận trước khi xóa.
    if (restaurantId && restaurantId !== item.restaurantId) {
      Alert.alert(
        'Bắt đầu giỏ hàng mới?',
        `Giỏ hàng hiện có món từ ${
          useCartStore.getState().restaurantName
        }. Bạn có muốn xóa giỏ hàng và thêm món từ ${restaurant.name} không?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa và thêm',
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
          <Text style={styles.loadingTitle}>Đang mở nhà hàng</Text>
          <Text style={styles.loadingSubtitle}>
            Vui lòng chờ một chút nhé...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) return null;

  const availableItems = menuItems.filter((item) => item.isAvailable);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
              <Text style={styles.heroPlaceholderEmoji}>🍽️</Text>
              <Text style={styles.heroPlaceholderText}>Nhà hàng</Text>
            </View>
          )}

          <View style={styles.heroOverlay} />

          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>🍴 ĐẶT MÓN NGAY</Text>
          </View>
        </View>

        {/* Thông tin nhà hàng */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{restaurant.name}</Text>
              <Text style={styles.cuisine}>
                {restaurant.cuisineType || 'Ẩm thực đa dạng'}
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
            <Text style={styles.description}>
              {restaurant.description}
            </Text>
          ) : null}

          <View style={styles.infoDivider} />

          <View style={styles.addressRow}>
            <View style={styles.addressIcon}>
              <Text style={styles.addressEmoji}>📍</Text>
            </View>
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>ĐỊA CHỈ NHÀ HÀNG</Text>
              <Text style={styles.address}>
                {restaurant.address || 'Chưa cập nhật địa chỉ'}
              </Text>
            </View>
          </View>

          <View style={styles.quickInfoRow}>
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoEmoji}>🍽️</Text>
              <Text style={styles.quickInfoText}>
                {availableItems.length} món đang bán
              </Text>
            </View>
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoEmoji}>✨</Text>
              <Text style={styles.quickInfoText}>Chọn món yêu thích</Text>
            </View>
          </View>
        </View>

        {/* Thực đơn */}
        <View style={styles.menuSection}>
          <View style={styles.menuHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>KHÁM PHÁ HƯƠNG VỊ</Text>
              <Text style={styles.menuHeading}>Thực đơn</Text>
            </View>

            <View style={styles.menuCountBadge}>
              <Text style={styles.menuCountText}>
                {availableItems.length} món
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
                    {categoryItems.length} món
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
                            Được chuẩn bị tươi ngon mỗi ngày
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
                                accessibilityLabel={`Giảm số lượng ${item.name}`}
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
                                accessibilityLabel={`Tăng số lượng ${item.name}`}
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
                              <Text style={styles.addButtonText}>Thêm</Text>
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
                            <Text style={styles.itemPlaceholderEmoji}>🍲</Text>
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
              <Text style={styles.emptyMenuEmoji}>🍽️</Text>
              <Text style={styles.emptyMenuTitle}>
                Thực đơn đang được cập nhật
              </Text>
              <Text style={styles.emptyMenuText}>
                Nhà hàng chưa có món ăn nào sẵn sàng. Bạn hãy quay lại sau nhé!
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerEmoji}>🧡</Text>
          <Text style={styles.footerText}>
            Cảm ơn bạn đã lựa chọn nhà hàng. Chúc bạn ngon miệng!
          </Text>
        </View>
      </ScrollView>

      {/* Tóm tắt giỏ hàng — chỉ hiển thị, không thay đổi luồng điều hướng */}
      {totalQuantity > 0 ? (
        <View style={styles.cartSummary}>
          <View style={styles.cartSummaryInfo}>
            <View style={styles.cartCountBadge}>
              <Text style={styles.cartCountText}>{totalQuantity}</Text>
            </View>
            <View style={styles.cartTextContainer}>
              <Text style={styles.cartTitle}>Giỏ hàng của bạn</Text>
              <Text style={styles.cartSubtitle}>
                {totalQuantity} món đã chọn
              </Text>
            </View>
          </View>

          <Text style={styles.cartSummaryHint}>Sẵn sàng đặt món ✓</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#29232A',
  },
  loadingSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#8B8289',
  },

  // Ảnh bìa
  heroContainer: {
    height: 245,
    width: '100%',
    backgroundColor: '#F5E6DC',
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9E8DC',
  },
  heroPlaceholderEmoji: {
    fontSize: 54,
    marginBottom: 8,
  },
  heroPlaceholderText: {
    color: '#9C7160',
    fontSize: 14,
    fontWeight: '700',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(41, 35, 42, 0.08)',
  },
  heroBadge: {
    position: 'absolute',
    left: 20,
    bottom: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E8E3',
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF6B35',
    letterSpacing: 0.8,
  },

  // Thông tin nhà hàng
  infoSection: {
    marginHorizontal: 16,
    marginTop: -1,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F0E8E3',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '900',
    color: '#29232A',
    letterSpacing: -0.6,
  },
  cuisine: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: '600',
    color: '#8B8289',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF4D9',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  ratingStar: {
    fontSize: 16,
    color: '#E9A323',
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#75511C',
  },
  description: {
    fontSize: 14,
    color: '#756B72',
    lineHeight: 22,
    marginTop: 14,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F0E8E3',
    marginVertical: 18,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addressIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressEmoji: {
    fontSize: 18,
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 10,
    color: '#A1989E',
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  address: {
    fontSize: 13,
    color: '#443C43',
    fontWeight: '600',
    lineHeight: 19,
  },
  quickInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF9F5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  quickInfoEmoji: {
    fontSize: 13,
  },
  quickInfoText: {
    fontSize: 11,
    color: '#756B72',
    fontWeight: '700',
  },

  // Thực đơn
  menuSection: {
    paddingHorizontal: 16,
    paddingTop: 30,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#FF6B35',
    marginBottom: 6,
  },
  menuHeading: {
    fontSize: 29,
    fontWeight: '900',
    color: '#29232A',
    letterSpacing: -0.8,
  },
  menuCountBadge: {
    backgroundColor: '#FFF0E8',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  menuCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B35',
  },
  categoryBlock: {
    marginBottom: 26,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 9,
  },
  categoryAccent: {
    width: 4,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
  },
  categoryName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#29232A',
  },
  categoryCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9B9097',
  },

  // Thẻ món ăn
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0E8E3',
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#29232A',
    lineHeight: 21,
  },
  itemDescription: {
    fontSize: 12,
    color: '#8B8289',
    marginTop: 5,
    lineHeight: 18,
  },
  itemDescriptionFallback: {
    fontSize: 12,
    color: '#A1989E',
    marginTop: 5,
    lineHeight: 18,
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 13,
  },
  itemPrice: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FF6B35',
  },
  itemImageContainer: {
    width: 108,
    height: 112,
    borderRadius: 15,
    position: 'relative',
    overflow: 'visible',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
    backgroundColor: '#F5EDE7',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPlaceholderEmoji: {
    fontSize: 34,
  },
  itemSelectedBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22A06B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  itemSelectedBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minWidth: 79,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: '#FF6B35',
  },
  addButtonPlus: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  qtyButton: {
    width: 29,
    height: 29,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyMinusButton: {
    backgroundColor: '#FFF0E8',
    borderWidth: 1,
    borderColor: '#FFD7C5',
  },
  qtyPlusButton: {
    backgroundColor: '#FF6B35',
  },
  qtyMinusText: {
    fontSize: 19,
    lineHeight: 22,
    color: '#FF6B35',
    fontWeight: '800',
  },
  qtyPlusText: {
    fontSize: 19,
    lineHeight: 22,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  qtyCount: {
    minWidth: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '900',
    color: '#29232A',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },

  // Trạng thái thực đơn trống
  emptyMenu: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyMenuEmoji: {
    fontSize: 42,
    marginBottom: 14,
  },
  emptyMenuTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#29232A',
    textAlign: 'center',
  },
  emptyMenuText: {
    fontSize: 13,
    color: '#8B8289',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },

  // Cuối trang
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 4,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF0E8',
  },
  footerEmoji: {
    fontSize: 21,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: '#9A6046',
    fontWeight: '600',
    lineHeight: 19,
  },

  // Tóm tắt giỏ hàng
  cartSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0E8E3',
  },
  cartSummaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
  },
  cartCountBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  cartTextContainer: {
    flex: 1,
  },
  cartTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#29232A',
  },
  cartSubtitle: {
    fontSize: 11,
    color: '#8B8289',
    marginTop: 3,
  },
  cartSummaryHint: {
    fontSize: 11,
    fontWeight: '800',
    color: '#168653',
  },
});
