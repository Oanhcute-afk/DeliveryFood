import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';
import { BURGER_COLORS } from '@/constants/theme';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignInButton } from '@/components/google-sign-in-button';

export default function LoginScreen() {
  const { login } = useAuth();
  const { tr } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password)
      return Alert.alert(
        tr('Thiếu thông tin', 'Missing information'),
        tr('Vui lòng nhập đầy đủ email và mật khẩu.', 'Please fill in all fields.'),
      );

    setIsLoading(true);

    try {
      await login(email, password);
      router.replace('/');
    } catch (error: any) {
      if (error?.response?.status === 403) {
        Alert.alert(
          tr('Tài khoản bị khóa', 'Account locked'),
          tr(
            'Tài khoản của bạn đã bị khóa bởi quản trị viên.',
            'Your account has been locked by an administrator.',
          ),
        );
      } else {
        Alert.alert(
          tr('Đăng nhập thất bại', 'Login failed'),
          tr('Email hoặc mật khẩu không đúng.', 'Invalid email or password.'),
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={BURGER_COLORS.background}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar with Brand & Language Switch */}
          <View style={styles.topBar}>
            <View style={styles.brandInline}>
              <View style={styles.logoSmall}>
                <Text style={styles.logoEmoji}>🍔</Text>
              </View>
              <View>
                <Text style={styles.brandName}>
                  deli<Text style={styles.brandAccent}>burger</Text>
                </Text>
                <Text style={styles.brandCaption}>
                  {tr('GIAO MÓN NGON TẬN NƠI', 'FRESH BURGERS & MORE')}
                </Text>
              </View>
            </View>

            <LanguageSwitch />
          </View>

          {/* Heading */}
          <View style={styles.heading}>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>
                {tr('🍔 NÓNG HỔI MỖI NGÀY', '🍔 FLAME-GRILLED DAILY')}
              </Text>
            </View>
            <Text style={styles.title}>
              {tr('Chào mừng trở lại!', 'Welcome back!')}
            </Text>
            <Text style={styles.subtitle}>
              {tr(
                'Đăng nhập để đặt ngay burger và món ngon gần bạn.',
                'Sign in to discover delicious burgers and meals near you.',
              )}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.label}>
              {tr('Địa chỉ Email', 'Email address')}
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={BURGER_COLORS.muted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={tr('Nhập email của bạn', 'Enter your email')}
                placeholderTextColor={BURGER_COLORS.faint}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>{tr('Mật khẩu', 'Password')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={BURGER_COLORS.muted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={tr('Nhập mật khẩu', 'Enter your password')}
                placeholderTextColor={BURGER_COLORS.faint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={() => {
                void handleLogin();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.buttonText}>
                    {tr('Đăng nhập', 'Sign In')}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            <GoogleSignInButton />
          </View>

          {/* Register link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {tr('Chưa có tài khoản?', "Don't have an account?")}
            </Text>

            <Pressable
              onPress={() => router.push('/register')}
              hitSlop={10}
              style={({ pressed }) => pressed && styles.buttonPressed}
            >
              <Text style={styles.registerText}>
                {' '}
                {tr('Đăng ký ngay', 'Sign Up')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BURGER_COLORS.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  brandInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoSmall: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: BURGER_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 24,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '900',
    color: BURGER_COLORS.text,
    letterSpacing: -0.6,
  },
  brandAccent: {
    color: BURGER_COLORS.primary,
  },
  brandCaption: {
    fontSize: 9,
    fontWeight: '800',
    color: BURGER_COLORS.muted,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  heading: {
    marginBottom: 22,
  },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: BURGER_COLORS.cheeseLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    color: BURGER_COLORS.cheeseDark,
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: BURGER_COLORS.text,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: BURGER_COLORS.muted,
    lineHeight: 21,
  },
  formCard: {
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    padding: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: BURGER_COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BURGER_COLORS.background,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: BURGER_COLORS.text,
  },
  button: {
    height: 52,
    backgroundColor: BURGER_COLORS.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 8,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  footerText: {
    fontSize: 13,
    color: BURGER_COLORS.muted,
  },
  registerText: {
    fontSize: 13,
    fontWeight: '800',
    color: BURGER_COLORS.primary,
  },
});
