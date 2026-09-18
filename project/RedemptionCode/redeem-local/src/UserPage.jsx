import React, { useState, useEffect, useCallback } from 'react';
import { redemptionService, supabase } from './services/redemptionService';

export default function UserPage({ categories, categoryId, setCategoryId, username, triggerStatus }) {
  const [startDate, setStartDate] = useState(''); 
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });     
  
  const [maxFailed, setMaxFailed] = useState(20); 
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportStates, setReportStates] = useState({});

  const [newCode, setNewCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 1. 載入清單（包含強大的 LocalStorage 本地去中心化剔除機制）
  const fetchCodes = useCallback(async () => {
    if (!supabase || !categoryId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await redemptionService.getFilteredCodes({
        categoryId,
        startDate: startDate || null, 
        endDate: endDate ? `${endDate}T23:59:59Z` : null,     
        maxFailedAttempts: parseInt(maxFailed) || 20, 
        username: username.trim()
      });
      
      const serverCodes = data || [];

      // 💾 【LocalStorage 核心過濾核心】
      // 根據當前的「模擬登入帳號」或「訪客身份」撈取專屬的本地已領取快取快取快取
      const cacheKey = username.trim() ? `rc_used_${username.trim()}` : `rc_used_guest`;
      const localUsedIds = JSON.parse(localStorage.getItem(cacheKey) || '[]');

      // 核心剔除邏輯：如果這個代碼 ID 存在於本地瀏覽器的快取中，直接在前端秒殺隱藏！
      const clientFilteredCodes = serverCodes.filter(item => !localUsedIds.includes(item.id));

      setCodes(clientFilteredCodes);

      // 初始化勾選狀態：已使用(true), 已過期(false)
      const initialStates = {};
      clientFilteredCodes.forEach(item => {
        initialStates[item.id] = { isUsed: true, isExpired: false };
      });
      setReportStates(initialStates);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [categoryId, username, startDate, endDate, maxFailed]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  // 新增發行兌換碼
  const handleInsertCode = async (e) => {
    e.preventDefault();
    if (!newCode.trim() || !categoryId) return;
    try {
      await redemptionService.insertCode({
        categoryId,
        code: newCode.trim(),
        password: newPassword.trim() || null,
        login_date: new Date().toISOString(),
        login_user: username.trim() || null 
      });
      setNewCode('');
      setNewPassword('');
      triggerStatus(`兌換碼 [${newCode.trim()}] 上架成功！`);
      fetchCodes(); 
    } catch (err) { triggerStatus('發行失敗: ' + err.message, 'error'); }
  };

  const handleCheckboxChange = (id, field) => {
    setReportStates(prev => ({ ...prev, [id]: { ...prev[id], [field]: !prev[id][field] } }));
  };

  // 4. 批次提交變更（100% 寫入本地 LocalStorage，零網路開銷）
  const handleSubmitAllChanges = async () => {
    const trimmedUser = username.trim();
    setLoading(true);
    try {
      // 獲取該使用者對應的 LocalStorage 儲存庫 Key 鍵
      const cacheKey = trimmedUser ? `rc_used_${trimmedUser}` : `rc_used_guest`;
      const currentUsedList = JSON.parse(localStorage.getItem(cacheKey) || '[]');

      let clientChangeCount = 0;

      for (const item of codes) {
        const state = reportStates[item.id];
        if (!state) continue;

        // 如果勾選了「已過期」，打回雲端資料庫累積群眾失效失效failed_attempts次數
        if (state.isExpired) {
          clientChangeCount++;
          await redemptionService.submitReport({ categoryId, code: item.code, username: trimmedUser, reportType: 'EXPIRED' });
          
          // 檢舉過期時，不論有沒有登入，連帶加入「本地個人已領取隱藏快取」
          if (!currentUsedList.includes(item.id)) currentUsedList.push(item.id);
        } 
        // 如果手動保留或勾選了「已使用」
        else if (state.isUsed) {
          clientChangeCount++;
          // 完全不驚動雲端！直接塞入本地端的個人隱藏清單
          if (!currentUsedList.includes(item.id)) currentUsedList.push(item.id);
        }
      }

      // 將最新的已領取清單回寫進瀏覽器 LocalStorage
      localStorage.setItem(cacheKey, JSON.stringify(currentUsedList));

      triggerStatus(`成功處理 ${clientChangeCount} 筆項目變更狀態`);
      fetchCodes(); 
    } catch (err) { 
      triggerStatus('變更失敗: ' + err.message, 'error'); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div>
      <h3 style={{ color: '#333', margin: '0 0 15px 0' }}>🔍 兌換碼查詢與批次提交 (LocalStorage 零容積模式)</h3>
      {error && <div style={{ color: 'red', background: '#fee', padding: '10px', marginBottom: '10px' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
        <span style={{ fontSize: '14px', background: '#eee', padding: '6px 12px', borderRadius: '4px' }}>
          👤 當前身份: <b>{username || '未登入訪客'}</b>
        </span>
        <label>從: <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <label>至: <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
        <label>隱藏檢舉 ≥: <input type="number" style={{ width: '45px' }} value={maxFailed} onChange={(e) => setMaxFailed(e.target.value)} /></label>
      </div>

      <section style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '6px', marginBottom: '20px', background: '#fafafa' }}>
        <form onSubmit={handleInsertCode} style={{ display: 'flex', gap: '10px' }}>
          <input type="text" placeholder="新發行兌換碼" value={newCode} onChange={(e) => setNewCode(e.target.value)} required style={{ flex: 1 }} />
          <input type="text" placeholder="附帶金鑰密碼" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ flex: 1 }} />
          <button type="submit" disabled={!supabase || !categoryId}>確認發行上架</button>
        </form>
      </section>

      <div style={{ marginBottom: '15px', textAlign: 'right' }}>
        <button onClick={handleSubmitAllChanges} disabled={loading || codes.length === 0} style={{ padding: '8px 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? '提交中...' : '💾 提交變更 (全部項目提交)'}
        </button>
      </div>

      {loading && codes.length === 0 ? <p>載入中...</p> : (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th>兌換碼</th>
              <th>密碼</th>
              <th>檢舉過期</th>
              <th>兌換碼貢獻者</th>
              <th>上架提交時間</th>
              <th>回報：已使用</th>
              <th>回報：已過期</th>
            </tr>
          </thead>
          <tbody>
            {codes.map(item => {
              const currentState = reportStates[item.id] || { isUsed: true, isExpired: false };
              return (
                <tr key={item.id}>
                  <td><b>{item.code}</b></td>
                  <td>{item.password || '-'}</td>
                  <td style={{ color: item.failed_attempts > 0 ? 'red' : 'black' }}>{item.failed_attempts} 次</td>
                  <td>{item.login_user || ''}</td>
                  <td>{item.login_date ? new Date(item.login_date).toLocaleDateString() : '-'}</td>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" checked={currentState.isUsed} onChange={() => handleCheckboxChange(item.id, 'isUsed')} /></td>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" checked={currentState.isExpired} onChange={() => handleCheckboxChange(item.id, 'isExpired')} style={{ accentColor: 'red' }} /></td>
                </tr>
              );
            })}
            {codes.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: '#999', padding: '15px' }}>
                  沒有符合當前過濾條件的可用兌換碼。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
