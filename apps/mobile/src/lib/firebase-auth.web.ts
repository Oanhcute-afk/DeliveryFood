// Luồng deep link về app không áp dụng cho web → ẩn nút Google trên web
export const isGoogleSignInAvailable = false;

export function signInWithGoogle(_returnPath: string): Promise<string | null> {
  return Promise.reject(new Error('Google sign-in is not supported on web'));
}

export async function signOutGoogle() {}
