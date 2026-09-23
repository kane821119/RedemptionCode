import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategoryStore } from '../store/categoryStore';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { readStorage, writeStorage, CACHE_KEYS } from '../lib/storage';
import { toPublicRouteKey } from '../lib/publicIds';
import { validateCategoryName, validateWebUrl } from '../lib/validation';
import { confirmAction } from '../lib/browser';
import { useLanguageStore } from '../i18n/languageStore';

export default function HomePage() {
  const navigate = useNavigate();
  const {
    categories,
    systemSettings,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchSystemSettings,
    updateCleanupRules,
    trackCategoryClick,
  } = useCategoryStore();
  const showToast = useToastStore((state) => state.showToast);
  const t = useLanguageStore((state) => state.t);
  const { isAdmin } = useAuthStore();
  const [cleanupThreshold, setCleanupThreshold] = useState('100');
  const [editingCat, setEditingCat] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyShowFavorites, setOnlyShowFavorites] = useState(() => readStorage(CACHE_KEYS.favoritesSwitch, false));
  const [favoriteMap, setFavoriteMap] = useState(() => readStorage(CACHE_KEYS.favorites, {}));
  const [catForm, setCatForm] = useState({ name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true, keepChinese: false, webUrl: '' });

  useEffect(() => {
    fetchCategories().catch((err) => showToast(`${t('loadCategoriesError')}: ${err.message}`, 'error'));
    fetchSystemSettings().catch(() => {});
  }, [fetchCategories, fetchSystemSettings, showToast, t]);

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

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-28 bg-slate-50 min-h-screen font-sans selection:bg-blue-500 selection:text-white">
      <div className="bg-white border border-slate-200/70 rounded-2xl p-3 shadow-sm mb-4 flex items-center gap-2.5">
        <span className="text-sm pl-1 text-slate-400">🔍</span>
        <input type="text" className="w-full text-xs font-semibold bg-transparent border-none text-slate-800 focus:outline-none" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      {isAdmin && (
        <div className="mb-4">
          <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="w-full bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border border-slate-200/80 relative overflow-hidden group"><div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600 opacity-60"></div><span className="text-xs font-black text-slate-700">👑 {isPanelOpen ? t('adminToggleClose') : t('adminToggleOpen')}</span><span className="text-xs text-slate-400 font-bold">{isPanelOpen ? '▲' : '▼'}</span></button>
          {isPanelOpen && (
            <section className="bg-white border border-slate-200/80 rounded-2xl p-4 mt-2 shadow-md space-y-4 relative overflow-hidden">
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
                  <div className="flex gap-2"><button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-500 transition-all">{editingCat ? t('saveChanges') : t('createCard')}</button>
                  {editingCat && <button type="button" onClick={() => { setEditingCat(null); setCatForm({ name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true, keepChinese: false, webUrl: '' }); }} className="px-4 bg-slate-200 text-slate-600 font-bold rounded-xl text-xs">{t('cancel')}</button>}</div>
                </form>
              </div>
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/50 text-xs pl-5">
                <div className="flex items-center gap-2 flex-wrap text-slate-600 font-medium"><span>{t('cleanupLabel')}</span><input type="number" className="w-14 p-1 text-center bg-white border rounded-lg text-slate-800 font-bold" value={cleanupThreshold} onChange={e => setCleanupThreshold(e.target.value)} /><span>{t('cleanupSuffix')}</span></div>
                <button onClick={() => { updateCleanupRules(cleanupThreshold); showToast(t('updateSuccess')); }} className="w-full mt-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl border">{t('saveScheduleRule')}</button>
              </div>
            </section>
          )}
        </div>
      )}

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

        {processedCategories.length === 0 ? ( <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs px-4">{t('empty')}</div> ) : (
          <div className="grid grid-cols-2 gap-3">
            {processedCategories.map(cat => {
              const isFav = !!favoriteMap[cat.id];
              return (
                <div key={cat.id} onClick={() => handleCategorySelect(cat.id)} className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 active:scale-[0.97] cursor-pointer flex flex-col justify-between min-h-[125px] relative group overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600 opacity-40 group-hover:opacity-100 transition-all"></div>
                  <div>
                    <div className="flex justify-between items-start gap-1.5">
                      <h3 className="text-sm font-extrabold text-slate-800 line-clamp-2 tracking-tight leading-tight flex-1">{cat.name}</h3>
                      {cat.total_clicks > 0 && <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-black shadow-inner">🔥 {cat.total_clicks}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1"><span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${cat.show_secret_key ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{cat.show_secret_key ? t('secretKeyOn') : t('secretKeyOff')}</span></div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-1 w-full">
                      <button onClick={(e) => handleToggleFavorite(cat.id, e)} className="text-xs active:scale-125 transition-transform p-0.5">{isFav ? '⭐' : '☆'}</button>
                      <div className="flex flex-wrap gap-0.5 items-center justify-end max-w-[65%] overflow-hidden">
                        {[cat.web_url && t('tagWeb'), cat.keep_chinese && t('tagChinese'), cat.keep_letters && t('tagLetters'), cat.keep_numbers && t('tagNumbers'), cat.keep_symbols && t('tagSymbols'), cat.force_uppercase && t('tagUppercase')].filter(Boolean).map((ruleName, idx) => ( <span key={idx} className="text-[7px] font-black bg-slate-50 text-slate-400 border border-slate-200/50 px-0.5 rounded scale-95 shrink-0">{ruleName}</span> ))}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleEditClick(cat)} className="p-0.5 text-[10px] bg-slate-50 border rounded">✏️</button>
                          <button onClick={async () => {
                            const message = t('confirmDeleteCategory').replace('{name}', cat.name);
                            if (confirmAction(message)) {
                              await deleteCategory(cat.id);
                              showToast(t('removed'));
                            }
                          }} className="p-0.5 text-[10px] bg-slate-50 border rounded text-rose-500">🗑️</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
