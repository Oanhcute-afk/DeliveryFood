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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 16) + 10,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={false}
      >
        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="fast-food" size={30} color="#FFFFFF" />
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

        {/* Register */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Chưa có tài khoản?
          </Text>

          <Pressable
            onPress={() => router.push('/register')}
            hitSlop={10}
          >
            <Text style={styles.registerText}> Đăng ký ngay</Text>
          </Pressable>
        </View>

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
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logo: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#29232A',
    letterSpacing: -0.8,
  },
  brandAccent: {
    color: '#FF6B35',
  },
  brandCaption: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#A49AA0',
    letterSpacing: 2.5,
    marginTop: 4,
  },
  heading: {
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#29232A',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#8B8289',
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#393039',
    marginBottom: 6,
    marginTop: 4,
  },
  inputContainer: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 15,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#29232A',
  },
  button: {
    height: 52,
    backgroundColor: '#FF6B35',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 10,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 13,
    color: '#8B8289',
  },
  registerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF6B35',
  },
  bottomNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  bottomNoteText: {
    fontSize: 11,
    color: '#A49AA0',
  },
});
