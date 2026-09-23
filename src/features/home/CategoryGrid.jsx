import React from 'react';
import { useLanguageStore } from '../../i18n/languageStore';

export default function CategoryGrid({
  processedCategories,
  favoriteMap,
  handleCategorySelect,
  handleToggleFavorite,
  handleEditClick,
  onDeleteCategory,
  isAdmin,
}) {
  const t = useLanguageStore((state) => state.t);

  return (
    <div className="space-y-3">
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
                        if (window.confirm(message)) {
                          await onDeleteCategory(cat.id);
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
    </div>
  );
}
