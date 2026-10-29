import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

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

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerCaption}>TÀI KHOẢN CỦA BẠN</Text>
            <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="person-outline"
              size={24}
              color="#FF6B35"
            />
          </View>
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
          <View style={styles.infoRow}>
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
              name="chevron-forward"
              size={18}
              color="#C4BAB4"
            />
          </View>

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
              name="chevron-forward"
              size={18}
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
              name="chevron-forward"
              size={18}
              color="#C4BAB4"
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  container: {
    paddingHorizontal: 22,
    paddingTop: 25,
    paddingBottom: 35,
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
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: '#FFEEE5',
    alignItems: 'center',
    justifyContent: 'center',
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
});
