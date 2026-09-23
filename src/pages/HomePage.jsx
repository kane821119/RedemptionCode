import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategoryStore } from '../store/categoryStore';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { readStorage, writeStorage, CACHE_KEYS } from '../lib/storage';
import { toPublicRouteKey } from '../lib/publicIds';
import { validateCategoryName, validateWebUrl } from '../lib/validation';
import { confirmAction } from '../lib/browser';
import { useLanguageStore } from '../i18n/languageStore';

const CategoryAdminPanel = lazy(() => import('../features/home/CategoryAdminPanel'));
const CategoryGrid = lazy(() => import('../features/home/CategoryGrid'));

export default function HomePage() {
  const navigate = useNavigate();
  const {
    categories,
    announcements,
    systemSettings,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchSystemSettings,
    updateCleanupRules,
    fetchAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    trackCategoryClick,
  } = useCategoryStore();
  const showToast = useToastStore((state) => state.showToast);
  const t = useLanguageStore((state) => state.t);
  const { isAdmin } = useAuthStore();
  const [cleanupThreshold, setCleanupThreshold] = useState(() => {
    const dbValue = Number(systemSettings?.cleanup_report_threshold);
    return Number.isFinite(dbValue) && dbValue > 0 ? String(dbValue) : '10';
  });
  const [cleanupTime, setCleanupTime] = useState(() => systemSettings?.cleanup_report_time || '00:00');
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const cleanupThresholdValue = cleanupThreshold ?? (systemSettings?.cleanup_report_threshold ? String(systemSettings.cleanup_report_threshold) : '10');
  const cleanupTimeValue = cleanupTime ?? systemSettings?.cleanup_report_time ?? '00:00';
  const [editingCat, setEditingCat] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyShowFavorites, setOnlyShowFavorites] = useState(() => readStorage(CACHE_KEYS.favoritesSwitch, false));
  const [favoriteMap, setFavoriteMap] = useState(() => readStorage(CACHE_KEYS.favorites, {}));
  const [catForm, setCatForm] = useState({ name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true, keepChinese: false, webUrl: '' });

  useEffect(() => {
    fetchCategories().catch((err) => showToast(`${t('loadCategoriesError')}: ${err.message}`, 'error'));
    fetchSystemSettings().catch(() => {});
    fetchAnnouncements().catch(() => {});
  }, [fetchCategories, fetchSystemSettings, fetchAnnouncements, showToast, t]);

  useEffect(() => {
    const dbValue = Number(systemSettings?.cleanup_report_threshold);
    if (Number.isFinite(dbValue) && dbValue > 0) {
      setCleanupThreshold(String(dbValue));
    }

    if (systemSettings?.cleanup_report_time) {
      setCleanupTime(systemSettings.cleanup_report_time);
    }
  }, [systemSettings?.cleanup_report_threshold, systemSettings?.cleanup_report_time]);

  const handleSaveAnnouncement = async () => {
    const content = announcementDraft.trim();
    if (!content) return showToast(t('announcementRequired'), 'error');

    try {
      await createAnnouncement(content);
      setAnnouncementDraft('');
      showToast(t('createSuccess'));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (confirmAction(t('deleteAnnouncementConfirm'))) {
      try {
        await deleteAnnouncement(id);
        showToast(t('deleteAnnouncementSuccess'));
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  const handleToggleSwitch = () => {
    const nextState = !onlyShowFavorites;
    setOnlyShowFavorites(nextState);
    writeStorage(CACHE_KEYS.favoritesSwitch, nextState);
  };

  const processedCategories = useMemo(() => {
    const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return categories.filter(cat => {
      if (onlyShowFavorites && !favoriteMap[cat.id]) return false;
      return tokens.length === 0 || tokens.some(tk => cat.name.toLowerCase().includes(tk));
    }).sort((a, b) => {
      const favA = favoriteMap[a.id] ? 1 : 0, favB = favoriteMap[b.id] ? 1 : 0;
      return favB !== favA ? favB - favA : (b.total_clicks || 0) - (a.total_clicks || 0);
    });
  }, [categories, searchQuery, onlyShowFavorites, favoriteMap]);

  const handleCategorySelect = async (id) => {
    const target = categories.find((category) => category.id === id);
    await trackCategoryClick(id);
    navigate(`/category/${encodeURIComponent(toPublicRouteKey(target))}`);
  };

  const handleToggleFavorite = (id, e) => {
    e.stopPropagation();
    const newMap = { ...favoriteMap, [id]: !favoriteMap[id] };
    setFavoriteMap(newMap);
    writeStorage(CACHE_KEYS.favorites, newMap);
  };
  const handleSaveCategory = async (e) => {
    e.preventDefault();

    const nameCheck = validateCategoryName(catForm.name);
    if (!nameCheck.valid) return showToast(nameCheck.error, 'error');

    const webUrlCheck = validateWebUrl(catForm.webUrl);
    if (!webUrlCheck.valid) return showToast(webUrlCheck.error, 'error');

    try {
      const payload = {
        ...catForm,
        name: nameCheck.value,
        webUrl: webUrlCheck.value,
      };

      if (editingCat) { await updateCategory(editingCat.id, payload); showToast(t('updateSuccess')); }
      else { await createCategory(payload); showToast(t('createSuccess')); }
      setCatForm({ name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true, keepChinese: false, webUrl: '' });
      setEditingCat(null);
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleEditClick = (cat) => {
    setEditingCat(cat); setIsPanelOpen(true);
    setCatForm({ name: cat.name, showSecretKey: cat.show_secret_key, keepLetters: cat.keep_letters, keepNumbers: cat.keep_numbers, keepSymbols: cat.keep_symbols, forceUppercase: cat.force_uppercase, keepChinese: cat.keep_chinese || false, webUrl: cat.web_url || '' });
  };

  const handleDeleteCategory = async (id) => {
    const target = categories.find((category) => category.id === id);
    const message = t('confirmDeleteCategory').replace('{name}', target?.name || '');
    if (confirmAction(message)) {
      await deleteCategory(id);
      showToast(t('removed'));
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-28 bg-slate-50 min-h-screen font-sans selection:bg-blue-500 selection:text-white">
      <Suspense fallback={<div className="mb-4 h-20 rounded-2xl border border-slate-200 bg-white animate-pulse" />}>
        <CategoryAdminPanel
          isAdmin={isAdmin}
          isPanelOpen={isPanelOpen}
          setIsPanelOpen={setIsPanelOpen}
          editingCat={editingCat}
          setEditingCat={setEditingCat}
          catForm={catForm}
          setCatForm={setCatForm}
          handleSaveCategory={handleSaveCategory}
          cleanupThreshold={cleanupThresholdValue}
          setCleanupThreshold={setCleanupThreshold}
          cleanupTime={cleanupTimeValue}
          setCleanupTime={setCleanupTime}
          updateCleanupRules={updateCleanupRules}
          showToast={showToast}
        />
      </Suspense>

      <div className="mb-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-3.5 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">📢</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">{t('announcement')}</span>
          </div>
          <span className="text-[9px] font-bold text-amber-700">{announcements.length} 則</span>
        </div>

        {isAdmin && (
          <div className="mb-3 space-y-2">
            <textarea
              rows="3"
              value={announcementDraft}
              onChange={(e) => setAnnouncementDraft(e.target.value)}
              className="w-full resize-none rounded-xl border border-amber-200 bg-white/80 p-2.5 text-xs text-slate-700 shadow-inner placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
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

        <div className="space-y-2">
          {announcements.length === 0 ? (
            <p className="text-xs leading-relaxed text-slate-600">{t('announcementEmpty')}</p>
          ) : (
            announcements.map((item) => (
              <div key={item.id} className="rounded-xl border border-amber-200 bg-white/80 p-2.5">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold text-amber-700">
                    {new Date(item.created_at).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
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
            ))
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200/70 rounded-2xl p-3 shadow-sm mb-4 flex items-center gap-2.5">
        <span className="text-sm pl-1 text-slate-400">🔍</span>
        <input type="text" className="w-full text-xs font-semibold bg-transparent border-none text-slate-800 focus:outline-none" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center px-0.5">
          <h2 className="text-xs font-black text-slate-400 uppercase">{t('existingCategories')}</h2>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <span className={`text-[9px] font-black ${onlyShowFavorites ? 'text-blue-600' : 'text-slate-400'}`}>{onlyShowFavorites ? t('favorites') : t('all')}</span>
            <div className="relative shrink-0" onClick={handleToggleSwitch}>
              <div className={`w-7 h-4.5 rounded-full transition-colors ${onlyShowFavorites ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
              <div className={`absolute top-0.5 left-0.5 bg-white w-3.5 h-3.5 rounded-full shadow-sm transition-transform duration-200 ${onlyShowFavorites ? 'translate-x-2.5' : 'translate-x-0'}`}></div>
            </div>
          </label>
        </div>

        {processedCategories.length === 0 ? (
          <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs px-4">{t('empty')}</div>
        ) : (
          <Suspense fallback={<div className="h-24 rounded-2xl border border-slate-200 bg-white animate-pulse" />}>
            <CategoryGrid
              processedCategories={processedCategories}
              favoriteMap={favoriteMap}
              handleCategorySelect={handleCategorySelect}
              handleToggleFavorite={handleToggleFavorite}
              handleEditClick={handleEditClick}
              onDeleteCategory={handleDeleteCategory}
              isAdmin={isAdmin}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
