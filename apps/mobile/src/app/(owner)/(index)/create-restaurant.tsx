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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/lib/axios';
import { useImageUploader } from '@/lib/uploadthing';

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
      Alert.alert('Thành công', 'Ảnh nhà hàng đã được tải lên.');
    },
    onUploadError: (error) => {
      Alert.alert('Tải ảnh thất bại', error.message);
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
        'Không thể tạo nhà hàng',
        e?.response?.data?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.',
      );
    },
  });

  function handleSubmit() {
    if (!name.trim() || !specificAddress || !cuisineType.trim()) {
      Alert.alert(
        'Thiếu thông tin',
        'Vui lòng nhập tên nhà hàng, địa chỉ cụ thể (số nhà, số tầng chung cư, tên đường) và loại ẩm thực.',
      );
      return;
    }

    createRestaurant();
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerEmoji}>🍽️</Text>
        </View>

        <Text style={styles.eyebrow}>FOOD DELIVERY · ĐỐI TÁC</Text>
        <Text style={styles.title}>Tạo nhà hàng</Text>
        <Text style={styles.subtitle}>
          Hãy giới thiệu nhà hàng của bạn để khách hàng dễ dàng tìm thấy.
        </Text>
      </View>

      {/* Ảnh nhà hàng */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ảnh nhà hàng</Text>
          <Text style={styles.optionalLabel}>Không bắt buộc</Text>
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
                  'Chưa có quyền truy cập',
                  'Bạn cần cấp quyền truy cập thư viện ảnh trong phần Cài đặt.',
                  [
                    { text: 'Để sau', style: 'cancel' },
                    {
                      text: 'Mở Cài đặt',
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
          accessibilityLabel="Chọn ảnh nhà hàng"
        >
          {imageUrl ? (
            <>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
              <View style={styles.changeImageBadge}>
                <Text style={styles.changeImageText}>✎ Đổi ảnh</Text>
              </View>
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <View style={styles.uploadIcon}>
                {isUploading ? (
                  <ActivityIndicator color="#FF6B35" size="large" />
                ) : (
                  <Text style={styles.uploadEmoji}>📷</Text>
                )}
              </View>

              <Text style={styles.imagePickerTitle}>
                {isUploading ? 'Đang tải ảnh lên...' : 'Thêm ảnh nhà hàng'}
              </Text>
              <Text style={styles.imagePickerText}>
                {isUploading
                  ? 'Vui lòng chờ trong giây lát'
                  : 'Chạm để chọn ảnh từ thư viện'}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Thông tin nhà hàng */}
      <View style={styles.formCard}>
        <View style={styles.formHeading}>
          <Text style={styles.formHeadingTitle}>Thông tin cơ bản</Text>
          <Text style={styles.formHeadingSubtitle}>
            Các mục có dấu * là bắt buộc
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Tên nhà hàng <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Nhà hàng Món Ngon"
            placeholderTextColor="#B1A6AC"
            value={name}
            onChangeText={setName}
            maxLength={100}
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mô tả nhà hàng</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Giới thiệu món ăn đặc trưng và phong cách của bạn..."
            placeholderTextColor="#B1A6AC"
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
              Địa chỉ cụ thể <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.gpsBadge}>
              <Text style={styles.gpsBadgeText}>📍 Đã cài GPS</Text>
            </View>
          </View>
          <Text style={styles.addressSubtitle}>
            Ghi rõ số nhà/mặt bằng, số tầng chung cư và tên đường để tài xế & khách dễ tìm
          </Text>

          <View style={styles.addressSubCard}>
            <View style={styles.subField}>
              <Text style={styles.subLabel}>🏠 Số nhà / Ki-ốt / Mặt bằng</Text>
              <TextInput
                style={styles.subInput}
                placeholder="VD: Số 18 hoặc Ki-ốt Shophouse A02"
                placeholderTextColor="#B1A6AC"
                value={houseNumber}
                onChangeText={setHouseNumber}
                maxLength={100}
                returnKeyType="next"
              />
            </View>

            <View style={styles.subField}>
              <Text style={styles.subLabel}>
                🏢 Số tầng / Tòa chung cư (nếu có)
              </Text>
              <TextInput
                style={styles.subInput}
                placeholder="VD: Tầng 1, Tòa S2 Chung cư Vinhomes"
                placeholderTextColor="#B1A6AC"
                value={floorBuilding}
                onChangeText={setFloorBuilding}
                maxLength={120}
                returnKeyType="next"
              />
            </View>

            <View style={styles.subField}>
              <Text style={styles.subLabel}>🛣️ Tên đường / Ngõ, hẻm</Text>
              <TextInput
                style={styles.subInput}
                placeholder="VD: Đường Nguyễn Huệ, Ngõ 15..."
                placeholderTextColor="#B1A6AC"
                value={streetName}
                onChangeText={setStreetName}
                maxLength={150}
                returnKeyType="next"
              />
            </View>

            <View style={styles.subField}>
              <Text style={styles.subLabel}>
                📝 Ghi chú vị trí thêm (tùy chọn)
              </Text>
              <TextInput
                style={styles.subInput}
                placeholder="VD: Ngay mặt tiền cổng chính, cạnh siêu thị..."
                placeholderTextColor="#B1A6AC"
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
                    Địa chỉ cụ thể:{' '}
                  </Text>
                  {specificAddress}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.field, styles.lastField]}>
          <Text style={styles.label}>
            Loại ẩm thực <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputWithIcon}>
            <Text style={styles.fieldIcon}>🍜</Text>
            <TextInput
              style={styles.iconInput}
              placeholder="Ví dụ: Việt Nam, Ý, Trung Quốc"
              placeholderTextColor="#B1A6AC"
              value={cuisineType}
              onChangeText={setCuisineType}
              maxLength={100}
              returnKeyType="done"
            />
          </View>
          <Text style={styles.helperText}>
            Mô tả loại món ăn chính mà nhà hàng phục vụ.
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
              <Text style={styles.buttonText}>Đang tạo nhà hàng...</Text>
            </>
          ) : (
            <>
              <Text style={styles.buttonText}>Tạo nhà hàng</Text>
              <Text style={styles.buttonArrow}>→</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.footerText}>
          Kiểm tra địa chỉ cụ thể và thông tin trước khi tạo nhà hàng.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 38,
  },

  // Header
  header: {
    marginBottom: 27,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 19,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerEmoji: {
    fontSize: 28,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#FF6B35',
    marginBottom: 7,
  },
  title: {
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '900',
    color: '#29232A',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 19,
    color: '#8B8289',
    marginTop: 8,
    maxWidth: 330,
  },

  // Ảnh
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#29232A',
  },
  optionalLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A1989E',
  },
  imagePicker: {
    height: 190,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F0D9CC',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
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
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadEmoji: {
    fontSize: 26,
  },
  imagePickerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#39313A',
    marginBottom: 5,
  },
  imagePickerText: {
    fontSize: 11,
    color: '#A1989E',
    textAlign: 'center',
  },
  changeImageBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(41, 35, 42, 0.82)',
  },
  changeImageText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.8,
  },

  // Form
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    padding: 18,
  },
  formHeading: {
    marginBottom: 22,
  },
  formHeadingTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#29232A',
  },
  formHeadingSubtitle: {
    fontSize: 11,
    color: '#A1989E',
    marginTop: 5,
  },
  field: {
    marginBottom: 21,
  },
  lastField: {
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#39313A',
    marginBottom: 9,
  },
  required: {
    color: '#FF6B35',
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 5,
  },
  gpsBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  gpsBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  addressSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: '#8B8289',
    marginBottom: 11,
  },
  addressSubCard: {
    backgroundColor: '#FFFCFA',
    borderWidth: 1,
    borderColor: '#EEE5E0',
    borderRadius: 16,
    padding: 13,
    gap: 11,
  },
  subField: {
    gap: 5,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#39313A',
  },
  subInput: {
    minHeight: 45,
    borderWidth: 1,
    borderColor: '#EEE5E0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 13,
    color: '#29232A',
  },
  addressPreviewBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: '#FFF0E8',
    borderRadius: 12,
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
    color: '#FF6B35',
  },
  addressPreviewText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#29232A',
  },
  input: {
    minHeight: 49,
    borderWidth: 1,
    borderColor: '#EEE5E0',
    borderRadius: 13,
    backgroundColor: '#FFFCFA',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: '#29232A',
  },
  multilineInput: {
    minHeight: 105,
    paddingTop: 13,
  },
  characterCount: {
    fontSize: 10,
    color: '#A1989E',
    textAlign: 'right',
    marginTop: 6,
  },
  inputWithIcon: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE5E0',
    borderRadius: 13,
    backgroundColor: '#FFFCFA',
    paddingHorizontal: 12,
  },
  fieldIcon: {
    fontSize: 17,
    marginRight: 9,
  },
  iconInput: {
    flex: 1,
    minHeight: 47,
    paddingVertical: 10,
    fontSize: 13,
    color: '#29232A',
  },
  helperText: {
    fontSize: 10,
    lineHeight: 15,
    color: '#A1989E',
    marginTop: 7,
  },

  // Nút tạo nhà hàng
  bottomSection: {
    marginTop: 22,
  },
  button: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 15,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  buttonArrow: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerText: {
    fontSize: 10,
    color: '#A1989E',
    textAlign: 'center',
    marginTop: 13,
  },
});
