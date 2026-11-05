import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from 'firebase/auth';

let cachedAuth: Auth | null = null;

function getFirebaseAuth(): Auth | null {
  if (cachedAuth) return cachedAuth;

  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const app = getApps().length
      ? getApp()
      : initializeApp({
          apiKey,
          authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
          appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        });

    cachedAuth = getAuth(app);
    return cachedAuth;
  } catch (error) {
    console.warn('[firebase-auth] Failed to initialize Firebase:', error);
    return null;
  }
}

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

  const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl, {
    showInRecents: true,
    createTask: false,
  });

  if (result.type !== 'success' || !result.url) return null;

  const { queryParams } = Linking.parse(result.url);
  const error = queryParams?.error;
  if (error === 'access_denied' || error === 'cancelled') return null;
  if (error) throw new Error(`Google sign-in error: ${String(error)}`);

  const googleIdToken = queryParams?.googleIdToken;
  if (typeof googleIdToken !== 'string') {
    throw new Error('Google did not return an ID token');
  }

  // Cố gắng lấy Firebase ID token; nếu môi trường React Native thiếu storage browser thì dùng trực tiếp googleIdToken
  try {
    const auth = getFirebaseAuth();
    if (auth) {
      const credential = GoogleAuthProvider.credential(googleIdToken);
      const { user } = await signInWithCredential(auth, credential);
      return await user.getIdToken();
    }
  } catch (err) {
    console.warn('[firebase-auth] Firebase client sign-in fallback to raw token:', err);
  }

  return googleIdToken;
}

export async function signOutGoogle() {
  try {
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
    }
  } catch {
    // Không có phiên Firebase nào để đăng xuất
  }
}
