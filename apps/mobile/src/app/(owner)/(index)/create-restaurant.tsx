import { openSettings } from 'expo-linking';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/lib/axios';
import { useImageUploader } from '@/lib/uploadthing';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

function buildSpecificRestaurantAddress(
  houseNumber: string,
  floorBuilding: string,
  streetName: string,
  addressNote: string,
): string {
  const h = houseNumber.trim();
  const f = floorBuilding.trim();
  const s = streetName.trim();
  const n = addressNote.trim();

  const parts: string[] = [];

  if (h) {
    parts.push(
      /^(số|căn|ki-ốt|kiot|mặt bằng|phòng|nhà)\b/i.test(h)
        ? h
        : `Số nhà ${h}`,
    );
  }
  if (f) {
    parts.push(
      /^(tầng|lầu|chung cư|tòa|block|tttm)\b/i.test(f)
        ? f
        : `Tầng/Chung cư: ${f}`,
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

export default function CreateRestaurantScreen() {
  const { tr } = useLanguage();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [floorBuilding, setFloorBuilding] = useState('');
  const [streetName, setStreetName] = useState('');
  const [addressNote, setAddressNote] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const specificAddress = useMemo(
    () =>
      buildSpecificRestaurantAddress(
        houseNumber,
        floorBuilding,
        streetName,
        addressNote,
      ),
    [houseNumber, floorBuilding, streetName, addressNote],
  );

  const { openImagePicker, isUploading } = useImageUploader('restaurantImage', {
    onClientUploadComplete: (res) => {
      setImageUrl(res[0].ufsUrl);
      Alert.alert(
        tr('Thành công', 'Success'),
        tr('Ảnh nhà hàng đã được tải lên.', 'Restaurant photo uploaded.'),
      );
    },
    onUploadError: (error) => {
      Alert.alert(tr('Tải ảnh thất bại', 'Upload failed'), error.message);
    },
  });

  const { mutate: createRestaurant, isPending } = useMutation({
    mutationFn: () =>
      api.post('/restaurants', {
        name: name.trim(),
        description: description.trim(),
        address: specificAddress,
        cuisineType: cuisineType.trim(),
        imageUrl,
      }),
    onSuccess: (response) => {
      const created = response?.data ?? response;
      queryClient.setQueryData(['my-restaurant'], created);
      void queryClient.invalidateQueries({ queryKey: ['my-restaurant'] });
      void queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      router.replace('/(owner)/(index)');
    },
    onError: (e: any) => {
      Alert.alert(
        tr('Không thể tạo nhà hàng', 'Unable to create restaurant'),
        e?.response?.data?.message ??
          tr('Đã xảy ra lỗi. Vui lòng thử lại.', 'An error occurred. Please try again.'),
      );
    },
  });

  function handleSubmit() {
    if (!name.trim() || !specificAddress || !cuisineType.trim()) {
      Alert.alert(
        tr('Thiếu thông tin', 'Missing information'),
        tr(
          'Vui lòng nhập tên nhà hàng, địa chỉ cụ thể và loại ẩm thực.',
          'Please enter restaurant name, specific address, and cuisine type.',
        ),
      );
      return;
    }

    createRestaurant();
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerIcon}>
              <Text style={styles.headerEmoji}>🍔</Text>
            </View>
            <LanguageSwitch />
          </View>

          <Text style={styles.eyebrow}>
            {tr('ĐỐI TÁC NHÀ HÀNG', 'RESTAURANT PARTNER')}
          </Text>
          <Text style={styles.title}>
            {tr('Tạo nhà hàng', 'Create Restaurant')}
          </Text>
          <Text style={styles.subtitle}>
            {tr(
              'Hãy giới thiệu nhà hàng của bạn để khách hàng dễ dàng tìm thấy.',
              'Introduce your restaurant so hungry customers can find you.',
            )}
          </Text>
        </View>

        {/* Ảnh nhà hàng */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {tr('Ảnh nhà hàng', 'Restaurant Photo')}
            </Text>
            <Text style={styles.optionalLabel}>
              {tr('Không bắt buộc', 'Optional')}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.imagePicker,
              pressed && styles.pressed,
              isUploading && styles.imagePickerUploading,
            ]}
            onPress={() =>
              void openImagePicker({
                source: 'library',
                onInsufficientPermissions: () => {
                  Alert.alert(
                    tr('Chưa có quyền truy cập', 'Permission required'),
                    tr(
                      'Bạn cần cấp quyền truy cập thư viện ảnh trong phần Cài đặt.',
                      'Please grant photo library access in Settings.',
                    ),
                    [
                      { text: tr('Để sau', 'Later'), style: 'cancel' },
                      {
                        text: tr('Mở Cài đặt', 'Open Settings'),
                        onPress: () => {
                          void openSettings();
                        },
                      },
                    ],
                  );
                },
              })
            }
            disabled={isUploading}
            accessibilityRole="button"
          >
            {imageUrl ? (
              <>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <View style={styles.changeImageBadge}>
                  <Text style={styles.changeImageText}>
                    {tr('✎ Đổi ảnh', '✎ Change photo')}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.imagePlaceholder}>
                <View style={styles.uploadIcon}>
                  {isUploading ? (
                    <ActivityIndicator color={BURGER_COLORS.primary} size="large" />
                  ) : (
                    <Text style={styles.uploadEmoji}>📷</Text>
                  )}
                </View>

                <Text style={styles.imagePickerTitle}>
                  {isUploading
                    ? tr('Đang tải ảnh lên...', 'Uploading photo...')
                    : tr('Thêm ảnh nhà hàng', 'Add restaurant photo')}
                </Text>
                <Text style={styles.imagePickerText}>
                  {isUploading
                    ? tr('Vui lòng chờ trong giây lát', 'Please wait a moment')
                    : tr('Chạm để chọn ảnh từ thư viện', 'Tap to choose from library')}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Thông tin nhà hàng */}
        <View style={styles.formCard}>
          <View style={styles.formHeading}>
            <Text style={styles.formHeadingTitle}>
              {tr('Thông tin cơ bản', 'Basic Details')}
            </Text>
            <Text style={styles.formHeadingSubtitle}>
              {tr('Các mục có dấu * là bắt buộc', 'Fields marked with * are required')}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              {tr('Tên nhà hàng', 'Restaurant Name')}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder={tr('Ví dụ: Burger Ngon Sài Gòn', 'e.g. Flame Burger House')}
              placeholderTextColor={BURGER_COLORS.faint}
              value={name}
              onChangeText={setName}
              maxLength={100}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              {tr('Mô tả nhà hàng', 'Description')}
            </Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder={tr(
                'Giới thiệu món ăn đặc trưng và phong cách của bạn...',
                'Tell customers about your signature burgers and dishes...',
              )}
              placeholderTextColor={BURGER_COLORS.faint}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {description.length}/1000
            </Text>
          </View>

          <View style={styles.field}>
            <View style={styles.addressHeaderRow}>
              <Text style={[styles.label, { marginBottom: 0 }]}>
                {tr('Địa chỉ cụ thể', 'Specific Address')}{' '}
                <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.gpsBadge}>
                <Text style={styles.gpsBadgeText}>
                  {tr('📍 Đã cài GPS', '📍 GPS Ready')}
                </Text>
              </View>
            </View>
            <Text style={styles.addressSubtitle}>
              {tr(
                'Ghi rõ số nhà/mặt bằng, tầng chung cư và tên đường để tài xế & khách dễ tìm',
                'Enter house/unit number, floor/building, and street name',
              )}
            </Text>

            <View style={styles.addressSubCard}>
              <View style={styles.subField}>
                <Text style={styles.subLabel}>
                  {tr('🏠 Số nhà / Ki-ốt / Mặt bằng', '🏠 House / Unit Number')}
                </Text>
                <TextInput
                  style={styles.subInput}
                  placeholder={tr(
                    'VD: Số 18 hoặc Ki-ốt Shophouse A02',
                    'e.g. No. 18 or Unit A02',
                  )}
                  placeholderTextColor={BURGER_COLORS.faint}
                  value={houseNumber}
                  onChangeText={setHouseNumber}
                  maxLength={100}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.subField}>
                <Text style={styles.subLabel}>
                  {tr(
                    '🏢 Số tầng / Tòa chung cư (nếu có)',
                    '🏢 Floor / Building (optional)',
                  )}
                </Text>
                <TextInput
                  style={styles.subInput}
                  placeholder={tr(
                    'VD: Tầng 1, Tòa S2 Chung cư Vinhomes',
                    'e.g. Floor 1, Tower S2',
                  )}
                  placeholderTextColor={BURGER_COLORS.faint}
                  value={floorBuilding}
                  onChangeText={setFloorBuilding}
                  maxLength={120}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.subField}>
                <Text style={styles.subLabel}>
                  {tr('🛣️ Tên đường / Ngõ, hẻm', '🛣️ Street / Alley Name')}
                </Text>
                <TextInput
                  style={styles.subInput}
                  placeholder={tr(
                    'VD: Đường Nguyễn Huệ, Ngõ 15...',
                    'e.g. Nguyen Hue Street...',
                  )}
                  placeholderTextColor={BURGER_COLORS.faint}
                  value={streetName}
                  onChangeText={setStreetName}
                  maxLength={150}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.subField}>
                <Text style={styles.subLabel}>
                  {tr('📝 Ghi chú vị trí thêm (tùy chọn)', '📝 Location Notes (optional)')}
                </Text>
                <TextInput
                  style={styles.subInput}
                  placeholder={tr(
                    'VD: Ngay mặt tiền cổng chính, cạnh siêu thị...',
                    'e.g. Main entrance, next to supermarket...',
                  )}
                  placeholderTextColor={BURGER_COLORS.faint}
                  value={addressNote}
                  onChangeText={setAddressNote}
                  maxLength={150}
                  returnKeyType="next"
                />
              </View>

              {specificAddress ? (
                <View style={styles.addressPreviewBox}>
                  <Text style={styles.addressPreviewIcon}>📍</Text>
                  <Text style={styles.addressPreviewText}>
                    <Text style={styles.addressPreviewLabel}>
                      {tr('Địa chỉ cụ thể: ', 'Full address: ')}
                    </Text>
                    {specificAddress}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={[styles.field, styles.lastField]}>
            <Text style={styles.label}>
              {tr('Loại ẩm thực', 'Cuisine Type')}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWithIcon}>
              <Text style={styles.fieldIcon}>🍔</Text>
              <TextInput
                style={styles.iconInput}
                placeholder={tr(
                  'Ví dụ: Burger, Việt Nam, Ý',
                  'e.g. Burger, Vietnamese, Italian',
                )}
                placeholderTextColor={BURGER_COLORS.faint}
                value={cuisineType}
                onChangeText={setCuisineType}
                maxLength={100}
                returnKeyType="done"
              />
            </View>
            <Text style={styles.helperText}>
              {tr(
                'Mô tả loại món ăn chính mà nhà hàng phục vụ.',
                'Main type of food served by your restaurant.',
              )}
            </Text>
          </View>
        </View>

        {/* Nút tạo */}
        <View style={styles.bottomSection}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              (isPending || isUploading) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isPending || isUploading}
            accessibilityRole="button"
          >
            {isPending ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.buttonText}>
                  {tr('Đang tạo nhà hàng...', 'Creating restaurant...')}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.buttonText}>
                  {tr('Tạo nhà hàng', 'Create Restaurant')}
                </Text>
                <Text style={styles.buttonArrow}>→</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BURGER_COLORS.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 38,
  },
  header: {
    marginBottom: 22,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: {
    fontSize: 25,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: BURGER_COLORS.primary,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: BURGER_COLORS.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: BURGER_COLORS.muted,
    marginTop: 5,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  optionalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: BURGER_COLORS.muted,
  },
  imagePicker: {
    height: 180,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BURGER_COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: BURGER_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePickerUploading: {
    opacity: 0.7,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  uploadIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadEmoji: {
    fontSize: 24,
  },
  imagePickerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BURGER_COLORS.text,
    marginBottom: 4,
  },
  imagePickerText: {
    fontSize: 11,
    color: BURGER_COLORS.muted,
    textAlign: 'center',
  },
  changeImageBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(44, 26, 17, 0.82)',
  },
  changeImageText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.88,
  },
  formCard: {
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    padding: 16,
  },
  formHeading: {
    marginBottom: 18,
  },
  formHeadingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  formHeadingSubtitle: {
    fontSize: 11,
    color: BURGER_COLORS.muted,
    marginTop: 3,
  },
  field: {
    marginBottom: 18,
  },
  lastField: {
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: BURGER_COLORS.text,
    marginBottom: 8,
  },
  required: {
    color: BURGER_COLORS.primary,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  gpsBadge: {
    backgroundColor: BURGER_COLORS.successLight,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  gpsBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: BURGER_COLORS.success,
  },
  addressSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: BURGER_COLORS.muted,
    marginBottom: 10,
  },
  addressSubCard: {
    backgroundColor: BURGER_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 15,
    padding: 12,
    gap: 10,
  },
  subField: {
    gap: 5,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: BURGER_COLORS.text,
  },
  subInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 11,
    backgroundColor: BURGER_COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: BURGER_COLORS.text,
  },
  addressPreviewBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: BURGER_COLORS.primaryLight,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 2,
  },
  addressPreviewIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  addressPreviewLabel: {
    fontWeight: '800',
    color: BURGER_COLORS.primary,
  },
  addressPreviewText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: BURGER_COLORS.text,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 12,
    backgroundColor: BURGER_COLORS.surfaceMuted,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 13,
    color: BURGER_COLORS.text,
  },
  multilineInput: {
    minHeight: 96,
    paddingTop: 12,
  },
  characterCount: {
    fontSize: 10,
    color: BURGER_COLORS.muted,
    textAlign: 'right',
    marginTop: 5,
  },
  inputWithIcon: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 12,
    backgroundColor: BURGER_COLORS.surfaceMuted,
    paddingHorizontal: 12,
  },
  fieldIcon: {
    fontSize: 17,
    marginRight: 8,
  },
  iconInput: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 9,
    fontSize: 13,
    color: BURGER_COLORS.text,
  },
  helperText: {
    fontSize: 11,
    lineHeight: 15,
    color: BURGER_COLORS.muted,
    marginTop: 6,
  },
  bottomSection: {
    marginTop: 20,
  },
  button: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BURGER_COLORS.primary,
    borderRadius: 15,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  buttonArrow: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
