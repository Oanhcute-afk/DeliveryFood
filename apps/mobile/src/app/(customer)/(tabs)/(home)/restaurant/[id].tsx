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
import { voucherApi } from '@/lib/vouchers';
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

  const { data: voucherData } = useQuery({
    queryKey: ['available-vouchers-restaurant'],
    queryFn: () => voucherApi.available(0).catch(() => null),
  });
  const hasVouchers = (voucherData?.vouchers?.length ?? 0) > 0;

  function handleAddItem(item: MenuItem) {
    if (!restaurant) return;

    if (restaurantId && restaurantId !== item.restaurantId) {
      Alert.alert(
<<<<<<< HEAD
        'Bắt đầu giỏ hàng mới?',
        `Giỏ hàng hiện có món từ ${
          useCartStore.getState().restaurantName
        }. Bạn có muốn xóa giỏ hàng cũ và thêm món từ ${restaurant.name} không?`,
=======
        tr('Bắt đầu giỏ hàng mới?', 'Start a new cart?'),
        tr(
          `Giỏ hàng hiện có món từ ${
            useCartStore.getState().restaurantName
          }. Bạn có muốn xóa giỏ hàng và thêm món từ ${restaurant.name} không?`,
          `Your cart currently has items from ${
            useCartStore.getState().restaurantName
          }. Clear cart and add items from ${restaurant.name}?`,
        ),
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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

  const filteredItemsCount = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    return visibleCategories.reduce((acc, category) => {
      const count = menuItems.filter((item) => {
        if (item.categoryId !== category.id || !item.isAvailable) return false;
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          (item.description ?? '').toLowerCase().includes(q)
        );
      }).length;
      return acc + count;
    }, 0);
  }, [visibleCategories, menuItems, menuSearch]);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = items.reduce(
    (sum, item) => sum + parseFloat(item.price || '0') * item.quantity,
    0,
  );
  const ratingNum = Number(restaurant?.rating ?? 0);

  if (loadingRestaurant) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color={BURGER_COLORS.primary} />
          </View>
<<<<<<< HEAD
          <Text style={styles.loadingTitle}>Đang mở thực đơn nhà hàng</Text>
=======
          <Text style={styles.loadingTitle}>
            {tr('Đang mở thực đơn', 'Loading menu')}
          </Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
          <Text style={styles.loadingSubtitle}>
            {tr('Vui lòng chờ một chút nhé...', 'Please wait a moment...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.emptyMenuEmoji}>⚠️</Text>
          <Text style={styles.emptyMenuTitle}>Không tìm thấy nhà hàng</Text>
          <Text style={styles.emptyMenuText}>
            Nhà hàng này hiện không khả dụng hoặc đã ngừng hoạt động.
          </Text>
          <Pressable
            style={[
              styles.addButton,
              { marginTop: 16, paddingHorizontal: 20, paddingVertical: 12 },
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.addButtonText}>Quay lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
        keyboardShouldPersistTaps="handled"
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
<<<<<<< HEAD
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
=======
              <Text style={styles.heroPlaceholderEmoji}>🍔</Text>
              <Text style={styles.heroPlaceholderText}>
                {tr('Nhà hàng', 'Restaurant')}
              </Text>
            </View>
          )}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
        </View>

        {/* Thông tin nhà hàng */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{restaurant.name}</Text>
              <Text style={styles.cuisine}>
<<<<<<< HEAD
                {restaurant.cuisineType || 'Ẩm thực đa dạng'} • Đang mở cửa
=======
                {restaurant.cuisineType ||
                  tr('Burger & Món ngon', 'Burgers & Comfort Food')}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
              </Text>
            </View>

            {ratingNum > 0 ? (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingValue}>{ratingNum.toFixed(1)}</Text>
              </View>
            ) : null}
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
              <Ionicons
                name={hasVouchers ? 'pricetag' : 'shield-checkmark'}
                size={16}
                color={hasVouchers ? '#16A34A' : '#3B82F6'}
              />
              <View>
                <Text style={styles.deliveryStatLabel}>
                  {hasVouchers ? 'Mã ưu đãi' : 'Dịch vụ'}
                </Text>
                <Text
                  style={[
                    styles.deliveryStatValue,
                    { color: hasVouchers ? '#16A34A' : '#3B82F6' },
                  ]}
                >
                  {hasVouchers ? 'Có mã giảm phí giao' : 'Giao tận nơi'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.addressRow}>
<<<<<<< HEAD
            <View style={styles.addressIcon}>
              <Ionicons name="location" size={18} color="#FF6B35" />
            </View>
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>ĐỊA CHỈ QUÁN</Text>
              <Text style={styles.address}>
                {restaurant.address || 'Chưa cập nhật địa chỉ'}
              </Text>
            </View>
=======
            <Text style={styles.addressEmoji}>📍</Text>
            <Text style={styles.address} numberOfLines={2}>
              {restaurant.address ||
                tr('Chưa cập nhật địa chỉ', 'Address not provided')}
            </Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
          </View>
        </View>

        {/* Bộ lọc danh mục & Tìm món trong quán */}
        <View style={styles.menuSection}>
          <View style={styles.menuHeader}>
<<<<<<< HEAD
            <View>
              <Text style={styles.sectionEyebrow}>CHỌN MÓN NGON</Text>
              <Text style={styles.menuHeading}>Thực đơn của quán</Text>
            </View>

            <View style={styles.menuCountBadge}>
              <Text style={styles.menuCountText}>
                {availableItems.length} món sẵn sàng
=======
            <Text style={styles.menuHeading}>
              {tr('Thực đơn', 'Menu')}
            </Text>
            <View style={styles.menuCountBadge}>
              <Text style={styles.menuCountText}>
                {availableItems.length} {tr('món', 'items')}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
                const active = selectedCategoryId === cat.id;

                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    style={[
                      styles.categoryPill,
                      active && styles.categoryPillActive,
                      count === 0 && { opacity: 0.75, backgroundColor: '#FAF5F2' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        active && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat.name} {count === 0 ? '(Hết)' : `(${count})`}
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
                    {categoryItems.length} {tr('món', 'items')}
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
<<<<<<< HEAD
                            Chế biến nóng sốt khi có đơn đặt
=======
                            {tr(
                              'Chế biến nóng hổi mỗi ngày',
                              'Freshly prepared daily',
                            )}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
                              <Ionicons name="add" size={16} color="#FFFFFF" />
                              <Text style={styles.addButtonText}>Thêm</Text>
=======
                              <Text style={styles.addButtonPlus}>+</Text>
                              <Text style={styles.addButtonText}>
                                {tr('Thêm', 'Add')}
                              </Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
                Không tìm thấy sản phẩm
              </Text>
              <Text style={styles.emptyMenuText}>
                Không tìm thấy sản phẩm, mời bạn tham khảo món khác
=======
                {tr('Thực đơn đang cập nhật', 'Menu is being updated')}
              </Text>
              <Text style={styles.emptyMenuText}>
                {tr(
                  'Nhà hàng chưa có món ăn nào sẵn sàng. Bạn hãy quay lại sau nhé!',
                  'No items are available right now. Please check back soon!',
                )}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
              </Text>
            </View>
          ) : filteredItemsCount === 0 ? (
            <View>
              <View style={styles.emptyMenu}>
                <Text style={styles.emptyMenuEmoji}>🍽️</Text>
                <Text style={styles.emptyMenuTitle}>
                  {selectedCategoryId !== 'ALL'
                    ? 'Không còn sản phẩm'
                    : 'Không tìm thấy sản phẩm'}
                </Text>
                <Text style={styles.emptyMenuText}>
                  {selectedCategoryId !== 'ALL'
                    ? `Danh mục "${
                        categories.find((c) => c.id === selectedCategoryId)?.name || ''
                      }" hiện không còn sản phẩm, mời bạn tham khảo món khác.`
                    : 'Không tìm thấy sản phẩm, mời bạn tham khảo món khác'}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.addButton,
                    { marginTop: 14, paddingHorizontal: 18, paddingVertical: 10 },
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    setMenuSearch('');
                    setSelectedCategoryId('ALL');
                  }}
                >
                  <Text style={styles.addButtonText}>Tham khảo món khác</Text>
                </Pressable>
              </View>

              <View style={[styles.categoryBlock, { marginTop: 18 }]}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryAccent} />
                  <Text style={styles.categoryName}>
                    Mời bạn tham khảo món khác
                  </Text>
                  <Text style={styles.categoryCount}>
                    {availableItems.length} món
                  </Text>
                </View>

                {availableItems.map((item) => {
                  const qty = getItemQuantity(item.id);

                  return (
                    <View key={item.id} style={styles.itemCard}>
                      <View style={styles.itemInfo}>
                        <View style={styles.itemBestSellerRow}>
                          <View style={styles.bestSellerTag}>
                            <Text style={styles.bestSellerTagText}>
                              🔥 Đề xuất
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
            </View>
          ) : null}
        </View>
<<<<<<< HEAD

        <View style={styles.footerNote}>
          <Text style={styles.footerEmoji}>🧡</Text>
          <Text style={styles.footerText}>
            Món ăn được đóng gói cẩn thận và giao tận nơi. Chúc bạn ngon miệng!
          </Text>
        </View>
      </ScrollView>

      {/* Thanh giỏ hàng nổi — bấm để chuyển thẳng tới Giỏ hàng & Thanh toán */}
=======
      </ScrollView>

>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD

            <View style={styles.cartCheckoutBtn}>
              <Text style={styles.cartCheckoutBtnText}>Giao hàng</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </Pressable>
=======
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
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
    fontSize: 13,
    color: '#8B8289',
    marginTop: 8,
=======
    marginTop: 6,
    fontSize: 13,
    color: BURGER_COLORS.muted,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  heroContainer: {
<<<<<<< HEAD
    position: 'relative',
    height: 230,
    backgroundColor: '#FFE8D9',
=======
    height: 200,
    width: '100%',
    backgroundColor: BURGER_COLORS.surfaceMuted,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
<<<<<<< HEAD
    backgroundColor: '#FFE8D9',
=======
    backgroundColor: BURGER_COLORS.surfaceMuted,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  heroPlaceholderEmoji: {
    fontSize: 48,
    marginBottom: 6,
  },
  heroPlaceholderText: {
<<<<<<< HEAD
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
=======
    color: BURGER_COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
  },
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  infoSection: {
    marginTop: -16,
    marginHorizontal: 16,
<<<<<<< HEAD
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
=======
    marginTop: -18,
    padding: 16,
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
<<<<<<< HEAD
    justifyContent: 'space-between',
    gap: 12,
=======
    gap: 10,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  nameContainer: {
    flex: 1,
  },
  name: {
<<<<<<< HEAD
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
=======
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
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
<<<<<<< HEAD
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
=======
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
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
<<<<<<< HEAD
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
=======
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
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  menuSection: {
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
<<<<<<< HEAD
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
=======
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
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  menuCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: BURGER_COLORS.cheeseDark,
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
<<<<<<< HEAD
    marginBottom: 12,
  },
  categoryAccent: {
    width: 5,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#FF6B35',
    marginRight: 9,
=======
    marginBottom: 10,
    gap: 8,
  },
  categoryAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: BURGER_COLORS.primary,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  categoryName: {
    flex: 1,
    fontSize: 17,
<<<<<<< HEAD
    fontWeight: '900',
    color: '#29232A',
=======
    fontWeight: '800',
    color: BURGER_COLORS.text,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  categoryCount: {
    fontSize: 11,
    fontWeight: '700',
    color: BURGER_COLORS.muted,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
<<<<<<< HEAD
    justifyContent: 'space-between',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    padding: 14,
    marginBottom: 12,
=======
    gap: 12,
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
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
=======
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
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    marginTop: 4,
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
<<<<<<< HEAD
    gap: 10,
    marginTop: 12,
=======
    gap: 8,
    marginTop: 10,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: BURGER_COLORS.primary,
  },
  itemImageContainer: {
<<<<<<< HEAD
    position: 'relative',
    width: 94,
    height: 94,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF0E8',
=======
    width: 92,
    height: 92,
    borderRadius: 14,
    position: 'relative',
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  itemImage: {
    width: '100%',
    height: '100%',
<<<<<<< HEAD
  },
  itemImagePlaceholder: {
    flex: 1,
=======
    borderRadius: 14,
    backgroundColor: BURGER_COLORS.surfaceMuted,
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: BURGER_COLORS.surfaceMuted,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8D9',
  },
  itemPlaceholderEmoji: {
<<<<<<< HEAD
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
=======
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
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  itemSelectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
<<<<<<< HEAD
    fontWeight: '900',
=======
    fontWeight: '800',
    color: '#FFFFFF',
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },

  // Nút thêm / tăng giảm
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
<<<<<<< HEAD
    gap: 4,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
=======
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
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
    width: 30,
    height: 30,
    borderRadius: 10,
=======
    width: 28,
    height: 28,
    borderRadius: 9,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
    fontSize: 18,
    lineHeight: 20,
    color: '#FF6B35',
    fontWeight: '900',
  },
  qtyPlusText: {
    fontSize: 18,
=======
    fontSize: 17,
    lineHeight: 20,
    color: BURGER_COLORS.primary,
    fontWeight: '800',
  },
  qtyPlusText: {
    fontSize: 17,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  qtyCount: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  buttonPressed: {
<<<<<<< HEAD
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
=======
    opacity: 0.85,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
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
=======
    lineHeight: 19,
    color: BURGER_COLORS.muted,
    textAlign: 'center',
    marginTop: 6,
  },
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
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
=======
    gap: 10,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  cartSummaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
<<<<<<< HEAD
    gap: 12,
    flex: 1,
  },
  cartCountBadge: {
    flexDirection: 'row',
=======
    gap: 10,
  },
  cartCountBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: BURGER_COLORS.primary,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cartCountText: {
    color: '#FFFFFF',
<<<<<<< HEAD
    fontSize: 15,
    fontWeight: '900',
=======
    fontWeight: '800',
    fontSize: 13,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  cartTextContainer: {
    justifyContent: 'center',
  },
  cartTitle: {
<<<<<<< HEAD
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
=======
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  cartSubtitle: {
    color: '#D7C4B6',
    fontSize: 11,
<<<<<<< HEAD
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
=======
    marginTop: 2,
  },
  cartSummaryHint: {
    color: BURGER_COLORS.cheese,
    fontSize: 12,
    fontWeight: '800',
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
});
