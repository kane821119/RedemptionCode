import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCategoryStore } from '../store/categoryStore';
import { useCodePoolStore } from '../store/codePoolStore';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import BulkUploadForm from '../features/pool/BulkUploadForm';
import { supabase } from '../services/supabaseClient';
import { CACHE_KEYS, readStorage } from '../lib/storage';
import { resolveCategoryIdFromRoute } from '../lib/publicIds';
import { copyTextToClipboard, confirmAction } from '../lib/browser';
import { useLanguageStore } from '../i18n/languageStore';

export default function CategoryDetailPage() {
  const { routeKey } = useParams();
  const navigate = useNavigate();
  const { categories, systemSettings } = useCategoryStore();
  const { fetchCodesOfCategory, batchSubmitChanges } = useCodePoolStore();
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const showToast = useToastStore((state) => state.showToast);
  const t = useLanguageStore((state) => state.t);
  const categoryId = resolveCategoryIdFromRoute(routeKey, categories);

  const [currentCategory, setCurrentCategory] = useState(null);
  const [rawCodes, setRawCodes] = useState([]);
  const [syncTrigger, setSyncTrigger] = useState(0);
  const [localActions, setLocalActions] = useState({});

  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
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

  useEffect(() => {
    if (!categoryId && routeKey) {
      navigate('/home', { replace: true });
    }
  }, [categoryId, routeKey, navigate]);

  const loadPoolData = async () => {
    try {
      const res = await fetchCodesOfCategory();
      const filtered = res
        .filter(c => c.category_id === categoryId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setRawCodes(filtered);
    } catch (err) { showToast(err.message, 'error'); }
  };

  useEffect(() => {
    if (currentCategory) loadPoolData();
  }, [currentCategory, syncTrigger]);

  const processedCodes = useMemo(() => {
    const committedCache = readStorage(CACHE_KEYS.usedCodes, {});
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
      const copied = await copyTextToClipboard(codeText);
      if (copied) {
        showToast(`${t('copyCode')}${codeText}`);
      } else {
        showToast(t('copyFailed'), 'error');
      }
      setLocalActions(prev => ({ ...prev, [codeText]: 'used' }));
    } else {
      setLocalActions(prev => ({ ...prev, [codeText]: null }));
    }
  };

  const handleReportCheck = (codeText, isChecked) => {
    setLocalActions(prev => ({ ...prev, [codeText]: isChecked ? 'reported' : null }));
  };

  const handleDeleteCode = async (id) => {
    if (!confirmAction(t('deleteCodeConfirm'))) return;
    try {
      const { error } = await supabase.from('codes').delete().eq('id', id);
      if (error) throw error;
      showToast(t('deleteCodeSuccess'));
      setSyncTrigger(p => p + 1);
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleSyncSubmit = async () => {
    try {
      const itemsToSubmit = processedCodes.map(c => ({
        id: c.id, code: c.code,
        isUsed: localActions[c.code] === 'used',
        isReported: localActions[c.code] === 'reported'
      }));
      await batchSubmitChanges(categoryId, itemsToSubmit);
      showToast(t('syncSuccess'));
      setLocalActions({});
      setSyncTrigger(p => p + 1);
    } catch (e) { showToast(e.message, 'error'); }
  };

  if (!currentCategory) return <div className="text-center py-10 text-slate-400 text-xs font-bold">{t('categoryLoading')}</div>;
  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-28 bg-slate-50 min-h-screen font-sans selection:bg-blue-500 selection:text-white">
      <BulkUploadForm category={currentCategory} onUploaded={() => setSyncTrigger(p => p + 1)} />

      <div className="bg-white border border-slate-200/70 rounded-2xl p-4 mb-4 shadow-sm text-[11px] text-slate-600 space-y-3">
        <div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-slate-400">{t('createdTime')}</span><input type="date" className="p-1.5 border rounded-lg bg-slate-50 font-medium text-slate-700 focus:outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} /><span className="text-slate-300">{t('to')}</span><input type="date" className="p-1.5 border rounded-lg bg-slate-50 font-medium text-slate-700 focus:outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
        <div className="flex justify-between items-center gap-4 border-t border-slate-100 pt-2.5 flex-wrap"><div className="flex items-center gap-1.5"><span className="font-bold text-slate-400">{t('reportThreshold')}</span><input type="number" className="w-10 p-1 text-center border rounded-lg bg-slate-50 text-slate-800 font-bold" value={threshold} onChange={e => setThreshold(parseInt(e.target.value) || 0)} /><span className="font-medium text-slate-500">{t('times')}</span></div><label className="flex items-center gap-1.5 cursor-pointer font-black text-blue-600 select-none"><input type="checkbox" className="w-4 h-4 rounded accent-blue-600" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} /><span>{t('showHiddenItems')}</span></label></div>
      </div>

      {processedCodes.length === 0 ? ( <div className="text-center py-12 bg-white border border-slate-200/70 rounded-2xl text-slate-400 text-xs font-medium">{t('noCodesInRange')}</div> ) : (
        <div className="space-y-3">
          {processedCodes.map((item) => (
            <div key={item.id} className={`bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm relative overflow-hidden group ${item.localHiddenReason ? 'opacity-40 bg-slate-50/50' : ''}`}>
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600 opacity-40"></div>
              <div className="flex justify-between items-start gap-4 mb-2.5 pl-1">
                <span className={`font-mono font-black text-base tracking-wide select-all ${item.localHiddenReason ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.code}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isAdmin && <button onClick={() => handleDeleteCode(item.id)} className="p-1 text-[11px] bg-slate-50 text-rose-500 border border-slate-200 rounded-md shadow-sm font-bold">🗑️</button>}
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${item.localHiddenReason ? item.localHiddenReason === 'used' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>{item.localHiddenReason ? item.localHiddenReason === 'used' ? t('statusUsed') : t('statusReported') : t('statusAvailable')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-1.5 text-[10px] text-slate-400 font-bold border-b border-slate-100 pb-2.5 mb-2.5 pl-1">
                {currentCategory.show_secret_key && <div className="truncate">{t('keyLabel')} <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-black">{item.secret_key || t('none')}</span></div>}
                <div className="truncate">{t('contributorLabel')} <span className="text-slate-600 font-extrabold">{item.contributor}</span></div>
                <div className="truncate">{t('createdLabel')} <span className="text-slate-600 font-medium">{new Date(item.created_at).toLocaleDateString()}</span></div>
                <div className={`truncate ${item.report_count > 0 ? 'text-rose-500' : ''}`}>{t('reportCountLabel')} {item.report_count}</div>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-bold text-slate-600 pl-1 select-none">
                {currentCategory.web_url && !item.localHiddenReason && (
                  <a href={`${currentCategory.web_url}${item.code}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 bg-blue-50/50 border border-blue-100 px-2 py-1 rounded-lg shadow-sm"><span>{t('webDirect')}</span></a>
                )}
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded accent-blue-600" checked={!!item.isUsed} onChange={(e) => handleToggleAction(item.code, e.target.checked)} /><span>{t('markUsed')}</span></label>
                <label className="flex items-center gap-1.5 cursor-pointer text-amber-700"><input type="checkbox" className="w-4 h-4 rounded accent-amber-600" checked={!!item._uiReported} onChange={(e) => handleReportCheck(item.code, e.target.checked)} /><span>{t('reportExpired')}</span></label>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100vw-32px)] max-w-md z-40 px-1">
        <button onClick={handleSyncSubmit} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-xl text-xs shadow-lg tracking-widest">{t('submit')}</button>
      </div>
    </div>
  );
}
