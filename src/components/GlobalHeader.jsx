import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../i18n/languageStore';
import { useCategoryStore } from '../store/categoryStore';
import { toPublicRouteKey } from '../lib/publicIds';

export default function GlobalHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const locale = useLanguageStore((state) => state.locale);
  const setLocale = useLanguageStore((state) => state.setLocale);
  const t = useLanguageStore((state) => state.t);
  const { userName, loginWithGoogle, logout, loading: authLoading } = useAuthStore();
  const categories = useCategoryStore((state) => state.categories);

  const pathname = location.pathname;
  const showChat = pathname !== '/lobby';
  const showBack = pathname !== '/home';

  const currentCategoryName = (() => {
    if (!pathname.startsWith('/category/')) return '';
    const routeKey = pathname.split('/category/')[1];
    const match = categories.find((category) => toPublicRouteKey(category).toLowerCase() === decodeURIComponent(routeKey).toLowerCase() || category.id === routeKey);
    return match?.name || '';
  })();

  const pageTitle = (() => {
    if (pathname === '/lobby') return t('lobbyTitle');
    if (pathname.startsWith('/category/')) return currentCategoryName || t('appName');
    return t('appName');
  })();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-md px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {showBack && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-xs font-bold text-slate-700 shadow-sm"
                aria-label={t('back')}
              >
                ⬅️
              </button>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="overflow-wrap-anywhere break-words text-sm font-black text-slate-900 sm:text-base">{pageTitle}</h1>
            </div>
          </div>

          {!authLoading && (
            <div className="flex items-center gap-1.5 shrink-0">
              {showChat && (
                <button
                  onClick={() => navigate('/lobby')}
                  className="px-2.5 py-2 text-[10px] font-bold bg-white text-slate-600 border border-slate-200 rounded-xl shadow-sm"
                >
                  {t('navChat')}
                </button>
              )}

              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="px-2 py-2 text-[10px] font-bold bg-white text-slate-700 border border-slate-200 rounded-xl shadow-sm outline-none"
                aria-label={t('language')}
              >
                <option value="zh-TW">{t('traditionalChinese')}</option>
                <option value="en-US">{t('english')}</option>
                <option value="ja-JP">{t('japanese')}</option>
                <option value="vi-VN">{t('vietnamese')}</option>
              </select>

              {userName ? (
                <div className="flex items-center gap-1.5 pl-0.5">
                  <div className="flex flex-col items-end">
                    <span className="max-w-[80px] truncate text-[10px] font-bold text-slate-800">{userName}</span>
                  </div>
                  <button onClick={logout} className="p-2 bg-slate-100 rounded-xl text-[10px] font-bold">🚪</button>
                </div>
              ) : (
                <button
                  onClick={loginWithGoogle}
                  className="px-3 py-2 text-[10px] font-bold bg-white text-slate-700 border border-slate-200 rounded-xl shadow-sm"
                >
                  {t('loginGoogle')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
