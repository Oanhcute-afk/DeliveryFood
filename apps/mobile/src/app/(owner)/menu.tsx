import { useState } from 'react';
import { openSettings } from 'expo-linking';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/axios';
import { useImageUploader } from '@/lib/uploadthing';
import { MenuCategory, MenuItem, RestaurantType } from '@food-delivery/types';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

const COLORS = {
  background: BURGER_COLORS.background,
  surface: BURGER_COLORS.surface,
  primary: BURGER_COLORS.primary,
  primaryLight: BURGER_COLORS.primaryLight,
  text: BURGER_COLORS.text,
  muted: BURGER_COLORS.muted,
  border: BURGER_COLORS.border,
  green: BURGER_COLORS.success,
  greenLight: BURGER_COLORS.successLight,
  red: BURGER_COLORS.danger,
  redLight: BURGER_COLORS.dangerLight,
};

export default function OwnerMenuScreen() {
  const { tr } = useLanguage();
  const queryClient = useQueryClient();

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemImageUrl, setNewItemImageUrl] = useState<string | null>(null);

  const {
    data: restaurant,
    isPending: restaurantPending,
    isFetching: restaurantFetching,
  } = useQuery<RestaurantType | null>({
    queryKey: ['my-restaurant'],
    queryFn: () =>
      api.get<RestaurantType | null>('/restaurants/mine').then((r) => r.data),
  });

  const {
    data: categories = [],
    isPending: categoriesPending,
    isFetching: categoriesFetching,
  } = useQuery<MenuCategory[]>({
    queryKey: ['categories', restaurant?.id],
    queryFn: () =>
      api
        .get<MenuCategory[]>(`/menu/categories/${restaurant?.id}`)
        .then((r) => r.data),
    enabled: !!restaurant?.id,
  });

  const restaurantLoading = restaurantPending || restaurantFetching;
  const categoriesLoading =
    !!restaurant?.id && (categoriesPending || categoriesFetching);

  const { data: items = [], isPending: itemsPending } = useQuery<MenuItem[]>({
    queryKey: ['menu-items', restaurant?.id],
    queryFn: () =>
      api.get<MenuItem[]>(`/menu/items/${restaurant?.id}`).then((r) => r.data),
    enabled: !!restaurant?.id,
  });

  const { mutate: addCategory, isPending: addingCategory } = useMutation({
    mutationFn: (name: string) => api.post('/menu/categories', { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['categories', restaurant?.id],
      });
      setNewCategoryName('');
      setShowAddCategory(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        tr('Không thể tạo danh mục', 'Unable to create category'),
        e.response?.data?.message ?? tr('Vui lòng thử lại.', 'Please try again.'),
      );
    },
  });

  const { mutate: deleteCategory, isPending: deletingCategory } = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/categories/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['categories', restaurant?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ['menu-items', restaurant?.id],
      });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        tr('Không thể xóa danh mục', 'Unable to delete category'),
        e.response?.data?.message ?? tr('Vui lòng thử lại.', 'Please try again.'),
      );
    },
  });

  function handleAddCategory() {
    const name = newCategoryName.trim();

    if (!name) {
      Alert.alert(
        tr('Thiếu thông tin', 'Missing information'),
        tr('Vui lòng nhập tên danh mục.', 'Please enter a category name.'),
      );
      return;
    }

    addCategory(name);
  }

  const {
    openImagePicker: openItemImagePicker,
    isUploading: uploadingItemImage,
  } = useImageUploader('menuItemImage', {
    onClientUploadComplete: (res) => {
      setNewItemImageUrl(res[0].ufsUrl);
    },
    onUploadError: (error) => {
      Alert.alert(tr('Tải ảnh thất bại', 'Upload failed'), error.message);
    },
  });

  const { mutate: addItem, isPending: addingItem } = useMutation({
    mutationFn: () =>
      api.post('/menu/items', {
        categoryId: selectedCategoryId,
        name: newItemName.trim(),
        price: newItemPrice.trim(),
        imageUrl: newItemImageUrl,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['menu-items', restaurant?.id],
      });
      setNewItemName('');
      setNewItemPrice('');
      setNewItemImageUrl(null);
      setShowAddItem(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        tr('Không thể tạo món ăn', 'Unable to create item'),
        e.response?.data?.message ?? tr('Vui lòng thử lại.', 'Please try again.'),
      );
    },
  });

  const { mutate: toggleAvailability } = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      api.patch(`/menu/items/${id}`, { isAvailable }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['menu-items', restaurant?.id],
      }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        tr('Không thể cập nhật trạng thái', 'Unable to update status'),
        e.response?.data?.message ?? tr('Vui lòng thử lại.', 'Please try again.'),
      );
    },
  });

  function handleAddItem() {
    const name = newItemName.trim();
    const price = newItemPrice.trim();
    const numericPrice = Number(price);

    if (!name || !price) {
      Alert.alert(
        tr('Thiếu thông tin', 'Missing information'),
        tr('Vui lòng nhập tên món và giá.', 'Please enter dish name and price.'),
      );
      return;
    }

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      Alert.alert(
        tr('Giá không hợp lệ', 'Invalid price'),
        tr('Vui lòng nhập giá lớn hơn 0.', 'Please enter a price greater than 0.'),
      );
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert(
        tr('Chưa chọn danh mục', 'No category selected'),
        tr('Vui lòng chọn danh mục cho món ăn.', 'Please select a category for the dish.'),
      );
      return;
    }

    addItem();
  }

  function closeAddItemModal() {
    setShowAddItem(false);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemImageUrl(null);
  }

  const { mutate: deleteItem } = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/items/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['menu-items', restaurant?.id],
      }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        tr('Không thể xóa món ăn', 'Unable to delete item'),
        e.response?.data?.message ?? tr('Vui lòng thử lại.', 'Please try again.'),
      );
    },
  });

  function confirmDeleteCategory(category: MenuCategory) {
    Alert.alert(
      tr('Xóa danh mục?', 'Delete category?'),
      tr(
        `Danh mục "${category.name}" và các món thuộc danh mục này sẽ bị xóa.`,
        `Category "${category.name}" and all its items will be deleted.`,
      ),
      [
        { text: tr('Hủy', 'Cancel'), style: 'cancel' },
        {
          text: tr('Xóa danh mục', 'Delete'),
          style: 'destructive',
          onPress: () => deleteCategory(category.id),
        },
      ],
    );
  }

  function confirmDeleteItem(item: MenuItem) {
    Alert.alert(
      tr('Xóa món ăn?', 'Delete dish?'),
      tr(
        `Bạn có muốn xóa "${item.name}" không?`,
        `Are you sure you want to delete "${item.name}"?`,
      ),
      [
        { text: tr('Hủy', 'Cancel'), style: 'cancel' },
        {
          text: tr('Xóa món', 'Delete'),
          style: 'destructive',
          onPress: () => deleteItem(item.id),
        },
      ],
    );
  }

  if (restaurantLoading || categoriesLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {tr('Đang tải thực đơn...', 'Loading menu...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyEmoji}>🍔</Text>
          </View>
          <Text style={styles.emptyTitle}>
            {tr('Bạn chưa có nhà hàng', 'No restaurant found')}
          </Text>
          <Text style={styles.emptyText}>
            {tr(
              'Hãy tạo nhà hàng trước khi bắt đầu quản lý thực đơn.',
              'Please create your restaurant before managing the menu.',
            )}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalAvailable = items.filter(
    (item) => item.isAvailable !== false,
  ).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.pageHeader}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>
                  {tr('QUẢN LÝ NHÀ HÀNG', 'MENU MANAGEMENT')}
                </Text>
                <Text style={styles.pageTitle}>
                  {tr('Thực đơn của bạn', 'Your Menu')}
                </Text>
                <Text style={styles.pageSubtitle}>
                  {tr(
                    'Quản lý danh mục, món ăn và tình trạng phục vụ.',
                    'Manage categories, dishes, and availability.',
                  )}
                </Text>
              </View>

              <LanguageSwitch />
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Text style={styles.summaryEmoji}>📋</Text>
              </View>

              <View style={styles.summaryInfo}>
                <Text style={styles.summaryTitle}>
                  {tr('Tổng quan thực đơn', 'Menu Overview')}
                </Text>
                <Text style={styles.summarySubtitle}>
                  {tr(
                    `${categories.length} danh mục · ${items.length} món ăn`,
                    `${categories.length} categories · ${items.length} dishes`,
                  )}
                </Text>
              </View>

              <View style={styles.availableBadge}>
                <Text style={styles.availableNumber}>{totalAvailable}</Text>
                <Text style={styles.availableLabel}>
                  {tr('Đang bán', 'Available')}
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.addCategoryButton,
                pressed && styles.pressed,
              ]}
              onPress={() => setShowAddCategory(true)}
            >
              <Text style={styles.addCategoryIcon}>＋</Text>
              <Text style={styles.addCategoryText}>
                {tr('Thêm danh mục mới', 'Add New Category')}
              </Text>
            </Pressable>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  {tr('Danh mục món ăn', 'Menu Categories')}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {tr(
                    'Chọn trạng thái để quản lý món đang bán',
                    'Toggle switches to manage dish availability',
                  )}
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{categories.length}</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyEmoji}>🍔</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {tr('Chưa có danh mục nào', 'No categories yet')}
            </Text>
            <Text style={styles.emptyText}>
              {tr(
                'Tạo danh mục đầu tiên để bắt đầu thêm món vào thực đơn.',
                'Create your first category to start adding dishes.',
              )}
            </Text>
          </View>
        }
        renderItem={({ item: category }) => {
          const categoryItems = items.filter(
            (menuItem) => menuItem.categoryId === category.id,
          );

          return (
            <View style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryHeading}>
                  <View style={styles.categoryIcon}>
                    <Text style={styles.categoryIconText}>🍴</Text>
                  </View>

                  <View style={styles.categoryTitleContent}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryCount}>
                      {categoryItems.length} {tr('món ăn', 'dishes')}
                    </Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={deletingCategory}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.deleteIconButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => confirmDeleteCategory(category)}
                >
                  <Text style={styles.deleteIcon}>×</Text>
                </Pressable>
              </View>

              {categoryItems.length === 0 ? (
                <View style={styles.categoryEmpty}>
                  <Text style={styles.categoryEmptyText}>
                    {tr(
                      'Chưa có món ăn trong danh mục này.',
                      'No dishes in this category yet.',
                    )}
                  </Text>
                </View>
              ) : (
                categoryItems.map((item) => {
                  const isAvailable = item.isAvailable !== false;

                  return (
                    <View key={item.id} style={styles.itemCard}>
                      {item.imageUrl ? (
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={[
                            styles.itemThumb,
                            !isAvailable && styles.unavailableImage,
                          ]}
                        />
                      ) : (
                        <View style={styles.itemThumbPlaceholder}>
                          <Text style={styles.itemPlaceholderEmoji}>🍔</Text>
                        </View>
                      )}

                      <View style={styles.itemInfo}>
                        <Text
                          style={[
                            styles.itemName,
                            !isAvailable && styles.unavailableText,
                          ]}
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>

                        <Text style={styles.itemPrice}>
                          ${Number(item.price).toFixed(2)}
                        </Text>

                        <View
                          style={[
                            styles.itemStatusBadge,
                            isAvailable
                              ? styles.itemStatusAvailable
                              : styles.itemStatusUnavailable,
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              {
                                backgroundColor: isAvailable
                                  ? COLORS.green
                                  : COLORS.red,
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.itemStatusText,
                              {
                                color: isAvailable ? COLORS.green : COLORS.red,
                              },
                            ]}
                          >
                            {isAvailable
                              ? tr('Đang bán', 'Available')
                              : tr('Tạm hết', 'Sold out')}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.itemActions}>
                        <Switch
                          value={isAvailable}
                          onValueChange={(value) =>
                            toggleAvailability({
                              id: item.id,
                              isAvailable: value,
                            })
                          }
                          trackColor={{
                            false: COLORS.border,
                            true: COLORS.greenLight,
                          }}
                          thumbColor={isAvailable ? COLORS.green : '#FFFFFF'}
                        />

                        <Pressable
                          accessibilityRole="button"
                          hitSlop={8}
                          style={({ pressed }) => [
                            styles.deleteItemButton,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => confirmDeleteItem(item)}
                        >
                          <Text style={styles.deleteItemText}>
                            {tr('Xóa món', 'Delete')}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.addItemButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setSelectedCategoryId(category.id);
                  setShowAddItem(true);
                }}
              >
                <Text style={styles.addItemPlus}>＋</Text>
                <Text style={styles.addItemText}>
                  {tr('Thêm món vào danh mục', 'Add dish to category')}
                </Text>
              </Pressable>
            </View>
          );
        }}
        ListFooterComponent={
          itemsPending ? (
            <ActivityIndicator
              color={COLORS.primary}
              style={styles.itemsLoading}
            />
          ) : (
            <View style={styles.bottomSpace} />
          )
        }
      />

      {/* Modal tạo danh mục */}
      <Modal
        visible={showAddCategory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCategory(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowAddCategory(false)}
          />

          <View style={styles.modal}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Text style={styles.modalEmoji}>🗂️</Text>
              </View>

              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>
                  {tr('Danh mục mới', 'New Category')}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {tr('Nhóm các món ăn theo loại', 'Group your dishes by type')}
                </Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>
              {tr('Tên danh mục', 'Category Name')}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={tr('Ví dụ: Burger bò, Đồ uống...', 'e.g. Beef Burgers, Drinks...')}
              placeholderTextColor={BURGER_COLORS.faint}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={handleAddCategory}
            />

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                (addingCategory || !newCategoryName.trim()) &&
                  styles.disabledButton,
              ]}
              onPress={handleAddCategory}
              disabled={addingCategory || !newCategoryName.trim()}
            >
              {addingCategory ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {tr('Tạo danh mục', 'Create Category')}
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setShowAddCategory(false)}
            >
              <Text style={styles.cancelText}>{tr('Hủy', 'Cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal tạo món ăn */}
      <Modal
        visible={showAddItem}
        transparent
        animationType="slide"
        onRequestClose={closeAddItemModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeAddItemModal}
          />

          <View style={[styles.modal, styles.itemModal]}>
            <View style={styles.modalHandle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <Text style={styles.modalEmoji}>🍔</Text>
                </View>

                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>
                    {tr('Thêm món ăn', 'Add Dish')}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {tr('Điền thông tin món mới của bạn', 'Enter details for the new dish')}
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>
                {tr('Ảnh món ăn', 'Dish Photo')}
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.imagePicker,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  void openItemImagePicker({
                    source: 'library',
                    onInsufficientPermissions: () => {
                      Alert.alert(
                        tr('Chưa có quyền truy cập', 'Permission required'),
                        tr(
                          'Bạn cần cấp quyền truy cập thư viện ảnh trong cài đặt.',
                          'Please grant photo library access in Settings.',
                        ),
                        [
                          { text: tr('Để sau', 'Later'), style: 'cancel' },
                          {
                            text: tr('Mở cài đặt', 'Open Settings'),
                            onPress: () => {
                              void openSettings();
                            },
                          },
                        ],
                      );
                    },
                  })
                }
                disabled={uploadingItemImage}
              >
                {newItemImageUrl ? (
                  <>
                    <Image
                      source={{ uri: newItemImageUrl }}
                      style={styles.itemImage}
                    />
                    <View style={styles.changeImageBadge}>
                      <Text style={styles.changeImageText}>
                        {tr('Đổi ảnh', 'Change photo')}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.imagePickerContent}>
                    {uploadingItemImage ? (
                      <ActivityIndicator color={COLORS.primary} />
                    ) : (
                      <>
                        <Text style={styles.imagePickerEmoji}>📷</Text>
                        <Text style={styles.imagePickerTitle}>
                          {tr('Chọn ảnh món ăn', 'Select dish photo')}
                        </Text>
                        <Text style={styles.imagePickerHint}>
                          {tr('Nhấn để chọn ảnh từ thư viện', 'Tap to choose from library')}
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </Pressable>

              <Text style={styles.inputLabel}>
                {tr('Tên món ăn', 'Dish Name')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={tr('Ví dụ: Burger bò phô mai', 'e.g. Double Cheese Burger')}
                placeholderTextColor={BURGER_COLORS.faint}
                value={newItemName}
                onChangeText={setNewItemName}
                maxLength={120}
                returnKeyType="next"
              />

              <Text style={styles.inputLabel}>
                {tr('Giá bán (USD)', 'Price (USD)')}
              </Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0.00"
                  placeholderTextColor={BURGER_COLORS.faint}
                  value={newItemPrice}
                  onChangeText={setNewItemPrice}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  (addingItem ||
                    uploadingItemImage ||
                    !newItemName.trim() ||
                    !newItemPrice.trim()) &&
                    styles.disabledButton,
                ]}
                onPress={handleAddItem}
                disabled={
                  addingItem ||
                  uploadingItemImage ||
                  !newItemName.trim() ||
                  !newItemPrice.trim()
                }
              >
                {addingItem ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {tr('Tạo món ăn', 'Create Dish')}
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={closeAddItemModal}
              >
                <Text style={styles.cancelText}>{tr('Hủy', 'Cancel')}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 25,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.muted,
    fontSize: 13,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    gap: 11,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryEmoji: {
    fontSize: 20,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  summarySubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  availableBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 11,
  },
  availableNumber: {
    color: COLORS.green,
    fontSize: 17,
    fontWeight: '900',
  },
  availableLabel: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 22,
    gap: 8,
  },
  addCategoryIcon: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
  },
  addCategoryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  countBadge: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 9,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  categoryCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconText: {
    fontSize: 18,
  },
  categoryTitleContent: {
    flex: 1,
  },
  categoryName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  categoryCount: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  deleteIconButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.redLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    color: COLORS.red,
    fontSize: 21,
    lineHeight: 23,
    fontWeight: '600',
  },
  categoryEmpty: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: BURGER_COLORS.surfaceMuted,
    borderRadius: 11,
    marginBottom: 10,
  },
  categoryEmptyText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  itemThumb: {
    width: 64,
    height: 68,
    borderRadius: 13,
    backgroundColor: BURGER_COLORS.surfaceMuted,
  },
  unavailableImage: {
    opacity: 0.55,
  },
  itemThumbPlaceholder: {
    width: 64,
    height: 68,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPlaceholderEmoji: {
    fontSize: 24,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 4,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  unavailableText: {
    color: COLORS.muted,
  },
  itemPrice: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  itemStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  itemStatusAvailable: {
    backgroundColor: COLORS.greenLight,
  },
  itemStatusUnavailable: {
    backgroundColor: COLORS.redLight,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  itemActions: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteItemButton: {
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  deleteItemText: {
    color: COLORS.red,
    fontSize: 10,
    fontWeight: '800',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    marginTop: 4,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: BURGER_COLORS.surfaceMuted,
  },
  addItemPlus: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '800',
  },
  addItemText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 21,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyEmoji: {
    fontSize: 28,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
  itemsLoading: {
    marginVertical: 20,
  },
  bottomSpace: {
    height: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(44, 26, 17, 0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  itemModal: {
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  modalIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmoji: {
    fontSize: 22,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  inputLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 13,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  cancelText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  imagePicker: {
    height: 145,
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 16,
  },
  imagePickerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imagePickerEmoji: {
    fontSize: 26,
  },
  imagePickerTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  imagePickerHint: {
    color: COLORS.muted,
    fontSize: 11,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  changeImageBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(44, 26, 17, 0.8)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
  },
  changeImageText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    marginBottom: 16,
  },
  currencySymbol: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 13,
  },
  pressed: {
    opacity: 0.88,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
