import { useMemo, useState } from 'react';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/lib/axios';
import { useCartStore } from '@/store/cart-store';
import { useDebounce } from '@/hooks/use-debounce';
import { voucherApi } from '@/lib/vouchers';
import { VoucherSection } from '@/components/voucher-picker';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

const COLORS = {
  background: BURGER_COLORS.background,
  white: BURGER_COLORS.surface,
  primary: BURGER_COLORS.primary,
  primaryLight: BURGER_COLORS.primaryLight,
  text: BURGER_COLORS.text,
  muted: BURGER_COLORS.muted,
  border: BURGER_COLORS.border,
  danger: BURGER_COLORS.danger,
  green: BURGER_COLORS.success,
  greenLight: BURGER_COLORS.successLight,
};

function buildSpecificAddress(
  houseNumber: string,
  floorApartment: string,
  streetName: string,
  addressNote: string,
): string {
  const h = houseNumber.trim();
  const f = floorApartment.trim();
  const s = streetName.trim();
  const n = addressNote.trim();

  const parts: string[] = [];

  if (h) {
    parts.push(/^(số|căn|phòng|nhà)\b/i.test(h) ? h : `Số nhà ${h}`);
  }
  if (f) {
    parts.push(
      /^(tầng|lầu|chung cư|tòa|block)\b/i.test(f) ? f : `Tầng/Chung cư: ${f}`,
    );
  }
  if (s) {
    parts.push(
      /^(đường|phố|ngõ|hẻm|quốc lộ|đại lộ)\b/i.test(s) ? s : `Đường ${s}`,
    );
  }
  if (n) {
    parts.push(`(${n})`);
  }

  return parts.join(', ');
}

export default function CartScreen() {
  const { tr } = useLanguage();
  const queryClient = useQueryClient();
  const {
    items,
    restaurantId,
    restaurantName,
    incrementItem,
    decrementItem,
    clearCart,
  } = useCartStore();

  const [houseNumber, setHouseNumber] = useState('');
  const [floorApartment, setFloorApartment] = useState('');
  const [streetName, setStreetName] = useState('');
  const [addressNote, setAddressNote] = useState('');

  const specificAddress = useMemo(
    () =>
      buildSpecificAddress(
        houseNumber,
        floorApartment,
        streetName,
        addressNote,
      ),
    [houseNumber, floorApartment, streetName, addressNote],
  );

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const cartTotal = items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );

  // undefined = tự chọn voucher tốt nhất, null = khách chọn không dùng voucher
  const [selectedVoucherId, setSelectedVoucherId] = useState<
    string | null | undefined
  >(undefined);

  // Làm tròn theo cent và chờ khách ngừng bấm +/- rồi mới hỏi server
  const voucherSubtotal = useDebounce(Math.round(cartTotal * 100) / 100, 400);
  const {
    data: voucherData,
    isLoading: vouchersLoading,
    refetch: refetchVouchers,
  } = useQuery({
    queryKey: ['vouchers-available', voucherSubtotal],
    queryFn: () => voucherApi.available(voucherSubtotal),
    enabled: items.length > 0 && voucherSubtotal > 0,
    placeholderData: (previous) => previous,
  });

  const vouchers = voucherData?.vouchers ?? [];
  const bestVoucherId = voucherData?.bestVoucherId ?? null;
  const pickedVoucher =
    selectedVoucherId === null
      ? null
      : vouchers.find((v) => v.id === selectedVoucherId && v.eligible);
  // Voucher khách tự chọn không còn hợp lệ (VD: giảm số món) → quay về voucher tốt nhất
  const selectedVoucher =
    pickedVoucher === null
      ? null
      : (pickedVoucher ?? vouchers.find((v) => v.id === bestVoucherId) ?? null);
  const discount = selectedVoucher?.discount ?? 0;
  const finalTotal = Math.max(cartTotal - discount, 0);

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: () =>
      api.post('/orders', {
        restaurantId,
        deliveryAddress: specificAddress,
        items: items.map((item) => ({
          menuItemId: item.id,
          quantity: String(item.quantity),
        })),
        voucherId: selectedVoucher?.id,
      }),

    onSuccess: (res) => {
      const createdOrder = res.data;
      if (createdOrder?.id) {
        queryClient.setQueryData(['order', createdOrder.id], {
          ...createdOrder,
          items: createdOrder.items ?? [],
        });
      }
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['vouchers-available'] });
      setSelectedVoucherId(undefined);
      clearCart();
      router.push(`/(customer)/order/${createdOrder.id}`);
    },

    onError: (error: any) => {
      // Voucher có thể vừa hết lượt/hết hạn → tải lại danh sách
      void refetchVouchers();
      Alert.alert(
        tr('Không thể đặt hàng', 'Unable to place order'),
        error?.response?.data?.message ??
          tr('Vui lòng thử lại sau.', 'Please try again later.'),
      );
    },
  });

  function handlePlaceOrder() {
    if (items.length === 0) {
      Alert.alert(
        tr('Giỏ hàng trống', 'Empty cart'),
        tr('Hãy thêm món ăn trước khi đặt hàng.', 'Please add items before placing an order.'),
      );
      return;
    }

    if (!specificAddress) {
      Alert.alert(
        tr('Thiếu địa chỉ cụ thể', 'Missing delivery address'),
        tr(
          'Vui lòng ghi địa chỉ cụ thể như số nhà, số tầng chung cư và tên đường.',
          'Please enter your house number, floor/apartment, or street name.',
        ),
      );
      return;
    }

    if (!restaurantId) {
      Alert.alert(
        tr('Lỗi', 'Error'),
        tr('Không tìm thấy thông tin nhà hàng.', 'Restaurant information not found.'),
      );
      return;
    }

    placeOrder();
  }

  function handleClearCart() {
    Alert.alert(
      tr('Xóa giỏ hàng?', 'Clear cart?'),
      tr(
        'Bạn có chắc muốn xóa tất cả món ăn trong giỏ?',
        'Are you sure you want to remove all items from your cart?',
      ),
      [
        { text: tr('Hủy', 'Cancel'), style: 'cancel' },
        {
          text: tr('Xóa tất cả', 'Clear all'),
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
          <Text style={styles.screenTitle}>{tr('Giỏ hàng', 'My Cart')}</Text>
          <LanguageSwitch />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons
              name="bag-handle-outline"
              size={60}
              color={COLORS.primary}
            />
          </View>

          <Text style={styles.emptyTitle}>
            {tr('Giỏ hàng đang trống', 'Your cart is empty')}
          </Text>

          <Text style={styles.emptyDescription}>
            {tr(
              'Những món ngon bạn yêu thích sẽ xuất hiện ở đây.',
              'Your favorite delicious items will appear here.',
            )}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.browseButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/(customer)/(tabs)/(home)')}
          >
            <Ionicons name="restaurant-outline" size={20} color="#FFFFFF" />
            <Text style={styles.browseButtonText}>
              {tr('Khám phá món ngon', 'Explore delicious food')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.screenTitle}>{tr('Giỏ hàng', 'My Cart')}</Text>
          <Text style={styles.headerSubtitle}>
            {tr(`${itemCount} món ăn đã chọn`, `${itemCount} items selected`)}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <LanguageSwitch />
          <Pressable
            style={({ pressed }) => [
              styles.clearIconButton,
              pressed && styles.pressed,
            ]}
            onPress={handleClearCart}
            accessibilityLabel={tr('Xóa toàn bộ giỏ hàng', 'Clear entire cart')}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={COLORS.danger}
            />
          </Pressable>
        </View>
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
                size={24}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantCaption}>
                {tr('Đơn hàng từ', 'Order from')}
              </Text>
              <Text style={styles.restaurantName} numberOfLines={2}>
                {restaurantName || tr('Nhà hàng', 'Restaurant')}
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
                  size={28}
                  color={COLORS.muted}
                />
              </View>
            )}

            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>

              <Text style={styles.unitPrice}>
                ${Number(item.price).toFixed(2)} / {tr('món', 'each')}
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
                accessibilityLabel={tr(
                  `Giảm số lượng ${item.name}`,
                  `Decrease quantity of ${item.name}`,
                )}
              >
                <Ionicons
                  name="remove"
                  size={18}
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
                accessibilityLabel={tr(
                  `Tăng số lượng ${item.name}`,
                  `Increase quantity of ${item.name}`,
                )}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
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

              <View style={styles.sectionHeadingContent}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>
                    {tr('Địa chỉ giao hàng', 'Delivery address')}
                  </Text>
                  <View style={styles.gpsBadge}>
                    <Ionicons
                      name="navigate"
                      size={11}
                      color={COLORS.green}
                    />
                    <Text style={styles.gpsBadgeText}>
                      {tr('Đã cài GPS', 'GPS Ready')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.sectionSubtitle}>
                  {tr(
                    'Ghi rõ số nhà, tầng chung cư và tên đường để tài xế giao tận nơi',
                    'Enter house number, floor/building, and street for doorstep delivery',
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.addressFormCard}>
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons
                    name="home-outline"
                    size={15}
                    color={COLORS.primary}
                  />
                  <Text style={styles.fieldLabel}>
                    {tr('Số nhà / Mã căn hộ', 'House / Apartment number')}
                  </Text>
                </View>
                <TextInput
                  style={styles.fieldInput}
                  placeholder={tr(
                    'VD: Số 24 hoặc Căn hộ B08-12',
                    'e.g. No. 24 or Apt B08-12',
                  )}
                  placeholderTextColor={BURGER_COLORS.faint}
                  value={houseNumber}
                  onChangeText={setHouseNumber}
                  editable={!isPending}
                />
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons
                    name="business-outline"
                    size={15}
                    color={COLORS.primary}
                  />
                  <Text style={styles.fieldLabel}>
                    {tr('Số tầng / Tòa chung cư (nếu có)', 'Floor / Building (optional)')}
                  </Text>
                </View>
                <TextInput
                  style={styles.fieldInput}
                  placeholder={tr(
                    'VD: Tầng 8, Tòa S1 Chung cư Vinhomes',
                    'e.g. Floor 8, Tower S1',
                  )}
                  placeholderTextColor={BURGER_COLORS.faint}
                  value={floorApartment}
                  onChangeText={setFloorApartment}
                  editable={!isPending}
                />
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons
                    name="map-outline"
                    size={15}
                    color={COLORS.primary}
                  />
                  <Text style={styles.fieldLabel}>
                    {tr('Tên đường / Ngõ, hẻm', 'Street / Alley name')}
                  </Text>
                </View>
                <TextInput
                  style={styles.fieldInput}
                  placeholder={tr(
                    'VD: Đường Nguyễn Huệ, Ngõ 15...',
                    'e.g. Nguyen Hue Street, Alley 15...',
                  )}
                  placeholderTextColor={BURGER_COLORS.faint}
                  value={streetName}
                  onChangeText={setStreetName}
                  editable={!isPending}
                />
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons
                    name="document-text-outline"
                    size={15}
                    color={COLORS.primary}
                  />
                  <Text style={styles.fieldLabel}>
                    {tr('Ghi chú chi tiết thêm (tùy chọn)', 'Delivery notes (optional)')}
                  </Text>
                </View>
                <TextInput
                  style={styles.fieldInput}
                  placeholder={tr(
                    'VD: Gọi điện khi tới sảnh, gửi lễ tân...',
                    'e.g. Call when arriving at lobby...',
                  )}
                  placeholderTextColor={BURGER_COLORS.faint}
                  value={addressNote}
                  onChangeText={setAddressNote}
                  editable={!isPending}
                />
              </View>

              {specificAddress ? (
                <View style={styles.addressPreviewBox}>
                  <Ionicons
                    name="pin-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.addressPreviewText}>
                    <Text style={styles.addressPreviewLabel}>
                      {tr('Địa chỉ nhận: ', 'Delivery to: ')}
                    </Text>
                    {specificAddress}
                  </Text>
                </View>
              ) : null}
            </View>

            <VoucherSection
              vouchers={vouchers}
              bestVoucherId={bestVoucherId}
              selected={selectedVoucher}
              isLoading={vouchersLoading}
              disabled={isPending}
              onSelect={setSelectedVoucherId}
            />

            <View style={styles.summaryCard}>
              <Text style={styles.summaryHeading}>
                {tr('Tóm tắt đơn hàng', 'Order Summary')}
              </Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {tr('Tổng số món', 'Total items')}
                </Text>
                <Text style={styles.summaryValue}>
                  {itemCount} {tr('món', 'items')}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {tr('Tạm tính', 'Subtotal')}
                </Text>
                <Text style={styles.summaryValue}>
                  ${cartTotal.toFixed(2)}
                </Text>
              </View>

              {selectedVoucher ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Voucher {selectedVoucher.code}
                  </Text>
                  <Text style={[styles.summaryValue, styles.discountValue]}>
                    −${discount.toFixed(2)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.summaryDivider} />

              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>
                    {tr('Tổng cộng', 'Total')}
                  </Text>
                  <Text style={styles.totalHint}>
                    {tr(
                      'Chưa bao gồm phí giao hàng nếu có',
                      'Excludes delivery fee if applicable',
                    )}
                  </Text>
                </View>

                <Text style={styles.totalAmount}>
                  ${finalTotal.toFixed(2)}
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
                    {tr('Đang đặt hàng...', 'Placing order...')}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={22}
                    color="#FFFFFF"
                  />
                  <Text style={styles.orderButtonText}>
                    {tr('Đặt hàng ngay', 'Place Order Now')}
                  </Text>
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
                {tr(
                  'Vui lòng kiểm tra địa chỉ cụ thể trước khi đặt hàng',
                  'Please verify your delivery address before ordering',
                )}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.clearTextButton,
                pressed && styles.pressed,
              ]}
              onPress={handleClearCart}
              disabled={isPending}
            >
              <Text style={styles.clearText}>
                {tr('Xóa giỏ hàng', 'Clear cart')}
              </Text>
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
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 3,
  },
  clearIconButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: BURGER_COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 36,
  },
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  restaurantIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantCaption: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 3,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  restaurantCheck: {
    marginLeft: 8,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginTop: 10,
    gap: 12,
  },
  itemImage: {
    width: 78,
    height: 78,
    borderRadius: 14,
    backgroundColor: BURGER_COLORS.surfaceMuted,
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
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 19,
  },
  unitPrice: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '900',
    marginTop: 4,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonMinus: {
    backgroundColor: BURGER_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qtyButtonPlus: {
    backgroundColor: COLORS.primary,
  },
  qtyCount: {
    minWidth: 20,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  footer: {
    paddingTop: 24,
    gap: 14,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  sectionHeadingContent: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  gpsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.green,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 17,
  },
  addressFormCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 15,
    gap: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  fieldInput: {
    minHeight: 46,
    backgroundColor: BURGER_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  addressPreviewBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
  addressPreviewLabel: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  addressPreviewText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.text,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  summaryHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  totalHint: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 3,
    maxWidth: 200,
  },
  discountValue: {
    color: COLORS.green,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },
  orderButton: {
    minHeight: 54,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  orderButtonDisabled: {
    opacity: 0.7,
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
    paddingHorizontal: 32,
    paddingBottom: 50,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  emptyTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 22,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 15,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.88,
  },
});
