import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from '@react-native-firebase/auth';

// Web client ID do Firebase tự tạo (Firebase → Authentication → Google)
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

export const isGoogleSignInAvailable = true;

/**
 * Đăng nhập Google qua Firebase Auth.
 * Trả về Firebase ID token để gửi lên API, hoặc null nếu người dùng huỷ.
 */
export async function signInWithGoogle(): Promise<string | null> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  let response;
  try {
    response = await GoogleSignin.signIn();
  } catch (error) {
    if (
      isErrorWithCode(error) &&
      (error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.code === statusCodes.IN_PROGRESS)
    ) {
      return null;
    }
    throw error;
  }

  if (!isSuccessResponse(response)) return null;

  const { idToken } = response.data;
  if (!idToken) throw new Error('Google did not return an ID token');

  const credential = GoogleAuthProvider.credential(idToken);
  const { user } = await signInWithCredential(getAuth(), credential);
  return user.getIdToken();
}

// Đăng xuất để lần sau hiện lại bảng chọn tài khoản Google
export async function signOutGoogle() {
  try {
    await GoogleSignin.signOut();
    await signOut(getAuth());
  } catch {
    // Không có phiên Google nào để đăng xuất
  }
}
