import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/axios';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { tr } = useLanguage();

  const { data: ratingData, isLoading } = useQuery<{
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
    tr('Tài xế', 'Driver');

  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() ||
    'FD';

  const roleLabel =
    user?.role === 'DRIVER'
      ? tr('Tài xế giao hàng', 'Delivery Driver')
      : user?.role === 'CUSTOMER'
        ? tr('Khách hàng', 'Customer')
        : user?.role === 'RESTAURANT_OWNER'
          ? tr('Chủ nhà hàng', 'Restaurant Owner')
          : user?.role ?? tr('Thành viên', 'Member');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Tiêu đề */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.eyebrow}>
              {tr('TÀI KHOẢN TÀI XẾ', 'DRIVER ACCOUNT')}
            </Text>
            <Text style={styles.pageTitle}>
              {tr('Hồ sơ cá nhân', 'My Profile')}
            </Text>
            <Text style={styles.pageSubtitle}>
              {tr(
                'Quản lý thông tin tài khoản của bạn',
                'Manage your driver account details',
              )}
            </Text>
          </View>

          <LanguageSwitch />
        </View>

        {/* Thông tin người dùng */}
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
                <Text style={styles.roleText}>{roleLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>✉️</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {tr('ĐỊA CHỈ EMAIL', 'EMAIL ADDRESS')}
              </Text>
              <Text style={styles.infoValue}>
                {user?.email || tr('Chưa cập nhật', 'Not provided')}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>🪪</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {tr('VAI TRÒ TÀI KHOẢN', 'ACCOUNT ROLE')}
              </Text>
              <Text style={styles.infoValue}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {/* Tùy chọn ngôn ngữ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {tr('Tùy chọn hiển thị', 'Display Preferences')}
          </Text>
        </View>
        <View style={styles.langWrap}>
          <LanguageSwitch variant="card" />
        </View>

        {/* Đánh giá tài xế */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {tr('Đánh giá của bạn', 'Your Rating')}
          </Text>
          <Text style={styles.sectionEmoji}>⭐</Text>
        </View>

        <View style={styles.ratingCard}>
          <View style={styles.ratingIcon}>
            <Text style={styles.ratingIconText}>★</Text>
          </View>

          <View style={styles.ratingContent}>
            <Text style={styles.ratingTitle}>
              {tr('Điểm đánh giá tài xế', 'Driver Rating')}
            </Text>

            {isLoading ? (
              <View style={styles.ratingLoading}>
                <ActivityIndicator size="small" color={BURGER_COLORS.primary} />
                <Text style={styles.ratingDescription}>
                  {tr('Đang tải đánh giá...', 'Loading rating...')}
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
                  {tr(
                    'Điểm trung bình từ khách hàng',
                    'Average rating from customers',
                  )}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.noRating}>
                  {tr('Chưa có đánh giá', 'No ratings yet')}
                </Text>
                <Text style={styles.ratingDescription}>
                  {tr(
                    'Điểm số sẽ xuất hiện sau khi bạn nhận được đánh giá.',
                    'Ratings will appear after customers review your deliveries.',
                  )}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Đăng xuất */}
        <View style={styles.logoutSection}>
          <Text style={styles.sectionTitle}>
            {tr('Tài khoản', 'Account Actions')}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
            ]}
            onPress={() => {
              void logout();
            }}
            accessibilityRole="button"
            accessibilityLabel={tr('Đăng xuất tài khoản', 'Log out')}
          >
            <View style={styles.logoutIcon}>
              <Text style={styles.logoutIconText}>↪</Text>
            </View>

            <View style={styles.logoutContent}>
              <Text style={styles.logoutText}>
                {tr('Đăng xuất', 'Log Out')}
              </Text>
              <Text style={styles.logoutDescription}>
                {tr(
                  'Đăng xuất khỏi tài khoản hiện tại',
                  'Sign out of your current account',
                )}
              </Text>
            </View>

            <Text style={styles.logoutArrow}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BURGER_COLORS.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: BURGER_COLORS.primary,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: BURGER_COLORS.text,
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: 12,
    color: BURGER_COLORS.muted,
    marginTop: 4,
  },
  profileCard: {
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    marginBottom: 22,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: BURGER_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 23,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  profileIdentity: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  email: {
    fontSize: 12,
    color: BURGER_COLORS.muted,
    marginTop: 3,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: BURGER_COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 8,
    gap: 6,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BURGER_COLORS.primary,
  },
  roleText: {
    fontSize: 11,
    color: BURGER_COLORS.primaryDark,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: BURGER_COLORS.border,
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BURGER_COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoEmoji: {
    fontSize: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: BURGER_COLORS.muted,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: BURGER_COLORS.text,
  },
  langWrap: {
    marginBottom: 22,
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
    color: BURGER_COLORS.text,
  },
  sectionEmoji: {
    fontSize: 18,
  },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
  },
  ratingIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: BURGER_COLORS.cheeseLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingIconText: {
    fontSize: 26,
    color: BURGER_COLORS.cheese,
  },
  ratingContent: {
    flex: 1,
    paddingTop: 2,
  },
  ratingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: BURGER_COLORS.text,
    marginBottom: 5,
  },
  ratingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingValue: {
    fontSize: 26,
    fontWeight: '900',
    color: BURGER_COLORS.text,
  },
  ratingOutOf: {
    fontSize: 12,
    color: BURGER_COLORS.muted,
    marginTop: 6,
  },
  ratingStar: {
    fontSize: 17,
    color: BURGER_COLORS.cheese,
    marginLeft: 2,
  },
  ratingDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: BURGER_COLORS.muted,
    marginTop: 4,
  },
  ratingLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  noRating: {
    fontSize: 15,
    fontWeight: '800',
    color: BURGER_COLORS.textSoft,
  },
  logoutSection: {
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
    gap: 12,
  },
  logoutButtonPressed: {
    opacity: 0.88,
  },
  logoutIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: BURGER_COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIconText: {
    fontSize: 22,
    fontWeight: '700',
    color: BURGER_COLORS.danger,
  },
  logoutContent: {
    flex: 1,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: BURGER_COLORS.danger,
  },
  logoutDescription: {
    fontSize: 11,
    color: BURGER_COLORS.muted,
    marginTop: 2,
  },
  logoutArrow: {
    fontSize: 24,
    color: BURGER_COLORS.faint,
  },
});
