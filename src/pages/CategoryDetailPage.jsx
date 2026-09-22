import React, { useState, useEffect, useMemo } from 'react';
import { useSystemStore } from '../store/systemStore';
import { useAuthStore } from '../store/authStore';
import BulkUploadForm from '../features/pool/BulkUploadForm';
import { supabase } from '../services/supabaseClient'; // 引入客戶端以便進行管理員直接刪除

export default function CategoryDetailPage({ categoryId, onNavigateBack }) {
  const { categories, systemSettings, fetchCodesOfCategory, batchSubmitChanges, showToast } = useSystemStore();
  const isAdmin = useAuthStore((state) => state.isAdmin);

  const [currentCategory, setCurrentCategory] = useState(null);
  const [rawCodes, setRawCodes] = useState([]);
  const [syncTrigger, setSyncTrigger] = useState(0);

  // 暫存當前頁面上使用者的點擊操作
  const [localActions, setLocalActions] = useState({}); 

  // 📥 體驗優化：將開始日期預設設為極早期（最舊），結束日期預設為今天
  const [startDate, setStartDate] = useState('2020-01-01'); // 預設拉出最舊歷史代碼
  const [endDate, setEndDate] = useState(() => {
    // 精確抓取當下時區的今天日期 (格式：YYYY-MM-DD)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  const [threshold, setThreshold] = useState(20);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    const cat = categories.find(c => c.id === categoryId);
    setCurrentCategory(cat);
    if (systemSettings.cleanup_report_threshold) {
      setThreshold(parseInt(systemSettings.cleanup_report_threshold) || 20);
    }
  }, [categoryId, categories, systemSettings]);

  const loadPoolData = async () => {
    try {
      const res = await fetchCodesOfCategory();
      // 採取「最先建立的優先排序(First Instance First)」
      const filtered = res
        .filter(c => c.category_id === categoryId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setRawCodes(filtered);
    } catch (err) { showToast(err.message, 'error'); }
  };

  useEffect(() => {
    if (currentCategory) loadPoolData();
  }, [currentCategory, syncTrigger]);

  // 複合式快取精確篩選
  const processedCodes = useMemo(() => {
    const committedCache = JSON.parse(localStorage.getItem('used_codes_pool_v3') || '{}');
    
    const mapped = rawCodes.map(item => {
      const compositeKey = `${categoryId}_${item.code}`;
      const isCommittedUsed = committedCache[compositeKey] === 'used';
      
      return {
        ...item,
        isUsed: isCommittedUsed || localActions[item.code] === 'used',
        _uiReported: localActions[item.code] === 'reported',
        localHiddenReason: committedCache[compositeKey] || null
      };
    });

    return mapped.filter(item => {
      if (startDate && new Date(item.created_at) < new Date(`${startDate}T00:00:00`)) return false;
      if (endDate && new Date(item.created_at) > new Date(`${endDate}T23:59:59`)) return false;
      if (!showHidden && item.report_count >= threshold) return false;
      if (!showHidden && item.localHiddenReason) return false;
      return true;
    });
  }, [rawCodes, startDate, endDate, threshold, showHidden, localActions, categoryId]);
  const handleToggleAction = async (codeText, isChecked) => {
    if (isChecked) {
      await navigator.clipboard.writeText(codeText);
      showToast(`📋 序號已複製：${codeText}`);
      setLocalActions(prev => ({ ...prev, [codeText]: 'used' }));
    } else {
      setLocalActions(prev => ({ ...prev, [codeText]: null }));
    }
  };

  const handleReportCheck = (codeText, isChecked) => {
    setLocalActions(prev => ({ ...prev, [codeText]: isChecked ? 'reported' : null }));
  };

  // ✨ 新增：管理員一鍵永久刪除特定代碼邏輯
  const handleDeleteCode = async (id) => {
    if (!window.confirm('確定要從雲端資料庫永久抹除此組代碼嗎？此操作無法復原。')) return;
    try {
      const { error } = await supabase.from('codes').delete().eq('id', id);
      if (error) throw error;
      showToast('該代碼已被管理員永久移除！');
      setSyncTrigger(p => p + 1); // 即時刷新列表
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleSyncSubmit = async () => {
    try {
      const itemsToSubmit = processedCodes.map(c => ({
        id: c.id,
        code: c.code,
        isUsed: localActions[c.code] === 'used',
        isReported: localActions[c.code] === 'reported'
      }));

      await batchSubmitChanges(categoryId, itemsToSubmit);
      showToast('所有操作異動已正式確認並提交！');
      
      setLocalActions({});
      setSyncTrigger(p => p + 1);
    } catch (e) { showToast(e.message, 'error'); }
  };

  if (!currentCategory) return <div className="text-center py-10 text-slate-400 text-xs font-bold">載入中...</div>;

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-36 bg-slate-50 min-h-screen font-sans selection:bg-blue-500 selection:text-white">
      
      {/* 頂部回上一頁卡片 */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onNavigateBack} className="p-3 bg-white border border-slate-200/70 rounded-xl font-bold shadow-sm active:scale-90 transition-all text-xs text-slate-700">
          ⬅️
        </button>
        <div>
          <h2 className="text-base font-black text-slate-900 truncate max-w-[280px]">【{currentCategory.name}】</h2>
          <p className="text-[10px] text-slate-400 font-bold tracking-wider mt-0.5 uppercase">CODE POOL DETAILS</p>
        </div>
      </div>

      {/* 智慧批次分割發行表單 */}
      <BulkUploadForm category={currentCategory} onUploaded={() => setSyncTrigger(p => p + 1)} />

      {/* 篩選工具列 */}
      <div className="bg-white border border-slate-200/70 rounded-2xl p-4 mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] text-[11px] text-slate-600 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-400">📅 建立時間:</span>
          <input type="date" className="p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-700 focus:outline-none focus:border-blue-500" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span className="text-slate-300">至</span>
          <input type="date" className="p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-700 focus:outline-none focus:border-blue-500" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        
        <div className="flex justify-between items-center gap-4 border-t border-slate-100 pt-2.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-400">隱藏檢舉 ≧</span>
            <input type="number" className="w-10 p-1 text-center border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-bold" value={threshold} onChange={e => setThreshold(parseInt(e.target.value) || 0)} />
            <span className="font-medium text-slate-500">次</span>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer font-black text-blue-600 select-none">
            <input type="checkbox" className="w-4 h-4 rounded accent-blue-600" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} />
            <span>顯示已遮蔽項目</span>
          </label>
        </div>
      </div>
      {/* 序號卡片清單流 */}
      {processedCodes.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200/70 rounded-2xl text-slate-400 text-xs font-medium">
          此篩選區間內暫無可用代碼序號
        </div>
      ) : (
        <div className="space-y-3">
          {processedCodes.map((item) => (
            <div 
              key={item.id} 
              className={`bg-white border border-slate-200/70 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all relative overflow-hidden group ${item.localHiddenReason ? 'opacity-40 bg-slate-50/50' : ''}`}
            >
              {/* 卡片左側藍色條 */}
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600 opacity-40 group-hover:opacity-100 transition-all"></div>
              
              <div className="flex justify-between items-start gap-4 mb-2.5 pl-1">
                <span className={`font-mono font-black text-base tracking-wide select-all ${item.localHiddenReason ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {item.code}
                </span>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* 管理者在代碼卡片右上角的原子刪除按鈕 */}
                  {isAdmin && (
                    <button 
                      onClick={() => handleDeleteCode(item.id)}
                      className="p-1 text-[11px] bg-slate-50 hover:bg-rose-50 text-rose-500 border border-slate-200 rounded-md active:scale-90 transition-all shadow-sm font-bold"
                      title="管理者永久刪除"
                    >
                      🗑️
                    </button>
                  )}
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                    item.localHiddenReason 
                      ? item.localHiddenReason === 'used'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200/30'
                        : 'bg-rose-50 text-rose-700 border border-rose-200/30'
                      : 'bg-blue-50 text-blue-700 border border-blue-100/30'
                  }`}>
                    {item.localHiddenReason 
                      ? item.localHiddenReason === 'used' 
                        ? '🚫 已領取' 
                        : '⚠️ 已檢舉' 
                      : '🟢 可用'}
                  </span>
                </div>
              </div>

              {/* 屬性細項 */}
              <div className="grid grid-cols-2 gap-y-1.5 text-[10px] text-slate-400 font-bold border-b border-slate-100 pb-2.5 mb-2.5 pl-1">
                {currentCategory.show_secret_key && (
                  <div className="truncate">🔑 金鑰: <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-black">{item.secret_key || '無'}</span></div>
                )}
                <div className="truncate">👤 貢獻: <span className="text-slate-600 font-extrabold">{item.contributor}</span></div>
                <div className="truncate">📅 建立: <span className="text-slate-600 font-medium">{new Date(item.created_at).toLocaleDateString()}</span></div>
                <div className={`truncate ${item.report_count > 0 ? 'text-rose-500' : ''}`}>⚠️ 檢舉: {item.report_count} 次</div>
              </div>

              {/* 手機單手觸控優化操作列 */}
              <div className="flex gap-5 text-[11px] font-bold text-slate-600 pl-1 select-none">
                <label className="flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded accent-blue-600" 
                    checked={!!item.isUsed} 
                    onChange={(e) => handleToggleAction(item.code, e.target.checked)} 
                  />
                  <span>複製並標記已用</span>
                </label>
                
                <label className="flex items-center gap-1.5 cursor-pointer text-amber-700 active:scale-95 transition-transform">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded accent-amber-600" 
                    checked={!!item._uiReported} 
                    onChange={(e) => handleReportCheck(item.code, e.target.checked)} 
                  />
                  <span>回報過期失效</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🚀 修正：高度拉回原本的 bottom-4 貼底，且文字全面精簡精緻為「提交」 */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100vw-32px)] max-w-md z-40 px-1">
        <button 
          onClick={handleSyncSubmit} 
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-xl text-xs shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-[0.98] tracking-widest"
        >
          提交
        </button>
      </div>
    </div>
  );
}
