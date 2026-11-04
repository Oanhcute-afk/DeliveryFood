import { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { saveToken, getToken, deleteToken } from '@/lib/auth';
import { signOutGoogle } from '@/lib/firebase-auth';
import { User, UserRole } from '@food-delivery/types';

interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  googleLogin: (idToken: string, role?: UserRole) => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<User>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => Promise<void>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    try {
      const token = await getToken();
      if (token) {
        const res = await api.get('/auth/me');
        setUser(res.data);
      }
    } catch {
      await deleteToken();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    await saveToken(res.data.token);
    queryClient.clear();
    setUser(res.data.user);
  }

  async function register(data: RegisterData) {
    const res = await api.post('/auth/register', data);
    await saveToken(res.data.token);
    queryClient.clear();
    setUser(res.data.user);
  }

  async function googleLogin(idToken: string, role?: UserRole) {
    const res = await api.post('/auth/google', { idToken, role });
    await saveToken(res.data.token);
    queryClient.clear();
    setUser(res.data.user);
  }

  async function updateProfile(data: UpdateProfileData): Promise<User> {
    const res = await api.patch<User>('/auth/profile', data);
    const updated = res.data;
    setUser(updated);
    return updated;
  }

  async function logout() {
    await deleteToken();
    await signOutGoogle();
    queryClient.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        googleLogin,
        updateProfile,
        setUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
