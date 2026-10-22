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

export default function ProfileScreen() {
  const { user, logout } = useAuth();

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
    'Tài xế';

  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() ||
    'FD';

  const roleLabel =
    user?.role === 'DRIVER'
      ? 'Tài xế giao hàng'
      : user?.role === 'CUSTOMER'
        ? 'Khách hàng'
        : user?.role === 'RESTAURANT_OWNER'
          ? 'Chủ nhà hàng'
          : user?.role ?? 'Thành viên';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Tiêu đề */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>FOOD DELIVERY</Text>
            <Text style={styles.pageTitle}>Hồ sơ cá nhân</Text>
            <Text style={styles.pageSubtitle}>
              Quản lý thông tin tài khoản của bạn
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>👤</Text>
          </View>
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
              <Text style={styles.infoLabel}>ĐỊA CHỈ EMAIL</Text>
              <Text style={styles.infoValue}>{user?.email || 'Chưa cập nhật'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>🪪</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>VAI TRÒ TÀI KHOẢN</Text>
              <Text style={styles.infoValue}>{roleLabel}</Text>
            </View>
          </View>
        </View>

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

            {isLoading ? (
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
                  Điểm số sẽ xuất hiện sau khi bạn nhận được đánh giá.
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Đăng xuất */}
        <View style={styles.logoutSection}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>

          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
            ]}
            onPress={() => {
              void logout();
            }}
            accessibilityRole="button"
            accessibilityLabel="Đăng xuất tài khoản"
          >
            <View style={styles.logoutIcon}>
              <Text style={styles.logoutIconText}>↪</Text>
            </View>

            <View style={styles.logoutContent}>
              <Text style={styles.logoutText}>Đăng xuất</Text>
              <Text style={styles.logoutDescription}>
                Đăng xuất khỏi tài khoản hiện tại
              </Text>
            </View>

            <Text style={styles.logoutArrow}>›</Text>
          </Pressable>
        </View>

        <Text style={styles.footerText}>FoodDelivery · Đồng hành cùng bạn</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 25,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
    color: '#FF6B35',
    marginBottom: 7,
  },
  pageTitle: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '900',
    color: '#29232A',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#8B8289',
    marginTop: 5,
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 26,
  },

  // Thẻ hồ sơ
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 19,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    marginBottom: 28,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 23,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 25,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  profileIdentity: {
    flex: 1,
  },
  name: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '900',
    color: '#29232A',
  },
  email: {
    fontSize: 12,
    color: '#8B8289',
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 9,
    gap: 6,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B35',
  },
  roleText: {
    fontSize: 10,
    color: '#D94D20',
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3ECE7',
    marginVertical: 19,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FFF9F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoEmoji: {
    fontSize: 17,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#A1989E',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#39313A',
  },

  // Đánh giá
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#29232A',
  },
  sectionEmoji: {
    fontSize: 20,
  },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 20,
    padding: 18,
    marginBottom: 28,
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
    fontSize: 29,
    color: '#F5A623',
  },
  ratingContent: {
    flex: 1,
    paddingTop: 2,
  },
  ratingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#39313A',
    marginBottom: 7,
  },
  ratingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#29232A',
  },
  ratingOutOf: {
    fontSize: 12,
    color: '#8B8289',
    marginTop: 7,
  },
  ratingStar: {
    fontSize: 18,
    color: '#F5A623',
    marginLeft: 2,
  },
  ratingDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: '#8B8289',
    marginTop: 5,
  },
  ratingLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 5,
  },
  noRating: {
    fontSize: 15,
    fontWeight: '800',
    color: '#514850',
  },

  // Đăng xuất
  logoutSection: {
    marginBottom: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 18,
    padding: 15,
    marginTop: 13,
    gap: 12,
  },
  logoutButtonPressed: {
    opacity: 0.75,
    backgroundColor: '#FFF3EF',
  },
  logoutIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#FEF0EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIconText: {
    fontSize: 25,
    fontWeight: '700',
    color: '#DC4545',
  },
  logoutContent: {
    flex: 1,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#D63E3E',
  },
  logoutDescription: {
    fontSize: 11,
    color: '#8B8289',
    marginTop: 4,
  },
  logoutArrow: {
    fontSize: 27,
    color: '#B5AAB0',
  },
  footerText: {
    fontSize: 10,
    color: '#B1A6AC',
    textAlign: 'center',
    fontWeight: '600',
  },
});
