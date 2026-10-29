import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { api } from '@/lib/axios';
import { RestaurantType } from '@food-delivery/types';
import { useDebounce } from '@/hooks/use-debounce';
import { useCartStore } from '@/store/cart-store';
import { useAuth } from '@/context/auth-context';

const FOOD_CATEGORIES = [
  { id: 'all', label: 'Tất cả', emoji: '🍽️', keywords: [] as string[] },
  {
    id: 'viet',
    label: 'Món Việt',
    emoji: '🍜',
    keywords: ['việt', 'phở', 'bún', 'cơm', 'bánh mì', 'vietnamese', 'rice'],
  },
  {
    id: 'fastfood',
    label: 'Burger & Gà',
    emoji: '🍔',
    keywords: ['burger', 'gà', 'chicken', 'fast', 'american', 'kfc'],
  },
  {
    id: 'pizza',
    label: 'Pizza & Ý',
    emoji: '🍕',
    keywords: ['pizza', 'ý', 'italian', 'pasta', 'mì ý'],
  },
  {
    id: 'asian',
    label: 'Hàn & Nhật',
    emoji: '🍣',
    keywords: ['hàn', 'nhật', 'sushi', 'korean', 'japanese', 'ramen', 'tokbokki'],
  },
  {
    id: 'drink',
    label: 'Đồ uống',
    emoji: '🧋',
    keywords: ['trà', 'cà phê', 'coffee', 'tea', 'drink', 'đồ uống', 'sinh tố'],
  },
  {
    id: 'top_rated',
    label: 'Đánh giá cao',
    emoji: '⭐',
    keywords: [],
  },
];

function getDeliveryEstimate(index: number): {
  time: string;
  distance: string;
  promo: string;
} {
  const estimates = [
    { time: '15-20 phút', distance: '0.8 km', promo: 'Freeship đơn từ $0' },
    { time: '20-25 phút', distance: '1.4 km', promo: 'Giảm $2 phí giao' },
    { time: '15-25 phút', distance: '1.1 km', promo: 'Freeship • Quán chuẩn' },
    { time: '25-30 phút', distance: '2.0 km', promo: 'Ưu đãi món mới' },
  ];
  return estimates[index % estimates.length];
}

export default function CustomerHomeScreen() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const debouncedSearch = useDebounce(search, 350);

  const { user } = useAuth();
  const cartItems = useCartStore((s) => s.items);
  const cartRestaurantName = useCartStore((s) => s.restaurantName);
  const cartTotalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotalPrice = cartItems.reduce(
    (sum, i) => sum + parseFloat(i.price) * i.quantity,
    0,
  );

  const {
    data: restaurants = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<RestaurantType[]>({
    queryKey: ['restaurants', debouncedSearch],
    queryFn: () =>
      api
        .get<RestaurantType[]>('/restaurants', {
          params: debouncedSearch.trim()
            ? { search: debouncedSearch.trim() }
            : undefined,
        })
        .then((response) => response.data),
  });

  const filteredRestaurants = useMemo(() => {
    if (selectedCategory === 'all') return restaurants;

    if (selectedCategory === 'top_rated') {
      return [...restaurants].sort(
        (a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0),
      );
    }

    const cat = FOOD_CATEGORIES.find((c) => c.id === selectedCategory);
    if (!cat || cat.keywords.length === 0) return restaurants;

    const matches = restaurants.filter((r) => {
      const haystack =
        `${r.name ?? ''} ${r.cuisineType ?? ''} ${r.description ?? ''}`.toLowerCase();
      return cat.keywords.some((kw) => haystack.includes(kw));
    });

    return matches.length > 0 ? matches : restaurants;
  }, [restaurants, selectedCategory]);

  function openRestaurant(id: string) {
    router.push({
      pathname: '/(customer)/(tabs)/(home)/restaurant/[id]',
      params: { id },
    });
  }

  const userFirstName = user?.firstName?.trim() || 'bạn';

  function renderHeader() {
    return (
      <View style={styles.listHeaderContainer}>
        {/* Banner khuyến mãi đậm chất Delivery Food */}
        <View style={styles.promoBanner}>
          <View style={styles.promoLeft}>
            <View style={styles.promoTag}>
              <Ionicons name="flame" size={13} color="#FF6B35" />
              <Text style={styles.promoTagText}>ƯU ĐÃI GIAO ĐỒ ĂN</Text>
            </View>

            <Text style={styles.promoTitle}>
              Món nóng hổi{'\n'}Freeship tận cửa!
            </Text>
            <Text style={styles.promoSubtitle}>
              Áp mã voucher tại bước thanh toán để nhận ưu đãi hấp dẫn hôm nay.
            </Text>

            <View style={styles.promoActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.promoCta,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => router.push('/(customer)/(tabs)/vouchers')}
              >
                <Ionicons name="pricetag" size={14} color="#FF6B35" />
                <Text style={styles.promoCtaText}>Săn Voucher ngay</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.promoVisual}>
            <View style={styles.promoCircle}>
              <Text style={styles.promoEmoji}>🍔</Text>
            </View>
            <View style={styles.promoMiniBadge}>
              <Text style={styles.promoMiniText}>⚡ 15p</Text>
            </View>
          </View>
        </View>

        {/* Cam kết dịch vụ giao đồ ăn */}
        <View style={styles.perksBar}>
          <View style={styles.perkItem}>
            <Ionicons name="flash" size={15} color="#FF6B35" />
            <Text style={styles.perkText}>Giao nhanh 20p</Text>
          </View>
          <View style={styles.perkDivider} />
          <View style={styles.perkItem}>
            <Ionicons name="shield-checkmark" size={15} color="#16A34A" />
            <Text style={styles.perkText}>Quán ngon tuyển chọn</Text>
          </View>
          <View style={styles.perkDivider} />
          <View style={styles.perkItem}>
            <Ionicons name="pricetag" size={15} color="#F59E0B" />
            <Text style={styles.perkText}>Nhiều mã giảm giá</Text>
          </View>
        </View>

        {/* Danh mục món ăn */}
        <View style={styles.categorySection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Hôm nay ăn gì?</Text>
            {selectedCategory !== 'all' && (
              <Pressable onPress={() => setSelectedCategory('all')}>
                <Text style={styles.resetFilterText}>Xem tất cả</Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {FOOD_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[
                    styles.categoryChip,
                    active && styles.categoryChipActive,
                  ]}
                >
                  <View
                    style={[
                      styles.categoryEmojiWrap,
                      active && styles.categoryEmojiWrapActive,
                    ]}
                  >
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  </View>
                  <Text
                    style={[
                      styles.categoryChipLabel,
                      active && styles.categoryChipLabelActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Tiêu đề danh sách nhà hàng */}
        {filteredRestaurants.length > 0 && (
          <View style={styles.listSectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>QUÁN NGON QUANH BẠN</Text>
              <Text style={styles.sectionTitle}>
                {selectedCategory === 'top_rated'
                  ? 'Nhà hàng được đánh giá cao'
                  : 'Giao nhanh • Đặt là có ngay'}
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {filteredRestaurants.length} quán
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  function renderContent() {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
          <Text style={styles.stateTitle}>Đang tìm quán ngon gần bạn</Text>
          <Text style={styles.stateDescription}>
            Chờ một chút, hàng loạt món ngon sắp hiện ra!
          </Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.centered}>
          <Text style={styles.stateEmoji}>📡</Text>
          <Text style={styles.stateTitle}>Không tải được danh sách quán</Text>
          <Text style={styles.stateDescription}>
            Kiểm tra kết nối mạng hoặc máy chủ API rồi thử lại nhé.
          </Text>
          <Text style={styles.errorDetails} numberOfLines={3}>
            {error instanceof Error ? error.message : String(error)}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.retryButtonText}>Thử lại ngay</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredRestaurants}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          filteredRestaurants.length === 0 && styles.emptyListContent,
          cartTotalItems > 0 && { paddingBottom: 105 },
        ]}
        refreshing={isFetching && !isLoading}
        onRefresh={() => refetch()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.stateEmoji}>🍽️</Text>
            <Text style={styles.stateTitle}>Chưa tìm thấy nhà hàng phù hợp</Text>
            <Text style={styles.stateDescription}>
              Hãy thử từ khóa khác hoặc chọn lại danh mục món ăn nhé.
            </Text>
            {(search.length > 0 || selectedCategory !== 'all') && (
              <Pressable
                onPress={() => {
                  setSearch('');
                  setSelectedCategory('all');
                }}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Xóa bộ lọc</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item, index }) => {
          const deliveryInfo = getDeliveryEstimate(index);
          const isOpen = item.isOpen !== false;
          const ratingNum = Number(item.rating ?? 0);

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Xem thực đơn ${item.name}`}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() => openRestaurant(String(item.id))}
            >
              <View style={styles.imageContainer}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.cardImagePlaceholder}>
                    <Text style={styles.placeholderEmoji}>🍲</Text>
                    <Text style={styles.placeholderText}>
                      Món ngon chuẩn vị
                    </Text>
                  </View>
                )}

                {/* Tag ưu đãi góc trái trên */}
                <View style={styles.promoBadgeOverlay}>
                  <Ionicons name="flash" size={12} color="#FFFFFF" />
                  <Text style={styles.promoBadgeText}>Yêu thích</Text>
                </View>

                {/* Trạng thái đóng/mở góc phải trên */}
                <View
                  style={[
                    styles.statusOverlayBadge,
                    !isOpen && styles.statusOverlayClosed,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      !isOpen && { backgroundColor: '#9CA3AF' },
                    ]}
                  />
                  <Text style={styles.statusOverlayText}>
                    {isOpen ? 'Đang mở cửa' : 'Tạm đóng'}
                  </Text>
                </View>

                {/* Thời gian giao hàng góc dưới ảnh */}
                <View style={styles.deliveryTimeOverlay}>
                  <Ionicons name="bicycle" size={14} color="#FF6B35" />
                  <Text style={styles.deliveryTimeText}>
                    {deliveryInfo.time} • {deliveryInfo.distance}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.nameWithTick}>
                    <Ionicons
                      name="checkmark-circle"
                      size={17}
                      color="#FF6B35"
                      style={{ marginTop: 2 }}
                    />
                    <Text style={styles.cardName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>

                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={13} color="#F59E0B" />
                    <Text style={styles.ratingValue}>
                      {ratingNum > 0 ? ratingNum.toFixed(1) : '4.8'}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.cuisinePill}>
                    <Text style={styles.cuisinePillText} numberOfLines={1}>
                      {item.cuisineType || 'Ẩm thực đa dạng'}
                    </Text>
                  </View>

                  {item.address ? (
                    <View style={styles.addressPreview}>
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color="#8B8289"
                      />
                      <Text style={styles.addressPreviewText} numberOfLines={1}>
                        {item.address}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardFooter}>
                  <View style={styles.freeshipTag}>
                    <Ionicons
                      name="pricetag-outline"
                      size={13}
                      color="#168653"
                    />
                    <Text style={styles.freeshipTagText}>
                      {deliveryInfo.promo}
                    </Text>
                  </View>

                  <View style={styles.viewMenuButton}>
                    <Text style={styles.viewMenuText}>Đặt món</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={13}
                      color="#FFFFFF"
                    />
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          filteredRestaurants.length > 0 ? (
            <View style={styles.footerNote}>
              <Text style={styles.footerEmoji}>🛵</Text>
              <Text style={styles.footerText}>
                DeliFood giao món nóng hổi tận tay bạn mỗi ngày!
              </Text>
            </View>
          ) : null
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />

      {/* Top Delivery Bar gọn gàng, chuẩn app giao đồ ăn */}
      <View style={styles.topHeader}>
        <View style={styles.deliveryRow}>
          <View style={styles.locationPinBox}>
            <Ionicons name="location" size={20} color="#FFFFFF" />
          </View>

          <View style={styles.deliveryInfo}>
            <View style={styles.deliveryLabelRow}>
              <Text style={styles.deliveryLabel}>GIAO ĐẾN</Text>
              <View style={styles.fastBadge}>
                <Text style={styles.fastBadgeText}>⚡ Giao nhanh</Text>
              </View>
            </View>
            <Text style={styles.deliveryAddressText} numberOfLines={1}>
              Xin chào {userFirstName} • Vị trí hiện tại của bạn
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở giỏ hàng"
            style={({ pressed }) => [
              styles.cartIconButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/(customer)/(tabs)/cart')}
          >
            <Ionicons name="bag-handle" size={21} color="#FF6B35" />
            {cartTotalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartTotalItems}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Thanh tìm kiếm nổi bật */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#FF6B35" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm món ăn, trà sữa, burger, nhà hàng..."
            placeholderTextColor="#9E949A"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
            accessibilityLabel="Tìm kiếm nhà hàng"
          />
          {search.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa từ khóa tìm kiếm"
              onPress={() => setSearch('')}
              hitSlop={10}
              style={styles.clearButton}
            >
              <Ionicons name="close" size={16} color="#756B72" />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.content}>{renderContent()}</View>

      {/* Thanh giỏ hàng nổi (Floating Mini Cart) khi khách đã chọn món */}
      {cartTotalItems > 0 && (
        <View style={styles.floatingCartWrapper}>
          <Pressable
            style={({ pressed }) => [
              styles.floatingCartBar,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/(customer)/(tabs)/cart')}
          >
            <View style={styles.floatingCartLeft}>
              <View style={styles.floatingCartCountBox}>
                <Text style={styles.floatingCartCountText}>
                  {cartTotalItems}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.floatingCartTitle} numberOfLines={1}>
                  {cartRestaurantName || 'Giỏ hàng của bạn'}
                </Text>
                <Text style={styles.floatingCartSub}>
                  Tạm tính: ${cartTotalPrice.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.floatingCartAction}>
              <Text style={styles.floatingCartActionText}>Thanh toán</Text>
              <Ionicons name="arrow-forward" size={16} color="#FF6B35" />
            </View>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  topHeader: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFF9F5',
    borderBottomWidth: 1,
    borderBottomColor: '#F4EBE4',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 12,
  },
  locationPinBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  deliveryLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF6B35',
    letterSpacing: 0.9,
  },
  fastBadge: {
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  fastBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E85D2A',
  },
  deliveryAddressText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#29232A',
  },
  cartIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E4DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFF9F5',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  searchContainer: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE2DA',
    borderRadius: 15,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#29232A',
    height: '100%',
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3ECE7',
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  listHeaderContainer: {
    marginBottom: 8,
  },
  promoBanner: {
    backgroundColor: '#FF6B35',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  promoLeft: {
    flex: 1,
    paddingRight: 10,
  },
  promoTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  promoTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FF6B35',
    letterSpacing: 0.6,
  },
  promoTitle: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  promoSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: '#FFE5D9',
    marginTop: 6,
  },
  promoActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  promoCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
  },
  promoCtaText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF6B35',
  },
  promoVisual: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoEmoji: {
    fontSize: 40,
  },
  promoMiniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#29232A',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  promoMiniText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  perksBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F0E6DF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  perkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B4248',
  },
  perkDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#EDE2DA',
  },
  categorySection: {
    marginBottom: 18,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B35',
  },
  categoryScroll: {
    gap: 10,
    paddingRight: 8,
  },
  categoryChip: {
    alignItems: 'center',
    width: 76,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E6DF',
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  categoryEmojiWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFF3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmojiWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  categoryEmoji: {
    fontSize: 21,
  },
  categoryChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#574E54',
    textAlign: 'center',
  },
  categoryChipLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FF6B35',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#29232A',
    letterSpacing: -0.4,
  },
  countBadge: {
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B35',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFE5DE',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#29232A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  imageContainer: {
    position: 'relative',
    height: 168,
    backgroundColor: '#FFF0E8',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8D9',
  },
  placeholderEmoji: {
    fontSize: 40,
    marginBottom: 6,
  },
  placeholderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B5633F',
  },
  promoBadgeOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  promoBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statusOverlayBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusOverlayClosed: {
    backgroundColor: 'rgba(243, 244, 246, 0.95)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  statusOverlayText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#29232A',
  },
  deliveryTimeOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  deliveryTimeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#29232A',
  },
  cardBody: {
    padding: 15,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  nameWithTick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  cardName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    color: '#29232A',
    letterSpacing: -0.3,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8E6',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#B45309',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  cuisinePill: {
    backgroundColor: '#FFF2EA',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cuisinePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D95322',
  },
  addressPreview: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  addressPreviewText: {
    flex: 1,
    fontSize: 12,
    color: '#8B8289',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F4ECE6',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  freeshipTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EAFBF1',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
  },
  freeshipTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#168653',
  },
  viewMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 11,
  },
  viewMenuText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F0E6DF',
    padding: 28,
    marginTop: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stateEmoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#29232A',
    textAlign: 'center',
  },
  stateDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: '#8B8289',
    textAlign: 'center',
    marginTop: 6,
  },
  errorDetails: {
    marginTop: 10,
    fontSize: 11,
    color: '#C7522A',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 13,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    padding: 14,
    borderRadius: 15,
    backgroundColor: '#FFF0E8',
  },
  footerEmoji: {
    fontSize: 18,
  },
  footerText: {
    fontSize: 12,
    color: '#9A6046',
    fontWeight: '700',
  },
  floatingCartWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
  },
  floatingCartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#29232A',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
    marginRight: 10,
  },
  floatingCartCountBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCartCountText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  floatingCartTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  floatingCartSub: {
    color: '#D6CED4',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  floatingCartAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
  },
  floatingCartActionText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '900',
  },
});
