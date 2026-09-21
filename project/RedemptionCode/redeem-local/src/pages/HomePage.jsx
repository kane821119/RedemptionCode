import React, { useState, useEffect } from 'react';
import { CryptoCodeService, supabase } from '../services/cryptoCodeService.js';

export default function HomePage({ onSelectCategory }) {
  const [categories, setCategories] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState(null); // 🔄 調整：只存放使用者名稱，不存信箱
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
      // 🔄 調整：從 Google OAuth 詮釋資料中提取使用者暱稱/姓名
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
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      {status.show && <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: status.type === 'success' ? '#4caf50' : '#f44336', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 9999 }}>{status.message}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div><h1>兌換碼大廳</h1><p style={{ color: '#666' }}>請選擇欲查看或批次發行的項目種類</p></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* 🔄 調整：此處只渲染顯示使用者名稱 */}
          {userName ? <><span style={{ fontSize: '14px', alignSelf: 'center' }}>👤 {userName}</span><button onClick={handleLogout} style={{ backgroundColor: '#f44336', color: 'white' }}>登出</button></> : <button onClick={handleGoogleLogin}>Google 帳號登入</button>}
        </div>
      </div>

      {isAdmin && (
        <div style={{ border: '2px dashed #673ab7', padding: '20px', borderRadius: '8px', marginBottom: '30px', backgroundColor: '#f5f0ff' }}>
          <h3 style={{ color: '#673ab7', margin: '0 0 15px 0' }}>🛠️ 管理者控製面板</h3>
          <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <h4>📋 {editingCat ? '修改種類屬性與過濾分割規則' : '新增兌換種類與設定規則'}</h4>
              <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="text" placeholder="種類名稱" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
                <label><input type="checkbox" checked={catForm.showSecretKey} onChange={e => setCatForm({ ...catForm, showSecretKey: e.target.checked })} /> 顯示密碼欄位</label>
                
                <div style={{ background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '13px', fontWeight: 'bold' }}>⚙️ 批次分割自動過濾規則 (多選)：</p>
                  <label style={{ marginRight: '10px' }}><input type="checkbox" checked={catForm.keepLetters} onChange={e => setCatForm({ ...catForm, keepLetters: e.target.checked })} /> 保留英文</label>
                  <label style={{ marginRight: '10px' }}><input type="checkbox" checked={catForm.keepNumbers} onChange={e => setCatForm({ ...catForm, keepNumbers: e.target.checked })} /> 保留數字</label> <br/>
                  <label style={{ marginRight: '10px' }}><input type="checkbox" checked={catForm.keepSymbols} onChange={e => setCatForm({ ...catForm, keepSymbols: e.target.checked })} /> 保留符號</label>
                  <label style={{ marginRight: '10px' }}><input type="checkbox" checked={catForm.forceUppercase} onChange={e => setCatForm({ ...catForm, forceUppercase: e.target.checked })} /> 強制大寫</label>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}><button type="submit" style={{ backgroundColor: '#673ab7', color: 'white', flex: 1 }}>{editingCat ? '儲存變更' : '建立'}</button>{editingCat && <button type="button" onClick={() => { setEditingCat(null); setCatForm({ name: '', showSecretKey: false, keepLetters: true, keepNumbers: true, keepSymbols: false, forceUppercase: true }); }}>取消</button>}</div>
              </form>
            </div>
            <div>
              <h4>🧹 凌晨 03:00 自動打鎖參數</h4>
              <label>檢舉被黑達 <input type="number" style={{ width: '60px' }} value={cleanupSettings.cleanup_report_threshold} onChange={e => setCleanupSettings({ cleanup_report_threshold: e.target.value })} /> 次自動徹底灰飛煙滅</label> <br/>
              <button onClick={() => { CryptoCodeService.updateCleanupRules(cleanupSettings.cleanup_report_threshold); triggerStatus('清理規則已更新'); }} style={{ backgroundColor: '#e91e63', color: 'white', marginTop: '10px' }}>儲存清理規則</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {categories.map(cat => (
          <div key={cat.id} onClick={() => onSelectCategory(cat.id)} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#fff', position: 'relative' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>{cat.name}</h3>
            <div style={{ fontSize: '11px', color: '#777', lineHeight: '1.4' }}>
              <div>{cat.show_secret_key ? '🔒 帶密碼模式' : '🔓 免密碼模式'}</div>
              <div>規則: {cat.force_uppercase && '大寫 '}{cat.keep_letters && '英文 '}{cat.keep_numbers && '數字 '}{cat.keep_symbols && '符號 '}</div>
            </div>
            {isAdmin && (
              <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '5px' }}>
                <button onClick={(e) => { e.stopPropagation(); handleEditClick(cat); }} style={{ backgroundColor: '#ff9800', color: 'white' }}>改</button>
                <button onClick={(e) => handleDeleteCategory(cat.id, e)} style={{ backgroundColor: '#f44336', color: 'white' }}>刪</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
