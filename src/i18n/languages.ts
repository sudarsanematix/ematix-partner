/**
 * The language contract for the partner app.
 *
 * The app speaks the same locale codes as the API ('en' | 'ta'). Display
 * labels such as 'English' and 'தமிழ்' are what the user sees, but they are
 * never stored or sent: only codes travel over the wire.
 */

export const LANGUAGE_STORAGE_KEY = '@ematix_partner_language';

export type AppLanguage = 'en' | 'ta';

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

export const SUPPORTED_LANGUAGES: readonly { code: AppLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ்' },
];

const LEGACY_LANGUAGE_CODES = new Map<string, AppLanguage>([
  ['English', 'en'],
  ['Tamil', 'ta'],
  ['தமிழ்', 'ta'],
  ['Hindi', 'en'],
  ['हिन्दी', 'en'],
]);

export const isAppLanguage = (value: unknown): value is AppLanguage =>
  value === 'en' || value === 'ta';

export const resolveAppLanguage = (value: unknown): AppLanguage | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (isAppLanguage(trimmed)) return trimmed;
  return LEGACY_LANGUAGE_CODES.get(trimmed) ?? null;
};

export const getDisplayLabel = (code: AppLanguage): string => {
  const match = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  return match ? match.label : 'English';
};
