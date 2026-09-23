import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { validateMessage } from '../lib/validation';
import { confirmAction } from '../lib/browser';
import { useLanguageStore } from '../i18n/languageStore';

export default function LobbyChatPage() {
  const navigate = useNavigate();
  const { messages, bannedEmails, fetchMessages, fetchBannedUsers, createMessage, banUserEmail, removeBanUserEmail, deleteMessage } = useChatStore();
  const showToast = useToastStore((state) => state.showToast);
  const { userName, isAdmin, user: currentUser } = useAuthStore();
  const t = useLanguageStore((state) => state.t);
  const [msgInput, setMsgInput] = useState('');
  const [isBannedPanelOpen, setIsBannedPanelOpen] = useState(false);

  useEffect(() => {
    fetchMessages().catch(() => {});
    fetchBannedUsers().catch(() => {}); 
  }, []);

  const isCurrentUserBanned = useMemo(() => {
    if (!currentUser || !currentUser.email) return false;
    return bannedEmails.includes(currentUser.email);
  }, [bannedEmails, currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (isCurrentUserBanned) return showToast(t('bannedUserMessage'), 'error');

    const messageCheck = validateMessage(msgInput);
    if (!messageCheck.valid) return showToast(messageCheck.error, 'error');

    try {
      await createMessage(messageCheck.value, userName);
      showToast(t('messageSuccess'));
      setMsgInput('');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleBanUser = async (email, targetName) => {
    if (!email) return showToast(t('banAccountError'), 'error');
    if (confirmAction(`${t('banUserConfirm')}【${targetName}】(${email})？`)) {
      try {
        await banUserEmail(email);
        showToast(t('banUserSuccess').replace('{name}', targetName));
      } catch (err) { showToast(err.message, 'error'); }
    }
  };

  const handleUnbanUser = async (email) => {
    if (confirmAction(`${t('unbanUserConfirm')} (${email})？`)) {
      try {
        await removeBanUserEmail(email);
        showToast(t('unbanUserSuccess'));
      } catch (err) { showToast(err.message, 'error'); }
    }
  };
  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-24 bg-slate-50 min-h-screen font-sans selection:bg-blue-500 selection:text-white">
      {/* 留言發布卡片 */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.01)] space-y-4 mb-4">
        {userName ? (
          isCurrentUserBanned ? (
            <div className="text-center p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600">
              {t('commentBlocked')}
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 focus:outline-none focus:bg-white focus:border-blue-500 text-slate-800 placeholder-slate-400"
                placeholder={t('userMessagePlaceholder').replace('{name}', userName)}
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
              />
              <button type="submit" className="px-4 py-3 bg-blue-600 text-white font-black rounded-xl text-xs hover:bg-blue-500 active:scale-95 transition-all shrink-0">
                {t('publish')}
              </button>
            </form>
          )
        ) : (
          <div className="text-center p-4 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-400 italic">
            {t('createMessagePrompt')}
          </div>
        )}
      </div>

      {/* ✨ 核心位置調整：僅限管理者可見、可展開/收合的置頂「黑名單特赦管理卡片」 */}
      {isAdmin && (
        <div className="mb-4">
          <button 
            onClick={() => setIsBannedPanelOpen(!isBannedPanelOpen)} 
            className="w-full bg-white text-slate-800 p-3.5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex justify-between items-center active:scale-[0.99] transition-all border border-slate-200/80 relative overflow-hidden group"
          >
            {/* 左側對齊的琥珀色黑名單提示條 */}
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500 opacity-60"></div>
            
            <span className="text-xs font-black text-slate-700 tracking-wider flex items-center gap-2 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              {isBannedPanelOpen ? t('adminManageToggleClose') : t('adminManageToggleOpen')}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-amber-50 text-amber-700 font-extrabold px-1.5 py-0.5 rounded border border-amber-200/40">
                {t('bannedUsersCount').replace('{count}', bannedEmails.length)}
              </span>
              <span className="text-xs text-slate-400 font-bold">{isBannedPanelOpen ? '▲' : '▼'}</span>
            </div>
          </button>

          {isBannedPanelOpen && (
            <section className="bg-white border border-slate-200/80 rounded-2xl p-4 mt-2 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-3 animate-fadeIn relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500 opacity-30"></div>
              
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5 pl-1">
                {bannedEmails.length === 0 ? (
                  <div className="text-center py-4 text-[10px] font-bold text-slate-400 italic">{t('noBannedUsers')}</div>
                ) : (
                  bannedEmails.map((bannedEmail, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-slate-50 border border-slate-200/50 rounded-xl gap-3">
                      <span className="text-[11px] font-mono font-bold text-slate-600 truncate flex-1 select-all">
                        {bannedEmail}
                      </span>
                      <button 
                        onClick={() => handleUnbanUser(bannedEmail)}
                        className="text-[9px] font-black bg-white hover:bg-emerald-50 text-emerald-600 border border-slate-200 hover:border-emerald-200 px-2 py-1 rounded-lg shadow-sm transition active:scale-95 shrink-0"
                      >
                        {t('unblock')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* 留言歷史訊息串流 */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-0.5 mb-1">
          <h2 className="text-xs font-black tracking-widest text-slate-400 uppercase">{t('historyMessages')}</h2>
          <span className="text-[9px] text-slate-400 font-bold">{t('historyFooter').replace('{count}', messages.length)}</span>
        </div>

        {messages.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs italic">
            {t('noMessages')}
          </div>
        ) : (
          messages.map(msg => {
            const isThisMsgUserBanned = bannedEmails.includes(msg.user_email);
            
            return (
              <div key={msg.id} className={`p-4 bg-white border border-slate-200/60 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] relative group overflow-hidden ${isThisMsgUserBanned ? 'opacity-40 bg-slate-100/50' : ''}`}>
                <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-blue-500 opacity-30"></div>
                
                <div className="flex justify-between items-center flex-wrap gap-y-1 mb-1.5 pl-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-black text-slate-700">
                      👤 {msg.user_name}
                      {isThisMsgUserBanned && <span className="text-[8px] bg-rose-100 text-rose-700 px-1 rounded ml-1">{t('blockedBadge')}</span>}
                    </span>
                    
                    {isAdmin && msg.user_email && (
                      <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md font-mono shadow-inner select-all">
                        ✉️ {msg.user_email}
                      </span>
                    )}
                  </div>
                  
                  <span className="text-[9px] text-slate-400 font-bold">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                
                <p className="text-xs text-slate-600 font-medium leading-relaxed break-all pr-20 pl-1">{msg.content}</p>
                
                {isAdmin && (
                  <div className="absolute bottom-3 right-3 flex gap-1">
                    {!isThisMsgUserBanned && msg.user_email && (
                      <button 
                        onClick={() => handleBanUser(msg.user_email, msg.user_name)}
                        className="text-[9px] font-bold bg-white text-amber-600 border border-slate-200 hover:bg-amber-50 px-1.5 py-0.5 rounded shadow-sm transition active:scale-90"
                      >
                        {t('adminBanUser')}
                      </button>
                    )}
                    <button 
                      onClick={async () => { if (confirmAction(t('deleteMessageConfirm'))) { await deleteMessage(msg.id); showToast(t('deleteMessageSuccess')); } }}
                      className="text-[9px] font-bold bg-white text-rose-500 border border-slate-200 hover:bg-rose-50 px-1.5 py-0.5 rounded shadow-sm transition active:scale-90"
                    >
                      {t('adminDeleteMessage')}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
