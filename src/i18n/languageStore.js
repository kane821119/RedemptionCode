import { create } from 'zustand';
import { translations, defaultLocale } from './translations';

const STORAGE_KEY = 'app_locale';
const MANUAL_OVERRIDE_KEY = 'app_locale_override';

const createTranslator = (locale) => (key) => translations[locale]?.[key] || translations[defaultLocale]?.[key] || key;

const detectBrowserLanguage = () => {
  const browserLang = (navigator.language || navigator.userLanguage || defaultLocale).toLowerCase();
  const aliasMap = {
    'zh': 'zh-TW',
    'zh-tw': 'zh-TW',
    'zh-hant': 'zh-TW',
    'zh-cn': 'zh-CN',
    'en': 'en-US',
    'en-us': 'en-US',
    'ja': 'ja-JP',
    'ja-jp': 'ja-JP',
    'vi': 'vi-VN',
    'vi-vn': 'vi-VN',
    'ko': 'ko-KR',
    'ko-kr': 'ko-KR',
    'fr': 'fr-FR',
    'fr-fr': 'fr-FR',
    'de': 'de-DE',
    'de-de': 'de-DE',
    'es': 'es-ES',
    'es-es': 'es-ES',
    'ru': 'ru-RU',
    'ru-ru': 'ru-RU',
    'th': 'th-TH',
    'th-th': 'th-TH',
  };

  const exactMatch = Object.keys(translations).find((locale) => locale.toLowerCase() === browserLang);
  if (exactMatch) return exactMatch;
  if (aliasMap[browserLang]) return aliasMap[browserLang];
  return defaultLocale;
};

const resolveLocale = () => {
  const manualLocale = localStorage.getItem(MANUAL_OVERRIDE_KEY);
  if (manualLocale && Object.prototype.hasOwnProperty.call(translations, manualLocale)) {
    return manualLocale;
  }

  const browserLocale = detectBrowserLanguage();
  if (localStorage.getItem(STORAGE_KEY) && !manualLocale) {
    localStorage.removeItem(STORAGE_KEY);
  }

  return browserLocale;
};

export const getLocaleText = (key, locale = resolveLocale()) => {
  return translations[locale]?.[key] || translations[defaultLocale]?.[key] || key;
};

export const useLanguageStore = create((set, get) => {
  const initialLocale = resolveLocale();

  return {
    locale: initialLocale,
    t: createTranslator(initialLocale),

    setLocale: (locale) => {
      const nextLocale = Object.prototype.hasOwnProperty.call(translations, locale) ? locale : defaultLocale;
      localStorage.setItem(MANUAL_OVERRIDE_KEY, nextLocale);
      localStorage.setItem(STORAGE_KEY, nextLocale);
      document.documentElement.lang = nextLocale;
      set({ locale: nextLocale, t: createTranslator(nextLocale) });
    },

    initLocale: () => {
      const locale = resolveLocale();
      document.documentElement.lang = locale;
      set({ locale, t: createTranslator(locale) });
    },
  };
});
