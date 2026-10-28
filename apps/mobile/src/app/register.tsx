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
import { UserRole } from '@food-delivery/types';
import { Ionicons } from '@expo/vector-icons';
import { ROLES } from '@/constants/roles';
import { GoogleSignInButton } from '@/components/google-sign-in-button';

export default function RegisterScreen() {
  const { register } = useAuth();
  const { isVi, tr } = useLanguage();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister() {
    if (!firstName || !lastName || !email || !password) {
      return Alert.alert(
        tr('Thiếu thông tin', 'Missing information'),
        tr('Vui lòng điền đầy đủ các trường.', 'Please fill in all fields.'),
      );
    }

    setIsLoading(true);

    try {
      await register({ firstName, lastName, email, password, role });
    } catch (error: any) {
      console.error('Register error:', error);

      const message =
        error?.response?.data?.message ??
        error?.message ??
        tr('Đã có lỗi xảy ra', 'Something went wrong');

      Alert.alert(
        tr('Đăng ký thất bại', 'Registration failed'),
        Array.isArray(message) ? message.join('\n') : String(message),
      );
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
          {/* Top bar */}
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
                  {tr('TẠO TÀI KHOẢN MỚI', 'CREATE NEW ACCOUNT')}
                </Text>
              </View>
            </View>

            <LanguageSwitch />
          </View>

          {/* Heading */}
          <View style={styles.heading}>
            <Text style={styles.title}>
              {tr('Đăng ký tài khoản', 'Create account')}
            </Text>
            <Text style={styles.subtitle}>
              {tr(
                'Tham gia ngay để thưởng thức burger và món ngon mỗi ngày.',
                'Join us and discover a world of delicious burgers and food.',
              )}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Text style={styles.label}>{tr('Tên', 'First name')}</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={BURGER_COLORS.muted}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={tr('Tên', 'First name')}
                    placeholderTextColor={BURGER_COLORS.faint}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.nameField}>
                <Text style={styles.label}>{tr('Họ', 'Last name')}</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={BURGER_COLORS.muted}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={tr('Họ', 'Last name')}
                    placeholderTextColor={BURGER_COLORS.faint}
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>
              {tr('Địa chỉ Email', 'Email address')}
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={19}
                color={BURGER_COLORS.muted}
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
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>{tr('Mật khẩu', 'Password')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color={BURGER_COLORS.muted}
              />
              <TextInput
                style={styles.input}
                placeholder={tr('Tạo mật khẩu', 'Create a password')}
                placeholderTextColor={BURGER_COLORS.faint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="done"
              />
            </View>

            {/* Role selector */}
            <View style={styles.roleHeading}>
              <Text style={styles.label}>
                {tr('Chọn vai trò của bạn', 'Choose your role')}
              </Text>
              <Text style={styles.required}>
                {tr('Bắt buộc', 'Required')}
              </Text>
            </View>

            <View style={styles.roleContainer}>
              {ROLES.map((r) => {
                const isSelected = role === r.value;

                return (
                  <Pressable
                    key={r.value}
                    style={({ pressed }) => [
                      styles.roleCard,
                      isSelected && styles.roleCardActive,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => setRole(r.value)}
                  >
                    <View
                      style={[
                        styles.roleIcon,
                        isSelected && styles.roleIconActive,
                      ]}
                    >
                      <Ionicons
                        name={r.icon}
                        size={20}
                        color={isSelected ? '#FFFFFF' : BURGER_COLORS.muted}
                      />
                    </View>

                    <View style={styles.roleInfo}>
                      <Text
                        style={[
                          styles.roleText,
                          isSelected && styles.roleTextActive,
                        ]}
                      >
                        {isVi ? r.labelVi : r.label}
                      </Text>
                      <Text style={styles.roleSubtitle}>
                        {isVi ? r.subtitleVi : r.subtitle}
                      </Text>
                    </View>

                    <Ionicons
                      name={
                        isSelected ? 'radio-button-on' : 'radio-button-off'
                      }
                      size={20}
                      color={
                        isSelected
                          ? BURGER_COLORS.primary
                          : BURGER_COLORS.border
                      }
                    />
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={() => {
                void handleRegister();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.buttonText}>
                    {tr('Tạo tài khoản', 'Create Account')}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            <GoogleSignInButton role={role} />
          </View>

          {/* Login link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {tr('Đã có tài khoản?', 'Already have an account?')}
            </Text>

            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={({ pressed }) => pressed && styles.buttonPressed}
            >
              <Text style={styles.loginText}>
                {' '}
                {tr('Đăng nhập', 'Log In')}
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
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoSmall: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BURGER_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 22,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '900',
    color: BURGER_COLORS.text,
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: BURGER_COLORS.primary,
  },
  brandCaption: {
    fontSize: 9,
    fontWeight: '800',
    color: BURGER_COLORS.muted,
    letterSpacing: 1,
    marginTop: 2,
  },
  heading: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: BURGER_COLORS.text,
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: BURGER_COLORS.muted,
    lineHeight: 19,
  },
  formCard: {
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    padding: 16,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 10,
  },
  nameField: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: BURGER_COLORS.text,
    marginBottom: 6,
  },
  inputContainer: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BURGER_COLORS.background,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    fontSize: 13,
    color: BURGER_COLORS.text,
  },
  roleHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 8,
  },
  required: {
    fontSize: 11,
    fontWeight: '600',
    color: BURGER_COLORS.faint,
  },
  roleContainer: {
    gap: 8,
    marginBottom: 16,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    backgroundColor: BURGER_COLORS.background,
  },
  roleCardActive: {
    borderColor: BURGER_COLORS.primary,
    backgroundColor: BURGER_COLORS.primaryLight,
  },
  roleIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: BURGER_COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  roleIconActive: {
    backgroundColor: BURGER_COLORS.primary,
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
  roleTextActive: {
    color: BURGER_COLORS.primaryDark,
  },
  roleSubtitle: {
    fontSize: 11,
    color: BURGER_COLORS.muted,
  },
  button: {
    height: 52,
    backgroundColor: BURGER_COLORS.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 20,
  },
  footerText: {
    fontSize: 13,
    color: BURGER_COLORS.muted,
  },
  loginText: {
    fontSize: 13,
    fontWeight: '800',
    color: BURGER_COLORS.primary,
  },
});
