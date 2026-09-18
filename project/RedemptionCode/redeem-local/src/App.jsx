import React, { useState, useEffect, useCallback } from 'react';
import { redemptionService, supabase } from './services/redemptionService';
import UserPage from './UserPage';   
import AdminPage from './AdminPage'; 

export default function App() {
  const [currentPage, setCurrentPage] = useState('user'); 
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [user, setUser] = useState(null);

  const [statusText, setStatusText] = useState('');
  const [statusType, setStatusType] = useState('info'); 

  const triggerStatus = useCallback((message, type = 'info') => {
    setStatusText(message);
    setStatusType(type);
    const timer = setTimeout(() => setStatusText(''), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    if (!supabase) {
      triggerStatus('未組態環境變數，無法登入', 'error');
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err) {
      triggerStatus('登入失敗: ' + err.message, 'error');
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    triggerStatus('已安全登出');
  };

  const fetchCategories = useCallback(async () => {
    try {
      const data = await redemptionService.getCategories();
      setCategories(data || []);
      if (data && data.length > 0 && !categoryId) {
        setCategoryId(data[0].id); 
      }
    } catch (err) {
      console.error(err.message);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const username = user 
    ? (user.user_metadata?.full_name || user.email?.split('@')[0] || '') 
    : '';

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '950px', margin: '0 auto', color: '#333', position: 'relative' }}>
      
      {statusText && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: statusType === 'error' ? '#ff4d4f' : '#333', color: '#fff', padding: '10px 24px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, fontSize: '14px', fontWeight: 'bold' }}>
          {statusText}
        </div>
      )}

      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ccc', paddingBottom: '10px', marginBottom: '20px' }}>
        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>通用型兌換碼系統</span>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {user ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}>
              <span>🟢 歡迎，<b>{username}</b></span>
              <button onClick={handleLogout} style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>登出</button>
            </div>
          ) : (
            <button 
              onClick={handleGoogleLogin} 
              style={{ padding: '6px 12px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🔵 使用 Google 帳號連動登入
            </button>
          )}

          <button 
            onClick={() => setCurrentPage('user')} 
            style={{ padding: '6px 12px', fontWeight: currentPage === 'user' ? 'bold' : 'normal', background: currentPage === 'user' ? '#333' : '#eee', color: currentPage === 'user' ? '#fff' : '#000', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
          >
            🔍 查詢頁
          </button>
          <button 
            onClick={() => setCurrentPage('admin')} 
            style={{ padding: '6px 12px', fontWeight: currentPage === 'admin' ? 'bold' : 'normal', background: currentPage === 'admin' ? '#dc3545' : '#eee', color: currentPage === 'admin' ? '#fff' : '#000', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
          >
            🛠️ 管理頁
          </button>
        </div>
      </nav>

      {currentPage === 'user' ? (
        <UserPage 
          categories={categories} 
          categoryId={categoryId} 
          setCategoryId={setCategoryId} 
          username={username} 
          triggerStatus={triggerStatus} 
        />
      ) : (
        <AdminPage 
          categories={categories} 
          fetchCategories={fetchCategories}
          categoryId={categoryId}
          setCategoryId={setCategoryId}
          username={username} 
          triggerStatus={triggerStatus} 
        />
      )}
    </div>
  );
}
