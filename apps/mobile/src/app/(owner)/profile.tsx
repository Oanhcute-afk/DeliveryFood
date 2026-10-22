import { router } from 'expo-router';
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
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fullName =
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
    'Người dùng';

  const initials =
    `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`
      .trim()
      .toUpperCase() || 'U';

  const roleLabels: Record<string, string> = {
    CUSTOMER: 'Khách hàng',
    RESTAURANT_OWNER: 'Chủ nhà hàng',
    DRIVER: 'Tài xế giao hàng',
  };

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
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?',
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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>FOODDELIVERY</Text>
            <Text style={styles.title}>Tài khoản</Text>
            <Text style={styles.subtitle}>
              Quản lý thông tin cá nhân của bạn
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerEmoji}>👤</Text>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.email}>
            {user?.email || 'Chưa có email'}
          </Text>

          <View style={styles.roleBadge}>
            <View style={styles.roleDot} />
            <Text style={styles.roleText}>
              {roleLabels[user?.role ?? ''] ?? user?.role ?? 'Thành viên'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>👤</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Họ và tên</Text>
              <Text style={styles.infoValue}>{fullName}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>✉️</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Địa chỉ email</Text>
              <Text style={styles.infoValue}>
                {user?.email || 'Chưa cập nhật'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>🏷️</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Vai trò tài khoản</Text>
              <Text style={styles.infoValue}>
                {roleLabels[user?.role ?? ''] ?? user?.role ?? 'Thành viên'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipEmoji}>🍊</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Chào mừng bạn!</Text>
            <Text style={styles.tipDescription}>
              Cảm ơn bạn đã sử dụng FoodDelivery. Chúc bạn có trải nghiệm
              thật tuyệt vời.
            </Text>
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
              <Text style={styles.logoutText}>Đăng xuất</Text>
              <Text style={styles.logoutArrow}>›</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.footer}>FoodDelivery · Đặt món thật dễ dàng</Text>
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 35,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 23,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: {
    color: COLORS.text,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 5,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: {
    fontSize: 25,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 27,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  name: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  email: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 7,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 15,
  },
  roleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  roleText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 13,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoEmoji: {
    fontSize: 19,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 5,
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
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 18,
    padding: 16,
    marginTop: 20,
    gap: 12,
  },
  tipEmoji: {
    fontSize: 25,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 5,
  },
  tipDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#F5D8D8',
    borderRadius: 16,
    paddingHorizontal: 17,
    paddingVertical: 16,
    marginTop: 24,
    gap: 12,
  },
  logoutIcon: {
    color: COLORS.red,
    fontSize: 23,
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
    fontSize: 25,
  },
  pressed: {
    opacity: 0.75,
  },
  disabledButton: {
    opacity: 0.55,
  },
  footer: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 22,
  },
});