import AsyncStorage from '@react-native-async-storage/async-storage';
import { createInstance, type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  resolveAppLanguage,
  type AppLanguage,
} from './languages';
import en from './locales/en.json';
import ta from './locales/ta.json';
import type { TranslationDictionary } from './types';

export const DEFAULT_NAMESPACE = 'translation';

export const SUPPORTED_LANGUAGE_CODES: readonly AppLanguage[] = ['en', 'ta'];

export const resources: {
  en: { translation: TranslationDictionary };
  ta: { translation: TranslationDictionary };
} = {
  en: { translation: en },
  ta: { translation: ta },
};

export const i18n: I18nInstance = createInstance();

let storedPreference: AppLanguage | null = null;

export const hasStoredLanguagePreference = (): boolean => storedPreference !== null;

let initPromise: Promise<I18nInstance> | null = null;

const readStoredLanguage = async (): Promise<AppLanguage> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    const resolved = resolveAppLanguage(stored);
    if (resolved) {
      storedPreference = resolved;
      return resolved;
    }
  } catch {
    // Falls back to the default below.
  }
  return DEFAULT_LANGUAGE;
};

export const initI18n = async (): Promise<I18nInstance> => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const initialLanguage = await readStoredLanguage();

    await i18n.use(initReactI18next).init({
      resources,
      lng: initialLanguage,
      fallbackLng: DEFAULT_LANGUAGE,
      defaultNS: DEFAULT_NAMESPACE,
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
      compatibilityJSON: 'v4',
    });

    return i18n;
  })();

  return initPromise;
};

export const changeAppLanguage = async (nextLanguage: AppLanguage): Promise<void> => {
  if (i18n.isInitialized && i18n.language !== nextLanguage) {
    await i18n.changeLanguage(nextLanguage);
  }
  storedPreference = nextLanguage;
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  } catch {
    // In-memory change already took effect.
  }
};

export const getAppLanguage = (): AppLanguage => {
  const current = i18n.language;
  return resolveAppLanguage(current) ?? DEFAULT_LANGUAGE;
};

// Kick off initialisation eagerly
initI18n().catch((error) => {
  console.warn('[i18n] Failed to initialise partner localization', error);
});
