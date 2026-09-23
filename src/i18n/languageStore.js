import { create } from 'zustand';
import { translations, defaultLocale } from './translations';

const STORAGE_KEY = 'app_locale';

const createTranslator = (locale) => (key) => translations[locale]?.[key] || translations[defaultLocale]?.[key] || key;

export const getLocaleText = (key, locale = localStorage.getItem(STORAGE_KEY) || detectBrowserLanguage()) => {
  return translations[locale]?.[key] || translations[defaultLocale]?.[key] || key;
};

const detectBrowserLanguage = () => {
  const browserLang = navigator.language || navigator.userLanguage || defaultLocale;
  return Object.prototype.hasOwnProperty.call(translations, browserLang) ? browserLang : defaultLocale;
};

export const useLanguageStore = create((set, get) => {
  const initialLocale = localStorage.getItem(STORAGE_KEY) || detectBrowserLanguage();

  return {
    locale: initialLocale,
    t: createTranslator(initialLocale),

    setLocale: (locale) => {
      const nextLocale = Object.prototype.hasOwnProperty.call(translations, locale) ? locale : defaultLocale;
      localStorage.setItem(STORAGE_KEY, nextLocale);
      document.documentElement.lang = nextLocale;
      set({ locale: nextLocale, t: createTranslator(nextLocale) });
    },

    initLocale: () => {
      const locale = localStorage.getItem(STORAGE_KEY) || detectBrowserLanguage();
      document.documentElement.lang = locale;
      set({ locale, t: createTranslator(locale) });
    },
  };
});
