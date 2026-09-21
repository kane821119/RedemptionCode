import React, { useState, useEffect } from 'react';
import { CryptoCodeService, supabase } from '../services/cryptoCodeService.js';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .cc-home * { box-sizing: border-box; }

  .cc-home {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    max-width: 960px;
    margin: 0 auto;
    padding: 28px 20px 60px;
    color: #0f172a;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    min-height: 100vh;
  }

  .cc-toast {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    padding: 14px 28px;
    border-radius: 12px;
    color: #fff;
    font-weight: 500;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    animation: slideDown 0.3s ease;
  }
  .cc-toast.success { background: linear-gradient(135deg, #10b981, #059669); }
  .cc-toast.error { background: linear-gradient(135deg, #ef4444, #dc2626); }

  @keyframes slideDown {
    from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  .cc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 36px;
    gap: 16px;
    flex-wrap: wrap;
  }

  .cc-header h1 {
    margin: 0 0 6px 0;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.03em;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .cc-header p {
    margin: 0;
    color: #64748b;
    font-size: 15px;
  }

  .cc-user-bar {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cc-user-name {
    font-size: 14px;
    font-weight: 500;
    color: #475569;
    background: #fff;
    padding: 8px 14px;
    border-radius: 999px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }

  .cc-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 18px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .cc-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
  .cc-btn:active { transform: translateY(0); }

  .cc-btn-primary {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: #fff;
  }
  .cc-btn-primary:hover { box-shadow: 0 4px 16px rgba(79,70,229,0.4); }

  .cc-btn-danger {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: #fff;
  }
  .cc-btn-danger:hover { box-shadow: 0 4px 16px rgba(239,68,68,0.35); }

  .cc-btn-ghost {
    background: #fff;
    color: #475569;
    border: 1px solid #e2e8f0;
  }

  .cc-btn-sm {
    padding: 6px 12px;
    font-size: 12px;
    border-radius: 8px;
  }

  .cc-admin-panel {
    background: linear-gradient(145deg, #f5f3ff, #ede9fe);
    border: 1.5px solid #c4b5fd;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 36px;
    box-shadow: 0 4px 20px rgba(99,102,241,0.08);
  }

  .cc-admin-panel h3 {
    margin: 0 0 20px 0;
    font-size: 18px;
    font-weight: 700;
    color: #5b21b6;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cc-admin-grid {
    display: grid;
    gap: 24px;
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 720px) {
    .cc-admin-grid { grid-template-columns: 1fr; }
  }

  .cc-admin-grid h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #4c1d95;
  }

  .cc-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .cc-input {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    font-family: inherit;
    background: #fff;
    transition: border-color 0.2s, box-shadow 0.2s;
    outline: none;
  }

  .cc-input:focus {
    border-color: #818cf8;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
  }

  .cc-check-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #334155;
    cursor: pointer;
    user-select: none;
  }

  .cc-check-label input {
    width: 16px;
    height: 16px;
    accent-color: #6366f1;
    cursor: pointer;
  }

  .cc-rules-box {
    background: #fff;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
  }

  .cc-rules-box p {
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
  }

  .cc-rules-box .cc-check-label {
    margin-right: 14px;
    margin-bottom: 4px;
  }

  .cc-form-actions {
    display: flex;
    gap: 10px;
    margin-top: 4px;
  }

  .cc-cleanup-label {
    font-size: 13px;
    color: #475569;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .cc-cleanup-label input {
    width: 64px;
    padding: 8px 10px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    text-align: center;
    font-family: inherit;
  }

  .cc-category-grid {
    display: grid;
    gap: 18px;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }

  .cc-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 22px;
    cursor: pointer;
    position: relative;
    transition: all 0.25s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .cc-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 28px rgba(0,0,0,0.08);
    border-color: #c7d2fe;
  }

  .cc-card h3 {
    margin: 0 0 12px 0;
    font-size: 17px;
    font-weight: 600;
    color: #1e293b;
  }

  .cc-card-meta {
    font-size: 12px;
    color: #64748b;
    line-height: 1.6;
  }

  .cc-card-meta div {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .cc-card-actions {
    position: absolute;
    top: 14px;
    right: 14px;
    display: flex;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .cc-card:hover .cc-card-actions {
    opacity: 1;
  }

  .cc-btn-edit {
    background: #f59e0b;
    color: #fff;
  }
  .cc-btn-edit:hover { box-shadow: 0 4px 12px rgba(245,158,11,0.35); }

  .cc-btn-delete {
    background: #ef4444;
    color: #fff;
  }
  .cc-btn-delete:hover { box-shadow: 0 4px 12px rgba(239,68,68,0.35); }
`;

export default function HomePage({ onSelectCategory }) {
  const [categories, setCategories] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState(null);
  const [status, setStatus] = useState({ show: false, message: '', type: 'success' });

  const [cleanupSettings, setCleanupSettings] = useState({ cleanup_report_threshold: '100' });
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({
    name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true
  });

  const triggerStatus = (message, type = 'success') => {
    setStatus({ show: true, message, type });
    setTimeout(() => setStatus(prev => ({ ...prev, show: false })), 3000);
  };

  useEffect(() => {
    initHome();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const name = session?.user?.user_metadata?.full_name || null;
      setUserName(name);
      if (session?.user) checkAdminStatus(); else setIsAdmin(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const initHome = async () => {
    try {
      const cats = await CryptoCodeService.fetchCategories();
      setCategories(cats);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || '已登入使用者');
        await checkAdminStatus();
      }
    } catch (err) { triggerStatus(err.message, 'error'); }
  };

  const checkAdminStatus = async () => {
    const adminCheck = await CryptoCodeService.checkIsAdmin();
    setIsAdmin(adminCheck);
    if (adminCheck) {
      const settings = await CryptoCodeService.fetchSystemSettings();
      if (settings.cleanup_report_threshold) setCleanupSettings(settings);
    }
  };

  const handleGoogleLogin = async () => { await supabase.auth.signInWithOAuth({ provider: 'google' }); };
  const handleLogout = async () => { await supabase.auth.signOut(); triggerStatus('已登出'); };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catForm.name) return triggerStatus('請輸入名稱', 'error');
    try {
      if (editingCat) {
        await CryptoCodeService.updateCategory(editingCat.id, catForm);
        triggerStatus('種類修改成功！');
      } else {
        await CryptoCodeService.createCategory(catForm);
        triggerStatus('種類建立成功！');
      }
      setCatForm({ name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true });
      setEditingCat(null);
      initHome();
    } catch (err) { triggerStatus(err.message, 'error'); }
  };

  const handleEditClick = (cat) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name, showSecretKey: cat.show_secret_key, keepLetters: cat.keep_letters,
      keepNumbers: cat.keep_numbers, keepSymbols: cat.keep_symbols, forceUppercase: cat.force_uppercase
    });
  };

  const handleDeleteCategory = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('確定刪除此種類？其下的所有兌換碼將會被連帶刪除！')) return;
    try { await CryptoCodeService.deleteCategory(id); triggerStatus('種類已刪除'); initHome(); } catch (err) { triggerStatus(err.message, 'error'); }
  };

  return (
    <div className="cc-home">
      <style>{styles}</style>

      {status.show && (
        <div className={`cc-toast ${status.type}`}>{status.message}</div>
      )}

      <header className="cc-header">
        <div>
          <h1>兌換碼大廳</h1>
          <p>請選擇欲查看或批次發行的項目種類</p>
        </div>
        <div className="cc-user-bar">
          {userName ? (
            <>
              <span className="cc-user-name">👤 {userName}</span>
              <button className="cc-btn cc-btn-danger" onClick={handleLogout}>登出</button>
            </>
          ) : (
            <button className="cc-btn cc-btn-primary" onClick={handleGoogleLogin}>
              Google 帳號登入
            </button>
          )}
        </div>
      </header>

      {isAdmin && (
        <section className="cc-admin-panel">
          <h3>🛠️ 管理者控製面板</h3>
          <div className="cc-admin-grid">
            <div>
              <h4>{editingCat ? '修改種類屬性與過濾分割規則' : '新增兌換種類與設定規則'}</h4>
              <form className="cc-form" onSubmit={handleSaveCategory}>
                <input
                  className="cc-input"
                  type="text"
                  placeholder="種類名稱"
                  value={catForm.name}
                  onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                />
                <label className="cc-check-label">
                  <input
                    type="checkbox"
                    checked={catForm.showSecretKey}
                    onChange={e => setCatForm({ ...catForm, showSecretKey: e.target.checked })}
                  />
                  顯示密碼欄位
                </label>

                <div className="cc-rules-box">
                  <p>⚙️ 批次分割自動過濾規則（多選）</p>
                  <label className="cc-check-label">
                    <input type="checkbox" checked={catForm.keepLetters} onChange={e => setCatForm({ ...catForm, keepLetters: e.target.checked })} />
                    保留英文
                  </label>
                  <label className="cc-check-label">
                    <input type="checkbox" checked={catForm.keepNumbers} onChange={e => setCatForm({ ...catForm, keepNumbers: e.target.checked })} />
                    保留數字
                  </label>
                  <br />
                  <label className="cc-check-label">
                    <input type="checkbox" checked={catForm.keepSymbols} onChange={e => setCatForm({ ...catForm, keepSymbols: e.target.checked })} />
                    保留符號
                  </label>
                  <label className="cc-check-label">
                    <input type="checkbox" checked={catForm.forceUppercase} onChange={e => setCatForm({ ...catForm, forceUppercase: e.target.checked })} />
                    強制大寫
                  </label>
                </div>

                <div className="cc-form-actions">
                  <button type="submit" className="cc-btn cc-btn-primary" style={{ flex: 1 }}>
                    {editingCat ? '儲存變更' : '建立種類'}
                  </button>
                  {editingCat && (
                    <button
                      type="button"
                      className="cc-btn cc-btn-ghost"
                      onClick={() => {
                        setEditingCat(null);
                        setCatForm({ name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true });
                      }}
                    >
                      取消
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div>
              <h4>🧹 凌晨 03:00 自動打鎖參數</h4>
              <label className="cc-cleanup-label">
                檢舉被黑達
                <input
                  type="number"
                  value={cleanupSettings.cleanup_report_threshold}
                  onChange={e => setCleanupSettings({ cleanup_report_threshold: e.target.value })}
                />
                次自動徹底灰飛煙滅
              </label>
              <button
                className="cc-btn"
                style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)', color: '#fff', marginTop: 14 }}
                onClick={() => {
                  CryptoCodeService.updateCleanupRules(cleanupSettings.cleanup_report_threshold);
                  triggerStatus('清理規則已更新');
                }}
              >
                儲存清理規則
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="cc-category-grid">
        {categories.map(cat => (
          <div key={cat.id} className="cc-card" onClick={() => onSelectCategory(cat.id)}>
            <h3>{cat.name}</h3>
            <div className="cc-card-meta">
              <div>{cat.show_secret_key ? '🔒 帶密碼模式' : '🔓 免密碼模式'}</div>
              <div>
                規則：
                {cat.force_uppercase && '大寫 '}
                {cat.keep_letters && '英文 '}
                {cat.keep_numbers && '數字 '}
                {cat.keep_symbols && '符號 '}
              </div>
            </div>
            {isAdmin && (
              <div className="cc-card-actions">
                <button
                  className="cc-btn cc-btn-sm cc-btn-edit"
                  onClick={(e) => { e.stopPropagation(); handleEditClick(cat); }}
                >
                  改
                </button>
                <button
                  className="cc-btn cc-btn-sm cc-btn-delete"
                  onClick={(e) => handleDeleteCategory(cat.id, e)}
                >
                  刪
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}