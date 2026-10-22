
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
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = [
  { name: 'All', icon: 'grid-outline' as const },
  { name: 'Burger', icon: 'fast-food-outline' as const },
  { name: 'Pizza', icon: 'pizza-outline' as const },
  { name: 'Drinks', icon: 'cafe-outline' as const },
  { name: 'Dessert', icon: 'ice-cream-outline' as const },
];

export default function CustomerSearchScreen() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>DISCOVER DELICIOUS FOOD</Text>
            <Text style={styles.title}>
              Find your <Text style={styles.titleAccent}>favorite</Text>
            </Text>
            <Text style={styles.subtitle}>
              What would you like to eat today?
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="fast-food" size={27} color="#FF6B35" />
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={22} color="#99929A" />

          <TextInput
            style={styles.searchInput}
            placeholder="Search dishes, restaurants..."
            placeholderTextColor="#AAA4AA"
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

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <Text style={styles.sectionHint}>Explore by taste</Text>
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
                  color={active ? '#FFFFFF' : '#8B8289'}
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

        {/* Featured section */}
        <View style={styles.featuredCard}>
          <View style={styles.featuredContent}>
            <View style={styles.featuredBadge}>
              <Ionicons name="flame" size={13} color="#FF6B35" />
              <Text style={styles.featuredBadgeText}>FOOD DISCOVERY</Text>
            </View>

            <Text style={styles.featuredTitle}>
              Craving something{'\n'}delicious?
            </Text>

            <Text style={styles.featuredSubtitle}>
              Search and find your next favorite meal.
            </Text>

            <Pressable
              style={styles.exploreButton}
              onPress={() => {
                // Search UI only; connect to your menu API when ready.
              }}
            >
              <Text style={styles.exploreButtonText}>Explore food</Text>
              <Ionicons
                name="arrow-forward"
                size={16}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          <View style={styles.featuredIllustration}>
            <Ionicons name="restaurant" size={56} color="#FF6B35" />
            <View style={styles.illustrationDot} />
            <View style={styles.illustrationDotSmall} />
          </View>
        </View>

        {/* Results placeholder */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {search.trim() ? 'Search results' : 'Popular near you'}
          </Text>
          <Ionicons name="sparkles-outline" size={19} color="#FF6B35" />
        </View>

        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="restaurant-outline"
              size={30}
              color="#FF6B35"
            />
          </View>

          <Text style={styles.emptyTitle}>
            {search.trim()
              ? 'Ready to find your food?'
              : 'Your next meal awaits'}
          </Text>

          <Text style={styles.emptySubtitle}>
            {search.trim()
              ? `You searched for "${search}". Connect your menu API to display matching dishes.`
              : 'Connect your menu API to discover dishes and restaurants.'}
          </Text>
        </View>

        <View style={styles.bottomNote}>
          <Ionicons name="heart" size={13} color="#FF6B35" />
          <Text style={styles.bottomNoteText}>
            Made with love for food lovers
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  greeting: {
    color: '#FF6B35',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 9,
  },
  title: {
    color: '#29232A',
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  titleAccent: {
    color: '#FF6B35',
  },
  subtitle: {
    color: '#8B8289',
    fontSize: 12,
    marginTop: 8,
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFEEE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    height: 57,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 11,
    marginBottom: 30,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#29232A',
    height: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#29232A',
  },
  sectionHint: {
    color: '#A49AA0',
    fontSize: 11,
  },
  categoryList: {
    gap: 11,
    paddingBottom: 30,
  },
  categoryItem: {
    width: 78,
    height: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  categoryItemActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B8289',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  featuredCard: {
    minHeight: 210,
    backgroundColor: '#FFF0E7',
    borderRadius: 24,
    padding: 20,
    marginBottom: 30,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  featuredContent: {
    flex: 1,
    zIndex: 1,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  featuredBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FF6B35',
    letterSpacing: 0.6,
  },
  featuredTitle: {
    color: '#29232A',
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 27,
    letterSpacing: -0.4,
  },
  featuredSubtitle: {
    color: '#8B8289',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 7,
    maxWidth: 190,
  },
  exploreButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginTop: 14,
  },
  exploreButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  featuredIllustration: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -5,
  },
  illustrationDot: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: '#FFD0B8',
    right: -30,
    top: 3,
  },
  illustrationDotSmall: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#FFB38E',
    top: 4,
    left: 8,
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
    fontSize: 15,
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
  bottomNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 25,
  },
  bottomNoteText: {
    fontSize: 10,
    color: '#A49AA0',
  },
});
