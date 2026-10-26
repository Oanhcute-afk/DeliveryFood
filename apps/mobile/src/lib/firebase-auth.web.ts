// React Native Firebase không hỗ trợ web → ẩn nút Google trên web
export const isGoogleSignInAvailable = false;

export function signInWithGoogle(): Promise<string | null> {
  return Promise.reject(new Error('Google sign-in is not supported on web'));
}

export async function signOutGoogle() {}
