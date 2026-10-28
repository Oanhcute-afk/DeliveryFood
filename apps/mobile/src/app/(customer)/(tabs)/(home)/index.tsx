import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
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
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

export default function CustomerHomeScreen() {
  const { tr } = useLanguage();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

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

  function openRestaurant(id: string) {
    router.push({
      pathname: '/(customer)/(home)/restaurant/[id]',
      params: { id },
    });
  }

  function renderContent() {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color={BURGER_COLORS.primary} />
          </View>
          <Text style={styles.stateTitle}>
            {tr('Đang tìm quán ngon', 'Finding restaurants')}
          </Text>
          <Text style={styles.stateDescription}>
            {tr(
              'Chờ một chút, burger nóng hổi sắp xuất hiện!',
              'Hang tight, freshly grilled meals are on the way!',
            )}
          </Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.centered}>
          <Text style={styles.stateEmoji}>📡</Text>
          <Text style={styles.stateTitle}>
            {tr('Không tải được nhà hàng', 'Unable to load restaurants')}
          </Text>
          <Text style={styles.stateDescription}>
            {tr(
              'Kiểm tra kết nối mạng hoặc máy chủ API rồi thử lại nhé.',
              'Please check your internet connection or API server and try again.',
            )}
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
            <Text style={styles.retryButtonText}>
              {tr('Thử lại', 'Try again')}
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        data={restaurants}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          restaurants.length === 0 && styles.emptyListContent,
        ]}
        refreshing={isFetching && !isLoading}
        onRefresh={() => refetch()}
        ListHeaderComponent={
          restaurants.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>
                {tr('Quán ngon nổi bật', 'Featured Restaurants')}
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {restaurants.length} {tr('quán', 'places')}
                </Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.stateEmoji}>🍔</Text>
            <Text style={styles.stateTitle}>
              {tr('Chưa tìm thấy nhà hàng', 'No restaurants found')}
            </Text>
            <Text style={styles.stateDescription}>
              {tr(
                'Thử tìm tên quán hoặc loại món ăn khác nhé.',
                'Try another restaurant name or cuisine type.',
              )}
            </Text>
            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch('')}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.retryButtonText}>
                  {tr('Xóa tìm kiếm', 'Clear search')}
                </Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${tr('Xem thực đơn', 'View menu')} ${item.name}`}
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
                  <Text style={styles.placeholderEmoji}>🍔</Text>
                  <Text style={styles.placeholderText}>
                    {tr('Nóng hổi & thơm ngon', 'Fresh & Flame-Grilled')}
                  </Text>
                </View>
              )}

              <View style={styles.openBadge}>
                <View style={styles.openDot} />
                <Text style={styles.openBadgeText}>
                  {tr('Mở cửa', 'Open')}
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>

                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingStar}>★</Text>
                  <Text style={styles.ratingValue}>
                    {Number(item.rating) > 0
                      ? Number(item.rating).toFixed(1)
                      : tr('Mới', 'New')}
                  </Text>
                </View>
              </View>

              <View style={styles.cardMetaRow}>
                <Text style={styles.cardCuisine} numberOfLines={1}>
                  {item.cuisineType || tr('Burger & Đồ ăn nhanh', 'Burgers & Fast Food')}
                </Text>

                <View style={styles.viewMenu}>
                  <Text style={styles.viewMenuText}>
                    {tr('Xem menu', 'View menu')}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={BURGER_COLORS.primary}
                  />
                </View>
              </View>
            </View>
          </Pressable>
        )}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View style={styles.brandGroup}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandEmoji}>🍔</Text>
            </View>
            <View>
              <Text style={styles.greetingLabel}>
                {tr('DELIBURGER · GIAO NHANH', 'DELIBURGER · FAST DELIVERY')}
              </Text>
              <Text style={styles.greetingTitle}>
                {tr('Hôm nay ăn gì? 👋', 'Craving a burger? 👋')}
              </Text>
            </View>
          </View>

          <LanguageSwitch />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={BURGER_COLORS.primary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={tr(
              'Tìm burger, nhà hàng, món ăn...',
              'Search burgers, restaurants, dishes...',
            )}
            placeholderTextColor={BURGER_COLORS.faint}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
            accessibilityLabel={tr('Tìm kiếm nhà hàng', 'Search restaurants')}
          />
          {search.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr(
                'Xóa từ khóa tìm kiếm',
                'Clear search query',
              )}
              onPress={() => setSearch('')}
              hitSlop={10}
              style={styles.clearButton}
            >
              <Ionicons name="close" size={16} color={BURGER_COLORS.muted} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.content}>{renderContent()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BURGER_COLORS.background,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: BURGER_COLORS.background,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BURGER_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandEmoji: {
    fontSize: 22,
  },
  greetingLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: BURGER_COLORS.primary,
    letterSpacing: 0.8,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: BURGER_COLORS.text,
    marginTop: 2,
  },
  searchContainer: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: BURGER_COLORS.text,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BURGER_COLORS.surfaceMuted,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 96,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: BURGER_COLORS.text,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: BURGER_COLORS.cheeseLight,
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: BURGER_COLORS.cheeseDark,
  },
  card: {
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.88,
  },
  imageContainer: {
    height: 164,
    backgroundColor: BURGER_COLORS.surfaceMuted,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BURGER_COLORS.surfaceMuted,
  },
  placeholderEmoji: {
    fontSize: 40,
    marginBottom: 6,
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '700',
    color: BURGER_COLORS.muted,
  },
  openBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: BURGER_COLORS.surface,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BURGER_COLORS.lettuce,
  },
  openBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: BURGER_COLORS.lettuce,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: BURGER_COLORS.cheeseLight,
  },
  ratingStar: {
    color: BURGER_COLORS.cheese,
    fontSize: 13,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '800',
    color: BURGER_COLORS.cheeseDark,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  cardCuisine: {
    flex: 1,
    fontSize: 13,
    color: BURGER_COLORS.muted,
  },
  viewMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewMenuText: {
    fontSize: 12,
    fontWeight: '800',
    color: BURGER_COLORS.primary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
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
  stateEmoji: {
    fontSize: 42,
    marginBottom: 12,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: BURGER_COLORS.text,
    textAlign: 'center',
  },
  stateDescription: {
    fontSize: 13,
    color: BURGER_COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
  errorDetails: {
    fontSize: 11,
    color: BURGER_COLORS.tomato,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: BURGER_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
