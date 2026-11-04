import { useEffect, useMemo, useRef, useState } from 'react';
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
  useWindowDimensions,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { api } from '@/lib/axios';
import { MenuCategory, MenuItem, PublicCategorySummary, RestaurantType } from '@food-delivery/types';
import { useDebounce } from '@/hooks/use-debounce';
import { useCartStore } from '@/store/cart-store';
import { useAuth } from '@/context/auth-context';
import { voucherApi } from '@/lib/vouchers';

function getCategoryEmoji(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('phở') || n.includes('bún') || n.includes('mì') || n.includes('ramen')) return '🍜';
  if (n.includes('cơm') || n.includes('xôi') || n.includes('rice')) return '🍚';
  if (n.includes('gà') || n.includes('chicken') || n.includes('chiên')) return '🍗';
  if (n.includes('burger')) return '🍔';
  if (n.includes('pizza') || n.includes('ý') || n.includes('pasta')) return '🍕';
  if (n.includes('trà') || n.includes('cà phê') || n.includes('coffee') || n.includes('nước') || n.includes('uống') || n.includes('sinh tố') || n.includes('sữa')) return '🧋';
  if (n.includes('bánh') || n.includes('kem') || n.includes('tráng miệng') || n.includes('chè')) return '🍰';
  if (n.includes('sushi') || n.includes('hải sản') || n.includes('cá') || n.includes('tôm')) return '🍣';
  if (n.includes('lẩu') || n.includes('nướng') || n.includes('bbq')) return '🍲';
  if (n.includes('chay') || n.includes('salad') || n.includes('rau')) return '🥗';
  if (n.includes('ăn vặt') || n.includes('khoai')) return '🍟';
  if (n.includes('khai vị')) return '🥟';
  return '🍽️';
}

interface DynamicCategory {
  id: string;
  label: string;
  emoji: string;
  hasProducts: boolean;
  availableCount: number;
  restaurantIds?: string[];
  keywords?: string[];
}

function getDeliveryEstimate(index: number): {
  time: string;
  distance: string;
} {
  const estimates = [
    { time: '15-20 phút', distance: '0.8 km' },
    { time: '20-25 phút', distance: '1.4 km' },
    { time: '15-25 phút', distance: '1.1 km' },
    { time: '25-30 phút', distance: '2.0 km' },
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

  const { data: allRestaurants = [] } = useQuery<RestaurantType[]>({
    queryKey: ['restaurants', ''],
    queryFn: () =>
      api.get<RestaurantType[]>('/restaurants').then((r) => r.data),
  });

  // Kiểm tra voucher thực tế trên hệ thống
  const { data: voucherData } = useQuery({
    queryKey: ['available-vouchers-customer'],
    queryFn: () => voucherApi.available(0).catch(() => null),
  });
  const hasVouchers = (voucherData?.vouchers?.length ?? 0) > 0;

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);
  const { width: windowWidth } = useWindowDimensions();
  // Chiều rộng thực tế của khung carousel (đo bằng onLayout) để mỗi trang khớp đúng 1 slide
  const [measuredBannerWidth, setMeasuredBannerWidth] = useState(0);
  const bannerCardWidth =
    measuredBannerWidth > 0
      ? measuredBannerWidth
      : Math.max(windowWidth - 36, 280);
  // Đang kéo tay thì tạm dừng tự chuyển slide
  const isBannerDraggingRef = useRef(false);
  // Đổi giá trị để khởi động lại bộ đếm tự chuyển sau mỗi lần người dùng lướt
  const [autoplayKey, setAutoplayKey] = useState(0);

  // Danh sách slide bảng tin:
  // - Nếu CÓ VOUCHER: Hiện slide voucher + 3 slide (Món ngon đặt nhiều, Cửa hàng mới mở, Tiệm gần nổi tiếng)
  // - Nếu KHÔNG CÓ VOUCHER: Chỉ hiển thị đúng 3 slide bảng tin
  const bannerSlides = useMemo(() => {
    const defaultSlides = [
      {
        id: 'popular_dishes',
        tag: 'MÓN ĐẶT NHIỀU',
        tagIcon: 'flame' as const,
        tagColor: '#FF6B35',
        title: 'Món ngon nóng sốt\nĐặt nhiều nhất tuần',
        subtitle:
          'Tổng hợp các món khoái khẩu chuẩn vị được thực khách săn đón.',
        ctaText: 'Khám phá ngay',
        ctaIcon: 'restaurant' as const,
        emoji: '🍔',
        miniBadge: '🔥 Top 1',
        bgColor: '#FF6B35',
        shadowColor: '#FF6B35',
        onPress: () => setSelectedCategory('popular'),
      },
      {
        id: 'new_stores',
        tag: 'CỬA HÀNG MỚI MỞ',
        tagIcon: 'sparkles' as const,
        tagColor: '#2563EB',
        title: 'Cửa hàng mới mở\nHương vị mới toanh',
        subtitle:
          'Khám phá ngay những nhà hàng mới mở với thực đơn phong phú hấp dẫn.',
        ctaText: 'Thử quán mới',
        ctaIcon: 'storefront' as const,
        emoji: '🏪',
        miniBadge: '✨ Mới',
        bgColor: '#2563EB',
        shadowColor: '#1D4ED8',
        onPress: () => setSelectedCategory('newest'),
      },
      {
        id: 'top_rated',
        tag: 'TIỆM GẦN NỔI TIẾNG',
        tagIcon: 'star' as const,
        tagColor: '#7C3AED',
        title: 'Tiệm gần nổi tiếng\nĐánh giá 5 sao',
        subtitle:
          'Những quán ngon danh tiếng quanh bạn, chất lượng tuyển chọn.',
        ctaText: 'Xem quán hot',
        ctaIcon: 'trophy' as const,
        emoji: '🍲',
        miniBadge: '⭐ 4.9+',
        bgColor: '#7C3AED',
        shadowColor: '#6D28D9',
        onPress: () => setSelectedCategory('top_rated'),
      },
    ];

    if (hasVouchers) {
      const voucherCount = voucherData?.vouchers?.length ?? 0;
      const voucherSlide = {
        id: 'voucher',
        tag: 'ƯU ĐÃI VOUCHER',
        tagIcon: 'pricetag' as const,
        tagColor: '#EA580C',
        title: 'Săn Voucher xịn\nGiảm sâu hôm nay!',
        subtitle:
          voucherCount > 0
            ? `Có ${voucherCount} mã giảm giá sẵn sàng áp dụng khi thanh toán.`
            : 'Áp mã voucher tại bước thanh toán để nhận ưu đãi hấp dẫn.',
        ctaText: 'Săn Voucher ngay',
        ctaIcon: 'gift' as const,
        emoji: '🎟️',
        miniBadge: '⚡ Giảm sâu',
        bgColor: '#EA580C',
        shadowColor: '#C2410C',
        onPress: () => router.push('/(customer)/(tabs)/cart'),
      };
      return [voucherSlide, ...defaultSlides];
    }

    return defaultSlides;
  }, [hasVouchers, voucherData]);

  // Đảm bảo index không vượt quá độ dài khi số lượng slide thay đổi
  useEffect(() => {
    if (activeSlideIndex >= bannerSlides.length) {
      setActiveSlideIndex(0);
      bannerScrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [bannerSlides.length, activeSlideIndex]);

  // Tự động chuyển slide sau 4.5 giây kể từ lần chuyển gần nhất.
  // Bộ đếm được đặt lại mỗi khi slide thay đổi hoặc người dùng vừa lướt tay,
  // nên không còn bị giật/nhảy slide ngay khi đang lướt.
  useEffect(() => {
    if (bannerSlides.length <= 1) return;
    const timer = setTimeout(() => {
      if (isBannerDraggingRef.current) return;
      const nextIndex = (activeSlideIndex + 1) % bannerSlides.length;
      bannerScrollRef.current?.scrollTo({
        x: nextIndex * bannerCardWidth,
        animated: true,
      });
      setActiveSlideIndex(nextIndex);
    }, 4500);

    return () => clearTimeout(timer);
  }, [activeSlideIndex, autoplayKey, bannerSlides.length, bannerCardWidth]);

  const goToSlide = (idx: number) => {
    setActiveSlideIndex(idx);
    setAutoplayKey((k) => k + 1);
    bannerScrollRef.current?.scrollTo({
      x: idx * bannerCardWidth,
      animated: true,
    });
  };

  const handleBannerScrollEnd = (x: number) => {
    isBannerDraggingRef.current = false;
    const idx = Math.round(x / bannerCardWidth);
    if (idx >= 0 && idx < bannerSlides.length) {
      setActiveSlideIndex(idx);
    }
    setAutoplayKey((k) => k + 1);
  };

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

  // 1. Lấy danh mục thực tế do các nhà hàng tạo ra từ backend
  const { data: serverCategories = [] } = useQuery<PublicCategorySummary[]>({
    queryKey: ['public-menu-categories'],
    queryFn: () =>
      api
        .get<PublicCategorySummary[]>('/menu/categories')
        .then((r) => r.data)
        .catch(() => []),
  });

  // 2. Dự phòng: nếu backend chưa có route thì tổng hợp danh mục từ các quán đã tải
  const { data: fallbackCategories = [] } = useQuery({
    queryKey: [
      'fallback-restaurant-categories',
      allRestaurants.map((r) => r.id).sort().join(','),
    ],
    queryFn: async () => {
      if (allRestaurants.length === 0) return [];
      const map = new Map<
        string,
        { name: string; restaurantIds: Set<string>; availableCount: number }
      >();

      await Promise.all(
        allRestaurants.map(async (r) => {
          try {
            const [catRes, itemsRes] = await Promise.all([
              api.get<MenuCategory[]>(`/menu/categories/${r.id}`),
              api.get<MenuItem[]>(`/menu/items/${r.id}`),
            ]);
            const availableItems = (itemsRes.data || []).filter(
              (i) => i.isAvailable,
            );
            for (const cat of catRes.data || []) {
              const name = (cat.name || '').trim();
              if (!name) continue;
              const key = name.toLowerCase();
              if (!map.has(key)) {
                map.set(key, {
                  name,
                  restaurantIds: new Set<string>(),
                  availableCount: 0,
                });
              }
              const group = map.get(key)!;
              const matchingCount = availableItems.filter(
                (i) => i.categoryId === cat.id,
              ).length;
              if (matchingCount > 0) {
                group.restaurantIds.add(r.id);
                group.availableCount += matchingCount;
              }
            }
          } catch {}
        }),
      );

      return Array.from(map.values()).map((v) => ({
        id: v.name,
        name: v.name,
        restaurantIds: Array.from(v.restaurantIds),
        categoryIds: [],
        totalItems: v.availableCount,
        availableItems: v.availableCount,
        hasProducts: v.availableCount > 0,
      }));
    },
    enabled: serverCategories.length === 0 && allRestaurants.length > 0,
  });

  // 3. Danh sách danh mục dựa trên thực đơn các nhà hàng tạo ra
  const categoryList = useMemo<DynamicCategory[]>(() => {
    const rawList =
      serverCategories.length > 0 ? serverCategories : fallbackCategories;

    const list: DynamicCategory[] = [
      {
        id: 'all',
        label: 'Tất cả',
        emoji: '🍽️',
        hasProducts: restaurants.length > 0,
        availableCount: restaurants.length,
      },
    ];

    if (rawList.length > 0) {
      for (const cat of rawList) {
        list.push({
          id: cat.name,
          label: cat.name,
          emoji: getCategoryEmoji(cat.name),
          restaurantIds: cat.restaurantIds,
          hasProducts: cat.hasProducts ?? (cat.availableItems > 0),
          availableCount: cat.availableItems ?? 0,
        });
      }
    } else {
      // Mặc định khi chưa có nhà hàng nào tạo danh mục trong database
      list.push(
        {
          id: 'viet',
          label: 'Món Việt',
          emoji: '🍜',
          hasProducts: true,
          availableCount: 1,
          keywords: ['việt', 'phở', 'bún', 'cơm', 'bánh mì', 'vietnamese'],
        },
        {
          id: 'fastfood',
          label: 'Burger & Gà',
          emoji: '🍔',
          hasProducts: true,
          availableCount: 1,
          keywords: ['burger', 'gà', 'chicken', 'fast', 'kfc'],
        },
        {
          id: 'pizza',
          label: 'Pizza & Ý',
          emoji: '🍕',
          hasProducts: true,
          availableCount: 1,
          keywords: ['pizza', 'ý', 'italian', 'pasta'],
        },
        {
          id: 'drink',
          label: 'Đồ uống',
          emoji: '🧋',
          hasProducts: true,
          availableCount: 1,
          keywords: ['trà', 'cà phê', 'coffee', 'tea', 'drink'],
        },
      );
    }

    list.push({
      id: 'top_rated',
      label: 'Đánh giá cao',
      emoji: '⭐',
      hasProducts: restaurants.length > 0,
      availableCount: restaurants.length,
    });

    return list;
  }, [serverCategories, fallbackCategories, restaurants]);

  const activeCategory = useMemo(() => {
    return categoryList.find((c) => c.id === selectedCategory);
  }, [categoryList, selectedCategory]);

  const filteredRestaurants = useMemo(() => {
    if (selectedCategory === 'all') return restaurants;

    if (selectedCategory === 'top_rated' || selectedCategory === 'popular') {
      return [...restaurants].sort(
        (a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0),
      );
    }

    if (selectedCategory === 'newest') {
      return [...restaurants].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      );
    }

    if (!activeCategory) return restaurants;

    // Nếu nhấp vào danh mục không còn sản phẩm: trả về rỗng để hiển thị thông báo
    if (!activeCategory.hasProducts || activeCategory.availableCount === 0) {
      return [];
    }

    // Nếu có danh sách quán thuộc danh mục:
    if (activeCategory.restaurantIds && activeCategory.restaurantIds.length > 0) {
      return restaurants.filter((r) =>
        activeCategory.restaurantIds!.includes(r.id),
      );
    }

    // Nếu là fallback theo keywords:
    if (activeCategory.keywords && activeCategory.keywords.length > 0) {
      return restaurants.filter((r) => {
        const haystack =
          `${r.name ?? ''} ${r.cuisineType ?? ''} ${r.description ?? ''}`.toLowerCase();
        return activeCategory.keywords!.some((kw) => haystack.includes(kw));
      });
    }

    const catNameLower = activeCategory.label.toLowerCase();
    return restaurants.filter((r) => {
      const haystack =
        `${r.name ?? ''} ${r.cuisineType ?? ''} ${r.description ?? ''}`.toLowerCase();
      return haystack.includes(catNameLower);
    });
  }, [restaurants, selectedCategory, activeCategory]);

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
        {/* Bảng tin Banner Carousel */}
        <View
          style={styles.carouselWrapper}
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && w !== measuredBannerWidth) {
              setMeasuredBannerWidth(w);
            }
          }}
        >
          <ScrollView
            ref={bannerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            decelerationRate="fast"
            bounces={false}
            overScrollMode="never"
            contentContainerStyle={styles.carouselScrollContent}
            onScrollBeginDrag={() => {
              isBannerDraggingRef.current = true;
            }}
            onMomentumScrollEnd={(e) => {
              handleBannerScrollEnd(e.nativeEvent.contentOffset.x);
            }}
          >
            {bannerSlides.map((slide) => (
              <View
                key={slide.id}
                style={[
                  styles.promoBanner,
                  {
                    width: bannerCardWidth,
                    backgroundColor: slide.bgColor,
                    shadowColor: slide.shadowColor,
                  },
                ]}
              >
                <View style={styles.promoLeft}>
                  <View style={styles.promoTag}>
                    <Ionicons
                      name={slide.tagIcon}
                      size={13}
                      color={slide.tagColor}
                    />
                    <Text
                      style={[
                        styles.promoTagText,
                        { color: slide.tagColor },
                      ]}
                    >
                      {slide.tag}
                    </Text>
                  </View>

                  <Text style={styles.promoTitle}>{slide.title}</Text>
                  <Text style={styles.promoSubtitle}>{slide.subtitle}</Text>

                  <View style={styles.promoActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.promoCta,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={slide.onPress}
                    >
                      <Ionicons
                        name={slide.ctaIcon}
                        size={14}
                        color={slide.tagColor}
                      />
                      <Text
                        style={[
                          styles.promoCtaText,
                          { color: slide.tagColor },
                        ]}
                      >
                        {slide.ctaText}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.promoVisual}>
                  <View style={styles.promoCircle}>
                    <Text style={styles.promoEmoji}>{slide.emoji}</Text>
                  </View>
                  <View style={styles.promoMiniBadge}>
                    <Text style={styles.promoMiniText}>{slide.miniBadge}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Dấu chấm chuyển trang (Pagination Dots) */}
          <View style={styles.dotsContainer}>
            {bannerSlides.map((slide, idx) => {
              const active = idx === activeSlideIndex;
              return (
                <Pressable
                  key={slide.id}
                  onPress={() => goToSlide(idx)}
                  hitSlop={8}
                  style={[
                    styles.dotItem,
                    active && [
                      styles.dotItemActive,
                      {
                        backgroundColor:
                          bannerSlides[
                            Math.min(activeSlideIndex, bannerSlides.length - 1)
                          ]?.bgColor || '#FF6B35',
                      },
                    ],
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* Cam kết dịch vụ giao đồ ăn */}
        <View style={styles.perksBar}>
          <View style={styles.perkItem}>
            <Ionicons name="flash" size={14} color="#FF6B35" />
            <Text style={styles.perkText} numberOfLines={1}>
              Giao nhanh 20p
            </Text>
          </View>
          <View style={styles.perkDivider} />
          <View style={styles.perkItem}>
            <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
            <Text style={styles.perkText} numberOfLines={1}>
              Quán tuyển chọn
            </Text>
          </View>
          <View style={styles.perkDivider} />
          <View style={styles.perkItem}>
            <Ionicons
              name={hasVouchers ? 'pricetag' : 'sparkles'}
              size={14}
              color={hasVouchers ? '#F59E0B' : '#3B82F6'}
            />
            <Text style={styles.perkText} numberOfLines={1}>
              {hasVouchers ? 'Nhiều voucher' : 'Món ngon mỗi ngày'}
            </Text>
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
            {categoryList.map((cat) => {
              const active = selectedCategory === cat.id;
              const isOutOfStock =
                !cat.hasProducts ||
                (cat.id !== 'all' && cat.id !== 'top_rated' && cat.availableCount === 0);

              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[
                    styles.categoryChip,
                    active && styles.categoryChipActive,
                    isOutOfStock && styles.categoryChipOutOfStock,
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
                    numberOfLines={1}
                  >
                    {cat.label}
                  </Text>
                  {isOutOfStock ? (
                    <View style={styles.stockBadgeEmpty}>
                      <Text style={styles.stockBadgeEmptyText}>Hết món</Text>
                    </View>
                  ) : cat.id !== 'all' && cat.id !== 'top_rated' && cat.availableCount > 0 ? (
                    <View style={[styles.stockBadge, active && styles.stockBadgeActive]}>
                      <Text style={[styles.stockBadgeText, active && styles.stockBadgeTextActive]}>
                        {cat.availableCount} món
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Tiêu đề danh sách nhà hàng */}
        {filteredRestaurants.length > 0 && (
          <View style={styles.listSectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                {selectedCategory === 'top_rated'
                  ? 'TIỆM GẦN NỔI TIẾNG'
                  : selectedCategory === 'newest'
                  ? 'CỬA HÀNG MỚI MỞ'
                  : selectedCategory === 'popular'
                  ? 'MÓN NGON ĐẶT NHIỀU'
                  : 'QUÁN NGON QUANH BẠN'}
              </Text>
              <Text style={styles.sectionTitle}>
                {selectedCategory === 'top_rated'
                  ? 'Nhà hàng được đánh giá cao'
                  : selectedCategory === 'newest'
                  ? 'Những quán mới mở gần đây'
                  : selectedCategory === 'popular'
                  ? 'Quán bán chạy & được yêu thích'
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
        <ScrollView
          contentContainerStyle={styles.centered}
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
        >
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
          <Text style={styles.stateTitle}>Đang tìm quán ngon gần bạn</Text>
          <Text style={styles.stateDescription}>
            Chờ một chút, hàng loạt món ngon sắp hiện ra!
          </Text>
        </ScrollView>
      );
    }

    if (isError) {
      return (
        <ScrollView
          contentContainerStyle={styles.centered}
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
        >
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
        </ScrollView>
      );
    }

    return (
      <FlatList
        data={filteredRestaurants}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.listContent,
          filteredRestaurants.length === 0 && styles.emptyListContent,
          cartTotalItems > 0 && { paddingBottom: 105 },
        ]}
        refreshing={isFetching && !isLoading}
        onRefresh={() => refetch()}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={
          <View>
            <View style={styles.emptyCard}>
              <Text style={styles.stateEmoji}>🍽️</Text>
              <Text style={styles.stateTitle}>
                {activeCategory && !activeCategory.hasProducts
                  ? 'Không còn sản phẩm'
                  : 'Không tìm thấy sản phẩm'}
              </Text>
              <Text style={styles.stateDescription}>
                {activeCategory && !activeCategory.hasProducts
                  ? `Danh mục "${activeCategory.label}" hiện không còn sản phẩm khả dụng. Mời bạn tham khảo món khác!`
                  : selectedCategory !== 'all'
                  ? `Không tìm thấy sản phẩm trong danh mục "${activeCategory?.label || ''}". Mời bạn tham khảo món khác!`
                  : 'Không tìm thấy sản phẩm, mời bạn tham khảo món khác'}
              </Text>
              {(search.length > 0 || selectedCategory !== 'all') && (
                <Pressable
                  onPress={() => {
                    setSearch('');
                    setSelectedCategory('all');
                  }}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>
                    Tham khảo món khác
                  </Text>
                </Pressable>
              )}
            </View>

            {allRestaurants.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <View style={styles.listSectionHeader}>
                  <View>
                    <Text style={styles.sectionEyebrow}>GỢI Ý CHO BẠN</Text>
                    <Text style={styles.sectionTitle}>
                      Mời bạn tham khảo món khác
                    </Text>
                  </View>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>
                      {allRestaurants.length} quán
                    </Text>
                  </View>
                </View>

                {allRestaurants.map((item, index) => {
                  const deliveryInfo = getDeliveryEstimate(index);
                  const isOpen = item.isOpen !== false;
                  const ratingNum = Number(item.rating ?? 0);

                  return (
                    <Pressable
                      key={String(item.id)}
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

                        <View style={styles.promoBadgeOverlay}>
                          <Ionicons name="flash" size={12} color="#FFFFFF" />
                          <Text style={styles.promoBadgeText}>Đề xuất</Text>
                        </View>

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

                          {ratingNum > 0 ? (
                            <View style={styles.ratingBadge}>
                              <Ionicons name="star" size={13} color="#F59E0B" />
                              <Text style={styles.ratingValue}>
                                {ratingNum.toFixed(1)}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.metaRow}>
                          <View style={styles.cuisinePill}>
                            <Text
                              style={styles.cuisinePillText}
                              numberOfLines={1}
                            >
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
                              <Text
                                style={styles.addressPreviewText}
                                numberOfLines={1}
                              >
                                {item.address}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.cardDivider} />

                        <View style={styles.cardFooter}>
                          {hasVouchers ? (
                            <View style={styles.freeshipTag}>
                              <Ionicons
                                name="pricetag-outline"
                                size={13}
                                color="#168653"
                              />
                              <Text style={styles.freeshipTagText}>
                                Có mã giảm giá
                              </Text>
                            </View>
                          ) : <View />}

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
                })}
              </View>
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

                  {ratingNum > 0 ? (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.ratingValue}>
                        {ratingNum.toFixed(1)}
                      </Text>
                    </View>
                  ) : null}
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
                  {hasVouchers ? (
                    <View style={styles.freeshipTag}>
                      <Ionicons
                        name="pricetag-outline"
                        size={13}
                        color="#168653"
                      />
                      <Text style={styles.freeshipTagText}>
                        Có mã giảm giá
                      </Text>
                    </View>
                  ) : <View />}

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
  carouselWrapper: {
    marginBottom: 14,
  },
  carouselScrollContent: {
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dotItem: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5DCD6',
  },
  dotItemActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
  },
  promoBannerNewStores: {
    backgroundColor: '#3B82F6',
    shadowColor: '#2563EB',
  },
  promoTagNewStores: {
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
  promoTagNewStoresText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 0.6,
  },
  promoBanner: {
    backgroundColor: '#FF6B35',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
    overflow: 'hidden',
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
    paddingHorizontal: 10,
    marginBottom: 18,
  },
  perkItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 0,
  },
  perkText: {
    flexShrink: 1,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#4B4248',
  },
  perkDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#EDE2DA',
    marginHorizontal: 4,
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
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E6DF',
    gap: 5,
  },
  categoryChipOutOfStock: {
    backgroundColor: '#FAF5F2',
    borderColor: '#F5E4DC',
  },
  stockBadge: {
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  stockBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  stockBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FF6B35',
  },
  stockBadgeTextActive: {
    color: '#FFFFFF',
  },
  stockBadgeEmpty: {
    backgroundColor: '#FDECEC',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  stockBadgeEmptyText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E5484D',
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
    flexGrow: 1,
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
