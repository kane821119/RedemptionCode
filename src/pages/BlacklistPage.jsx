import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import SeoMeta from '../components/SeoMeta';
import { confirmAction } from '../lib/browser';
import { useLanguageStore } from '../i18n/languageStore';
import { useAuthStore } from '../store/authStore';
import { useCategoryStore } from '../store/categoryStore';
import { useChatStore } from '../store/chatStore';
import { useCodePoolStore } from '../store/codePoolStore';
import { useToastStore } from '../store/toastStore';

export default function BlacklistPage() {
  const t = useLanguageStore((state) => state.t);
  const { isAdmin, loading: authLoading } = useAuthStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { bannedEmails, fetchBannedUsers, removeBanUserEmail } = useChatStore();
  const { fetchBannedCodePublishers, unbanCodePublisher } = useCodePoolStore();
  const showToast = useToastStore((state) => state.showToast);
  const [bannedPublishers, setBannedPublishers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !isAdmin) return;

    Promise.all([
      fetchBannedUsers(),
      fetchCategories(),
      fetchBannedCodePublishers(),
    ])
      .then(([, , publishers]) => setBannedPublishers(publishers))
      .catch((error) => showToast(error.message, 'error'))
      .finally(() => setIsLoading(false));
  }, [authLoading, isAdmin, fetchBannedUsers, fetchCategories, fetchBannedCodePublishers, showToast]);

  const filteredEmails = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return bannedEmails.filter((email) => !query || email.toLowerCase().includes(query));
  }, [bannedEmails, searchQuery]);

  const filteredPublishers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return bannedPublishers.filter((publisher) => {
      const categoryName = categories.find((category) => category.id === publisher.banned_category_id)?.name || '';
      return !query || publisher.user_id.toLowerCase().includes(query) || categoryName.toLowerCase().includes(query);
    });
  }, [bannedPublishers, categories, searchQuery]);

  const handleUnbanEmail = async (email) => {
    if (!confirmAction(`${t('unbanUserConfirm')} (${email})?`)) return;

    try {
      await removeBanUserEmail(email);
      showToast(t('unbanUserSuccess'));
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleUnbanPublisher = async (publisherId) => {
    if (!confirmAction(`${t('unbanPublisherConfirm')} (${publisherId})?`)) return;

    try {
      await unbanCodePublisher(publisherId);
      setBannedPublishers((current) => current.filter((publisher) => publisher.user_id !== publisherId));
      showToast(t('unbanPublisherSuccess'));
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  if (authLoading || (isAdmin && isLoading)) {
    return <div className="mx-auto flex min-h-64 max-w-md items-center justify-center px-4 text-xs font-bold text-slate-400">{t('categoryLoading')}</div>;
  }

  if (!isAdmin) return <Navigate to="/home" replace />;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 py-6 pb-28">
      <SeoMeta title={t('banPanelTitle')} path="/blacklist" />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xs font-black uppercase text-slate-500">{t('banPanelTitle')}</h2>
        <span className="text-[10px] font-bold text-slate-400">
          {t('bannedUsersCount').replace('{count}', bannedEmails.length)} · {t('bannedPublishersCount').replace('{count}', bannedPublishers.length)}
        </span>
      </div>

      <label className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <span aria-hidden="true" className="text-slate-400">⌕</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t('blacklistSearchPlaceholder')}
          className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
        />
      </label>

      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t('blacklistEmailsTitle')}</h3>
          <span className="text-[10px] font-bold text-slate-400">{filteredEmails.length}</span>
        </div>
        {filteredEmails.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-5 text-center text-[10px] font-bold text-slate-400">{t('noBannedUsers')}</p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {filteredEmails.map((email) => (
              <div key={email} className="flex items-center gap-3 px-3 py-2.5">
                <span className="min-w-0 flex-1 break-all font-mono text-[11px] font-semibold text-slate-700 select-all">{email}</span>
                <button type="button" onClick={() => handleUnbanEmail(email)} className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-[9px] font-black text-emerald-700 hover:bg-emerald-50">
                  {t('unblock')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t('blacklistPublishersTitle')}</h3>
          <span className="text-[10px] font-bold text-slate-400">{filteredPublishers.length}</span>
        </div>
        {filteredPublishers.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-5 text-center text-[10px] font-bold text-slate-400">{t('noBannedPublishers')}</p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {filteredPublishers.map((publisher) => {
              const categoryName = categories.find((category) => category.id === publisher.banned_category_id)?.name || t('publisherBanUnknownCategory');
              return (
                <div key={publisher.user_id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <span className="block break-all font-mono text-[10px] font-semibold text-slate-700 select-all">{publisher.user_id}</span>
                    <span className="mt-1 block truncate text-[9px] text-slate-400">{t('publisherBanCategoryLabel')} {categoryName}</span>
                  </div>
                  <button type="button" onClick={() => handleUnbanPublisher(publisher.user_id)} className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-[9px] font-black text-emerald-700 hover:bg-emerald-50">
                    {t('unbanPublisherButton')}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
