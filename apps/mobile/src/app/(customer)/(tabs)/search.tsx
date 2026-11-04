<<<<<<< HEAD
import { useMemo, useState } from 'react';
=======
import { useState } from 'react';
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
<<<<<<< HEAD
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/lib/axios';
import { RestaurantType } from '@food-delivery/types';
import { useDebounce } from '@/hooks/use-debounce';

const CATEGORIES = [
  { name: 'Tất cả', icon: 'grid-outline' as const, keywords: [] as string[] },
  {
    name: 'Món Việt',
    icon: 'restaurant-outline' as const,
    keywords: ['việt', 'phở', 'bún', 'cơm', 'vietnamese'],
  },
  {
    name: 'Burger & Gà',
    icon: 'fast-food-outline' as const,
    keywords: ['burger', 'gà', 'chicken', 'fast'],
  },
  {
    name: 'Pizza & Ý',
    icon: 'pizza-outline' as const,
    keywords: ['pizza', 'ý', 'italian', 'pasta'],
  },
  {
    name: 'Đồ uống',
    icon: 'cafe-outline' as const,
    keywords: ['trà', 'cà phê', 'coffee', 'drink', 'tea'],
  },
  {
    name: 'Tráng miệng',
    icon: 'ice-cream-outline' as const,
    keywords: ['kem', 'bánh', 'sweet', 'dessert'],
  },
];

const POPULAR_TAGS = [
  '🔥 Cơm tấm',
  '🍜 Phở bò',
  '🍔 Burger',
  '🍕 Pizza',
  '🍗 Gà rán',
  '🧋 Trà sữa',
=======
import { router } from 'expo-router';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

const CATEGORIES = [
  { id: 'All', labelVi: 'Tất cả', labelEn: 'All', icon: 'grid-outline' as const },
  { id: 'Burger', labelVi: 'Burger', labelEn: 'Burger', icon: 'fast-food-outline' as const },
  { id: 'Pizza', labelVi: 'Pizza', labelEn: 'Pizza', icon: 'pizza-outline' as const },
  { id: 'Drinks', labelVi: 'Đồ uống', labelEn: 'Drinks', icon: 'cafe-outline' as const },
  { id: 'Dessert', labelVi: 'Tráng miệng', labelEn: 'Dessert', icon: 'ice-cream-outline' as const },
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
];

export default function CustomerSearchScreen() {
  const { tr } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const debouncedSearch = useDebounce(search, 300);

  const { data: allRestaurants = [] } = useQuery<RestaurantType[]>({
    queryKey: ['restaurants', ''],
    queryFn: () =>
      api.get<RestaurantType[]>('/restaurants').then((r) => r.data),
  });

  const { data: restaurants = [], isLoading } = useQuery<RestaurantType[]>({
    queryKey: ['restaurants', debouncedSearch],
    queryFn: () =>
      api
        .get<RestaurantType[]>('/restaurants', {
          params: debouncedSearch.trim()
            ? { search: debouncedSearch.trim() }
            : undefined,
        })
        .then((r) => r.data),
  });

  const filteredRestaurants = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.name === selectedCategory);
    if (!cat || cat.keywords.length === 0) return restaurants;

    return restaurants.filter((r) => {
      const text =
        `${r.name ?? ''} ${r.cuisineType ?? ''} ${r.description ?? ''}`.toLowerCase();
      return cat.keywords.some((k) => text.includes(k));
    });
  }, [restaurants, selectedCategory]);

  function openRestaurant(id: string) {
    router.push({
      pathname: '/(customer)/(tabs)/(home)/restaurant/[id]',
      params: { id },
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
<<<<<<< HEAD
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />
=======
      <StatusBar barStyle="dark-content" backgroundColor={BURGER_COLORS.background} />
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
<<<<<<< HEAD
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>TÌM KIẾM & KHÁM PHÁ</Text>
            <Text style={styles.title}>
              Hôm nay ăn <Text style={styles.titleAccent}>món gì?</Text>
            </Text>
            <Text style={styles.subtitle}>
              Tìm nhanh món ngon, quán quen và ưu đãi gần bạn
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="fast-food" size={26} color="#FF6B35" />
          </View>
=======
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {tr('KHÁM PHÁ ẨM THỰC', 'DISCOVER DELICIOUS FOOD')}
            </Text>
            <Text style={styles.title}>
              {tr('Tìm món ', 'Find your ')}
              <Text style={styles.titleAccent}>
                {tr('yêu thích', 'favorite')}
              </Text>
            </Text>
            <Text style={styles.subtitle}>
              {tr('Hôm nay bạn muốn thưởng thức món gì?', 'What would you like to eat today?')}
            </Text>
          </View>

          <LanguageSwitch />
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
        </View>

        {/* Thanh tìm kiếm */}
        <View style={styles.searchContainer}>
<<<<<<< HEAD
          <Ionicons name="search" size={21} color="#FF6B35" />

          <TextInput
            style={styles.searchInput}
            placeholder="Nhập tên món ăn, nhà hàng, trà sữa..."
            placeholderTextColor="#9E949A"
=======
          <Ionicons name="search-outline" size={20} color={BURGER_COLORS.muted} />

          <TextInput
            style={styles.searchInput}
            placeholder={tr('Tìm món ăn, nhà hàng...', 'Search dishes, restaurants...')}
            placeholderTextColor={BURGER_COLORS.faint}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />

          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={20} color={BURGER_COLORS.faint} />
            </Pressable>
          )}
        </View>

        {/* Từ khóa phổ biến */}
        <View style={styles.popularWrap}>
          <Text style={styles.popularLabel}>Tìm kiếm phổ biến:</Text>
          <View style={styles.popularChips}>
            {POPULAR_TAGS.map((tag) => {
              const cleanKeyword = tag.replace(/^[^\s]+\s/, '');
              const isSelected =
                search.toLowerCase() === cleanKeyword.toLowerCase();
              return (
                <Pressable
                  key={tag}
                  style={[
                    styles.popularChip,
                    isSelected && styles.popularChipActive,
                  ]}
                  onPress={() =>
                    setSearch(isSelected ? '' : cleanKeyword)
                  }
                >
                  <Text
                    style={[
                      styles.popularChipText,
                      isSelected && styles.popularChipTextActive,
                    ]}
                  >
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Danh mục */}
        <View style={styles.sectionHeader}>
<<<<<<< HEAD
          <Text style={styles.sectionTitle}>Danh mục ẩm thực</Text>
          <Text style={styles.sectionHint}>Chọn theo khẩu vị</Text>
=======
          <Text style={styles.sectionTitle}>{tr('Danh mục', 'Categories')}</Text>
          <Text style={styles.sectionHint}>
            {tr('Khám phá theo khẩu vị', 'Explore by taste')}
          </Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category.id;

            return (
              <Pressable
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                style={({ pressed }) => [
                  styles.categoryItem,
                  active && styles.categoryItemActive,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={category.icon}
                  size={22}
<<<<<<< HEAD
                  color={active ? '#FFFFFF' : '#FF6B35'}
=======
                  color={active ? '#FFFFFF' : BURGER_COLORS.muted}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
                />
                <Text
                  style={[
                    styles.categoryText,
                    active && styles.categoryTextActive,
                  ]}
                >
                  {tr(category.labelVi, category.labelEn)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

<<<<<<< HEAD
        {/* Kết quả nhà hàng */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {search.trim()
              ? `Kết quả cho "${search}"`
              : 'Quán ngon đề xuất cho bạn'}
          </Text>
          <Text style={styles.resultCountText}>
            {filteredRestaurants.length} quán
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Đang tìm món ngon...</Text>
=======
        {/* Featured Burger Card */}
        <View style={styles.featuredCard}>
          <View style={styles.featuredContent}>
            <View style={styles.featuredBadge}>
              <Ionicons name="flame" size={13} color={BURGER_COLORS.primary} />
              <Text style={styles.featuredBadgeText}>
                {tr('GỢI Ý HÔM NAY', 'FOOD DISCOVERY')}
              </Text>
            </View>

            <Text style={styles.featuredTitle}>
              {tr('Đang thèm một bữa\nburger nóng hổi?', 'Craving something\ndelicious?')}
            </Text>

            <Text style={styles.featuredSubtitle}>
              {tr(
                'Khám phá các quán ăn ngon và đặt món nhanh chóng.',
                'Search and find your next favorite meal.',
              )}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.exploreButton,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                router.push('/(customer)/(tabs)/(home)');
              }}
            >
              <Text style={styles.exploreButtonText}>
                {tr('Khám phá quán ăn', 'Explore food')}
              </Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.featuredIllustration}>
            <Text style={styles.burgerEmoji}>🍔</Text>
          </View>
        </View>

        {/* Results placeholder */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {search.trim()
              ? tr('Kết quả tìm kiếm', 'Search results')
              : tr('Phổ biến gần bạn', 'Popular near you')}
          </Text>
          <Ionicons name="sparkles-outline" size={18} color={BURGER_COLORS.primary} />
        </View>

        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="restaurant-outline"
              size={28}
              color={BURGER_COLORS.primary}
            />
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
          </View>
        ) : filteredRestaurants.length === 0 ? (
          <View>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="restaurant-outline"
                  size={30}
                  color="#FF6B35"
                />
              </View>

<<<<<<< HEAD
              <Text style={styles.emptyTitle}>
                Không tìm thấy sản phẩm
              </Text>

              <Text style={styles.emptySubtitle}>
                Không tìm thấy sản phẩm, mời bạn tham khảo món khác
              </Text>

              <Pressable
                style={styles.resetBtn}
                onPress={() => {
                  setSearch('');
                  setSelectedCategory('Tất cả');
                }}
              >
                <Text style={styles.resetBtnText}>Tham khảo món khác</Text>
              </Pressable>
            </View>

            {allRestaurants.length > 0 && (
              <View style={{ marginTop: 22 }}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Mời bạn tham khảo món khác
                  </Text>
                  <Text style={styles.resultCountText}>
                    {allRestaurants.length} quán
                  </Text>
                </View>

                <View style={styles.resultsList}>
                  {allRestaurants.map((item, idx) => (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [
                        styles.restaurantRowCard,
                        pressed && { opacity: 0.88 },
                      ]}
                      onPress={() => openRestaurant(String(item.id))}
                    >
                      <View style={styles.thumbWrap}>
                        {item.imageUrl ? (
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.thumbImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.thumbPlaceholder}>
                            <Text style={{ fontSize: 28 }}>🍲</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.restaurantRowInfo}>
                        <View style={styles.restaurantRowTop}>
                          <Text
                            style={styles.restaurantRowName}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          {Number(item.rating) > 0 ? (
                            <View style={styles.ratingMini}>
                              <Ionicons name="star" size={12} color="#F59E0B" />
                              <Text style={styles.ratingMiniText}>
                                {Number(item.rating).toFixed(1)}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <Text
                          style={styles.restaurantRowCuisine}
                          numberOfLines={1}
                        >
                          {item.cuisineType || 'Ẩm thực đa dạng'}
                        </Text>

                        <View style={styles.restaurantRowBottom}>
                          <View style={styles.deliveryTag}>
                            <Ionicons
                              name="bicycle"
                              size={13}
                              color="#FF6B35"
                            />
                            <Text style={styles.deliveryTagText}>
                              {15 + (idx % 3) * 5}-{25 + (idx % 3) * 5} phút
                            </Text>
                          </View>

                          <View style={styles.orderNowMini}>
                            <Text style={styles.orderNowMiniText}>
                              Xem menu
                            </Text>
                            <Ionicons
                              name="chevron-forward"
                              size={13}
                              color="#FF6B35"
                            />
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.resultsList}>
            {filteredRestaurants.map((item, idx) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.restaurantRowCard,
                  pressed && { opacity: 0.88 },
                ]}
                onPress={() => openRestaurant(String(item.id))}
              >
                <View style={styles.thumbWrap}>
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.thumbImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Text style={{ fontSize: 28 }}>🍲</Text>
                    </View>
                  )}
                </View>

                <View style={styles.restaurantRowInfo}>
                  <View style={styles.restaurantRowTop}>
                    <Text style={styles.restaurantRowName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {Number(item.rating) > 0 ? (
                      <View style={styles.ratingMini}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.ratingMiniText}>
                          {Number(item.rating).toFixed(1)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.restaurantRowCuisine} numberOfLines={1}>
                    {item.cuisineType || 'Ẩm thực đa dạng'}
                  </Text>

                  <View style={styles.restaurantRowBottom}>
                    <View style={styles.deliveryTag}>
                      <Ionicons name="bicycle" size={13} color="#FF6B35" />
                      <Text style={styles.deliveryTagText}>
                        {15 + (idx % 3) * 5}-{25 + (idx % 3) * 5} phút
                      </Text>
                    </View>

                    <View style={styles.orderNowMini}>
                      <Text style={styles.orderNowMiniText}>Xem menu</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={13}
                        color="#FF6B35"
                      />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
=======
          <Text style={styles.emptyTitle}>
            {search.trim()
              ? tr('Sẵn sàng tìm món ngon?', 'Ready to find your food?')
              : tr('Bữa ăn ngon đang chờ bạn', 'Your next meal awaits')}
          </Text>

          <Text style={styles.emptySubtitle}>
            {search.trim()
              ? tr(
                  `Bạn đang tìm "${search}". Xem danh sách nhà hàng tại Trang chủ để chọn món ngay.`,
                  `You searched for "${search}". Browse restaurants on Home to order matching dishes.`,
                )
              : tr(
                  'Chọn danh mục hoặc ghé Trang chủ để khám phá thực đơn hấp dẫn từ các nhà hàng.',
                  'Pick a category or visit Home to discover dishes and restaurants.',
                )}
          </Text>
        </View>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BURGER_COLORS.background,
  },
  content: {
<<<<<<< HEAD
    paddingHorizontal: 20,
=======
    paddingHorizontal: 18,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    paddingTop: 14,
    paddingBottom: 32,
  },
  pressed: {
    opacity: 0.88,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
<<<<<<< HEAD
    marginBottom: 18,
    gap: 12,
  },
  greeting: {
    color: '#FF6B35',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  title: {
    color: '#29232A',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.7,
=======
    gap: 12,
    marginBottom: 18,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    color: BURGER_COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    color: BURGER_COLORS.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  titleAccent: {
    color: BURGER_COLORS.primary,
  },
  subtitle: {
<<<<<<< HEAD
    color: '#8B8289',
    fontSize: 12,
    marginTop: 5,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFEEE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE2DA',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 10,
    marginBottom: 14,
=======
    color: BURGER_COLORS.muted,
    fontSize: 13,
    marginTop: 4,
  },
  searchContainer: {
    height: 52,
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 22,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
<<<<<<< HEAD
    color: '#29232A',
=======
    color: BURGER_COLORS.text,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    height: '100%',
  },
  popularWrap: {
    marginBottom: 22,
  },
  popularLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8B8289',
    marginBottom: 8,
  },
  popularChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE4DC',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  popularChipActive: {
    backgroundColor: '#FFF0E8',
    borderColor: '#FF6B35',
  },
  popularChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#574E54',
  },
  popularChipTextActive: {
    color: '#FF6B35',
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
<<<<<<< HEAD
    fontSize: 18,
    fontWeight: '900',
    color: '#29232A',
  },
  sectionHint: {
    color: '#A49AA0',
    fontSize: 11,
    fontWeight: '600',
  },
  resultCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B35',
=======
    fontSize: 17,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  sectionHint: {
    color: BURGER_COLORS.muted,
    fontSize: 12,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  categoryList: {
    gap: 10,
    paddingBottom: 22,
  },
  categoryItem: {
<<<<<<< HEAD
    width: 86,
    height: 84,
=======
    minWidth: 82,
    height: 82,
    paddingHorizontal: 12,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    backgroundColor: BURGER_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
<<<<<<< HEAD
    gap: 8,
    paddingHorizontal: 6,
=======
    gap: 7,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  categoryItemActive: {
    backgroundColor: BURGER_COLORS.primary,
    borderColor: BURGER_COLORS.primary,
  },
  categoryText: {
<<<<<<< HEAD
    fontSize: 11,
    fontWeight: '700',
    color: '#574E54',
    textAlign: 'center',
=======
    fontSize: 12,
    fontWeight: '700',
    color: BURGER_COLORS.muted,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
<<<<<<< HEAD
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B8289',
=======
  featuredCard: {
    backgroundColor: BURGER_COLORS.primaryLight,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    padding: 18,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredContent: {
    flex: 1,
    paddingRight: 10,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: BURGER_COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: BURGER_COLORS.primary,
    letterSpacing: 0.5,
  },
  featuredTitle: {
    color: BURGER_COLORS.text,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  featuredSubtitle: {
    color: BURGER_COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  resultsList: {
    gap: 12,
  },
  restaurantRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
<<<<<<< HEAD
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0E6DF',
    padding: 12,
    gap: 13,
  },
  thumbWrap: {
    width: 86,
    height: 86,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#FFE8D9',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantRowInfo: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 80,
  },
  restaurantRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  restaurantRowName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    color: '#29232A',
  },
  ratingMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF8E6',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ratingMiniText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#B45309',
  },
  restaurantRowCuisine: {
    fontSize: 12,
    color: '#8B8289',
    fontWeight: '600',
    marginTop: 2,
  },
  restaurantRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  deliveryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF2EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deliveryTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D95322',
  },
  orderNowMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  orderNowMiniText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B35',
=======
    gap: 7,
    backgroundColor: BURGER_COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  exploreButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  featuredIllustration: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: BURGER_COLORS.cheeseLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burgerEmoji: {
    fontSize: 38,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  emptyCard: {
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 26,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
<<<<<<< HEAD
    color: '#29232A',
=======
    color: BURGER_COLORS.text,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: BURGER_COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
<<<<<<< HEAD
  resetBtn: {
    marginTop: 14,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
=======
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
});
