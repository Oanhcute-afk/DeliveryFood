import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from 'firebase/auth';

// Firebase JS SDK chạy được trong Expo Go (không cần native module)
const app = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    });

const auth = getAuth(app);

export const isGoogleSignInAvailable = true;

/**
 * Đăng nhập Google qua trình duyệt (API làm OAuth), rồi đăng nhập Firebase.
 * `returnPath` là route hiện tại để deep link quay về đúng màn hình.
 * Trả về Firebase ID token, hoặc null nếu người dùng huỷ.
 */
export async function signInWithGoogle(
  returnPath: string,
): Promise<string | null> {
  const returnUrl = Linking.createURL(returnPath);
  const startUrl = `${process.env.EXPO_PUBLIC_API_URL}/auth/google/start?redirect=${encodeURIComponent(returnUrl)}`;

  const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);
  if (result.type !== 'success') return null;

  const { queryParams } = Linking.parse(result.url);
  const error = queryParams?.error;
  if (error === 'access_denied' || error === 'cancelled') return null;
  if (error) throw new Error(`Google sign-in error: ${String(error)}`);

  const googleIdToken = queryParams?.googleIdToken;
  if (typeof googleIdToken !== 'string') {
    throw new Error('Google did not return an ID token');
  }

  const credential = GoogleAuthProvider.credential(googleIdToken);
  const { user } = await signInWithCredential(auth, credential);
  return user.getIdToken();
}

export async function signOutGoogle() {
  try {
    await signOut(auth);
  } catch {
    // Không có phiên Firebase nào để đăng xuất
  }
}
