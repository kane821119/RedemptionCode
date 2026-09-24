import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategoryStore } from '../store/categoryStore';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { readStorage, writeStorage, CACHE_KEYS, formatLocalDateTime } from '../lib/storage';
import { toPublicRouteKey } from '../lib/publicIds';
import { validateCategoryName, validateWebUrl } from '../lib/validation';
import { confirmAction } from '../lib/browser';
import { useLanguageStore } from '../i18n/languageStore';
import SeoMeta from '../components/SeoMeta';

const CategoryGrid = lazy(() => import('../features/home/CategoryGrid'));

export default function HomePage() {
  const navigate = useNavigate();
  const {
    categories,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    trackCategoryClick,
    fetchPendingCategoryQueue,
    supportPendingCategoryRequest,
    submitPendingCategoryRequest,
    approvePendingCategoryRequest,
    rejectPendingCategoryRequest,
    pendingCategoryQueue,
  } = useCategoryStore();
  const showToast = useToastStore((state) => state.showToast);
  const t = useLanguageStore((state) => state.t);
  const { isAdmin } = useAuthStore();
  const [editingCat, setEditingCat] = useState(null);
  const [isCreateCardOpen, setIsCreateCardOpen] = useState(false);
  const [isPendingQueueOpen, setIsPendingQueueOpen] = useState(false);
  const [pendingCategorySupports, setPendingCategorySupports] = useState(() => readStorage(CACHE_KEYS.pendingCategorySupports, {}));
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyShowFavorites, setOnlyShowFavorites] = useState(() => readStorage(CACHE_KEYS.favoritesSwitch, false));
  const [favoriteMap, setFavoriteMap] = useState(() => readStorage(CACHE_KEYS.favorites, {}));
  const [catForm, setCatForm] = useState({ name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true, keepChinese: false, webUrl: '' });

  useEffect(() => {
    fetchCategories().catch((err) => showToast(`${t('loadCategoriesError')}: ${err.message}`, 'error'));
    fetchPendingCategoryQueue().catch(() => {});
  }, [fetchCategories, fetchPendingCategoryQueue, showToast, t]);

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

      if (editingCat) {
        await updateCategory(editingCat.id, payload);
        showToast(t('updateSuccess'));
      } else {
        await submitPendingCategoryRequest(payload);
        showToast(t('pendingCategorySubmitSuccess'));
      }

      setCatForm({ name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true, keepChinese: false, webUrl: '' });
      setEditingCat(null);
      setIsCreateCardOpen(false);
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleApprovePendingCategory = async (item) => {
    try {
      await approvePendingCategoryRequest(item.id, {
        name: item.name,
        showSecretKey: item.showSecretKey,
        keepLetters: item.keepLetters,
        keepNumbers: item.keepNumbers,
        keepSymbols: item.keepSymbols,
        forceUppercase: item.forceUppercase,
        keepChinese: item.keepChinese,
        webUrl: item.webUrl,
      });
      showToast(t('pendingCategoryApproved'));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRejectPendingCategory = async (itemId) => {
    try {
      await rejectPendingCategoryRequest(itemId);
      showToast(t('pendingCategoryRejected'));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSupportPendingCategory = async (item) => {
    if (pendingCategorySupports[item.id]) return;
    try {
      await supportPendingCategoryRequest(item.id);
      const nextSupports = { ...pendingCategorySupports, [item.id]: true };
      setPendingCategorySupports(nextSupports);
      writeStorage(CACHE_KEYS.pendingCategorySupports, nextSupports);
      showToast(t('pendingCategorySupported'));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEditClick = (cat) => {
    setEditingCat(cat);
    setIsCreateCardOpen(true);
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
      <SeoMeta path="/home" />
      <div className="bg-white border border-slate-200/70 rounded-2xl p-3 shadow-sm mb-4 flex items-center gap-2.5">
        <span className="text-sm pl-1 text-slate-400">🔍</span>
        <input type="text" className="w-full text-xs font-semibold bg-transparent border-none text-slate-800 focus:outline-none" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center px-0.5 gap-2">
          <h2 className="text-xs font-black text-slate-400 uppercase">{t('existingCategories')}</h2>
          <button
            type="button"
            onClick={() => {
              setIsCreateCardOpen((prev) => !prev);
              if (!isCreateCardOpen && editingCat) {
                setEditingCat(null);
                setCatForm({ name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true, keepChinese: false, webUrl: '' });
              }
            }}
            className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[9px] font-black text-blue-600 shadow-sm transition hover:bg-blue-100"
          >
            {isCreateCardOpen ? '收起' : t('createCard')}
          </button>
          <label className="flex items-center gap-1.5 cursor-pointer select-none ml-auto">
            <span className={`text-[9px] font-black ${onlyShowFavorites ? 'text-blue-600' : 'text-slate-400'}`}>{onlyShowFavorites ? t('favorites') : t('all')}</span>
            <div className="relative shrink-0" onClick={handleToggleSwitch}>
              <div className={`w-7 h-4.5 rounded-full transition-colors ${onlyShowFavorites ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
              <div className={`absolute top-0.5 left-0.5 bg-white w-3.5 h-3.5 rounded-full shadow-sm transition-transform duration-200 ${onlyShowFavorites ? 'translate-x-2.5' : 'translate-x-0'}`}></div>
            </div>
          </label>
        </div>

        {isCreateCardOpen && (
          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/50 pl-5 space-y-4">
            <h4 className="font-black text-blue-600 text-xs uppercase">{editingCat ? t('adminEditTitle') : t('adminCreateTitle')}</h4>
            <form onSubmit={handleSaveCategory} className="space-y-3.5">
              <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 shadow-inner" placeholder={t('categoryNamePlaceholder')} value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
              <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono shadow-inner" placeholder={t('webUrlPlaceholder')} value={catForm.webUrl} onChange={e => setCatForm({ ...catForm, webUrl: e.target.value })} />
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 select-none"><input type="checkbox" className="w-4 h-4 rounded accent-blue-600 bg-white border-slate-300" checked={catForm.showSecretKey} onChange={e => setCatForm({ ...catForm, showSecretKey: e.target.checked })} /><span>{t('enableSecretKey')}</span></label>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] shadow-inner">
                <p className="font-bold text-slate-400 mb-2.5">{t('charWhitelistTitle')}</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 text-slate-600 font-semibold">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-600" checked={catForm.keepLetters} onChange={e => setCatForm({ ...catForm, keepLetters: e.target.checked })} /> <span>{t('letters')}</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-600" checked={catForm.keepNumbers} onChange={e => setCatForm({ ...catForm, keepNumbers: e.target.checked })} /> <span>{t('numbers')}</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-600" checked={catForm.keepSymbols} onChange={e => setCatForm({ ...catForm, keepSymbols: e.target.checked })} /> <span>{t('symbols')}</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-600" checked={catForm.keepChinese} onChange={e => setCatForm({ ...catForm, keepChinese: e.target.checked })} /> <span>{t('chinese')}</span></label>
                  <label className="flex items-center gap-2 cursor-pointer col-span-2 border-t border-slate-100 pt-2 text-indigo-600 font-bold"><input type="checkbox" className="w-3.5 h-3.5 rounded accent-indigo-600" checked={catForm.forceUppercase} onChange={e => setCatForm({ ...catForm, forceUppercase: e.target.checked })} /> <span>{t('uppercaseEnglishOnly')}</span></label>
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-500 transition-all">{t('createCard')}</button>
            </form>
          </div>
        )}

        {pendingCategoryQueue.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">{t('pendingCategoryQueueTitle')}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-amber-700">{pendingCategoryQueue.length}</span>
                <button
                  type="button"
                  onClick={() => setIsPendingQueueOpen((prev) => !prev)}
                  className="rounded-lg border border-amber-200 bg-white px-1.5 py-1 text-[8px] font-black text-amber-700"
                >
                  {isPendingQueueOpen ? t('pendingCategoryCollapse') : t('pendingCategoryExpand')}
                </button>
              </div>
            </div>

            {isPendingQueueOpen && (
              <div className="space-y-2">
                {pendingCategoryQueue.map((item) => (
                  <div key={item.id} className="rounded-xl border border-amber-200 bg-white p-2.5">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-800">{item.name}</span>
                      <span className="text-[9px] font-bold text-slate-400">{formatLocalDateTime(item.createdAt)}</span>
                    </div>
                    {item.webUrl && <p className="mb-2 break-all text-[10px] text-slate-500">{item.webUrl}</p>}
                    <div className="mb-2 flex flex-wrap gap-1 text-[9px] text-slate-500">
                      {item.keepLetters && <span className="rounded-full bg-slate-100 px-1.5 py-0.5">A-Z</span>}
                      {item.keepNumbers && <span className="rounded-full bg-slate-100 px-1.5 py-0.5">0-9</span>}
                      {item.keepSymbols && <span className="rounded-full bg-slate-100 px-1.5 py-0.5">符號</span>}
                      {item.keepChinese && <span className="rounded-full bg-slate-100 px-1.5 py-0.5">中文</span>}
                    </div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-amber-700">{t('pendingCategorySupportCount').replace('{count}', item.supportCount)}</span>
                      <button
                        type="button"
                        onClick={() => handleSupportPendingCategory(item)}
                        disabled={pendingCategorySupports[item.id]}
                        className="rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        +1
                      </button>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleApprovePendingCategory(item)} className="flex-1 rounded-lg bg-emerald-500 px-2 py-1.5 text-[9px] font-black text-white">{t('pendingCategoryApprove')}</button>
                        <button type="button" onClick={() => handleRejectPendingCategory(item.id)} className="flex-1 rounded-lg bg-rose-500 px-2 py-1.5 text-[9px] font-black text-white">{t('pendingCategoryReject')}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
