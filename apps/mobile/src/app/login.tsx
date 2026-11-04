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
<<<<<<< HEAD
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
=======
import { SafeAreaView } from 'react-native-safe-area-context';
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';
import { BURGER_COLORS } from '@/constants/theme';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignInButton } from '@/components/google-sign-in-button';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { tr } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password)
<<<<<<< HEAD
      return Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ email và mật khẩu.');
=======
      return Alert.alert(
        tr('Thiếu thông tin', 'Missing information'),
        tr('Vui lòng nhập đầy đủ email và mật khẩu.', 'Please fill in all fields.'),
      );
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6

    setIsLoading(true);

    try {
      await login(email, password);
      router.replace('/');
    } catch (error: any) {
      if (error?.response?.status === 403) {
        Alert.alert(
<<<<<<< HEAD
          'Tài khoản đã bị khóa',
          'Tài khoản của bạn đã bị khóa bởi quản trị viên.',
        );
      } else {
        Alert.alert('Đăng nhập thất bại', 'Email hoặc mật khẩu không chính xác.');
=======
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
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
<<<<<<< HEAD
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.container,
            {
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 24) + 40,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
        >
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="fast-food" size={26} color="#FFFFFF" />
            </View>

            <Text style={styles.brandName}>
              deli<Text style={styles.brandAccent}>food</Text>
            </Text>
            <Text style={styles.brandCaption}>
              MÓN NGON MỖI NGÀY
            </Text>
=======
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
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
          </View>

          {/* Heading */}
          <View style={styles.heading}>
<<<<<<< HEAD
            <Text style={styles.title}>Chào mừng trở lại!</Text>
            <Text style={styles.subtitle}>
              Đăng nhập để khám phá những món ăn ngon gần bạn.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Địa chỉ email</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#99929A"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Nhập địa chỉ email của bạn"
                placeholderTextColor="#AAA4AA"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>Mật khẩu</Text>

=======
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
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
<<<<<<< HEAD
                color="#99929A"
=======
                color={BURGER_COLORS.muted}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
<<<<<<< HEAD
                placeholder="Nhập mật khẩu của bạn"
                placeholderTextColor="#AAA4AA"
=======
                placeholder={tr('Nhập mật khẩu', 'Enter your password')}
                placeholderTextColor={BURGER_COLORS.faint}
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
                  <Text style={styles.buttonText}>Đăng nhập</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color="#FFFFFF"
                  />
=======
                  <Text style={styles.buttonText}>
                    {tr('Đăng nhập', 'Sign In')}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
                </>
              )}
            </Pressable>

            <GoogleSignInButton />
          </View>

<<<<<<< HEAD
          {/* Register Card — Dễ bấm, nổi bật, không bị thanh điều hướng che */}
          <Pressable
            style={({ pressed }) => [
              styles.registerCard,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/register')}
            accessibilityRole="button"
            accessibilityLabel="Chưa có tài khoản? Đăng ký ngay"
            hitSlop={{ top: 12, bottom: 20, left: 16, right: 16 }}
          >
            <Text style={styles.footerText}>Chưa có tài khoản?</Text>
            <Text style={styles.registerText}> Đăng ký ngay</Text>
            <Ionicons name="arrow-forward-circle" size={18} color="#FF6B35" />
          </Pressable>

          <View style={styles.bottomNote}>
            <Ionicons
              name="heart"
              size={12}
              color="#FF6B35"
            />
            <Text style={styles.bottomNoteText}>
              Dành trọn tâm huyết cho tín đồ ẩm thực
            </Text>
=======
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
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
=======
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 20,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
<<<<<<< HEAD
    marginTop: 2,
    marginBottom: 10,
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  brandName: {
    fontSize: 25,
    fontWeight: '900',
    color: '#29232A',
    letterSpacing: -0.8,
  },
  brandAccent: {
    color: '#FF6B35',
  },
  brandCaption: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#A49AA0',
    letterSpacing: 2,
    marginTop: 2,
  },
  heading: {
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#29232A',
    letterSpacing: -0.5,
    marginBottom: 3,
=======
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
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
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
<<<<<<< HEAD
    fontSize: 12.5,
    color: '#8B8289',
    lineHeight: 18,
=======
    fontSize: 14,
    color: BURGER_COLORS.muted,
    lineHeight: 21,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  formCard: {
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    padding: 18,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '700',
<<<<<<< HEAD
    color: '#393039',
    marginBottom: 4,
    marginTop: 2,
  },
  inputContainer: {
    height: 46,
=======
    color: BURGER_COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    height: 52,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BURGER_COLORS.background,
    borderWidth: 1,
<<<<<<< HEAD
    borderColor: '#F0E8E3',
    borderRadius: 14,
    paddingHorizontal: 13,
    marginBottom: 10,
  },
  inputIcon: {
    marginRight: 9,
=======
    borderColor: BURGER_COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: BURGER_COLORS.text,
  },
  button: {
<<<<<<< HEAD
    height: 48,
    backgroundColor: '#FF6B35',
=======
    height: 52,
    backgroundColor: BURGER_COLORS.primary,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 8,
<<<<<<< HEAD
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
=======
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
<<<<<<< HEAD
    fontSize: 14.5,
=======
    fontSize: 15,
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    fontWeight: '800',
    color: '#FFFFFF',
  },
  registerCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
<<<<<<< HEAD
    gap: 6,
    marginTop: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#FFE2D1',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  footerText: {
    fontSize: 13.5,
    color: '#6B6269',
    fontWeight: '600',
  },
  registerText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FF6B35',
  },
  bottomNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    marginBottom: 8,
  },
  bottomNoteText: {
    fontSize: 10.5,
    color: '#B5ABB2',
=======
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
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  },
});
