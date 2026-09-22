import React, { useState, useEffect } from 'react';
import { useSystemStore } from '../../store/systemStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../services/supabaseClient'; // 引入原生客戶端進行即時查重

export default function BulkUploadForm({ category, onUploaded }) {
  const [bulkInput, setBulkInput] = useState('');
  const [singleSecret, setSingleSecret] = useState('');
  const [contributor, setContributor] = useState('');
  
  const userName = useAuthStore((state) => state.userName);
  const { insertCodesBulk, showToast } = useSystemStore();

  useEffect(() => {
    if (userName) setContributor(userName);
  }, [userName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bulkInput.trim()) return showToast('請貼上包含代碼的文字內容', 'error');

    // 1. 🛡️ 終極進化：動態將中文 Unicode 字元範圍補入過濾正則中，全面放行中文兌換碼！
    let rules = [
      category.keep_chinese && '\\u4e00-\\u9fa5', // 精準捕捉繁簡中文字元範圍
      category.keep_letters && 'A-Za-z',
      category.keep_numbers && '0-9',
      category.keep_symbols && '\\-[_\\*\\!\\@\\#]'
    ].filter(Boolean);

    let matchPattern = `[${rules.length ? rules.join('') : 'A-Za-z0-9'}]+`;
    let rawMatches = [
      ...new Set(
        (bulkInput.match(new RegExp(matchPattern, 'g')) || [])
          // 強制大寫僅對英文字母有效，中文字元會安全忽略保持原樣
          .map(c => (category.force_uppercase ? c.toUpperCase() : c))
          .filter(c => c.length >= 4)
      )
    ];

    if (!rawMatches.length) return showToast('未能分割出任何有效代碼(長度需>=4)', 'error');

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
        showToast(`自動跳過 ${skippedCount} 組重複代碼，全新新增 0 組！`, 'error');
        setBulkInput('');
        setSingleSecret('');
        return;
      }

      // 4. 只將真正全新的乾淨序號送去後端上架
      await insertCodesBulk({
        categoryId: category.id,
        codesArray: uniqueNewCodes,
        secretsArray: new Array(uniqueNewCodes.length).fill(singleSecret.trim() || null),
        contributorName: contributor.trim()
      });

      if (skippedCount > 0) {
        showToast(`成功新增 ${uniqueNewCodes.length} 組，自動跳過 ${skippedCount} 組重複代碼！`);
      } else {
        showToast(`成功上架 ${uniqueNewCodes.length} 組全新代碼！`);
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
          placeholder="貼上雜亂文字，系統會自動根據白名單規則智慧抽離分割代碼物件..."
          rows={3}
          value={bulkInput}
          onChange={e => setBulkInput(e.target.value)}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {category.show_secret_key && (
            <input
              type="text"
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none text-slate-800 placeholder-slate-400"
              placeholder="共同附加金鑰 / 隨附密碼 (選填)"
              value={singleSecret}
              onChange={e => setSingleSecret(e.target.value)}
            />
          )}
          <input
            type="text"
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none text-slate-800 placeholder-slate-400"
            placeholder="提交人顯示名稱 (預設匿名訪客)"
            value={contributor}
            onChange={e => setContributor(e.target.value)}
          />
        </div>
        
        <button type="submit" className="w-full py-3 bg-blue-600 text-white font-black rounded-xl text-xs shadow-md hover:bg-blue-500 transition-all active:scale-[0.98] tracking-wider uppercase">
          ⚡ 智慧分析並發行至代碼池
        </button>
      </form>
    </div>
  );
}
