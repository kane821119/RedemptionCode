import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../i18n/languageStore';
import { useCategoryStore } from '../store/categoryStore';
import { useToastStore } from '../store/toastStore';
import { confirmAction } from '../lib/browser';
import { toPublicRouteKey } from '../lib/publicIds';
import { formatLocalDateTime } from '../lib/storage';

const localeShortLabels = {
  'de-DE': 'DE',
  'en-US': 'EN',
  'es-ES': 'ES',
  'fr-FR': 'FR',
  'ja-JP': 'JA',
  'ko-KR': 'KO',
  'ru-RU': 'RU',
  'th-TH': 'TH',
  'vi-VN': 'VI',
  'zh-CN': '简',
  'zh-TW': '繁',
};

export default function GlobalHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const locale = useLanguageStore((state) => state.locale);
  const setLocale = useLanguageStore((state) => state.setLocale);
  const t = useLanguageStore((state) => state.t);
  const { userName, loginWithGoogle, logout, loading: authLoading, isAdmin } = useAuthStore();
  const categories = useCategoryStore((state) => state.categories);
  const announcements = useCategoryStore((state) => state.announcements);
  const fetchAnnouncements = useCategoryStore((state) => state.fetchAnnouncements);
  const createAnnouncement = useCategoryStore((state) => state.createAnnouncement);
  const deleteAnnouncement = useCategoryStore((state) => state.deleteAnnouncement);
  const showToast = useToastStore((state) => state.showToast);
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);

  useEffect(() => {
    fetchAnnouncements().catch(() => {});
  }, [fetchAnnouncements]);

  const handleSaveAnnouncement = async () => {
    const content = announcementDraft.trim();
    if (!content) return showToast(t('announcementRequired'), 'error');

    try {
      await createAnnouncement(content);
      setAnnouncementDraft('');
      showToast(t('createSuccess'));
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirmAction(t('deleteAnnouncementConfirm'))) return;

    try {
      await deleteAnnouncement(id);
      showToast(t('deleteAnnouncementSuccess'));
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const pathname = location.pathname;
  const showChat = pathname !== '/lobby';
  const showBlacklist = isAdmin && pathname !== '/blacklist';
  const showBack = pathname !== '/home';

  const currentCategoryName = (() => {
    if (!pathname.startsWith('/category/')) return '';
    const routeKey = pathname.split('/category/')[1];
    const match = categories.find((category) => toPublicRouteKey(category).toLowerCase() === decodeURIComponent(routeKey).toLowerCase() || category.id === routeKey);
    return match?.name || '';
  })();

  const pageTitle = (() => {
    if (pathname === '/lobby') return t('lobbyTitle');
    if (pathname === '/blacklist') return t('blacklistShortTitle');
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
              <h1 className="truncate whitespace-nowrap text-sm font-black text-slate-900 sm:text-base">{pageTitle}</h1>
            </div>
          </div>

          {!authLoading && (
            <div className="flex items-center gap-1.5 shrink-0">
              {showChat && (
                <button
                  onClick={() => navigate('/lobby')}
                  className="px-3 py-2 text-[10px] font-bold bg-white text-slate-700 border border-slate-200 rounded-xl shadow-sm"
                >
                  {t('navChat')}
                </button>
              )}
              {showBlacklist && (
                <button
                  type="button"
                  onClick={() => navigate('/blacklist')}
                  className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-rose-200 bg-white px-2 text-[9px] font-bold text-slate-700 shadow-sm"
                  aria-label={t('banPanelTitle')}
                  title={t('banPanelTitle')}
                >
                  🚫
                  <span>{t('blacklistShortTitle')}</span>
                </button>
              )}

              <div className="relative flex h-8 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-300" title={t('language')}>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-xl bg-transparent text-transparent outline-none [&>option]:text-slate-800"
                  aria-label={t('language')}
                >
                  <option value="de-DE">{t('german')}</option>
                  <option value="en-US">{t('english')}</option>
                  <option value="es-ES">{t('spanish')}</option>
                  <option value="fr-FR">{t('french')}</option>
                  <option value="ja-JP">{t('japanese')}</option>
                  <option value="ko-KR">{t('korean')}</option>
                  <option value="ru-RU">{t('russian')}</option>
                  <option value="th-TH">{t('thai')}</option>
                  <option value="vi-VN">{t('vietnamese')}</option>
                  <option value="zh-CN">{t('simplifiedChinese')}</option>
                  <option value="zh-TW">{t('traditionalChinese')}</option>
                </select>
                <span aria-hidden="true" className="pointer-events-none text-[9px] font-black text-slate-700">
                  {localeShortLabels[locale] || 'EN'}⌄
                </span>
              </div>

              {userName ? (
                <div className="flex items-center gap-1.5 pl-0.5">
                  <div className="hidden flex-col items-end sm:flex">
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

        {(announcements.length > 0 || isAdmin) && (
          <section className="mt-3 border-t border-amber-200 pt-2.5">
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setIsAnnouncementOpen((open) => !open)}
              aria-expanded={isAnnouncementOpen}
              aria-controls="global-announcement-content"
              className="mb-2 flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">{t('announcement')}</span>
              <span className="flex items-center gap-2 text-[9px] font-bold text-amber-700">
                {announcements.length}
                <span aria-hidden="true">{isAnnouncementOpen ? '▲' : '▼'}</span>
              </span>
            </button>
          ) : (
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">{t('announcement')}</span>
              <span className="text-[9px] font-bold text-amber-700">{announcements.length}</span>
            </div>
          )}

          {(!isAdmin || isAnnouncementOpen) && (
            <div id="global-announcement-content">
          {isAdmin && (
            <div className="mb-2 space-y-2">
              <textarea
                rows="2"
                value={announcementDraft}
                onChange={(event) => setAnnouncementDraft(event.target.value)}
                className="w-full resize-none rounded-xl border border-amber-200 bg-white p-2 text-xs text-slate-700 shadow-inner placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
                placeholder={t('announcementPlaceholder')}
              />
              <button
                type="button"
                onClick={handleSaveAnnouncement}
                className="w-full rounded-xl bg-amber-500 px-3 py-2 text-[10px] font-black text-white shadow-sm hover:bg-amber-400 transition-colors"
              >
                {t('createAnnouncement')}
              </button>
            </div>
          )}

          {announcements.length === 0 ? (
            <p className="text-xs leading-relaxed text-slate-600">{t('announcementEmpty')}</p>
          ) : (
            <div className="space-y-2">
              {announcements.map((item) => (
                <div key={item.id} className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold text-amber-700">
                      {formatLocalDateTime(item.created_at, locale)}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(item.id)}
                        className="text-[9px] font-black text-rose-600 hover:text-rose-700"
                      >
                        {t('announcementDelete')}
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{item.content}</p>
                </div>
              ))}
            </div>
          )}
            </div>
          )}
          </section>
        )}
      </div>
    </header>
  );
}
