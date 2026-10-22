
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/lib/axios';
import { useCartStore } from '@/store/cart-store';

const COLORS = {
  background: '#FFF9F5',
  white: '#FFFFFF',
  primary: '#FF6B35',
  primaryLight: '#FFF0E8',
  text: '#29232A',
  muted: '#8B8289',
  border: '#F0E8E3',
  danger: '#EF4444',
  green: '#16A34A',
};

export default function CartScreen() {
  const {
    items,
    restaurantId,
    restaurantName,
    incrementItem,
    decrementItem,
    clearCart,
  } = useCartStore();

  const [deliveryAddress, setDeliveryAddress] = useState('');

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const cartTotal = items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: () =>
      api.post('/orders', {
        restaurantId,
        deliveryAddress: deliveryAddress.trim(),
        items: items.map((item) => ({
          menuItemId: item.id,
          quantity: String(item.quantity),
        })),
      }),

    onSuccess: (res) => {
      clearCart();
      router.push(`/(customer)/order/${res.data.id}`);
    },

    onError: (error: any) => {
      Alert.alert(
        'Không thể đặt hàng',
        error?.response?.data?.message ?? 'Vui lòng thử lại sau.',
      );
    },
  });

  function handlePlaceOrder() {
    if (items.length === 0) {
      Alert.alert('Giỏ hàng trống', 'Hãy thêm món ăn trước khi đặt hàng.');
      return;
    }

    if (!deliveryAddress.trim()) {
      Alert.alert('Thiếu địa chỉ', 'Vui lòng nhập địa chỉ giao hàng.');
      return;
    }

    if (!restaurantId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin nhà hàng.');
      return;
    }

    placeOrder();
  }

  function handleClearCart() {
    Alert.alert(
      'Xóa giỏ hàng?',
      'Bạn có chắc muốn xóa tất cả món ăn trong giỏ?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa tất cả',
          style: 'destructive',
          onPress: clearCart,
        },
      ],
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyHeader}>
          <Text style={styles.screenTitle}>Giỏ hàng</Text>
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons
              name="bag-handle-outline"
              size={66}
              color={COLORS.primary}
            />
          </View>

          <Text style={styles.emptyTitle}>Giỏ hàng đang trống</Text>

          <Text style={styles.emptyDescription}>
            Những món ngon bạn yêu thích sẽ xuất hiện ở đây.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.browseButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/(customer)/(tabs)/(home)')}
          >
            <Ionicons name="restaurant-outline" size={20} color="#FFFFFF" />
            <Text style={styles.browseButtonText}>Khám phá món ngon</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Giỏ hàng</Text>
          <Text style={styles.headerSubtitle}>
            {itemCount} món ăn đã chọn
          </Text>
        </View>

        <Pressable
          style={styles.clearIconButton}
          onPress={handleClearCart}
          accessibilityLabel="Xóa toàn bộ giỏ hàng"
        >
          <Ionicons
            name="trash-outline"
            size={21}
            color={COLORS.danger}
          />
        </Pressable>
      </View>

      <FlatList
        data={items}
        extraData={items}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.restaurantCard}>
            <View style={styles.restaurantIcon}>
              <Ionicons
                name="storefront-outline"
                size={25}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantCaption}>Đơn hàng từ</Text>
              <Text style={styles.restaurantName} numberOfLines={2}>
                {restaurantName || 'Nhà hàng'}
              </Text>
            </View>

            <View style={styles.restaurantCheck}>
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={COLORS.green}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.itemImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.itemImage, styles.imagePlaceholder]}>
                <Ionicons
                  name="fast-food-outline"
                  size={30}
                  color={COLORS.muted}
                />
              </View>
            )}

            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>

              <Text style={styles.unitPrice}>
                ${Number(item.price).toFixed(2)} / món
              </Text>

              <Text style={styles.itemPrice}>
                ${(Number(item.price) * item.quantity).toFixed(2)}
              </Text>
            </View>

            <View style={styles.qtyControls}>
              <Pressable
                style={({ pressed }) => [
                  styles.qtyButton,
                  styles.qtyButtonMinus,
                  pressed && styles.pressed,
                ]}
                onPress={() => decrementItem(item.id)}
                accessibilityLabel={`Giảm số lượng ${item.name}`}
              >
                <Ionicons
                  name="remove"
                  size={19}
                  color={COLORS.text}
                />
              </Pressable>

              <Text style={styles.qtyCount}>{item.quantity}</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.qtyButton,
                  styles.qtyButtonPlus,
                  pressed && styles.pressed,
                ]}
                onPress={() => incrementItem(item.id)}
                accessibilityLabel={`Tăng số lượng ${item.name}`}
              >
                <Ionicons name="add" size={19} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="location-outline"
                  size={21}
                  color={COLORS.primary}
                />
              </View>

              <View>
                <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
                <Text style={styles.sectionSubtitle}>
                  Nhập nơi bạn muốn nhận món ăn
                </Text>
              </View>
            </View>

            <TextInput
              style={styles.addressInput}
              placeholder="Số nhà, tên đường, phường/xã..."
              placeholderTextColor="#AAA0A5"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              multiline
              textAlignVertical="top"
              editable={!isPending}
            />

            <View style={styles.summaryCard}>
              <Text style={styles.summaryHeading}>Tóm tắt đơn hàng</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Tổng số món
                </Text>
                <Text style={styles.summaryValue}>
                  {itemCount} món
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tạm tính</Text>
                <Text style={styles.summaryValue}>
                  ${cartTotal.toFixed(2)}
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>Tổng cộng</Text>
                  <Text style={styles.totalHint}>
                    Chưa bao gồm phí giao hàng nếu có
                  </Text>
                </View>

                <Text style={styles.totalAmount}>
                  ${cartTotal.toFixed(2)}
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.orderButton,
                isPending && styles.orderButtonDisabled,
                pressed && !isPending && styles.pressed,
              ]}
              onPress={handlePlaceOrder}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.orderButtonText}>
                    Đang đặt hàng...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={22}
                    color="#FFFFFF"
                  />
                  <Text style={styles.orderButtonText}>Đặt hàng ngay</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color="#FFFFFF"
                  />
                </>
              )}
            </Pressable>

            <View style={styles.secureNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={COLORS.muted}
              />
              <Text style={styles.secureNoteText}>
                Vui lòng kiểm tra địa chỉ trước khi đặt hàng
              </Text>
            </View>

            <Pressable
              style={styles.clearTextButton}
              onPress={handleClearCart}
              disabled={isPending}
            >
              <Text style={styles.clearText}>Xóa giỏ hàng</Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 18,
  },

  emptyHeader: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },

  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.7,
  },

  headerSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 5,
  },

  clearIconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },

  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },

  restaurantIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  restaurantInfo: {
    flex: 1,
  },

  restaurantCaption: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 4,
  },

  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },

  restaurantCheck: {
    marginLeft: 8,
  },

  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginTop: 12,
    gap: 12,
  },

  itemImage: {
    width: 82,
    height: 88,
    borderRadius: 15,
    backgroundColor: '#F5EEE9',
  },

  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 20,
  },

  unitPrice: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 5,
  },

  itemPrice: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '800',
    marginTop: 5,
  },

  qtyControls: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  qtyButton: {
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  qtyButtonMinus: {
    backgroundColor: '#F5F0ED',
  },

  qtyButtonPlus: {
    backgroundColor: COLORS.primary,
  },

  qtyCount: {
    minWidth: 22,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },

  footer: {
    paddingTop: 28,
    gap: 14,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
  },

  addressInput: {
    minHeight: 92,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.text,
  },

  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 21,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },

  summaryHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 17,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  summaryLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },

  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 5,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },

  totalHint: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 5,
    maxWidth: 190,
  },

  totalAmount: {
    fontSize: 23,
    fontWeight: '900',
    color: COLORS.primary,
  },

  orderButton: {
    minHeight: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },

  orderButtonDisabled: {
    opacity: 0.75,
  },

  orderButtonText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  secureNoteText: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
  },

  clearTextButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },

  clearText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '700',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
    paddingBottom: 60,
  },

  emptyIconCircle: {
    width: 145,
    height: 145,
    borderRadius: 48,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },

  emptyDescription: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 25,
  },

  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 17,
  },

  browseButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
