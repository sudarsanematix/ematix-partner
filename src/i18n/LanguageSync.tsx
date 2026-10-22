import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { changeAppLanguage, hasStoredLanguagePreference } from './index';
import { resolveAppLanguage } from './languages';

export default function LanguageSync() {
  const { token, user, refresh } = useAuth();
  const { i18n } = useTranslation();
  const reconciledUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!token) return;
    if (!user?.preferences) {
      refresh();
    }
  }, [token, user?.preferences, refresh]);

  useEffect(() => {
    if (!user?.id) return;
    if (reconciledUserId.current === user.id) return;

    const accountLanguage = resolveAppLanguage(user.preferences?.language);
    if (!accountLanguage) return;

    reconciledUserId.current = user.id;

    if (hasStoredLanguagePreference()) return;

    changeAppLanguage(accountLanguage).catch((error) => {
      console.warn('[i18n] Could not apply partner language from account', error);
    });
  }, [user?.id, user?.preferences?.language, i18n.language]);

  return null;
}
