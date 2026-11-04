import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { tr } = useLanguage();

  const fullName =
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
<<<<<<< HEAD
    'Tín đồ ẩm thực';

  const roleLabel: Record<string, string> = {
    CUSTOMER: 'Khách hàng',
    RESTAURANT_OWNER: 'Chủ nhà hàng',
    DRIVER: 'Tài xế',
    ADMIN: 'Quản trị viên',
=======
    tr('Tín đồ ẩm thực', 'Food Lover');

  const roleLabel: Record<string, string> = {
    CUSTOMER: tr('Khách hàng', 'Customer'),
    RESTAURANT_OWNER: tr('Chủ nhà hàng', 'Restaurant Owner'),
    DRIVER: tr('Tài xế', 'Driver'),
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  };

  const displayRole = user?.role
    ? roleLabel[user.role] ?? user.role
<<<<<<< HEAD
    : 'Thành viên';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />
=======
    : tr('Thành viên', 'Member');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BURGER_COLORS.background} />
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6

      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
        contentContainerStyle={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
<<<<<<< HEAD
          <View>
            <Text style={styles.headerCaption}>TÀI KHOẢN CỦA BẠN</Text>
            <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
=======
          <View style={styles.headerLeft}>
            <Text style={styles.headerCaption}>
              {tr('TÀI KHOẢN CỦA BẠN', 'YOUR ACCOUNT')}
            </Text>
            <Text style={styles.headerTitle}>
              {tr('Hồ sơ cá nhân', 'My Profile')}
            </Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
          </View>

          <LanguageSwitch />
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Ionicons
                name="person"
                size={40}
                color={BURGER_COLORS.primary}
              />
            </View>

            <View style={styles.onlineIndicator} />
          </View>

          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.email}>
<<<<<<< HEAD
            {user?.email ?? 'Chưa có email'}
=======
            {user?.email ?? tr('Chưa có email', 'No email available')}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
          </Text>

          <View style={styles.roleBadge}>
            <Ionicons
              name="shield-checkmark"
              size={15}
              color={BURGER_COLORS.primary}
            />
            <Text style={styles.roleText}>{displayRole}</Text>
          </View>
        </View>

<<<<<<< HEAD
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
=======
        {/* Language Setting */}
        <Text style={styles.sectionTitle}>
          {tr('Tùy chọn hiển thị', 'Display Preferences')}
        </Text>
        <View style={styles.langSection}>
          <LanguageSwitch variant="card" />
        </View>

        {/* Account details */}
        <Text style={styles.sectionTitle}>
          {tr('Thông tin tài khoản', 'Account Information')}
        </Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="person-outline"
                size={20}
                color={BURGER_COLORS.primary}
              />
            </View>

            <View style={styles.infoContent}>
<<<<<<< HEAD
              <Text style={styles.infoLabel}>Họ và tên</Text>
=======
              <Text style={styles.infoLabel}>
                {tr('Họ và tên', 'Full name')}
              </Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
              <Text style={styles.infoValue}>{fullName}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={BURGER_COLORS.primary}
              />
            </View>

            <View style={styles.infoContent}>
<<<<<<< HEAD
              <Text style={styles.infoLabel}>Địa chỉ email</Text>
              <Text style={styles.infoValue}>
                {user?.email ?? 'Chưa cập nhật'}
=======
              <Text style={styles.infoLabel}>
                {tr('Địa chỉ Email', 'Email address')}
              </Text>
              <Text style={styles.infoValue}>
                {user?.email ?? tr('Chưa cung cấp', 'Not provided')}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
              </Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="ribbon-outline"
                size={20}
                color={BURGER_COLORS.primary}
              />
            </View>

            <View style={styles.infoContent}>
<<<<<<< HEAD
              <Text style={styles.infoLabel}>Vai trò tài khoản</Text>
=======
              <Text style={styles.infoLabel}>
                {tr('Vai trò tài khoản', 'Account role')}
              </Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
              <Text style={styles.infoValue}>{displayRole}</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
<<<<<<< HEAD
        <Text style={styles.sectionTitle}>Thao tác tài khoản</Text>
=======
        <Text style={styles.sectionTitle}>
          {tr('Tác vụ tài khoản', 'Account Actions')}
        </Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6

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
              color={BURGER_COLORS.danger}
            />
          </View>

<<<<<<< HEAD
          <Text style={styles.logoutText}>Đăng xuất</Text>
=======
          <Text style={styles.logoutText}>
            {tr('Đăng xuất', 'Log Out')}
          </Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6

          <View style={styles.logoutArrow}>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={BURGER_COLORS.danger}
            />
          </View>
        </Pressable>
<<<<<<< HEAD

        <View style={styles.footer}>
          <Ionicons name="heart" size={13} color="#FF6B35" />
          <Text style={styles.footerText}>
            Dành trọn tâm huyết cho tín đồ ẩm thực
          </Text>
        </View>
=======
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
=======
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 35,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerCaption: {
    color: BURGER_COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: BURGER_COLORS.text,
    letterSpacing: -0.6,
  },
  profileCard: {
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
    marginBottom: 22,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: BURGER_COLORS.primaryLight,
    borderWidth: 2,
    borderColor: BURGER_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    right: 1,
    bottom: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BURGER_COLORS.success,
    borderWidth: 3,
    borderColor: BURGER_COLORS.surface,
  },
  name: {
    fontSize: 21,
    fontWeight: '800',
    color: BURGER_COLORS.text,
    textAlign: 'center',
    marginBottom: 5,
  },
  email: {
    fontSize: 13,
    color: BURGER_COLORS.muted,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BURGER_COLORS.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginTop: 12,
  },
  roleText: {
    color: BURGER_COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  langSection: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BURGER_COLORS.text,
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    paddingHorizontal: 14,
    marginBottom: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: BURGER_COLORS.muted,
    marginBottom: 3,
    padding:1
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: BURGER_COLORS.text,
  },
  rowDivider: {
    height: 1,
    backgroundColor: BURGER_COLORS.border,
    marginLeft: 52,
  },
  logoutButton: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BURGER_COLORS.dangerLight,
    backgroundColor: BURGER_COLORS.surface,
    gap: 12,
  },
  logoutPressed: {
    opacity: 0.88,
  },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BURGER_COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: BURGER_COLORS.danger,
  },
  logoutArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: BURGER_COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
