import { useEffect, useState } from 'react';
import { openSettings } from 'expo-linking';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/lib/axios';
import { useImageUploader } from '@/lib/uploadthing';
import { RestaurantType } from '@food-delivery/types';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

export default function EditRestaurantScreen() {
  const { tr } = useLanguage();
  const queryClient = useQueryClient();

  const {
    data: restaurant,
    isLoading: isRestaurantLoading,
    isError: isRestaurantError,
    refetch,
  } = useQuery<RestaurantType | null>({
    queryKey: ['my-restaurant'],
    queryFn: () =>
      api
        .get<RestaurantType | null>('/restaurants/mine')
        .then((res) => res.data),
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name);
      setDescription(restaurant.description ?? '');
      setAddress(restaurant.address);
      setCuisineType(restaurant.cuisineType);
      setImageUrl(restaurant.imageUrl);
    }
  }, [restaurant]);

  const { openImagePicker, isUploading } = useImageUploader('restaurantImage', {
    onClientUploadComplete: (res) => {
      setImageUrl(res[0].ufsUrl);
      Alert.alert(
        tr('Thành công', 'Success'),
        tr('Ảnh nhà hàng đã được cập nhật.', 'Restaurant photo updated.'),
      );
    },
    onUploadError: (error) => {
      Alert.alert(tr('Tải ảnh thất bại', 'Upload failed'), error.message);
    },
  });

  const { mutate: updateRestaurant, isPending } = useMutation({
    mutationFn: () =>
      api.patch(`/restaurants/${restaurant?.id}`, {
        name: name.trim(),
        description: description.trim(),
        address: address.trim(),
        cuisineType: cuisineType.trim(),
        imageUrl,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-restaurant'] });
      router.back();
    },
    onError: (e: any) => {
      Alert.alert(
        tr('Không thể cập nhật nhà hàng', 'Unable to update restaurant'),
        e?.response?.data?.message ??
          tr('Đã xảy ra lỗi. Vui lòng thử lại.', 'An error occurred. Please try again.'),
      );
    },
  });

  function handleSave() {
    if (!name.trim() || !address.trim() || !cuisineType.trim()) {
      Alert.alert(
        tr('Thiếu thông tin', 'Missing information'),
        tr(
          'Vui lòng nhập tên nhà hàng, địa chỉ và loại ẩm thực.',
          'Please enter restaurant name, address, and cuisine type.',
        ),
      );
      return;
    }

    if (!restaurant?.id) {
      Alert.alert(
        tr('Không tìm thấy nhà hàng', 'Restaurant not found'),
        tr(
          'Không thể xác định nhà hàng cần cập nhật.',
          'Unable to identify the restaurant to update.',
        ),
      );
      return;
    }

    updateRestaurant();
  }

  if (isRestaurantLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BURGER_COLORS.primary} />
        <Text style={styles.loadingText}>
          {tr('Đang tải thông tin nhà hàng...', 'Loading restaurant info...')}
        </Text>
      </SafeAreaView>
    );
  }

  if (isRestaurantError || !restaurant) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorEmoji}>🍔</Text>
        </View>
        <Text style={styles.errorTitle}>
          {tr('Không tải được nhà hàng', 'Unable to load restaurant')}
        </Text>
        <Text style={styles.errorDescription}>
          {tr(
            'Vui lòng kiểm tra kết nối và thử tải lại thông tin.',
            'Please check your connection and try again.',
          )}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => {
            void refetch();
          }}
        >
          <Text style={styles.retryButtonText}>
            {tr('Thử lại', 'Retry')}
          </Text>
        </Pressable>
      </SafeAreaView>
    );
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
            <Pressable
              style={({ pressed }) => [
                styles.backBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => router.back()}
            >
              <Text style={styles.backBtnText}>←</Text>
            </Pressable>
            <LanguageSwitch />
          </View>

          <Text style={styles.eyebrow}>
            {tr('ĐỐI TÁC NHÀ HÀNG', 'RESTAURANT PARTNER')}
          </Text>
          <Text style={styles.title}>
            {tr('Chỉnh sửa nhà hàng', 'Edit Restaurant')}
          </Text>
          <Text style={styles.subtitle}>
            {tr(
              'Cập nhật thông tin để khách hàng luôn nhìn thấy thông tin chính xác về nhà hàng của bạn.',
              'Keep your restaurant profile accurate and up to date.',
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

        {/* Form thông tin */}
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
              placeholder={tr('Nhập tên nhà hàng', 'Enter restaurant name')}
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
                'Giới thiệu món ăn và phong cách nhà hàng...',
                'Describe your signature dishes and style...',
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
            <Text style={styles.label}>
              {tr('Địa chỉ', 'Address')}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWithIcon}>
              <Text style={styles.fieldIcon}>📍</Text>
              <TextInput
                style={styles.iconInput}
                placeholder={tr('Nhập địa chỉ nhà hàng', 'Enter restaurant address')}
                placeholderTextColor={BURGER_COLORS.faint}
                value={address}
                onChangeText={setAddress}
                maxLength={250}
                returnKeyType="next"
              />
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
                'Loại món ăn chính mà nhà hàng phục vụ.',
                'Main type of cuisine served.',
              )}
            </Text>
          </View>
        </View>

        {/* Nút lưu */}
        <View style={styles.bottomSection}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              (isPending || isUploading) && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={isPending || isUploading}
            accessibilityRole="button"
          >
            {isPending ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.buttonText}>
                  {tr('Đang lưu thay đổi...', 'Saving changes...')}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.buttonText}>
                  {tr('Lưu thay đổi', 'Save Changes')}
                </Text>
                <Text style={styles.buttonArrow}>✓</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isPending || isUploading}
          >
            <Text style={styles.cancelButtonText}>
              {tr('Hủy và quay lại', 'Cancel & go back')}
            </Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: BURGER_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  loadingText: {
    fontSize: 13,
    color: BURGER_COLORS.muted,
    marginTop: 12,
  },
  errorIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorEmoji: {
    fontSize: 30,
  },
  errorTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: BURGER_COLORS.text,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: BURGER_COLORS.muted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  retryButton: {
    minWidth: 130,
    alignItems: 'center',
    backgroundColor: BURGER_COLORS.primary,
    borderRadius: 13,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: BURGER_COLORS.text,
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
    letterSpacing: -0.5,
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
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: BURGER_COLORS.muted,
  },
});
