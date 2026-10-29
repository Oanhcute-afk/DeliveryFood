import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [menuSearch, setMenuSearch] = useState('');

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
        'Bắt đầu giỏ hàng mới?',
        `Giỏ hàng hiện có món từ ${
          useCartStore.getState().restaurantName
        }. Bạn có muốn xóa giỏ hàng cũ và thêm món từ ${restaurant.name} không?`,
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

  const availableItems = useMemo(
    () => menuItems.filter((item) => item.isAvailable),
    [menuItems],
  );

  const visibleCategories = useMemo(() => {
    const base =
      selectedCategoryId === 'ALL'
        ? categories
        : categories.filter((c) => c.id === selectedCategoryId);
    return base;
  }, [categories, selectedCategoryId]);

  if (loadingRestaurant) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
          <Text style={styles.loadingTitle}>Đang mở thực đơn nhà hàng</Text>
          <Text style={styles.loadingSubtitle}>
            Vui lòng chờ một chút nhé...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) return null;

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0,
  );
  const ratingDisplay =
    Number(restaurant.rating) > 0
      ? Number(restaurant.rating).toFixed(1)
      : '4.8';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          totalQuantity > 0 && { paddingBottom: 110 },
        ]}
      >
        {/* Ảnh bìa nhà hàng + Nút điều hướng nổi */}
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
              <Text style={styles.heroPlaceholderText}>Nhà hàng đối tác</Text>
            </View>
          )}

          <View style={styles.heroOverlay} />

          {/* Nút Quay lại & Giỏ hàng trên ảnh bìa */}
          <View style={styles.heroTopBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              style={({ pressed }) => [
                styles.heroCircleBtn,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color="#29232A" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xem giỏ hàng"
              style={({ pressed }) => [
                styles.heroCircleBtn,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push('/(customer)/(tabs)/cart')}
            >
              <Ionicons name="bag-handle" size={20} color="#FF6B35" />
              {totalQuantity > 0 && (
                <View style={styles.heroCartBadge}>
                  <Text style={styles.heroCartBadgeText}>{totalQuantity}</Text>
                </View>
              )}
            </Pressable>
          </View>

          <View style={styles.heroBottomBadges}>
            <View style={styles.heroBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>QUÁN ĐỐI TÁC CHÍNH HÃNG</Text>
            </View>

            <View style={styles.heroTimeBadge}>
              <Ionicons name="bicycle" size={14} color="#FF6B35" />
              <Text style={styles.heroTimeText}>15-25 phút</Text>
            </View>
          </View>
        </View>

        {/* Thông tin nhà hàng */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{restaurant.name}</Text>
              <Text style={styles.cuisine}>
                {restaurant.cuisineType || 'Ẩm thực đa dạng'} • Đang mở cửa
              </Text>
            </View>

            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingValue}>{ratingDisplay}</Text>
            </View>
          </View>

          {restaurant.description ? (
            <Text style={styles.description}>{restaurant.description}</Text>
          ) : null}

          {/* Thẻ thông tin giao hàng chuẩn app Delivery */}
          <View style={styles.deliveryStatsRow}>
            <View style={styles.deliveryStatBox}>
              <Ionicons name="flash" size={16} color="#FF6B35" />
              <View>
                <Text style={styles.deliveryStatLabel}>Thời gian giao</Text>
                <Text style={styles.deliveryStatValue}>15 - 25 phút</Text>
              </View>
            </View>

            <View style={styles.deliveryStatDivider} />

            <View style={styles.deliveryStatBox}>
              <Ionicons name="pricetag" size={16} color="#16A34A" />
              <View>
                <Text style={styles.deliveryStatLabel}>Phí giao hàng</Text>
                <Text style={[styles.deliveryStatValue, { color: '#16A34A' }]}>
                  Freeship 0đ
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.addressRow}>
            <View style={styles.addressIcon}>
              <Ionicons name="location" size={18} color="#FF6B35" />
            </View>
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>ĐỊA CHỈ QUÁN</Text>
              <Text style={styles.address}>
                {restaurant.address || 'Chưa cập nhật địa chỉ'}
              </Text>
            </View>
          </View>
        </View>

        {/* Bộ lọc danh mục & Tìm món trong quán */}
        <View style={styles.menuSection}>
          <View style={styles.menuHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>CHỌN MÓN NGON</Text>
              <Text style={styles.menuHeading}>Thực đơn của quán</Text>
            </View>

            <View style={styles.menuCountBadge}>
              <Text style={styles.menuCountText}>
                {availableItems.length} món sẵn sàng
              </Text>
            </View>
          </View>

          {/* Thanh tìm kiếm món trong nhà hàng */}
          <View style={styles.menuSearchBox}>
            <Ionicons name="search-outline" size={18} color="#8B8289" />
            <TextInput
              style={styles.menuSearchInput}
              placeholder="Tìm món trong quán..."
              placeholderTextColor="#A39B9F"
              value={menuSearch}
              onChangeText={setMenuSearch}
            />
            {menuSearch.length > 0 && (
              <Pressable onPress={() => setMenuSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#A39B9F" />
              </Pressable>
            )}
          </View>

          {/* Thanh trượt chọn nhanh danh mục */}
          {categories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPillsRow}
            >
              <Pressable
                onPress={() => setSelectedCategoryId('ALL')}
                style={[
                  styles.categoryPill,
                  selectedCategoryId === 'ALL' && styles.categoryPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    selectedCategoryId === 'ALL' &&
                      styles.categoryPillTextActive,
                  ]}
                >
                  Tất cả ({availableItems.length})
                </Text>
              </Pressable>

              {categories.map((cat) => {
                const count = availableItems.filter(
                  (i) => i.categoryId === cat.id,
                ).length;
                if (count === 0) return null;
                const active = selectedCategoryId === cat.id;

                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    style={[
                      styles.categoryPill,
                      active && styles.categoryPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        active && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat.name} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {visibleCategories.map((category) => {
            const categoryItems = menuItems.filter((item) => {
              const inCategory =
                item.categoryId === category.id && item.isAvailable;
              if (!inCategory) return false;
              if (!menuSearch.trim()) return true;
              const q = menuSearch.trim().toLowerCase();
              return (
                item.name.toLowerCase().includes(q) ||
                (item.description ?? '').toLowerCase().includes(q)
              );
            });

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
                        <View style={styles.itemBestSellerRow}>
                          <View style={styles.bestSellerTag}>
                            <Text style={styles.bestSellerTagText}>
                              🔥 Bán chạy
                            </Text>
                          </View>
                        </View>

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
                            Chế biến nóng sốt khi có đơn đặt
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
                              <Ionicons name="add" size={16} color="#FFFFFF" />
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
            Món ăn được đóng gói cẩn thận và giao tận nơi. Chúc bạn ngon miệng!
          </Text>
        </View>
      </ScrollView>

      {/* Thanh giỏ hàng nổi — bấm để chuyển thẳng tới Giỏ hàng & Thanh toán */}
      {totalQuantity > 0 ? (
        <View style={styles.cartFloatingContainer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xem giỏ hàng và đặt món"
            style={({ pressed }) => [
              styles.cartSummary,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/(customer)/(tabs)/cart')}
          >
            <View style={styles.cartSummaryInfo}>
              <View style={styles.cartCountBadge}>
                <Ionicons name="bag-check" size={18} color="#FFFFFF" />
                <Text style={styles.cartCountText}>{totalQuantity}</Text>
              </View>
              <View style={styles.cartTextContainer}>
                <Text style={styles.cartTitle}>
                  ${totalCartPrice.toFixed(2)}
                </Text>
                <Text style={styles.cartSubtitle} numberOfLines={1}>
                  {totalQuantity} món • Miễn phí giao hàng
                </Text>
              </View>
            </View>

            <View style={styles.cartCheckoutBtn}>
              <Text style={styles.cartCheckoutBtnText}>Giao hàng</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </Pressable>
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
    fontSize: 13,
    color: '#8B8289',
    marginTop: 8,
  },

  // Ảnh bìa
  heroContainer: {
    position: 'relative',
    height: 230,
    backgroundColor: '#FFE8D9',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8D9',
  },
  heroPlaceholderEmoji: {
    fontSize: 54,
    marginBottom: 8,
  },
  heroPlaceholderText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B5633F',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25, 18, 24, 0.22)',
  },
  heroTopBar: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  heroCartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  heroCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  heroBottomBadges: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroTimeText: {
    color: '#29232A',
    fontSize: 11,
    fontWeight: '800',
  },

  // Thông tin nhà hàng
  infoSection: {
    marginTop: -16,
    marginHorizontal: 16,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    shadowColor: '#29232A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
    color: '#29232A',
    letterSpacing: -0.5,
  },
  cuisine: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
    marginTop: 5,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8E6',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#B45309',
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6E656C',
    marginTop: 10,
  },
  deliveryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F2E7E0',
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 14,
    marginBottom: 12,
  },
  deliveryStatBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  deliveryStatDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#EBDCD3',
    marginHorizontal: 10,
  },
  deliveryStatLabel: {
    fontSize: 10,
    color: '#8B8289',
    fontWeight: '600',
  },
  deliveryStatValue: {
    fontSize: 12,
    color: '#29232A',
    fontWeight: '800',
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#A1979E',
    letterSpacing: 0.9,
    marginBottom: 2,
  },
  address: {
    fontSize: 12,
    fontWeight: '700',
    color: '#433A40',
  },

  // Thực đơn
  menuSection: {
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FF6B35',
    letterSpacing: 1.3,
    marginBottom: 4,
  },
  menuHeading: {
    fontSize: 21,
    fontWeight: '900',
    color: '#29232A',
    letterSpacing: -0.4,
  },
  menuCountBadge: {
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  menuCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B35',
  },
  menuSearchBox: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE2DA',
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  menuSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#29232A',
    height: '100%',
  },
  categoryPillsRow: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE2DA',
  },
  categoryPillActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E656C',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  categoryBlock: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryAccent: {
    width: 5,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#FF6B35',
    marginRight: 9,
  },
  categoryName: {
    flex: 1,
    fontSize: 17,
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
    justifyContent: 'space-between',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    padding: 14,
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemBestSellerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bestSellerTag: {
    backgroundColor: '#FFF2EA',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bestSellerTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E85D2A',
  },
  itemName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: '#29232A',
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: '#8B8289',
    marginTop: 4,
  },
  itemDescriptionFallback: {
    fontSize: 11,
    lineHeight: 16,
    color: '#ABA1A8',
    marginTop: 4,
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF6B35',
  },
  itemImageContainer: {
    position: 'relative',
    width: 94,
    height: 94,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF0E8',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8D9',
  },
  itemPlaceholderEmoji: {
    fontSize: 32,
  },
  itemSelectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  itemSelectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  // Nút thêm / tăng giảm
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyButton: {
    width: 30,
    height: 30,
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
    fontSize: 18,
    lineHeight: 20,
    color: '#FF6B35',
    fontWeight: '900',
  },
  qtyPlusText: {
    fontSize: 18,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  qtyCount: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '900',
    color: '#29232A',
  },
  buttonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
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
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#FFF0E8',
  },
  footerEmoji: {
    fontSize: 20,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: '#9A6046',
    fontWeight: '600',
    lineHeight: 18,
  },

  // Thanh giỏ hàng nổi ở dưới
  cartFloatingContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
  },
  cartSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    backgroundColor: '#29232A',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 6,
  },
  cartSummaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cartCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
  },
  cartCountText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  cartTextContainer: {
    flex: 1,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cartSubtitle: {
    fontSize: 11,
    color: '#D6CED4',
    marginTop: 2,
  },
  cartCheckoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 13,
  },
  cartCheckoutBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
