import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './router/AppRoutes';
import Toast from './components/Toast';
import GlobalHeader from './components/GlobalHeader';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useLanguageStore } from './i18n/languageStore';

export default function App() {
  const initAuth = useAuthStore((state) => state.initAuth);
  const initLocale = useLanguageStore((state) => state.initLocale);
  const initTheme = useThemeStore((state) => state.initTheme);

  useEffect(() => {
    initAuth();
    initLocale();
    initTheme();
  }, [initAuth, initLocale, initTheme]);

  return (
    <BrowserRouter>
      <div className="bg-slate-50 min-h-screen">
        <Toast />
        <GlobalHeader />
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}
