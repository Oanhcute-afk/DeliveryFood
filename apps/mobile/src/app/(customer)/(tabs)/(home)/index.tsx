
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

import { api } from '@/lib/axios';
import { RestaurantType } from '@food-delivery/types';
import { useDebounce } from '@/hooks/use-debounce';

export default function CustomerHomeScreen() {
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
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
          <Text style={styles.stateTitle}>Đang tìm nhà hàng</Text>
          <Text style={styles.stateDescription}>
            Chờ một chút, món ngon sắp đến rồi!
          </Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.centered}>
          <Text style={styles.stateEmoji}>📡</Text>
          <Text style={styles.stateTitle}>
            Không tải được nhà hàng
          </Text>
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
            <Text style={styles.retryButtonText}>Thử lại</Text>
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
              <View>
                <Text style={styles.sectionEyebrow}>
                  DÀNH RIÊNG CHO BẠN
                </Text>
                <Text style={styles.sectionTitle}>
                  Nhà hàng nổi bật
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {restaurants.length} nơi
                </Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.stateEmoji}>🍽️</Text>
            <Text style={styles.stateTitle}>
              Chưa tìm thấy nhà hàng
            </Text>
            <Text style={styles.stateDescription}>
              Thử một tên nhà hàng hoặc loại ẩm thực khác nhé.
            </Text>
            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch('')}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>
                  Xóa tìm kiếm
                </Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => (
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
                    Hương vị thơm ngon
                  </Text>
                </View>
              )}

              <View style={styles.imageBadge}>
                <Text style={styles.imageBadgeText}>
                  🍴 Đặt món
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardName} numberOfLines={2}>
                  {item.name}
                </Text>

                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingStar}>★</Text>
                  <Text style={styles.ratingValue}>
                    {Number(item.rating) > 0
                      ? Number(item.rating).toFixed(1)
                      : 'Mới'}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardCuisine} numberOfLines={1}>
                {item.cuisineType || 'Ẩm thực đa dạng'}
              </Text>

              <View style={styles.cardDivider} />

              <View style={styles.cardFooter}>
                <View style={styles.openBadge}>
                  <View style={styles.openDot} />
                  <Text style={styles.openBadgeText}>
                    Sẵn sàng phục vụ
                  </Text>
                </View>

                <View style={styles.viewMenu}>
                  <Text style={styles.viewMenuText}>Xem thực đơn</Text>
                  <Text style={styles.viewMenuArrow}>›</Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}
        ListFooterComponent={
          restaurants.length > 0 ? (
            <View style={styles.footerNote}>
              <Text style={styles.footerEmoji}>🧡</Text>
              <Text style={styles.footerText}>
                Khám phá món ngon và tìm hương vị yêu thích của bạn.
              </Text>
            </View>
          ) : null
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandEmoji}>🍊</Text>
          </View>

          <View style={styles.greetingContent}>
            <Text style={styles.greetingLabel}>
              HÔM NAY BẠN MUỐN ĂN GÌ?
            </Text>
            <Text style={styles.greetingTitle}>
              Chào bạn! 👋
            </Text>
          </View>
        </View>

        <Text style={styles.heading}>
          Món ngon, giao tận nơi
        </Text>
        <Text style={styles.subtitle}>
          Tìm nhà hàng và khám phá món ăn yêu thích.
        </Text>

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm nhà hàng, món ăn..."
            placeholderTextColor="#A1989E"
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
              <Text style={styles.clearButtonText}>×</Text>
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
    backgroundColor: '#FFF9F5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: '#FFF9F5',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandEmoji: {
    fontSize: 25,
  },
  greetingContent: {
    flex: 1,
  },
  greetingLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF6B35',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  greetingTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#29232A',
  },
  heading: {
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.8,
    color: '#29232A',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#8B8289',
    marginTop: 7,
    marginBottom: 20,
  },
  searchContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  searchIcon: {
    fontSize: 28,
    color: '#FF6B35',
    marginRight: 10,
    lineHeight: 32,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    color: '#29232A',
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5EDE7',
  },
  clearButtonText: {
    fontSize: 21,
    color: '#756B72',
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 2,
    paddingBottom: 30,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 16,
  },
  sectionEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FF6B35',
    letterSpacing: 1.3,
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#29232A',
  },
  countBadge: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: '#FFF0E8',
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B35',
  },
  card: {
    marginBottom: 17,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  imageContainer: {
    height: 180,
    backgroundColor: '#F5E6DC',
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
    backgroundColor: '#F9E8DC',
  },
  placeholderEmoji: {
    fontSize: 43,
    marginBottom: 7,
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9C7160',
  },
  imageBadge: {
    position: 'absolute',
    left: 13,
    bottom: 13,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  imageBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF6B35',
  },
  cardBody: {
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 15,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardName: {
    flex: 1,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
    color: '#29232A',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#FFF4D9',
  },
  ratingStar: {
    color: '#E9A323',
    fontSize: 13,
  },
  ratingValue: {
    fontSize: 11,
    fontWeight: '900',
    color: '#75511C',
  },
  cardCuisine: {
    marginTop: 5,
    fontSize: 13,
    color: '#8B8289',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0E8E3',
    marginVertical: 13,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: '#EAF8EF',
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22A06B',
  },
  openBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#168653',
  },
  viewMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewMenuText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF6B35',
  },
  viewMenuArrow: {
    fontSize: 22,
    lineHeight: 23,
    color: '#FF6B35',
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
    borderRadius: 23,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  stateEmoji: {
    fontSize: 45,
    marginBottom: 14,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#29232A',
    textAlign: 'center',
  },
  stateDescription: {
    fontSize: 13,
    color: '#8B8289',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  errorDetails: {
    fontSize: 11,
    color: '#B45309',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 17,
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 23,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 15,
    marginTop: 3,
    borderRadius: 15,
    backgroundColor: '#FFF0E8',
  },
  footerEmoji: {
    fontSize: 21,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: '#9A6046',
  },
});
