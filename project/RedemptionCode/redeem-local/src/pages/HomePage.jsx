import React, { useState, useEffect, useMemo } from 'react';
import { useSystemStore } from '../store/systemStore';
import { useAuthStore } from '../store/authStore';

export default function HomePage({ onSelectCategory, onNavigateToChat }) {
  const { categories, systemSettings, fetchCategories, createCategory, updateCategory, deleteCategory, fetchSystemSettings, updateCleanupRules, showToast } = useSystemStore();
  const { userName, isAdmin, loginWithGoogle, logout, loading: authLoading } = useAuthStore();

  const [cleanupThreshold, setCleanupThreshold] = useState('100');
  const [editingCat, setEditingCat] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); 
  
  const [catForm, setCatForm] = useState({
    name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true
  });

  useEffect(() => {
    fetchCategories().catch(err => showToast(`無法載入分類: ${err.message}`, 'error'));
    fetchSystemSettings().catch(() => {});
  }, []);

  useEffect(() => {
    if (systemSettings.cleanup_report_threshold) {
      setCleanupThreshold(systemSettings.cleanup_report_threshold);
    }
  }, [systemSettings]);

  // ⚡ 多關鍵字片段模糊比對 + 本地點擊次數熱度置頂排序核心演算法
  const processedCategories = useMemo(() => {
    const clickCounts = JSON.parse(localStorage.getItem('category_usage_clicks_v2') || '{}');
    const searchTokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    
    return categories
      .filter(cat => {
        if (searchTokens.length === 0) return true;
        const categoryNameLower = cat.name.toLowerCase();
        return searchTokens.some(token => categoryNameLower.includes(token));
      })
      .sort((a, b) => {
        const countA = clickCounts[a.id] || 0;
        const countB = clickCounts[b.id] || 0;
        return countB - countA;
      });
  }, [categories, searchQuery]);

  // 觸發點擊跳轉時，本地自動累加點擊權重次數
  const handleCategorySelect = (catId) => {
    const clickCounts = JSON.parse(localStorage.getItem('category_usage_clicks_v2') || '{}');
    clickCounts[catId] = (clickCounts[catId] || 0) + 1;
    localStorage.setItem('category_usage_clicks_v2', JSON.stringify(clickCounts));
    onSelectCategory(catId);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) return showToast('請填寫分類名稱', 'error');
    try {
      if (editingCat) {
        await updateCategory(editingCat.id, catForm);
        showToast('分類卡片屬性修改成功！');
      } else {
        await createCategory(catForm);
        showToast('新分類卡片建立成功！');
      }
      setCatForm({ name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true });
      setEditingCat(null);
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleEditClick = (cat) => {
    setEditingCat(cat);
    setIsPanelOpen(true);
    setCatForm({
      name: cat.name, showSecretKey: cat.show_secret_key, keepLetters: cat.keep_letters,
      keepNumbers: cat.keep_numbers, keepSymbols: cat.keep_symbols, forceUppercase: cat.force_uppercase
    });
  };
  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-28 bg-slate-50 min-h-screen font-sans selection:bg-blue-500 selection:text-white">
      
      {/* 頂部導覽卡片 */}
      <header className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.015)] flex justify-between items-center gap-4 mb-5">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            代碼集散廳
          </h1>
          <p className="text-[10px] font-black text-blue-600 tracking-widest uppercase mt-0.5">
            Card Dashboard
          </p>
        </div>

        {!authLoading && (
          <div className="flex items-center gap-1.5">
            
            {/* ✨ 新增：置頂一體化純白大廳留言板按鈕 */}
            <button 
              onClick={onNavigateToChat}
              className="px-2.5 py-2 text-xs font-bold bg-white text-slate-600 border border-slate-200 rounded-xl shadow-[0_2px_6px_rgba(0,0,0,0.01)] hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all flex items-center gap-1"
            >
              <span>💬 交流</span>
            </button>

            {userName ? (
              <div className="flex items-center gap-1.5 pl-0.5">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[80px]">{userName}</span>
                  {isAdmin && (
                    <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 mt-0.5">
                      管理者
                    </span>
                  )}
                </div>
                <button onClick={logout} className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition text-xs font-bold">
                  🚪
                </button>
              </div>
            ) : (
              <button 
                onClick={loginWithGoogle} 
                className="px-3 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-xl shadow-[0_2px_6px_rgba(0,0,0,0.03)] hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all"
              >
                Google 登入
              </button>
            )}
          </div>
        )}
      </header>

      {/* 搜尋卡片 */}
      <div className="bg-white border border-slate-200/70 rounded-2xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)] mb-4 flex items-center gap-2.5">
        <span className="text-sm pl-1 text-slate-400">🔍</span>
        <input 
          type="text" 
          className="w-full text-xs font-semibold bg-transparent border-none text-slate-800 placeholder-slate-400 focus:outline-none py-1"
          placeholder="輸入類別名稱即時搜尋過濾..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-[10px] font-bold text-slate-400 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded-md transition">清除</button>
        )}
      </div>

      {/* 管理者控製麵板 */}
      {isAdmin && (
        <div className="mb-4">
          <button 
            onClick={() => setIsPanelOpen(!isPanelOpen)} 
            className="w-full bg-white text-slate-800 p-4 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex justify-between items-center active:scale-[0.99] transition-all border border-slate-200/80 relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600 opacity-60"></div>
            <span className="text-xs font-black text-slate-700 tracking-wider flex items-center gap-2 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              {isPanelOpen ? '收起系統管理中心' : '展開系統管理中心'}
            </span>
            <span className="text-xs text-slate-400 font-bold">{isPanelOpen ? '▲' : '▼'}</span>
          </button>

          {isPanelOpen && (
            <section className="bg-white border border-slate-200/80 rounded-2xl p-4 mt-2 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4 animate-fadeIn relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600 opacity-30"></div>
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/50 pl-5">
                <h4 className="font-black text-blue-600 mb-3 text-xs tracking-wider uppercase">{editingCat ? '✏️ 編輯類型屬性' : '✨ 建立通用類型卡片'}</h4>
                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-xs text-slate-800 placeholder-slate-400 shadow-inner" placeholder="輸入分類名稱" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-600 py-1 select-none">
                    <input type="checkbox" className="w-4 h-4 rounded accent-blue-600 bg-white border-slate-300" checked={catForm.showSecretKey} onChange={e => setCatForm({ ...catForm, showSecretKey: e.target.checked })} />
                    <span>此分類啟用額外「密碼 / 隨附金鑰」</span>
                  </label>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] shadow-inner">
                    <p className="font-bold text-slate-400 mb-2">⚙️ 智慧切割提取字元白名單</p>
                    <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium">
                      <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-blue-600" checked={catForm.keepLetters} onChange={e => setCatForm({ ...catForm, keepLetters: e.target.checked })} /> 英文 (A-Z)</label>
                      <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-blue-600" checked={catForm.keepNumbers} onChange={e => setCatForm({ ...catForm, keepNumbers: e.target.checked })} /> 數字 (0-9)</label>
                      <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-blue-600" checked={catForm.keepSymbols} onChange={e => setCatForm({ ...catForm, keepSymbols: e.target.checked })} /> 基本符號</label>
                      <label className="flex items-center gap-1.5 text-blue-600 font-bold"><input type="checkbox" className="accent-blue-600" checked={catForm.forceUppercase} onChange={e => setCatForm({ ...catForm, forceUppercase: e.target.checked })} /> 強制轉大寫</label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-500 transition active:scale-95 shadow-md shadow-blue-500/10">{editingCat ? '儲存變更' : '建立卡片'}</button>
                    {editingCat && <button type="button" onClick={() => { setEditingCat(null); setCatForm({ name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true }); }} className="px-4 bg-slate-200 text-slate-600 font-bold rounded-xl text-xs">取消</button>}
                  </div>
                </form>
              </div>
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/50 text-xs pl-5">
                <h4 className="font-black text-slate-500 mb-2 tracking-wider">🧹 凌晨自動清理排程參數</h4>
                <div className="flex items-center gap-2 flex-wrap text-slate-600 mb-3 font-medium">
                  <span>不重複檢舉累計達</span>
                  <input type="number" className="w-14 p-1.5 text-center bg-white border border-slate-200 rounded-lg text-slate-800 font-bold text-xs" value={cleanupThreshold} onChange={e => setCleanupThreshold(e.target.value)} />
                  <span>次，自動從雲端完全抹除</span>
                </div>
                <button onClick={() => { updateCleanupRules(cleanupThreshold); showToast('後端自動清理規則更新成功！'); }} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs active:scale-95 transition-all border border-slate-200">儲存排程規則</button>
              </div>
            </section>
          )}
        </div>
      )}
      {/* 核心網格卡片池清單區塊：已移除厚重的留言卡片傳送門 */}
      <div className="space-y-3">
        <h2 className="text-xs font-black tracking-widest text-slate-400 uppercase px-0.5">📁 現有代碼池類別</h2>
        {processedCategories.length === 0 ? (
          <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs px-4">
            {searchQuery ? '找不到相符的類別名稱卡片' : '大廳目前空無一物，請透過管理面板建立。'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {processedCategories.map(cat => {
              const usageCount = JSON.parse(localStorage.getItem('category_usage_clicks_v2') || '{}')[cat.id] || 0;
              return (
                <div key={cat.id} onClick={() => handleCategorySelect(cat.id)} className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)] hover:shadow-md hover:border-blue-200 transition-all duration-200 active:scale-[0.97] cursor-pointer flex flex-col justify-between min-h-[120px] relative group overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600 opacity-40 group-hover:opacity-100 transition-all"></div>
                  <div>
                    <div className="flex justify-between items-start gap-1.5">
                      <h3 className="text-sm font-extrabold text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors tracking-tight leading-tight flex-1">{cat.name}</h3>
                      {usageCount > 0 && <span className="text-[8px] bg-blue-50 text-blue-600 px-1 rounded font-black shrink-0 shadow-inner">⚡{usageCount}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${cat.show_secret_key ? 'bg-blue-50 text-blue-700 border border-blue-100/50' : 'bg-slate-100 text-slate-600'}`}>{cat.show_secret_key ? '🔒 帶金鑰' : '🔓 免密'}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1 items-center max-w-[75%]">
                      {[cat.keep_letters && '英文', cat.keep_numbers && '數字', cat.keep_symbols && '符號', cat.force_uppercase && '大寫'].filter(Boolean).map((ruleName, idx) => (
                        <span key={idx} className="text-[8px] font-extrabold bg-slate-50 text-slate-500 border border-slate-200/60 px-1 rounded whitespace-nowrap">{ruleName}</span>
                      ))}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleEditClick(cat)} className="p-1 text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-md active:scale-90 transition shadow-sm">✏️</button>
                        <button onClick={async () => { if (window.confirm('確定刪除種類卡片？其下的所有代碼將會被連帶完全清除！')) { await deleteCategory(cat.id); showToast('類別卡片已完全移除'); } }} className="p-1 text-[11px] bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 rounded-md active:scale-90 transition shadow-sm">🗑️</button>
                      </div>
                    )}
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
