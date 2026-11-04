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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignInButton } from '@/components/google-sign-in-button';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password)
      return Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ email và mật khẩu.');

    setIsLoading(true);

    try {
      await login(email, password);
      router.replace('/');
    } catch (error: any) {
      if (error?.response?.status === 403) {
        Alert.alert(
          'Tài khoản đã bị khóa',
          'Tài khoản của bạn đã bị khóa bởi quản trị viên.',
        );
      } else {
        Alert.alert('Đăng nhập thất bại', 'Email hoặc mật khẩu không chính xác.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
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
          </View>

          {/* Heading */}
          <View style={styles.heading}>
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

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#99929A"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu của bạn"
                placeholderTextColor="#AAA4AA"
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
                  <Text style={styles.buttonText}>Đăng nhập</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color="#FFFFFF"
                  />
                </>
              )}
            </Pressable>

            <GoogleSignInButton />
          </View>

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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
  },
  brand: {
    alignItems: 'center',
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
  },
  subtitle: {
    fontSize: 12.5,
    color: '#8B8289',
    lineHeight: 18,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#393039',
    marginBottom: 4,
    marginTop: 2,
  },
  inputContainer: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 14,
    paddingHorizontal: 13,
    marginBottom: 10,
  },
  inputIcon: {
    marginRight: 9,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#29232A',
  },
  button: {
    height: 48,
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  registerCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
});
