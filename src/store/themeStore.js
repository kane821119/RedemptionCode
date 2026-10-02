import { create } from 'zustand';

const STORAGE_KEY = 'app_theme';

const readDarkMode = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark';
  } catch {
    return false;
  }
};

const persistDarkMode = (isDark) => {
  try {
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
  } catch {
    return;
  }
};

const applyTheme = (isDark) => {
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
};

export const useThemeStore = create((set) => ({
  isDark: readDarkMode(),

  initTheme: () => {
    const isDark = readDarkMode();
    applyTheme(isDark);
    set({ isDark });
  },

  toggleTheme: () => {
    const isDark = !useThemeStore.getState().isDark;
    persistDarkMode(isDark);
    applyTheme(isDark);
    set({ isDark });
  },
}));