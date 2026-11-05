import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/axios';

const COLORS = {
  background: '#FFF9F5',
  surface: '#FFFFFF',
  primary: '#FF6B35',
  primaryLight: '#FFF0E8',
  text: '#29232A',
  muted: '#8B8289',
  border: '#F0E8E3',
  red: '#E5484D',
  redLight: '#FDEBEC',
  green: '#16A34A',
  greenLight: '#DCFCE7',
};

export default function DriverProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const { data: ratingData, isLoading: ratingLoading } = useQuery<{
    averageRating: number | null;
  }>({
    queryKey: ['driver-rating', user?.id],
    queryFn: () =>
      api
        .get<{
          averageRating: number | null;
        }>(`/reviews/driver/${user?.id}/average`)
        .then((r) => r.data),
    enabled: !!user?.id,
  });

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    'Tài xế giao hàng';

  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() ||
    'TX';

  function openEditModal() {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setPhone(user?.phone ?? '');
    setIsEditModalVisible(true);
  }

  async function handleSaveProfile() {
    if (!firstName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên của bạn.');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
      setIsEditModalVisible(false);
      Alert.alert('Thành công', 'Thông tin tài xế đã được cập nhật.');
    } catch (error: any) {
      Alert.alert(
        'Không thể cập nhật',
        error?.response?.data?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      Alert.alert(
        'Đăng xuất thất bại',
        'Đã xảy ra lỗi khi đăng xuất. Vui lòng thử lại.',
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  function confirmLogout() {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản tài xế?',
      [
        {
          text: 'Ở lại',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => {
            void handleLogout();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>TRUNG TÂM TÀI XẾ</Text>
            <Text style={styles.pageTitle}>Hồ sơ cá nhân</Text>
            <Text style={styles.pageSubtitle}>
              Quản lý thông tin tài xế và nhận đơn giao hàng
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.editHeaderButton,
              pressed && styles.pressed,
            ]}
            onPress={openEditModal}
            accessibilityLabel="Chỉnh sửa thông tin"
          >
            <Ionicons name="create-outline" size={19} color={COLORS.primary} />
            <Text style={styles.editHeaderText}>Sửa</Text>
          </Pressable>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            <View style={styles.profileIdentity}>
              <Text style={styles.name}>{fullName}</Text>
              <Text style={styles.email}>{user?.email ?? ''}</Text>

              <View style={styles.roleBadge}>
                <View style={styles.roleDot} />
                <Text style={styles.roleText}>Tài xế giao hàng</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* SĐT */}
          <View style={styles.infoRow}>
            <View
              style={[
                styles.infoIcon,
                { backgroundColor: user?.phone ? '#DCFCE7' : COLORS.primaryLight },
              ]}
            >
              <Ionicons
                name="call-outline"
                size={20}
                color={user?.phone ? COLORS.green : COLORS.primary}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>SỐ ĐIỆN THOẠI LIÊN HỆ</Text>
              <Text
                style={[
                  styles.infoValue,
                  !user?.phone && styles.infoValueMissing,
                ]}
              >
                {user?.phone ? user.phone : 'Chưa cập nhật (Bấm sửa để thêm)'}
              </Text>
              <Text style={styles.infoHelper}>
                Nhà hàng và khách hàng sẽ gọi vào số này trong quá trình giao nhận món.
              </Text>
            </View>
            <Pressable style={styles.editRowBtn} onPress={openEditModal}>
              <Ionicons name="pencil" size={14} color={COLORS.primary} />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Email */}
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>ĐỊA CHỈ EMAIL</Text>
              <Text style={styles.infoValue}>{user?.email || 'Chưa cập nhật'}</Text>
            </View>
            <Ionicons name="lock-closed-outline" size={16} color="#C4BAB4" />
          </View>

          <View style={styles.divider} />

          {/* Vai trò */}
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="bicycle-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>VAI TRÒ TÀI KHOẢN</Text>
              <Text style={styles.infoValue}>Tài xế đối tác (DeliFood)</Text>
            </View>
            <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.green} />
          </View>
        </View>

        {/* Nút bấm chỉnh sửa thông tin nổi bật */}
        <Pressable
          style={({ pressed }) => [
            styles.editActionButton,
            pressed && styles.pressed,
          ]}
          onPress={openEditModal}
        >
          <Ionicons name="create-outline" size={18} color="#FFFFFF" />
          <Text style={styles.editActionText}>Chỉnh sửa thông tin cá nhân</Text>
        </Pressable>

        {/* Đánh giá tài xế */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Đánh giá của bạn</Text>
          <Text style={styles.sectionEmoji}>⭐</Text>
        </View>

        <View style={styles.ratingCard}>
          <View style={styles.ratingIcon}>
            <Text style={styles.ratingIconText}>★</Text>
          </View>

          <View style={styles.ratingContent}>
            <Text style={styles.ratingTitle}>Điểm đánh giá tài xế</Text>

            {ratingLoading ? (
              <View style={styles.ratingLoading}>
                <ActivityIndicator size="small" color="#FF6B35" />
                <Text style={styles.ratingDescription}>
                  Đang tải đánh giá...
                </Text>
              </View>
            ) : ratingData?.averageRating != null ? (
              <>
                <View style={styles.ratingValueRow}>
                  <Text style={styles.ratingValue}>
                    {ratingData.averageRating.toFixed(1)}
                  </Text>
                  <Text style={styles.ratingOutOf}>/ 5.0</Text>
                  <Text style={styles.ratingStar}>★</Text>
                </View>
                <Text style={styles.ratingDescription}>
                  Điểm trung bình từ khách hàng
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.noRating}>Chưa có đánh giá</Text>
                <Text style={styles.ratingDescription}>
                  Điểm số sẽ xuất hiện sau khi bạn hoàn thành các đơn giao.
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Tip Card */}
        <View style={styles.tipCard}>
          <Text style={styles.tipEmoji}>🛵</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Mẹo nhận đơn</Text>
            <Text style={styles.tipDescription}>
              Giữ số điện thoại chính xác giúp quán gọi bạn nhanh khi món đã chuẩn bị xong, rút ngắn thời gian chờ đợi.
            </Text>
          </View>
        </View>

        {/* Đăng xuất */}
        <View style={styles.logoutSection}>
          <Text style={styles.sectionTitle}>Thao tác tài khoản</Text>

          <Pressable
            accessibilityRole="button"
            disabled={isLoggingOut}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.pressed,
              isLoggingOut && styles.disabledButton,
            ]}
            onPress={confirmLogout}
          >
            {isLoggingOut ? (
              <ActivityIndicator color={COLORS.red} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
                <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
                <Text style={styles.logoutArrow}>›</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={styles.footer}>DeliFood · Dành cho tài xế giao hàng</Text>
      </ScrollView>

      {/* Modal chỉnh sửa thông tin cá nhân */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalHeaderEyebrow}>TÀI XẾ</Text>
              <Text style={styles.modalHeaderTitle}>Chỉnh sửa thông tin</Text>
            </View>

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setIsEditModalVisible(false)}
            >
              <Ionicons name="close" size={22} color={COLORS.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={true}
          >
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>
                Họ & tên đệm <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.inputField}
                placeholder="VD: Trần Văn"
                placeholderTextColor="#A89EA6"
                value={firstName}
                onChangeText={setFirstName}
                editable={!isSaving}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>
                Tên <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.inputField}
                placeholder="VD: Hoàng"
                placeholderTextColor="#A89EA6"
                value={lastName}
                onChangeText={setLastName}
                editable={!isSaving}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.phoneLabelRow}>
                <Text style={styles.inputLabel}>Số điện thoại liên hệ</Text>
                <View style={styles.recommendBadge}>
                  <Text style={styles.recommendBadgeText}>Bắt buộc khi giao hàng</Text>
                </View>
              </View>
              <Text style={styles.inputHint}>
                Số này sẽ hiển thị cho quán và khách hàng gọi cho bạn khi lấy/giao món.
              </Text>
              <TextInput
                style={styles.inputField}
                placeholder="VD: 0987654321"
                placeholderTextColor="#A89EA6"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!isSaving}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                isSaving && styles.saveButtonDisabled,
                pressed && !isSaving && styles.pressed,
              ]}
              onPress={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 35,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 5,
  },
  editHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  editHeaderText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 25,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
  },
  profileIdentity: {
    flex: 1,
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 3,
  },
  email: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: '#F7F0EB',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  infoValueMissing: {
    color: '#D97706',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  infoHelper: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 3,
    lineHeight: 15,
  },
  editRowBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  editActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionEmoji: {
    fontSize: 18,
  },
  ratingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF4D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingIconText: {
    fontSize: 24,
    color: '#D97706',
  },
  ratingContent: {
    flex: 1,
  },
  ratingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  ratingLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  ratingValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },
  ratingOutOf: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
  },
  ratingStar: {
    fontSize: 16,
    color: '#D97706',
    marginLeft: 2,
  },
  ratingDescription: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  noRating: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFF0E8',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  tipEmoji: {
    fontSize: 22,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8A3B14',
    marginBottom: 3,
  },
  tipDescription: {
    fontSize: 12,
    color: '#A85A32',
    lineHeight: 18,
  },
  logoutSection: {
    gap: 10,
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F8D7DA',
  },
  logoutText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.red,
    marginLeft: 10,
  },
  logoutArrow: {
    fontSize: 20,
    color: COLORS.red,
  },
  disabledButton: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#A1989E',
    marginTop: 4,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalHeaderEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
    gap: 16,
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  requiredStar: {
    color: COLORS.red,
  },
  phoneLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recommendBadge: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.green,
  },
  inputHint: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 16,
  },
  inputField: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
