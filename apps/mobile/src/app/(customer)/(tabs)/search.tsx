import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
];

export default function CustomerSearchScreen() {
  const { tr } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BURGER_COLORS.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
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
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={BURGER_COLORS.muted} />

          <TextInput
            style={styles.searchInput}
            placeholder={tr('Tìm món ăn, nhà hàng...', 'Search dishes, restaurants...')}
            placeholderTextColor={BURGER_COLORS.faint}
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

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{tr('Danh mục', 'Categories')}</Text>
          <Text style={styles.sectionHint}>
            {tr('Khám phá theo khẩu vị', 'Explore by taste')}
          </Text>
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
                  color={active ? '#FFFFFF' : BURGER_COLORS.muted}
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
          </View>

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
    paddingHorizontal: 18,
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
  },
  titleAccent: {
    color: BURGER_COLORS.primary,
  },
  subtitle: {
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
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: BURGER_COLORS.text,
    height: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  sectionHint: {
    color: BURGER_COLORS.muted,
    fontSize: 12,
  },
  categoryList: {
    gap: 10,
    paddingBottom: 22,
  },
  categoryItem: {
    minWidth: 82,
    height: 82,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    backgroundColor: BURGER_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  categoryItemActive: {
    backgroundColor: BURGER_COLORS.primary,
    borderColor: BURGER_COLORS.primary,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: BURGER_COLORS.muted,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
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
  },
  exploreButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
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
    color: BURGER_COLORS.text,
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
});
