import type en from './locales/en.json';

export type TranslationDictionary = typeof en;

export type TranslationNamespace = keyof TranslationDictionary;

export type TranslationKey<N extends TranslationNamespace = TranslationNamespace> =
  N extends TranslationNamespace ? `${N}.${keyof TranslationDictionary[N] & string}` : never;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: TranslationDictionary;
    };
  }
}
