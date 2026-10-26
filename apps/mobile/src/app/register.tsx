
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
import { useAuth } from '@/context/auth-context';
import { router } from 'expo-router';
import { UserRole } from '@food-delivery/types';
import { Ionicons } from '@expo/vector-icons';
import { ROLES } from '@/constants/roles';
import { GoogleSignInButton } from '@/components/google-sign-in-button';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister() {
    if (!firstName || !lastName || !email || !password) {
      return Alert.alert('Please fill in all fields');
    }

    setIsLoading(true);

    try {
      await register({ firstName, lastName, email, password, role });
    } catch (error: any) {
      console.error('Register error:', error);

      const message =
        error?.response?.data?.message ??
        error?.message ??
        'Something went wrong';

      Alert.alert(
        'Registration failed',
        Array.isArray(message) ? message.join('\n') : String(message),
      );
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
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="fast-food" size={32} color="#FFFFFF" />
          </View>

          <Text style={styles.brandName}>
            deli<Text style={styles.brandAccent}>food</Text>
          </Text>

          <Text style={styles.brandCaption}>
            GOOD FOOD, GOOD MOOD.
          </Text>
        </View>

        {/* Heading */}
        <View style={styles.heading}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>
            Join us and discover a world of delicious food.
          </Text>
        </View>

        {/* Name fields */}
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <Text style={styles.label}>First name</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={19}
                color="#99929A"
              />
              <TextInput
                style={styles.input}
                placeholder="First name"
                placeholderTextColor="#AAA4AA"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.nameField}>
            <Text style={styles.label}>Last name</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={19}
                color="#99929A"
              />
              <TextInput
                style={styles.input}
                placeholder="Last name"
                placeholderTextColor="#AAA4AA"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          </View>
        </View>

        {/* Email */}
        <Text style={styles.label}>Email address</Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="mail-outline"
            size={21}
            color="#99929A"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#AAA4AA"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
        </View>

        {/* Password */}
        <Text style={styles.label}>Password</Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={21}
            color="#99929A"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Create a password"
            placeholderTextColor="#AAA4AA"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="done"
          />
        </View>

        {/* Role selector */}
        <View style={styles.roleHeading}>
          <Text style={styles.label}>Choose your role</Text>
          <Text style={styles.required}>Required</Text>
        </View>

        <View style={styles.roleContainer}>
          {ROLES.map((r) => {
            const isSelected = role === r.value;

            return (
              <Pressable
                key={r.value}
                style={[
                  styles.roleCard,
                  isSelected && styles.roleCardActive,
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
                    size={23}
                    color={isSelected ? '#FFFFFF' : '#8B8289'}
                  />
                </View>

                <View style={styles.roleInfo}>
                  <Text
                    style={[
                      styles.roleText,
                      isSelected && styles.roleTextActive,
                    ]}
                  >
                    {r.label}
                  </Text>
                  <Text style={styles.roleSubtitle}>
                    {r.subtitle}
                  </Text>
                </View>

                <Ionicons
                  name={
                    isSelected
                      ? 'radio-button-on'
                      : 'radio-button-off'
                  }
                  size={21}
                  color={isSelected ? '#FF6B35' : '#D8CFCA'}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Register button */}
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
              <Text style={styles.buttonText}>Create Account</Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color="#FFFFFF"
              />
            </>
          )}
        </Pressable>

        <GoogleSignInButton role={role} />

        {/* Login link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?
          </Text>

          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.loginText}> Log In</Text>
          </Pressable>
        </View>

        <View style={styles.bottomNote}>
          <Ionicons name="heart" size={13} color="#FF6B35" />
          <Text style={styles.bottomNoteText}>
            Made with love for food lovers
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
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 28,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logo: {
    width: 62,
    height: 62,
    borderRadius: 21,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  brandName: {
    fontSize: 27,
    fontWeight: '800',
    color: '#29232A',
    letterSpacing: -0.8,
  },
  brandAccent: {
    color: '#FF6B35',
  },
  brandCaption: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A49AA0',
    letterSpacing: 2.5,
    marginTop: 4,
  },
  heading: {
    marginBottom: 22,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#29232A',
    letterSpacing: -0.7,
    marginBottom: 7,
  },
  subtitle: {
    fontSize: 13,
    color: '#8B8289',
    lineHeight: 20,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#393039',
    marginBottom: 9,
  },
  inputContainer: {
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 15,
    paddingHorizontal: 13,
    marginBottom: 17,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 51,
    fontSize: 13,
    color: '#29232A',
    paddingVertical: 0,
    marginLeft: 8,
  },
  roleHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 11,
  },
  required: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A49AA0',
  },
  roleContainer: {
    gap: 10,
    marginBottom: 21,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F0E8E3',
    backgroundColor: '#FFFFFF',
    minHeight: 72,
  },
  roleCardActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF0E8',
  },
  roleIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#F7F3F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleIconActive: {
    backgroundColor: '#FF6B35',
  },
  roleInfo: {
    flex: 1,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#393039',
    marginBottom: 4,
  },
  roleTextActive: {
    color: '#E85B28',
  },
  roleSubtitle: {
    fontSize: 11,
    color: '#8B8289',
  },
  button: {
    minHeight: 55,
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
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
    marginTop: 23,
  },
  footerText: {
    fontSize: 12,
    color: '#8B8289',
  },
  loginText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B35',
  },
  bottomNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 23,
  },
  bottomNoteText: {
    fontSize: 10,
    color: '#A49AA0',
  },
});
