import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCategoryStore } from '../store/categoryStore';
import { useCodePoolStore } from '../store/codePoolStore';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import BulkUploadForm from '../features/pool/BulkUploadForm';
import { supabase } from '../services/supabaseClient';
import { CACHE_KEYS, readStorage, resolveReportThreshold, writeStorage, formatLocalDateTime } from '../lib/storage';
import { resolveCategoryIdFromRoute } from '../lib/publicIds';
import { copyTextToClipboard, confirmAction } from '../lib/browser';
import { useLanguageStore } from '../i18n/languageStore';
import { translations } from '../i18n/translations';
import SeoMeta from '../components/SeoMeta';

export default function CategoryDetailPage() {
  const { routeKey } = useParams();
  const navigate = useNavigate();
  const { categories, fetchCategories } = useCategoryStore();
  const { fetchCodesOfCategory, batchSubmitChanges, saveToLocalCache } = useCodePoolStore();
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const showToast = useToastStore((state) => state.showToast);
  const t = useLanguageStore((state) => state.t);
  const categoryId = resolveCategoryIdFromRoute(routeKey, categories);

  const [currentCategory, setCurrentCategory] = useState(null);
  const [rawCodes, setRawCodes] = useState([]);
  const [syncTrigger, setSyncTrigger] = useState(0);
  const [localActions, setLocalActions] = useState(() => readStorage(CACHE_KEYS.actionHistory, {}));

  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  });

  const [threshold, setThreshold] = useState(() => {
    const storedThreshold = Number(readStorage(CACHE_KEYS.reportThreshold, 10));
    return resolveReportThreshold({ storedValue: storedThreshold, fallback: 10 });
  });
  const [showHidden, setShowHidden] = useState(() => readStorage(CACHE_KEYS.showHiddenItems, false));
  const [pendingHiddenMap, setPendingHiddenMap] = useState({});

  useEffect(() => {
    writeStorage(CACHE_KEYS.actionHistory, localActions);
  }, [localActions]);

  useEffect(() => {
    writeStorage(CACHE_KEYS.showHiddenItems, showHidden);
  }, [showHidden]);

  useEffect(() => {
    const nextThreshold = Number.isFinite(threshold) && threshold >= 1 ? threshold : 1;
    writeStorage(CACHE_KEYS.reportThreshold, nextThreshold);
  }, [threshold]);

  useEffect(() => {
    if (!categories.length) {
      fetchCategories().catch(() => {});
      return;
    }

    const cat = categories.find(c => c.id === categoryId);
    setCurrentCategory(cat);

    const storedThreshold = Number(readStorage(CACHE_KEYS.reportThreshold, 1));
    setThreshold(resolveReportThreshold({ storedValue: storedThreshold, fallback: 1 }));
  }, [categoryId, categories, fetchCategories]);

  useEffect(() => {
    if (!routeKey) return;
    if (!categories.length) return;
    if (!categoryId) {
      navigate('/home', { replace: true });
    }
  }, [categoryId, routeKey, categories, navigate]);

  const loadPoolData = async () => {
    try {
      const res = await fetchCodesOfCategory();
      const filtered = res.filter(c => c.category_id === categoryId);
      setRawCodes(filtered);
    } catch (err) { showToast(err.message, 'error'); }
  };

  useEffect(() => {
    if (currentCategory) loadPoolData();
  }, [currentCategory, syncTrigger]);

  const processedCodes = useMemo(() => {
    const committedCache = readStorage(CACHE_KEYS.usedCodes, {});
    const hiddenCache = { ...committedCache, ...pendingHiddenMap };
    const mapped = rawCodes.map(item => {
      const compositeKey = `${categoryId}_${item.code}`;
      const localActionStatus = localActions[compositeKey] || null;
      const submittedHiddenReason = hiddenCache[compositeKey] || null;
      const hiddenReason = submittedHiddenReason || localActionStatus || null;
      const isCommittedUsed = submittedHiddenReason === 'used';
      const normalizedClaimCount = Number(item.claim_count ?? item.claimCount ?? 0);
      const normalizedReportCount = Number(item.report_count ?? item.reportCount ?? 0);

      return {
        ...item,
        claim_count: normalizedClaimCount,
        report_count: normalizedReportCount,
        isUsed: isCommittedUsed || localActionStatus === 'used',
        _uiReported: localActionStatus === 'reported' || submittedHiddenReason === 'reported',
        localHiddenReason: hiddenReason,
        hasRecordedAction: Boolean(localActionStatus),
        hasSubmittedAction: Boolean(submittedHiddenReason),
        submittedHiddenReason
      };
    });

    return mapped.filter(item => {
      if (startDate && new Date(item.created_at).getTime() < new Date(`${startDate}T00:00:00`).getTime()) return false;
      if (endDate && new Date(item.created_at).getTime() > new Date(`${endDate}T23:59:59`).getTime()) return false;
      if (!showHidden && item.report_count >= threshold) return false;
      if (!showHidden && item.hasSubmittedAction) return false;
      return true;
    });
  }, [rawCodes, startDate, endDate, threshold, showHidden, localActions, pendingHiddenMap, categoryId]);

  const handleToggleAction = async (codeText, isChecked) => {
    if (isChecked) {
      const copied = await copyTextToClipboard(codeText);
      if (copied) {
        showToast(`${t('copyCode')}${codeText}`);
      } else {
        showToast(t('copyFailed'), 'error');
      }
    }

    const actionKey = `${categoryId}_${codeText}`;
    setLocalActions(prev => {
      const next = { ...prev };
      if (isChecked) next[actionKey] = 'used';
      else delete next[actionKey];
      return next;
    });
  };

  const handleReportCheck = async (item, isChecked) => {
    const actionKey = `${categoryId}_${item.code}`;
    setLocalActions(prev => {
      const next = { ...prev };
      if (isChecked) next[actionKey] = 'reported';
      else delete next[actionKey];
      return next;
    });
  };

  const anonymousGuestNames = new Set(
    Object.values(translations)
      .map((localeMap) => localeMap.anonymousGuest)
      .filter(Boolean)
  );

  const isAnonymousContributor = (value = '') => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return true;
    return anonymousGuestNames.has(trimmed);
  };

  const getDisplayContributor = (value = '') => {
    const trimmed = String(value || '').trim();
    if (!trimmed || anonymousGuestNames.has(trimmed)) {
      return t('anonymousGuest');
    }
    return trimmed;
  };

  const getItemStatus = (item) => {
    if (item.localHiddenReason === 'reported') return { label: t('statusReported'), tone: 'bg-rose-50 text-rose-700' };
    if (Number(item.report_count || 0) > 0) return { label: t('statusUnknown'), tone: 'bg-amber-50 text-amber-700' };
    if (item.localHiddenReason === 'used') return { label: t('statusUsed'), tone: 'bg-amber-50 text-amber-700' };
    return { label: t('statusAvailable'), tone: 'bg-blue-50 text-blue-700' };
  };

  const contributorLeaderboard = useMemo(() => {
    const grouped = {};

    rawCodes.forEach((item) => {
      const contributorName = String(item.contributor || '').trim();
      if (!contributorName || isAnonymousContributor(contributorName)) return;

      const key = contributorName.toLowerCase();
      if (!grouped[key]) {
        grouped[key] = { name: contributorName, claimedTotal: 0 };
      }

      grouped[key].claimedTotal += Number(item.claim_count || 0);
    });

    return Object.values(grouped)
      .sort((a, b) => b.claimedTotal - a.claimedTotal)
      .slice(0, 6);
  }, [rawCodes]);

  const handleDeleteCode = async (id, codeText) => {
    if (!confirmAction(`${t('deleteCodeConfirm')} 【${codeText}】`)) return;
    try {
      const { error } = await supabase.from('codes').delete().eq('id', id);
      if (error) throw error;
      showToast(t('deleteCodeSuccess'));
      setSyncTrigger(p => p + 1);
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleSyncSubmit = async () => {
    try {
      const itemsToSubmit = processedCodes
        .filter(item => !item.hasSubmittedAction)
        .map(c => ({
          id: c.id, code: c.code,
          isUsed: localActions[`${categoryId}_${c.code}`] === 'used',
          isReported: localActions[`${categoryId}_${c.code}`] === 'reported'
        }))
        .filter(item => item.isUsed || item.isReported);

      if (itemsToSubmit.length === 0) {
        showToast(t('syncSuccess'));
        return;
      }

      const nextHiddenMap = {};
      const claimedCodes = new Set(itemsToSubmit.filter(item => item.isUsed).map(item => item.code));
      const reportedCodes = new Set(itemsToSubmit.filter(item => item.isReported).map(item => item.code));

      itemsToSubmit.forEach((item) => {
        const compositeKey = `${categoryId}_${item.code}`;
        nextHiddenMap[compositeKey] = item.isReported ? 'reported' : 'used';
      });

      await batchSubmitChanges(categoryId, itemsToSubmit);

      setRawCodes(prev => prev.map(code => {
        if (claimedCodes.has(code.code)) {
          return { ...code, claim_count: Number(code.claim_count || 0) + 1 };
        }
        if (reportedCodes.has(code.code)) {
          return { ...code, report_count: Number(code.report_count || 0) + 1 };
        }
        return code;
      }));

      setPendingHiddenMap(prev => ({ ...prev, ...nextHiddenMap }));
      showToast(t('syncSuccess'));
    } catch (e) { showToast(e.message, 'error'); }
  };

  const hasPendingSubmissions = processedCodes.some((item) => {
    const action = localActions[`${categoryId}_${item.code}`];
    return !item.hasSubmittedAction && (action === 'used' || action === 'reported');
  });

  if (!currentCategory) return (
    <div className="text-center py-10 text-slate-400 text-xs font-bold">
      <SeoMeta
        title="分類載入中"
        description="正在載入分類內容，請稍候。"
        path={routeKey ? `/category/${routeKey}` : '/'}
      />
      {t('categoryLoading')}
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-28 bg-slate-50 min-h-screen font-sans selection:bg-blue-500 selection:text-white">
      <SeoMeta
        title={currentCategory.name}
        description={t('seoCategoryDescription').replace('{category}', currentCategory.name)}
        path={routeKey ? `/category/${routeKey}` : '/'}
      />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="min-w-0">
          <BulkUploadForm category={currentCategory} onUploaded={() => setSyncTrigger(p => p + 1)} />
        </div>

        <aside className="bg-white border border-slate-200/70 rounded-2xl p-3 shadow-sm min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-black uppercase text-slate-500">{t('contributorsLeaderboard')}</h3>
            <span className="text-[9px] font-bold text-slate-400">{t('claimedTotal')}</span>
          </div>

          <div className="space-y-2">
            {contributorLeaderboard.length === 0 ? (
              <div className="text-[10px] text-slate-400 font-medium">{t('noContributors')}</div>
            ) : (
              contributorLeaderboard.map((person) => (
                <div key={person.name} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-[10px] font-extrabold text-slate-700">{person.name}</span>
                  <span className="text-[9px] font-black text-blue-600">{person.claimedTotal}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      <div className="bg-white border border-slate-200/70 rounded-2xl p-4 mb-4 shadow-sm text-[11px] text-slate-600 space-y-3">
        <div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-slate-400">{t('createdTime')}</span><input type="date" className="p-1.5 border rounded-lg bg-slate-50 font-medium text-slate-700 focus:outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} /><span className="text-slate-300">{t('to')}</span><input type="date" className="p-1.5 border rounded-lg bg-slate-50 font-medium text-slate-700 focus:outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
        <div className="flex justify-between items-center gap-4 border-t border-slate-100 pt-2.5 flex-wrap"><div className="flex items-center gap-1.5"><span className="font-bold text-slate-400">{t('reportThreshold')}</span><input type="number" className="w-10 p-1 text-center border rounded-lg bg-slate-50 text-slate-800 font-bold" value={threshold} onChange={e => {
                  const nextValue = Math.max(1, parseInt(e.target.value) || 1);
                  const sanitizedValue = nextValue > 0 ? nextValue : 1;
                  setThreshold(sanitizedValue);
                  writeStorage(CACHE_KEYS.reportThreshold, sanitizedValue);
                }} /><span className="font-medium text-slate-500">{t('times')}</span><span className="ml-1 whitespace-nowrap rounded-md bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700 ring-1 ring-blue-100">{t('visibleCodesCount').replace('{count}', processedCodes.length)}</span></div><label className="flex items-center gap-1.5 cursor-pointer font-black text-blue-600 select-none"><input type="checkbox" className="w-4 h-4 rounded accent-blue-600" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} /><span>{t('showHiddenItems')}</span></label></div>
      </div>

      {processedCodes.length === 0 ? ( <div className="text-center py-12 bg-white border border-slate-200/70 rounded-2xl text-slate-400 text-xs font-medium">{t('noCodesInRange')}</div> ) : (
        <div className="space-y-3">
          {processedCodes.map((item) => (
            <div key={item.id} className={`${item.hasSubmittedAction ? 'bg-slate-200 border-slate-400 ring-2 ring-slate-300/80' : item.hasRecordedAction ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200/80' : 'bg-white border-slate-200/70'} border rounded-2xl p-4 shadow-sm relative overflow-hidden group`}>
              <div className={`absolute top-0 left-0 bottom-0 w-1 ${item.hasSubmittedAction ? 'bg-slate-500' : item.hasRecordedAction ? 'bg-amber-500' : 'bg-blue-600'} opacity-70`}></div>
              <div className="flex justify-between items-center gap-3 mb-2.5 pl-1">
                <span className="font-mono font-black text-base tracking-wide select-all text-slate-800">{item.code}</span>
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  {item.hasSubmittedAction && <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-slate-700 text-white">{t('submittedAction')}</span>}
                  {item.hasRecordedAction && !item.hasSubmittedAction && <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500 text-white">{t('pendingAction')}</span>}
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${getItemStatus(item).tone}`}>{getItemStatus(item).label}</span>
                  {isAdmin && <button onClick={() => handleDeleteCode(item.id, item.code)} className="inline-flex items-center justify-center w-7 h-7 text-[10px] bg-slate-50 text-rose-500 border border-slate-200 rounded-md shadow-sm font-bold">🗑️</button>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-1.5 text-[10px] text-slate-400 font-bold border-b border-slate-100 pb-2.5 mb-2.5 pl-1">
                {currentCategory.show_secret_key && <div className="truncate">{t('keyLabel')} <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-black">{item.secret_key || t('none')}</span></div>}
                <div className="truncate">{t('contributorLabel')} <span className="text-slate-600 font-extrabold">{getDisplayContributor(item.contributor)}</span></div>
                 <div className="truncate">{t('createdLabel')} <span className="text-slate-600 font-medium">{formatLocalDateTime(item.created_at)}</span></div>
                 <div className={`truncate ${Number(item.claim_count || 0) > 0 ? 'text-blue-500' : ''}`}>
                   {t('claimCountLabel')} {Number(item.claim_count || 0)}
                 </div>
                 <div className={`truncate ${Number(item.report_count || 0) > 0 ? 'text-rose-500' : ''}`}>
                   {t('reportCountLabel')} {Number(item.report_count || 0)}
                 </div>
              </div>

              {item.note && (
                <div className="mb-2.5 pl-1 text-[10px] text-slate-600 font-bold opacity-80">
                  <span className="mr-1">📝</span>
                  {item.note}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold text-slate-600 pl-1 select-none">
                {currentCategory.web_url && !item.localHiddenReason && (
                  <a href={`${currentCategory.web_url}${item.code}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 bg-blue-50/50 border border-blue-100 px-2 py-1 rounded-lg shadow-sm"><span>{t('webDirect')}</span></a>
                )}
                <div className="flex items-center gap-2">
                  <label className={`flex items-center gap-1.5 ${item.hasSubmittedAction ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}><input type="radio" name={`action-${item.id}`} className="w-4 h-4 accent-blue-600" checked={!!item.isUsed} disabled={item.hasSubmittedAction} onChange={(e) => handleToggleAction(item.code, e.target.checked)} /><span>{t('markUsed')}</span></label>
                </div>
                <label className={`flex items-center gap-1.5 text-amber-700 ${item.hasSubmittedAction ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}><input type="radio" name={`action-${item.id}`} className="w-4 h-4 accent-amber-600" checked={!!item._uiReported} disabled={item.hasSubmittedAction} onChange={(e) => handleReportCheck(item, e.target.checked)} /><span>{t('reportExpired')}</span></label>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasPendingSubmissions && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100vw-32px)] max-w-md z-40 px-1">
          <button onClick={handleSyncSubmit} className="w-1/2 mx-auto py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-xl text-xs shadow-lg tracking-widest">{t('submit')}</button>
        </div>
      )}
    </div>
  );
}
