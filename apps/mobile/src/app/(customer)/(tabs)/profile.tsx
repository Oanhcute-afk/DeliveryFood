import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const fullName =
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
    'Tín đồ ẩm thực';

  const roleLabel: Record<string, string> = {
    CUSTOMER: 'Khách hàng',
    RESTAURANT_OWNER: 'Chủ nhà hàng',
    DRIVER: 'Tài xế',
    ADMIN: 'Quản trị viên',
  };

  const displayRole = user?.role
    ? roleLabel[user.role] ?? user.role
    : 'Thành viên';

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
      Alert.alert('Thành công', 'Thông tin cá nhân đã được cập nhật.');
    } catch (error: any) {
      Alert.alert(
        'Không thể cập nhật',
        error?.response?.data?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />

      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
        contentContainerStyle={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerCaption}>TÀI KHOẢN CỦA BẠN</Text>
            <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.editHeaderButton,
              pressed && styles.pressed,
            ]}
            onPress={openEditModal}
            accessibilityLabel="Chỉnh sửa thông tin"
          >
            <Ionicons name="create-outline" size={20} color="#FF6B35" />
            <Text style={styles.editHeaderText}>Sửa</Text>
          </Pressable>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Ionicons
                name="person"
                size={42}
                color="#FF6B35"
              />
            </View>

            <View style={styles.onlineIndicator} />
          </View>

          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.email}>
            {user?.email ?? 'Chưa có email'}
          </Text>

          <View style={styles.roleBadge}>
            <Ionicons
              name="shield-checkmark"
              size={15}
              color="#FF6B35"
            />
            <Text style={styles.roleText}>{displayRole}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.editButton,
              pressed && styles.pressed,
            ]}
            onPress={openEditModal}
          >
            <Ionicons name="pencil" size={15} color="#FF6B35" />
            <Text style={styles.editButtonText}>Chỉnh sửa thông tin cá nhân</Text>
          </Pressable>

          <View style={styles.profileDivider} />

          <View style={styles.memberInfo}>
            <View style={styles.memberIcon}>
              <Ionicons
                name="heart"
                size={19}
                color="#FF6B35"
              />
            </View>

            <View style={styles.memberTextContainer}>
              <Text style={styles.memberTitle}>Chào mừng đến với DeliFood</Text>
              <Text style={styles.memberSubtitle}>
                Món ngon mỗi ngày, niềm vui trọn vẹn.
              </Text>
            </View>

            <Ionicons
              name="checkmark-circle"
              size={21}
              color="#37A66B"
            />
          </View>
        </View>

        {/* Account details */}
        <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>

        <View style={styles.infoCard}>
          <Pressable style={styles.infoRow} onPress={openEditModal}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#FF6B35"
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Họ và tên</Text>
              <Text style={styles.infoValue}>{fullName}</Text>
            </View>

            <Ionicons
              name="create-outline"
              size={18}
              color="#FF6B35"
            />
          </Pressable>

          <View style={styles.rowDivider} />

          <Pressable style={styles.infoRow} onPress={openEditModal}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="call-outline"
                size={20}
                color="#FF6B35"
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Số điện thoại liên hệ</Text>
              <Text style={styles.infoValue}>
                {user?.phone ? user.phone : 'Chưa cập nhật (Bấm để thêm)'}
              </Text>
            </View>

            <Ionicons
              name="create-outline"
              size={18}
              color="#FF6B35"
            />
          </Pressable>

          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#FF6B35"
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Địa chỉ email</Text>
              <Text style={styles.infoValue}>
                {user?.email ?? 'Chưa cập nhật'}
              </Text>
            </View>

            <Ionicons
              name="lock-closed-outline"
              size={16}
              color="#C4BAB4"
            />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="ribbon-outline"
                size={20}
                color="#FF6B35"
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Vai trò tài khoản</Text>
              <Text style={styles.infoValue}>{displayRole}</Text>
            </View>

            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color="#37A66B"
            />
          </View>
        </View>

        {/* Logout */}
        <Text style={styles.sectionTitle}>Thao tác tài khoản</Text>

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutPressed,
          ]}
          onPress={() => {
            void logout();
          }}
        >
          <View style={styles.logoutIcon}>
            <Ionicons
              name="log-out-outline"
              size={22}
              color="#E34D4D"
            />
          </View>

          <Text style={styles.logoutText}>Đăng xuất</Text>

          <View style={styles.logoutArrow}>
            <Ionicons
              name="arrow-forward"
              size={18}
              color="#E34D4D"
            />
          </View>
        </Pressable>

        <View style={styles.footer}>
          <Ionicons name="heart" size={13} color="#FF6B35" />
          <Text style={styles.footerText}>
            Dành trọn tâm huyết cho tín đồ ẩm thực
          </Text>
        </View>
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
              <Text style={styles.modalHeaderEyebrow}>TÀI KHOẢN</Text>
              <Text style={styles.modalHeaderTitle}>Chỉnh sửa thông tin</Text>
            </View>

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setIsEditModalVisible(false)}
            >
              <Ionicons name="close" size={22} color="#29232A" />
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
                placeholder="VD: Nguyễn Văn"
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
                placeholder="VD: An"
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
                  <Text style={styles.recommendBadgeText}>Khuyên dùng</Text>
                </View>
              </View>
              <Text style={styles.inputHint}>
                Tài xế giao hàng sẽ gọi vào số này khi đến nơi để giao món cho bạn.
              </Text>
              <TextInput
                style={styles.inputField}
                placeholder="VD: 0912345678"
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
  screen: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  headerCaption: {
    color: '#FF6B35',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 7,
  },
  headerTitle: {
    fontSize: 29,
    fontWeight: '800',
    color: '#29232A',
    letterSpacing: -0.7,
  },
  editHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEEE5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  editHeaderText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF6B35',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    paddingHorizontal: 20,
    paddingTop: 27,
    paddingBottom: 18,
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 32,
    backgroundColor: '#FFF0E7',
    borderWidth: 3,
    borderColor: '#FFE0D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    right: 1,
    bottom: 2,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#37A66B',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  name: {
    fontSize: 23,
    fontWeight: '800',
    color: '#29232A',
    textAlign: 'center',
    marginBottom: 7,
  },
  email: {
    fontSize: 13,
    color: '#8B8289',
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFF0E7',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginTop: 15,
  },
  roleText: {
    color: '#E85B28',
    fontSize: 12,
    fontWeight: '700',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF4EE',
    borderWidth: 1,
    borderColor: '#FCD8C8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 14,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#F2ECE8',
    width: '100%',
    marginTop: 22,
    marginBottom: 17,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  memberIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF0E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberTextContainer: {
    flex: 1,
  },
  memberTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#393039',
    marginBottom: 4,
  },
  memberSubtitle: {
    fontSize: 11,
    color: '#A49AA0',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#29232A',
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    paddingHorizontal: 15,
    marginBottom: 29,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  infoIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#FFF3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#A49AA0',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#393039',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F4EFEB',
    marginLeft: 55,
  },
  logoutButton: {
    minHeight: 67,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F6DADA',
    backgroundColor: '#FFFFFF',
    gap: 13,
  },
  logoutPressed: {
    opacity: 0.75,
  },
  logoutIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#E34D4D',
  },
  logoutArrow: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 28,
  },
  footerText: {
    fontSize: 10,
    color: '#A49AA0',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8E3',
  },
  modalHeaderEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6B35',
    letterSpacing: 1.2,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#29232A',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3ECEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 80,
    gap: 16,
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#29232A',
  },
  requiredStar: {
    color: '#E34D4D',
  },
  phoneLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recommendBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  inputHint: {
    fontSize: 11,
    color: '#8B8289',
    lineHeight: 16,
    marginBottom: 4,
  },
  inputField: {
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DED8',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#29232A',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    minHeight: 52,
    borderRadius: 16,
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
  pressed: {
    opacity: 0.8,
  },
});
