import { useLanguageStore } from '../../i18n/languageStore';

export default function CategoryAdminPanel({
  isAdmin,
  isPanelOpen,
  setIsPanelOpen,
  editingCat,
  setEditingCat,
  catForm,
  setCatForm,
  handleSaveCategory,
  cleanupThreshold,
  setCleanupThreshold,
  cleanupTime,
  setCleanupTime,
  updateCleanupRules,
  announcements,
  announcementDraft,
  setAnnouncementDraft,
  editingAnnouncementId,
  setEditingAnnouncementId,
  handleSaveAnnouncement,
  handleEditAnnouncement,
  handleDeleteAnnouncement,
  showToast,
}) {
  const t = useLanguageStore((state) => state.t);

  if (!isAdmin) return null;

  return (
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
          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/50 text-xs pl-5 space-y-3">
            <div className="flex items-center gap-2 flex-wrap text-slate-600 font-medium">
              <span>{t('cleanupLabel')}</span>
              <input type="number" min="1" className="w-14 p-1 text-center bg-white border rounded-lg text-slate-800 font-bold" value={cleanupThreshold} onChange={e => setCleanupThreshold(Math.max(1, Number(e.target.value) || 1))} />
              <span>{t('cleanupSuffix')}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-slate-600 font-medium">
              <span>{t('cleanupTimeLabel')}</span>
              <input type="time" className="px-2 py-1 bg-white border rounded-lg text-slate-800 font-bold" value={cleanupTime} onChange={e => setCleanupTime(e.target.value || '00:00')} />
            </div>
            <button onClick={() => { updateCleanupRules(cleanupThreshold, cleanupTime); showToast(t('updateSuccess')); }} className="w-full mt-1 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl border">{t('saveScheduleRule')}</button>
          </div>
        </section>
      )}
    </div>
  );
}
