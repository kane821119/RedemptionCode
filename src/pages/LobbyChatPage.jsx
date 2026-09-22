import React, { useState, useEffect, useMemo } from 'react';
import { useSystemStore } from '../store/systemStore';
import { useAuthStore } from '../store/authStore';

export default function LobbyChatPage({ onNavigateBack }) {
  const { messages, bannedEmails, fetchMessages, fetchBannedUsers, createMessage, banUserEmail, removeBanUserEmail, deleteMessage, showToast } = useSystemStore();
  const { userName, isAdmin, user: currentUser } = useAuthStore();
  const [msgInput, setMsgInput] = useState('');
  const [isBannedPanelOpen, setIsBannedPanelOpen] = useState(false); // ✨ 新增：控制黑名單面板折疊狀態

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
    if (!msgInput.trim()) return;
    if (isCurrentUserBanned) return showToast('您的帳號已被禁止在大廳交流發言！', 'error');
    
    try {
      await createMessage(msgInput, userName);
      showToast('留言成功發布！');
      setMsgInput('');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleBanUser = async (email, targetName) => {
    if (!email) return showToast('無法取得該留言者的 Email 資訊', 'error');
    if (window.confirm(`確定要永久封鎖使用者【${targetName}】(${email}) 嗎？封鎖後該帳號將再也無法進行大廳交流發言。`)) {
      try {
        await banUserEmail(email);
        showToast(`已成功將 ${targetName} 移入永久黑名單！`);
      } catch (err) { showToast(err.message, 'error'); }
    }
  };

  const handleUnbanUser = async (email) => {
    if (window.confirm(`確定要解除封鎖此帳號 (${email}) 嗎？恢復後他將重新獲得大廳發言權。`)) {
      try {
        await removeBanUserEmail(email);
        showToast('已成功移除黑名單，該帳號發言權已還原！');
      } catch (err) { showToast(err.message, 'error'); }
    }
  };
  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-24 bg-slate-50 min-h-screen font-sans selection:bg-blue-500 selection:text-white">
      
      {/* 頂部 Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onNavigateBack} className="p-3 bg-white border border-slate-200/70 rounded-xl font-bold shadow-sm active:scale-90 transition-all text-xs text-slate-700">
          ⬅️
        </button>
        <div>
          <h2 className="text-base font-black text-slate-900">大廳交流留言板</h2>
          <p className="text-[10px] text-blue-600 font-bold tracking-wider mt-0.5 uppercase">LOBBY REALTIME CHAT</p>
        </div>
      </div>

      {/* 留言發布卡片 */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.01)] space-y-4 mb-4">
        {userName ? (
          isCurrentUserBanned ? (
            <div className="text-center p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600">
              🚫 您的帳號已被禁止在大廳交流發言與評論
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 focus:outline-none focus:bg-white focus:border-blue-500 text-slate-800 placeholder-slate-400"
                placeholder={`以 ${userName} 身份留言討論...`}
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
              />
              <button type="submit" className="px-4 py-3 bg-blue-600 text-white font-black rounded-xl text-xs hover:bg-blue-500 active:scale-95 transition-all shrink-0">
                發布
              </button>
            </form>
          )
        ) : (
          <div className="text-center p-4 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-400 italic">
            🔒 請先返回大廳並登入 Google 帳號，即可參與留言討論
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
              {isBannedPanelOpen ? '收起發言黑名單管理' : '展開發言黑名單管理'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-amber-50 text-amber-700 font-extrabold px-1.5 py-0.5 rounded border border-amber-200/40">
                {bannedEmails.length} 人被封鎖
              </span>
              <span className="text-xs text-slate-400 font-bold">{isBannedPanelOpen ? '▲' : '▼'}</span>
            </div>
          </button>

          {isBannedPanelOpen && (
            <section className="bg-white border border-slate-200/80 rounded-2xl p-4 mt-2 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-3 animate-fadeIn relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500 opacity-30"></div>
              
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5 pl-1">
                {bannedEmails.length === 0 ? (
                  <div className="text-center py-4 text-[10px] font-bold text-slate-400 italic">目前沒有任何帳號被封鎖</div>
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
                        🔓 解除
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
          <h2 className="text-xs font-black tracking-widest text-slate-400 uppercase">💬 歷史交流訊息</h2>
          <span className="text-[9px] text-slate-400 font-bold">共 {messages.length} 則</span>
        </div>

        {messages.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs italic">
            目前尚無任何發言紀錄
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
                      {isThisMsgUserBanned && <span className="text-[8px] bg-rose-100 text-rose-700 px-1 rounded ml-1">已封鎖</span>}
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
                        🚫 封鎖
                      </button>
                    )}
                    <button 
                      onClick={async () => { if (window.confirm('確定要永久移除此條大廳發言嗎？')) { await deleteMessage(msg.id); showToast('留言已由管理員移除'); } }}
                      className="text-[9px] font-bold bg-white text-rose-500 border border-slate-200 hover:bg-rose-50 px-1.5 py-0.5 rounded shadow-sm transition active:scale-90"
                    >
                      🗑️
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
