import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { openMonitor } from '@/lib/admin-api';
import { Card, COLORS, ScreenHeader } from '@/components/admin/admin-ui';

export default function AdminProfileScreen() {
  const { user, logout } = useAuth();
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Admin';

  function confirmLogout() {
    Alert.alert('Đăng xuất?', 'Bạn sẽ cần đăng nhập lại để quản trị.', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title="Tài khoản"
          subtitle="Thông tin quản trị viên"
          emoji="🛡️"
        />

        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Ionicons name="shield-checkmark" size={30} color="#FFFFFF" />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{fullName}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              <View style={styles.roleBadge}>
                <View style={styles.roleDot} />
                <Text style={styles.roleText}>Quản trị viên</Text>
              </View>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Quyền của bạn</Text>
          {[
            'Xem trang Monitor (lượng truy cập, hiệu năng, lỗi)',
            'Mở/đóng cửa nhà hàng, khoá chủ nhà hàng',
            'Khoá/mở khoá tài khoản tài xế và khách hàng',
          ].map((text) => (
            <View key={text} style={styles.permission}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={COLORS.green}
              />
              <Text style={styles.permissionText}>{text}</Text>
            </View>
          ))}
        </Card>

        <Pressable
          onPress={openMonitor}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Ionicons name="pulse" size={20} color={COLORS.primary} />
          <Text style={styles.buttonText}>Mở trang Monitor</Text>
        </Pressable>

        <Pressable
          onPress={confirmLogout}
          style={({ pressed }) => [
            styles.button,
            styles.logout,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
          <Text style={[styles.buttonText, { color: COLORS.red }]}>
            Đăng xuất
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 },
  card: { marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: 19, fontWeight: '900', color: COLORS.text },
  email: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  roleText: { fontSize: 10, fontWeight: '800', color: COLORS.primaryDark },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
  },
  permission: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  permissionText: { flex: 1, fontSize: 13, color: COLORS.textSoft },
  button: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    marginBottom: 10,
  },
  logout: { backgroundColor: COLORS.redLight, borderColor: '#F5C9CB' },
  buttonText: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  pressed: { opacity: 0.85 },
});
