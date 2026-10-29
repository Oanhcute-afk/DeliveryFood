import { useMemo, useState } from 'react';
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
];

export default function CustomerSearchScreen() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const debouncedSearch = useDebounce(search, 300);

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

    const matched = restaurants.filter((r) => {
      const text =
        `${r.name ?? ''} ${r.cuisineType ?? ''} ${r.description ?? ''}`.toLowerCase();
      return cat.keywords.some((k) => text.includes(k));
    });

    return matched.length > 0 ? matched : restaurants;
  }, [restaurants, selectedCategory]);

  function openRestaurant(id: string) {
    router.push({
      pathname: '/(customer)/(tabs)/(home)/restaurant/[id]',
      params: { id },
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>TÌM KIẾM & KHÁM PHÁ</Text>
            <Text style={styles.title}>
              Hôm nay ăn <Text style={styles.titleAccent}>món gì?</Text>
            </Text>
            <Text style={styles.subtitle}>
              Tìm nhanh món ngon, quán quen và ưu đãi Freeship gần bạn
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="fast-food" size={26} color="#FF6B35" />
          </View>
        </View>

        {/* Thanh tìm kiếm */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={21} color="#FF6B35" />

          <TextInput
            style={styles.searchInput}
            placeholder="Nhập tên món ăn, nhà hàng, trà sữa..."
            placeholderTextColor="#9E949A"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />

          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={20} color="#AAA4AA" />
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
          <Text style={styles.sectionTitle}>Danh mục ẩm thực</Text>
          <Text style={styles.sectionHint}>Chọn theo khẩu vị</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category.name;

            return (
              <Pressable
                key={category.name}
                onPress={() => setSelectedCategory(category.name)}
                style={[
                  styles.categoryItem,
                  active && styles.categoryItemActive,
                ]}
              >
                <Ionicons
                  name={category.icon}
                  size={22}
                  color={active ? '#FFFFFF' : '#FF6B35'}
                />
                <Text
                  style={[
                    styles.categoryText,
                    active && styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

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
          </View>
        ) : filteredRestaurants.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="restaurant-outline"
                size={30}
                color="#FF6B35"
              />
            </View>

            <Text style={styles.emptyTitle}>
              Không tìm thấy quán phù hợp
            </Text>

            <Text style={styles.emptySubtitle}>
              Thử tìm kiếm với từ khóa khác hoặc bấm xóa bộ lọc bên dưới nhé.
            </Text>

            <Pressable
              style={styles.resetBtn}
              onPress={() => {
                setSearch('');
                setSelectedCategory('Tất cả');
              }}
            >
              <Text style={styles.resetBtnText}>Xem tất cả nhà hàng</Text>
            </Pressable>
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
                  <View style={styles.thumbBadge}>
                    <Text style={styles.thumbBadgeText}>Freeship</Text>
                  </View>
                </View>

                <View style={styles.restaurantRowInfo}>
                  <View style={styles.restaurantRowTop}>
                    <Text style={styles.restaurantRowName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.ratingMini}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingMiniText}>
                        {Number(item.rating) > 0
                          ? Number(item.rating).toFixed(1)
                          : '4.8'}
                      </Text>
                    </View>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  titleAccent: {
    color: '#FF6B35',
  },
  subtitle: {
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
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#29232A',
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
  },
  categoryList: {
    gap: 10,
    paddingBottom: 22,
  },
  categoryItem: {
    width: 86,
    height: 84,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 6,
  },
  categoryItemActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#574E54',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
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
  },
  resultsList: {
    gap: 12,
  },
  restaurantRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  thumbBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: '#16A34A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  thumbBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
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
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 21,
    backgroundColor: '#FFF0E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  emptyTitle: {
    color: '#29232A',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#8B8289',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },
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
});
