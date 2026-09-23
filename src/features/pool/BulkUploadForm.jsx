import React, { useState, useEffect } from 'react';
import { useCodePoolStore } from '../../store/codePoolStore';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../services/supabaseClient';
import { extractCodes } from '../../lib/codeParser';
import { validateBulkCodeInput, validateContributor, validateSingleCode } from '../../lib/validation';
import { useLanguageStore } from '../../i18n/languageStore';

export default function BulkUploadForm({ category, onUploaded }) {
  const [bulkInput, setBulkInput] = useState('');
  const [singleSecret, setSingleSecret] = useState('');
  const [contributor, setContributor] = useState('');
  
  const userName = useAuthStore((state) => state.userName);
  const { insertCodesBulk } = useCodePoolStore();
  const showToast = useToastStore((state) => state.showToast);
  const t = useLanguageStore((state) => state.t);

  useEffect(() => {
    if (userName) setContributor(userName);
  }, [userName]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const bulkCheck = validateBulkCodeInput(bulkInput);
    if (!bulkCheck.valid) return showToast(bulkCheck.error, 'error');

    const rawMatches = extractCodes(bulkCheck.value, category);

    if (!rawMatches.length) return showToast(t('bulkInvalidCodeLength'), 'error');

    const contributorCheck = validateContributor(contributor);
    const singleSecretValue = validateSingleCode(singleSecret).valid ? validateSingleCode(singleSecret).value : null;

    if (singleSecret && !validateSingleCode(singleSecret).valid) {
      return showToast(t('bulkInvalidSecret'), 'error');
    }

    try {
      // 2. 🛡️ 【前端去重攔截】直接向資料庫查詢該大類下已存在的序號
      const { data: existingRecords, error: checkError } = await supabase
        .from('codes')
        .select('code')
        .eq('category_id', category.id)
        .in('code', rawMatches);

      if (checkError) throw checkError;

      const existingCodes = new Set((existingRecords || []).map(r => r.code));
      const uniqueNewCodes = rawMatches.filter(code => !existingCodes.has(code));
      const skippedCount = rawMatches.length - uniqueNewCodes.length;

      // 3. 分流處理查重彈窗提示
      if (uniqueNewCodes.length === 0) {
        showToast(t('bulkSkipDuplicate').replace('{count}', skippedCount), 'error');
        setBulkInput('');
        setSingleSecret('');
        return;
      }

      // 4. 只將真正全新的乾淨序號送去後端上架
      await insertCodesBulk({
        categoryId: category.id,
        codesArray: uniqueNewCodes,
        secretsArray: new Array(uniqueNewCodes.length).fill(singleSecretValue),
        contributorName: contributorCheck.value
      });

      if (skippedCount > 0) {
        showToast(t('bulkInsertedWithSkip').replace('{count}', uniqueNewCodes.length).replace('{skipped}', skippedCount));
      } else {
        showToast(t('bulkInserted').replace('{count}', uniqueNewCodes.length));
      }

      setBulkInput('');
      setSingleSecret('');
      onUploaded();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="bg-white border border-slate-200/70 rounded-2xl p-4 mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] relative overflow-hidden group">
      <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600 opacity-40"></div>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 pl-1">
        <textarea
          className="w-full p-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all duration-200 resize-y min-h-[88px] text-slate-800 placeholder-slate-400 shadow-inner"
          placeholder={t('bulkInputPlaceholder')}
          rows={3}
          value={bulkInput}
          onChange={e => setBulkInput(e.target.value)}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {category.show_secret_key && (
            <input
              type="text"
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none text-slate-800 placeholder-slate-400"
              placeholder={t('secretInputPlaceholder')}
              value={singleSecret}
              onChange={e => setSingleSecret(e.target.value)}
            />
          )}
          <input
            type="text"
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none text-slate-800 placeholder-slate-400"
            placeholder={t('contributorPlaceholder')}
            value={contributor}
            onChange={e => setContributor(e.target.value)}
          />
        </div>
        
        <button type="submit" className="w-full py-3 bg-blue-600 text-white font-black rounded-xl text-xs shadow-md hover:bg-blue-500 transition-all active:scale-[0.98] tracking-wider uppercase">
          {t('bulkSubmitButton')}
        </button>
      </form>
    </div>
  );
}
