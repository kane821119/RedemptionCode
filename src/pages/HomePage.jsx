import React, { useState, useEffect, useMemo } from 'react';
import { useSystemStore } from '../store/systemStore';
import { useAuthStore } from '../store/authStore';

export default function HomePage({ onSelectCategory, onNavigateToChat }) {
  const { categories, systemSettings, fetchCategories, createCategory, updateCategory, deleteCategory, fetchSystemSettings, updateCleanupRules, trackCategoryClick, showToast } = useSystemStore();
  const { userName, isAdmin, loginWithGoogle, logout, loading: authLoading } = useAuthStore();
  const [cleanupThreshold, setCleanupThreshold] = useState('100');
  const [editingCat, setEditingCat] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); 
  const [onlyShowFavorites, setOnlyShowFavorites] = useState(() => JSON.parse(localStorage.getItem('only_show_favorites_switch_v2') || 'false'));
  const [favoriteMap, setFavoriteMap] = useState(() => JSON.parse(localStorage.getItem('category_favorites_v2') || '{}'));
  const [catForm, setCatForm] = useState({ name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true, keepChinese: false, webUrl: '' });

  useEffect(() => {
    fetchCategories().catch(err => showToast(`無法載入分類: ${err.message}`, 'error'));
    fetchSystemSettings().catch(() => {});
  }, []);
  const handleToggleSwitch = () => {
    const nextState = !onlyShowFavorites; setOnlyShowFavorites(nextState);
    localStorage.setItem('only_show_favorites_switch_v2', JSON.stringify(nextState));
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

  const handleCategorySelect = async (id) => { trackCategoryClick(id); onSelectCategory(id); };
  const handleToggleFavorite = (id, e) => {
    e.stopPropagation(); const newMap = { ...favoriteMap, [id]: !favoriteMap[id] };
    setFavoriteMap(newMap); localStorage.setItem('category_favorites_v2', JSON.stringify(newMap));
  };
  const handleSaveCategory = async (e) => {
    e.preventDefault(); if (!catForm.name.trim()) return showToast('請填寫分類名稱', 'error');
    try {
      if (editingCat) { await updateCategory(editingCat.id, catForm); showToast('修改成功！'); }
      else { await createCategory(catForm); showToast('建立成功！'); }
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
      <header className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm flex justify-between items-center gap-4 mb-5">
        <div><h1 className="text-xl font-black text-slate-900">代碼集散廳</h1><p className="text-[10px] font-black text-blue-600 uppercase mt-0.5">Card Dashboard</p></div>
        {!authLoading && (
          <div className="flex items-center gap-1.5">
            <button onClick={onNavigateToChat} className="px-2.5 py-2 text-xs font-bold bg-white text-slate-600 border border-slate-200 rounded-xl shadow-sm">💬 交流</button>
            {userName ? (
              <div className="flex items-center gap-1.5 pl-0.5">
                <div className="flex flex-col items-end"><span className="text-xs font-bold text-slate-800 truncate max-w-[80px]">{userName}</span></div>
                <button onClick={logout} className="p-2 bg-slate-100 rounded-xl text-xs font-bold">🚪</button>
              </div>
            ) : ( <button onClick={loginWithGoogle} className="px-3 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-xl shadow-sm">Google 登入</button> )}
          </div>
        )}
      </header>
      <div className="bg-white border border-slate-200/70 rounded-2xl p-3 shadow-sm mb-4 flex items-center gap-2.5">
        <span className="text-sm pl-1 text-slate-400">🔍</span>
        <input type="text" className="w-full text-xs font-semibold bg-transparent border-none text-slate-800 focus:outline-none" placeholder="輸入類別名稱即時搜尋..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      {isAdmin && (
        <div className="mb-4">
          <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="w-full bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border border-slate-200/80 relative overflow-hidden group"><div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600 opacity-60"></div><span className="text-xs font-black text-slate-700">👑 {isPanelOpen ? '收起管理控制中心' : '展開管理控制中心'}</span><span className="text-xs text-slate-400 font-bold">{isPanelOpen ? '▲' : '▼'}</span></button>
          {isPanelOpen && (
            <section className="bg-white border border-slate-200/80 rounded-2xl p-4 mt-2 shadow-md space-y-4 relative overflow-hidden">
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/50 pl-5 space-y-4">
                <h4 className="font-black text-blue-600 text-xs uppercase">{editingCat ? '✏️ 編輯類型屬性' : '✨ 建立通用類型卡片'}</h4>
                <form onSubmit={handleSaveCategory} className="space-y-3.5">
                  <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 shadow-inner" placeholder="分類名稱" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
                  <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono shadow-inner" placeholder="🌐 外部兌換前綴網址 (選填)" value={catForm.webUrl} onChange={e => setCatForm({ ...catForm, webUrl: e.target.value })} />
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 select-none"><input type="checkbox" className="w-4 h-4 rounded accent-blue-600 bg-white border-slate-300" checked={catForm.showSecretKey} onChange={e => setCatForm({ ...catForm, showSecretKey: e.target.checked })} /><span>啟用「隨附密碼 / 金鑰」</span></label>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] shadow-inner">
                    <p className="font-bold text-slate-400 mb-2.5">⚙️ 智慧切割提取字元白名單</p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 text-slate-600 font-semibold">
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-600" checked={catForm.keepLetters} onChange={e => setCatForm({ ...catForm, keepLetters: e.target.checked })} /> <span>英文 (A-Z)</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-600" checked={catForm.keepNumbers} onChange={e => setCatForm({ ...catForm, keepNumbers: e.target.checked })} /> <span>數字 (0-9)</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-600" checked={catForm.keepSymbols} onChange={e => setCatForm({ ...catForm, keepSymbols: e.target.checked })} /> <span>基本符號</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-600" checked={catForm.keepChinese} onChange={e => setCatForm({ ...catForm, keepChinese: e.target.checked })} /> <span>中文文字</span></label>
                      <label className="flex items-center gap-2 cursor-pointer col-span-2 border-t border-slate-100 pt-2 text-indigo-600 font-bold"><input type="checkbox" className="w-3.5 h-3.5 rounded accent-indigo-600" checked={catForm.forceUppercase} onChange={e => setCatForm({ ...catForm, forceUppercase: e.target.checked })} /> <span>強制轉大寫 (僅對英文有效)</span></label>
                    </div>
                  </div>
                  <div className="flex gap-2"><button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-500 transition-all">{editingCat ? '儲存變更' : '建立卡片'}</button>
                  {editingCat && <button type="button" onClick={() => { setEditingCat(null); setCatForm({ name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true, keepChinese: false, webUrl: '' }); }} className="px-4 bg-slate-200 text-slate-600 font-bold rounded-xl text-xs">取消</button>}</div>
                </form>
              </div>
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/50 text-xs pl-5">
                <div className="flex items-center gap-2 flex-wrap text-slate-600 font-medium"><span>🧹 凌晨不重複檢舉達</span><input type="number" className="w-14 p-1 text-center bg-white border rounded-lg text-slate-800 font-bold" value={cleanupThreshold} onChange={e => setCleanupThreshold(e.target.value)} /><span>次，自動完全抹除</span></div>
                <button onClick={() => { updateCleanupRules(cleanupThreshold); showToast('更新成功！'); }} className="w-full mt-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl border">儲存排程規則</button>
              </div>
            </section>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex justify-between items-center px-0.5">
          <h2 className="text-xs font-black text-slate-400 uppercase">📁 現有代碼池類別</h2>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <span className={`text-[9px] font-black ${onlyShowFavorites ? 'text-blue-600' : 'text-slate-400'}`}>{onlyShowFavorites ? '⭐ 收藏夾' : '全部'}</span>
            <div className="relative shrink-0" onClick={handleToggleSwitch}>
              <div className={`w-7 h-4.5 rounded-full transition-colors ${onlyShowFavorites ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
              <div className={`absolute top-0.5 left-0.5 bg-white w-3.5 h-3.5 rounded-full shadow-sm transition-transform duration-200 ${onlyShowFavorites ? 'translate-x-2.5' : 'translate-x-0'}`}></div>
            </div>
          </label>
        </div>

        {processedCategories.length === 0 ? ( <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs px-4">空無一物</div> ) : (
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
                    <div className="mt-2 flex flex-wrap gap-1"><span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${cat.show_secret_key ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{cat.show_secret_key ? '🔒 帶密碼' : '🔓 免密'}</span></div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-1 w-full">
                      <button onClick={(e) => handleToggleFavorite(cat.id, e)} className="text-xs active:scale-125 transition-transform p-0.5">{isFav ? '⭐' : '☆'}</button>
                      <div className="flex flex-wrap gap-0.5 items-center justify-end max-w-[65%] overflow-hidden">
                        {[cat.web_url && '網', cat.keep_chinese && '中', cat.keep_letters && '英', cat.keep_numbers && '數', cat.keep_symbols && '符', cat.force_uppercase && '大'].filter(Boolean).map((ruleName, idx) => ( <span key={idx} className="text-[7px] font-black bg-slate-50 text-slate-400 border border-slate-200/50 px-0.5 rounded scale-95 shrink-0">{ruleName}</span> ))}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleEditClick(cat)} className="p-0.5 text-[10px] bg-slate-50 border rounded">✏️</button>
                          <button onClick={async () => { if (window.confirm('確定刪除？')) { await deleteCategory(cat.id); showToast('已移除'); } }} className="p-0.5 text-[10px] bg-slate-50 border rounded text-rose-500">🗑️</button>
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
