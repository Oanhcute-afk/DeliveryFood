import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UserRole } from '@food-delivery/types';
import { useAuth } from '@/context/auth-context';
import { ROLES } from '@/constants/roles';
import { isGoogleSignInAvailable, signInWithGoogle } from '@/lib/firebase-auth';

interface Props {
  // Role dùng khi tạo tài khoản mới. Bỏ trống thì sẽ hỏi người dùng nếu cần.
  role?: UserRole;
}

export function GoogleSignInButton({ role }: Props) {
  const { googleLogin } = useAuth();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingIdToken, setPendingIdToken] = useState<string | null>(null);

  if (!isGoogleSignInAvailable) return null;

  async function handlePress() {
    setIsLoading(true);

    let idToken: string | null;
    try {
      idToken = await signInWithGoogle(pathname);
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert(
        'Đăng nhập Google thất bại',
        String(error?.message ?? error),
      );
      return;
    }

    if (idToken) await signIn(idToken, role);
    else setIsLoading(false);
  }

  async function signIn(idToken: string, selectedRole?: UserRole) {
    setIsLoading(true);

    try {
      await googleLogin(idToken, selectedRole);
      setPendingIdToken(null);
      router.replace('/');
    } catch (error: any) {
      const data = error?.response?.data;

      // Tài khoản Google chưa tồn tại → cho người dùng chọn role
      if (data?.code === 'ROLE_REQUIRED') {
        setPendingIdToken(idToken);
        return;
      }

      setPendingIdToken(null);
      const message =
        data?.message ?? error?.message ?? 'Đã xảy ra lỗi, vui lòng thử lại.';
      Alert.alert(
        'Đăng nhập Google thất bại',
        Array.isArray(message) ? message.join('\n') : String(message),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>hoặc</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          isLoading && styles.buttonDisabled,
        ]}
        onPress={() => {
          void handlePress();
        }}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#29232A" />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text style={styles.buttonText}>Tiếp tục với Google</Text>
          </>
        )}
      </Pressable>

      <Modal
        visible={!!pendingIdToken}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingIdToken(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Chọn vai trò của bạn</Text>
            <Text style={styles.sheetSubtitle}>
              Đây là lần đầu bạn đăng nhập bằng Google. Bạn muốn sử dụng ứng
              dụng với vai trò nào?
            </Text>

            {ROLES.map((r) => (
              <Pressable
                key={r.value}
                style={({ pressed }) => [
                  styles.roleCard,
                  pressed && styles.roleCardPressed,
                ]}
                disabled={isLoading}
                onPress={() => {
                  if (pendingIdToken) void signIn(pendingIdToken, r.value);
                }}
              >
                <View style={styles.roleIcon}>
                  <Ionicons name={r.icon} size={22} color="#FF6B35" />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleText}>{r.label}</Text>
                  <Text style={styles.roleSubtitle}>{r.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D8CFCA" />
              </Pressable>
            ))}

            {isLoading ? (
              <ActivityIndicator color="#FF6B35" style={styles.cancel} />
            ) : (
              <Pressable
                onPress={() => setPendingIdToken(null)}
                hitSlop={10}
                style={styles.cancel}
              >
                <Text style={styles.cancelText}>Hủy</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0E8E3',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A49AA0',
  },
  button: {
    minHeight: 55,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#29232A',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(41, 35, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: '#FFF9F5',
    borderRadius: 22,
    padding: 20,
    gap: 10,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#29232A',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#8B8289',
    lineHeight: 19,
    marginBottom: 6,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    backgroundColor: '#FFFFFF',
  },
  roleCardPressed: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF0E8',
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#393039',
    marginBottom: 3,
  },
  roleSubtitle: {
    fontSize: 11,
    color: '#8B8289',
  },
  cancel: {
    alignSelf: 'center',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B8289',
  },
});
