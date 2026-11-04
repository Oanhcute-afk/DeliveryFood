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
import { useLanguage } from '@/context/language-context';
import { ROLES } from '@/constants/roles';
import { BURGER_COLORS } from '@/constants/theme';
import { isGoogleSignInAvailable, signInWithGoogle } from '@/lib/firebase-auth';

interface Props {
  role?: UserRole;
}

export function GoogleSignInButton({ role }: Props) {
  const { googleLogin } = useAuth();
  const { isVi, tr } = useLanguage();
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
<<<<<<< HEAD
        'Đăng nhập Google thất bại',
=======
        tr('Đăng nhập Google thất bại', 'Google sign-in failed'),
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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

      if (data?.code === 'ROLE_REQUIRED') {
        setPendingIdToken(idToken);
        return;
      }

      setPendingIdToken(null);
      const message =
<<<<<<< HEAD
        data?.message ?? error?.message ?? 'Đã xảy ra lỗi, vui lòng thử lại.';
      Alert.alert(
        'Đăng nhập Google thất bại',
=======
        data?.message ??
        error?.message ??
        tr('Đã có lỗi xảy ra', 'Something went wrong');
      Alert.alert(
        tr('Đăng nhập Google thất bại', 'Google sign-in failed'),
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
        <Text style={styles.dividerText}>hoặc</Text>
=======
        <Text style={styles.dividerText}>{tr('hoặc', 'or')}</Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
          <ActivityIndicator color={BURGER_COLORS.text} />
        ) : (
          <>
<<<<<<< HEAD
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text style={styles.buttonText}>Tiếp tục với Google</Text>
=======
            <Ionicons name="logo-google" size={19} color="#EA4335" />
            <Text style={styles.buttonText}>
              {tr('Tiếp tục với Google', 'Continue with Google')}
            </Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
            <Text style={styles.sheetTitle}>Chọn vai trò của bạn</Text>
            <Text style={styles.sheetSubtitle}>
              Đây là lần đầu bạn đăng nhập bằng Google. Bạn muốn sử dụng ứng
              dụng với vai trò nào?
=======
            <Text style={styles.sheetTitle}>
              {tr('Chọn vai trò của bạn', 'Choose your role')}
            </Text>
            <Text style={styles.sheetSubtitle}>
              {tr(
                'Đây là lần đầu bạn đăng nhập bằng Google. Bạn muốn sử dụng ứng dụng với vai trò nào?',
                'This is your first time signing in with Google. How will you use the app?',
              )}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
                  <Ionicons
                    name={r.icon}
                    size={22}
                    color={BURGER_COLORS.primary}
                  />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleText}>
                    {isVi ? r.labelVi : r.label}
                  </Text>
                  <Text style={styles.roleSubtitle}>
                    {isVi ? r.subtitleVi : r.subtitle}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={BURGER_COLORS.faint}
                />
              </Pressable>
            ))}

            {isLoading ? (
              <ActivityIndicator
                color={BURGER_COLORS.primary}
                style={styles.cancel}
              />
            ) : (
              <Pressable
                onPress={() => setPendingIdToken(null)}
                hitSlop={10}
                style={styles.cancel}
              >
<<<<<<< HEAD
                <Text style={styles.cancelText}>Hủy</Text>
=======
                <Text style={styles.cancelText}>{tr('Hủy', 'Cancel')}</Text>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
    marginVertical: 10,
=======
    marginVertical: 16,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BURGER_COLORS.border,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: BURGER_COLORS.faint,
  },
  button: {
<<<<<<< HEAD
    minHeight: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
=======
    minHeight: 52,
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: BURGER_COLORS.text,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44, 26, 17, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: BURGER_COLORS.background,
    borderRadius: 20,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: BURGER_COLORS.muted,
    lineHeight: 19,
    marginBottom: 4,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    backgroundColor: BURGER_COLORS.surface,
  },
  roleCardPressed: {
    borderColor: BURGER_COLORS.primary,
    backgroundColor: BURGER_COLORS.primaryLight,
    opacity: 0.9,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BURGER_COLORS.primaryLight,
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
    color: BURGER_COLORS.text,
    marginBottom: 2,
  },
  roleSubtitle: {
    fontSize: 11,
    color: BURGER_COLORS.muted,
  },
  cancel: {
    alignSelf: 'center',
    marginTop: 6,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: BURGER_COLORS.muted,
  },
});
