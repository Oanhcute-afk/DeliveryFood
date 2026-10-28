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
    tr('Tín đồ ẩm thực', 'Food Lover');

  const roleLabel: Record<string, string> = {
    CUSTOMER: tr('Khách hàng', 'Customer'),
    RESTAURANT_OWNER: tr('Chủ nhà hàng', 'Restaurant Owner'),
    DRIVER: tr('Tài xế', 'Driver'),
  };

  const displayRole = user?.role
    ? roleLabel[user.role] ?? user.role
    : tr('Thành viên', 'Member');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BURGER_COLORS.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerCaption}>
              {tr('TÀI KHOẢN CỦA BẠN', 'YOUR ACCOUNT')}
            </Text>
            <Text style={styles.headerTitle}>
              {tr('Hồ sơ cá nhân', 'My Profile')}
            </Text>
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
            {user?.email ?? tr('Chưa có email', 'No email available')}
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
              <Text style={styles.infoLabel}>
                {tr('Họ và tên', 'Full name')}
              </Text>
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
              <Text style={styles.infoLabel}>
                {tr('Địa chỉ Email', 'Email address')}
              </Text>
              <Text style={styles.infoValue}>
                {user?.email ?? tr('Chưa cung cấp', 'Not provided')}
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
              <Text style={styles.infoLabel}>
                {tr('Vai trò tài khoản', 'Account role')}
              </Text>
              <Text style={styles.infoValue}>{displayRole}</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <Text style={styles.sectionTitle}>
          {tr('Tác vụ tài khoản', 'Account Actions')}
        </Text>

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

          <Text style={styles.logoutText}>
            {tr('Đăng xuất', 'Log Out')}
          </Text>

          <View style={styles.logoutArrow}>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={BURGER_COLORS.danger}
            />
          </View>
        </Pressable>
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
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 35,
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
