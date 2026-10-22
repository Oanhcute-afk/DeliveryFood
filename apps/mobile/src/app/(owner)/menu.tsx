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

const COLORS = {
  background: '#FFF9F5',
  surface: '#FFFFFF',
  primary: '#FF6B35',
  primaryLight: '#FFF0E8',
  text: '#29232A',
  muted: '#8B8289',
  border: '#F0E8E3',
  green: '#16A36A',
  greenLight: '#E8F8F0',
  red: '#E5484D',
  redLight: '#FDEBEC',
};

export default function OwnerMenuScreen() {
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
        'Không thể tạo danh mục',
        e.response?.data?.message ?? 'Vui lòng thử lại.',
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
        'Không thể xóa danh mục',
        e.response?.data?.message ?? 'Vui lòng thử lại.',
      );
    },
  });

  function handleAddCategory() {
    const name = newCategoryName.trim();

    if (!name) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên danh mục.');
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
      Alert.alert('Tải ảnh thất bại', error.message);
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
        'Không thể tạo món ăn',
        e.response?.data?.message ?? 'Vui lòng thử lại.',
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
        'Không thể cập nhật trạng thái',
        e.response?.data?.message ?? 'Vui lòng thử lại.',
      );
    },
  });

  function handleAddItem() {
    const name = newItemName.trim();
    const price = newItemPrice.trim();
    const numericPrice = Number(price);

    if (!name || !price) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên món và giá.');
      return;
    }

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      Alert.alert('Giá không hợp lệ', 'Vui lòng nhập giá lớn hơn 0.');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Chưa chọn danh mục', 'Vui lòng chọn danh mục cho món ăn.');
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

  const { mutate: deleteItem, isPending: deletingItem } = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/items/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['menu-items', restaurant?.id],
      }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        'Không thể xóa món ăn',
        e.response?.data?.message ?? 'Vui lòng thử lại.',
      );
    },
  });

  function confirmDeleteCategory(category: MenuCategory) {
    Alert.alert(
      'Xóa danh mục?',
      `Danh mục "${category.name}" và các món thuộc danh mục này sẽ bị xóa.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa danh mục',
          style: 'destructive',
          onPress: () => deleteCategory(category.id),
        },
      ],
    );
  }

  function confirmDeleteItem(item: MenuItem) {
    Alert.alert('Xóa món ăn?', `Bạn có muốn xóa "${item.name}" không?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa món',
        style: 'destructive',
        onPress: () => deleteItem(item.id),
      },
    ]);
  }

  if (restaurantLoading || categoriesLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải thực đơn...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
          </View>
          <Text style={styles.emptyTitle}>Bạn chưa có nhà hàng</Text>
          <Text style={styles.emptyText}>
            Hãy tạo nhà hàng trước khi bắt đầu quản lý thực đơn.
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
                <Text style={styles.eyebrow}>QUẢN LÝ NHÀ HÀNG</Text>
                <Text style={styles.pageTitle}>Thực đơn của bạn</Text>
                <Text style={styles.pageSubtitle}>
                  Quản lý danh mục, món ăn và tình trạng phục vụ.
                </Text>
              </View>

              <View style={styles.headerIcon}>
                <Text style={styles.headerEmoji}>🍜</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Text style={styles.summaryEmoji}>📋</Text>
              </View>

              <View style={styles.summaryInfo}>
                <Text style={styles.summaryTitle}>Tổng quan thực đơn</Text>
                <Text style={styles.summarySubtitle}>
                  {categories.length} danh mục · {items.length} món ăn
                </Text>
              </View>

              <View style={styles.availableBadge}>
                <Text style={styles.availableNumber}>{totalAvailable}</Text>
                <Text style={styles.availableLabel}>Đang bán</Text>
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
              <Text style={styles.addCategoryText}>Thêm danh mục mới</Text>
            </Pressable>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Danh mục món ăn</Text>
                <Text style={styles.sectionSubtitle}>
                  Chọn trạng thái để quản lý món đang bán
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
              <Text style={styles.emptyEmoji}>🥗</Text>
            </View>
            <Text style={styles.emptyTitle}>Chưa có danh mục nào</Text>
            <Text style={styles.emptyText}>
              Tạo danh mục đầu tiên để bắt đầu thêm món vào thực đơn.
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
                      {categoryItems.length} món ăn
                    </Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Xóa danh mục ${category.name}`}
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
                    Chưa có món ăn trong danh mục này.
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
                          <Text style={styles.itemPlaceholderEmoji}>🍲</Text>
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
                            {isAvailable ? 'Đang bán' : 'Tạm hết'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.itemActions}>
                        <Switch
                          accessibilityLabel={`Trạng thái bán món ${item.name}`}
                          value={isAvailable}
                          onValueChange={(value) =>
                            toggleAvailability({
                              id: item.id,
                              isAvailable: value,
                            })
                          }
                          trackColor={{
                            false: '#E8DCDD',
                            true: '#A5E6C5',
                          }}
                          thumbColor={isAvailable ? COLORS.green : '#FFFFFF'}
                        />

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Xóa món ${item.name}`}
                          hitSlop={8}
                          style={({ pressed }) => [
                            styles.deleteItemButton,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => confirmDeleteItem(item)}
                        >
                          <Text style={styles.deleteItemText}>Xóa món</Text>
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
                <Text style={styles.addItemText}>Thêm món vào danh mục</Text>
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
                <Text style={styles.modalTitle}>Danh mục mới</Text>
                <Text style={styles.modalSubtitle}>
                  Nhóm các món ăn theo loại
                </Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Tên danh mục</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Món chính, Đồ uống..."
              placeholderTextColor="#B4AAB0"
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
                <Text style={styles.primaryButtonText}>Tạo danh mục</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setShowAddCategory(false)}
            >
              <Text style={styles.cancelText}>Hủy</Text>
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
                  <Text style={styles.modalEmoji}>🍲</Text>
                </View>

                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>Thêm món ăn</Text>
                  <Text style={styles.modalSubtitle}>
                    Điền thông tin món mới của bạn
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Ảnh món ăn</Text>

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
                        'Chưa có quyền truy cập',
                        'Bạn cần cấp quyền truy cập thư viện ảnh trong cài đặt.',
                        [
                          { text: 'Để sau', style: 'cancel' },
                          {
                            text: 'Mở cài đặt',
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
                      <Text style={styles.changeImageText}>Đổi ảnh</Text>
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
                          Chọn ảnh món ăn
                        </Text>
                        <Text style={styles.imagePickerHint}>
                          Nhấn để chọn ảnh từ thư viện
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </Pressable>

              <Text style={styles.inputLabel}>Tên món ăn</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: Cơm gà sốt tiêu"
                placeholderTextColor="#B4AAB0"
                value={newItemName}
                onChangeText={setNewItemName}
                maxLength={120}
                returnKeyType="next"
              />

              <Text style={styles.inputLabel}>Giá bán (USD)</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0.00"
                  placeholderTextColor="#B4AAB0"
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
                  <Text style={styles.primaryButtonText}>Tạo món ăn</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={closeAddItemModal}
              >
                <Text style={styles.cancelText}>Hủy</Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 21,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 10,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  headerIcon: {
    width: 53,
    height: 53,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: {
    fontSize: 26,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    gap: 11,
  },
  summaryIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryEmoji: {
    fontSize: 21,
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
    marginTop: 5,
  },
  availableBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
  },
  availableNumber: {
    color: COLORS.green,
    fontSize: 18,
    fontWeight: '800',
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
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 14,
    marginBottom: 25,
    gap: 8,
  },
  addCategoryIcon: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '600',
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
    marginBottom: 13,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },
  countBadge: {
    minWidth: 33,
    height: 33,
    paddingHorizontal: 9,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  categoryCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 21,
    padding: 14,
    marginBottom: 15,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  categoryHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconText: {
    fontSize: 19,
  },
  categoryTitleContent: {
    flex: 1,
  },
  categoryName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  categoryCount: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },
  deleteIconButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.redLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    color: COLORS.red,
    fontSize: 23,
    lineHeight: 26,
    fontWeight: '500',
  },
  categoryEmpty: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: COLORS.background,
    borderRadius: 12,
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
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  itemThumb: {
    width: 67,
    height: 75,
    borderRadius: 14,
    backgroundColor: COLORS.background,
  },
  unavailableImage: {
    opacity: 0.55,
  },
  itemThumbPlaceholder: {
    width: 67,
    height: 75,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPlaceholderEmoji: {
    fontSize: 25,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: 5,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  unavailableText: {
    color: COLORS.muted,
  },
  itemPrice: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  itemStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
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
    gap: 5,
  },
  deleteItemButton: {
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  deleteItemText: {
    color: COLORS.red,
    fontSize: 10,
    fontWeight: '700',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD0BC',
    borderStyle: 'dashed',
    backgroundColor: '#FFFCFA',
  },
  addItemPlus: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  addItemText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 21,
    paddingHorizontal: 24,
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyEmoji: {
    fontSize: 30,
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
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
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
    backgroundColor: 'rgba(41,35,42,0.42)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
  },
  itemModal: {
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DDD2D7',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmoji: {
    fontSize: 23,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
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
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 17,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  cancelText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  imagePicker: {
    height: 150,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD0BC',
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 18,
  },
  imagePickerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  imagePickerEmoji: {
    fontSize: 29,
    marginBottom: 2,
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
    backgroundColor: 'rgba(41,35,42,0.78)',
    paddingHorizontal: 11,
    paddingVertical: 7,
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
    borderRadius: 13,
    paddingHorizontal: 14,
    marginBottom: 17,
  },
  currencySymbol: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '800',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 14,
  },
  pressed: {
    opacity: 0.75,
  },
  disabledButton: {
    opacity: 0.5,
  },
});