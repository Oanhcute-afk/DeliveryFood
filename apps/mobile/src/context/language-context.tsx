import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type AppLanguage = 'vi' | 'en';

const STORAGE_KEY = 'app_language_preference';

let currentLanguageSnapshot: AppLanguage = 'vi';

export function getCurrentLanguage(): AppLanguage {
  return currentLanguageSnapshot;
}

export function trStatic(vi: string, en: string): string {
  return currentLanguageSnapshot === 'vi' ? vi : en;
}

async function readStoredLanguage(): Promise<AppLanguage | null> {
  try {
    if (Platform.OS === 'web') {
      const saved =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(STORAGE_KEY)
          : null;
      return saved === 'en' || saved === 'vi' ? saved : null;
    }
    const saved = await SecureStore.getItemAsync(STORAGE_KEY);
    return saved === 'en' || saved === 'vi' ? saved : null;
  } catch {
    return null;
  }
}

async function writeStoredLanguage(lang: AppLanguage): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, lang);
      }
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEY, lang);
  } catch {
    // Ignore storage errors
  }
}

interface LanguageContextValue {
  language: AppLanguage;
  isVi: boolean;
  setLanguage: (lang: AppLanguage) => void;
  toggleLanguage: () => void;
  tr: (vi: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'vi',
  isVi: true,
  setLanguage: () => undefined,
  toggleLanguage: () => undefined,
  tr: (vi) => vi,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(
    currentLanguageSnapshot,
  );

  useEffect(() => {
    void readStoredLanguage().then((saved) => {
      if (saved) {
        currentLanguageSnapshot = saved;
        setLanguageState(saved);
      }
    });
  }, []);

  const setLanguage = useCallback((next: AppLanguage) => {
    currentLanguageSnapshot = next;
    setLanguageState(next);
    void writeStoredLanguage(next);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next: AppLanguage = prev === 'vi' ? 'en' : 'vi';
      currentLanguageSnapshot = next;
      void writeStoredLanguage(next);
      return next;
    });
  }, []);

  const tr = useCallback(
    (vi: string, en: string) => (language === 'vi' ? vi : en),
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isVi: language === 'vi',
      setLanguage,
      toggleLanguage,
      tr,
    }),
    [language, setLanguage, toggleLanguage, tr],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
