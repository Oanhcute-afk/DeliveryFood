import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

const COLORS = {
  background: BURGER_COLORS.background,
  surface: BURGER_COLORS.surface,
  primary: BURGER_COLORS.primary,
  primaryLight: BURGER_COLORS.primaryLight,
  text: BURGER_COLORS.text,
  muted: BURGER_COLORS.muted,
  border: BURGER_COLORS.border,
  red: BURGER_COLORS.danger,
  redLight: BURGER_COLORS.dangerLight,
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { tr } = useLanguage();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fullName =
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
    tr('Người dùng', 'User');

  const initials =
    `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`
      .trim()
      .toUpperCase() || 'U';

  const roleLabels: Record<string, string> = {
    CUSTOMER: tr('Khách hàng', 'Customer'),
    RESTAURANT_OWNER: tr('Chủ nhà hàng', 'Restaurant Owner'),
    DRIVER: tr('Tài xế giao hàng', 'Delivery Driver'),
  };

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      Alert.alert(
        tr('Đăng xuất thất bại', 'Logout failed'),
        tr(
          'Đã xảy ra lỗi khi đăng xuất. Vui lòng thử lại.',
          'An error occurred while logging out. Please try again.',
        ),
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  function confirmLogout() {
    Alert.alert(
      tr('Đăng xuất', 'Log Out'),
      tr(
        'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?',
        'Are you sure you want to log out of your account?',
      ),
      [
        {
          text: tr('Ở lại', 'Stay'),
          style: 'cancel',
        },
        {
          text: tr('Đăng xuất', 'Log Out'),
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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.eyebrow}>
              {tr('KÊNH NHÀ HÀNG', 'MERCHANT ACCOUNT')}
            </Text>
            <Text style={styles.title}>{tr('Tài khoản', 'My Profile')}</Text>
            <Text style={styles.subtitle}>
              {tr(
                'Quản lý thông tin cá nhân của bạn',
                'Manage your personal & merchant account',
              )}
            </Text>
          </View>

          <LanguageSwitch />
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.email}>
            {user?.email || tr('Chưa có email', 'No email')}
          </Text>

          <View style={styles.roleBadge}>
            <View style={styles.roleDot} />
            <Text style={styles.roleText}>
              {roleLabels[user?.role ?? ''] ??
                user?.role ??
                tr('Thành viên', 'Member')}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {tr('Tùy chọn hiển thị', 'Display Preferences')}
        </Text>
        <View style={styles.langWrap}>
          <LanguageSwitch variant="card" />
        </View>

        <Text style={styles.sectionTitle}>
          {tr('Thông tin cá nhân', 'Personal Information')}
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>👤</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {tr('Họ và tên', 'Full name')}
              </Text>
              <Text style={styles.infoValue}>{fullName}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>✉️</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {tr('Địa chỉ email', 'Email address')}
              </Text>
              <Text style={styles.infoValue}>
                {user?.email || tr('Chưa cập nhật', 'Not provided')}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>🏷️</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {tr('Vai trò tài khoản', 'Account role')}
              </Text>
              <Text style={styles.infoValue}>
                {roleLabels[user?.role ?? ''] ??
                  user?.role ??
                  tr('Thành viên', 'Member')}
              </Text>
            </View>
          </View>
        </View>

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
              <Text style={styles.logoutIcon}>↪</Text>
              <Text style={styles.logoutText}>
                {tr('Đăng xuất', 'Log Out')}
              </Text>
              <Text style={styles.logoutArrow}>›</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
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
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 22,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  name: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  email: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 5,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 12,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  roleText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  langWrap: {
    marginBottom: 22,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoEmoji: {
    fontSize: 18,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 3,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.redLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginTop: 22,
    gap: 12,
  },
  logoutIcon: {
    color: COLORS.red,
    fontSize: 22,
    fontWeight: '700',
  },
  logoutText: {
    flex: 1,
    color: COLORS.red,
    fontSize: 15,
    fontWeight: '800',
  },
  logoutArrow: {
    color: COLORS.red,
    fontSize: 24,
  },
  pressed: {
    opacity: 0.88,
  },
  disabledButton: {
    opacity: 0.55,
  },
});
