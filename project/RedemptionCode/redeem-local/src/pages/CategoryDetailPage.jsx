import React, { useState, useEffect } from 'react';
import { CryptoCodeService, supabase } from '../services/cryptoCodeService.js';

export default function CategoryDetailPage({ categoryId, onNavigateBack }) {
  const [currentCategory, setCurrentCategory] = useState(null), [codes, setCodes] = useState([]), [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState({ show: false, message: '', type: 'success' }), [reportThreshold, setReportThreshold] = useState(20);
  const [bulkInput, setBulkInput] = useState(''), [singleSecret, setSingleSecret] = useState(''), [contributorInput, setContributorInput] = useState('');
  const [startDate, setStartDate] = useState(''), [endDate, setEndDate] = useState(() => new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'));
  const [editingId, setEditingId] = useState(null), [editFields, setEditFields] = useState({ code: '', secret_key: '' }), [showHidden, setShowHidden] = useState(false);

  const showMsg = (message, type = 'success') => {
    setStatus({ show: true, message, type });
    setTimeout(() => setStatus(prev => ({ ...prev, show: false })), 3000);
  };

  const loadData = async () => {
    try {
      const cats = await CryptoCodeService.fetchCategories();
      setCurrentCategory(cats.find(c => c.id === categoryId));
      const raw = await CryptoCodeService.fetchAvailableCodes({ startDate, endDate, reportThreshold }), cache = CryptoCodeService.getLocalCache();
      const mapped = raw.filter(c => c.category_id === categoryId).map(c => ({ ...c, isUsed: cache[c.code] === 'used', isReported: cache[c.code] === 'reported', localHiddenReason: cache[c.code] || null })).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setCodes(showHidden ? mapped : mapped.filter(item => !item.localHiddenReason));
    } catch (err) { showMsg(err.message, 'error'); }
  };

  useEffect(() => { loadData(); }, [categoryId, startDate, endDate, reportThreshold, showHidden]);
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.full_name) setContributorInput(user.user_metadata.full_name);
    setIsAdmin(await CryptoCodeService.checkIsAdmin());
  })(); }, [categoryId]);

  const handleBulkInsert = async (e) => {
    e.preventDefault(); if (!bulkInput.trim()) return showMsg('請貼入兌換碼文字', 'error');
    let rules = [currentCategory.keep_letters && 'A-Za-z', currentCategory.keep_numbers && '0-9', currentCategory.keep_symbols && '\\-[_\\*\\!\\@\\#]'].filter(Boolean);
    let matches = [...new Set((bulkInput.match(new RegExp(`[${rules.length ? rules.join('') : 'A-Za-z0-9'}]+`, 'g')) || []).map(c => currentCategory.force_uppercase ? c.toUpperCase() : c).filter(c => c.length >= 4))];
    if (!matches.length) return showMsg('未能分割出任何有效代碼', 'error');
    try {
      await CryptoCodeService.insertCodesBulk({ categoryId, codesArray: matches, secretsArray: new Array(matches.length).fill(singleSecret.trim()), contributorName: contributorInput.trim() });
      showMsg(`成功上架 ${matches.length} 組兌換碼！`); setBulkInput(''); setSingleSecret(''); loadData();
    } catch (err) { showMsg(err.message, 'error'); }
  };

  const handleCheckboxChange = async (index, field, codeText) => {
    const val = !codes[index][field];
    if (field === 'isUsed' && val) { await navigator.clipboard.writeText(codeText); showMsg(`📋 已複製：${codeText}`); }
    setCodes(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: val } : item));
  };

  const saveInlineEdit = async (id) => {
    if (!editFields.code.trim()) return showMsg('兌換碼不能留空', 'error');
    try {
      const { error } = await supabase.from('codes').update({ code: editFields.code.trim(), secret_key: currentCategory.show_secret_key ? (editFields.secret_key.trim() || null) : null }).eq('id', id);
      if (error) throw error; showMsg('儲存成功！'); setEditingId(null); loadData();
    } catch (err) { showMsg(err.message, 'error'); }
  };

  if (!currentCategory) return <div style={{ padding: '20px' }}>載入中...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      {status.show && <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: status.type === 'success' ? '#4caf50' : '#f44336', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 9999 }}>{status.message}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button onClick={onNavigateBack}>⬅️ 返回大廳</button><h2>【{currentCategory.name}】</h2>
      </div>
      <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#f9f9f9' }}>
        <form onSubmit={handleBulkInsert} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <textarea rows="3" placeholder="請在此貼上雜亂文字..." value={bulkInput} onChange={e => setBulkInput(e.target.value)} style={{ width: '100%' }} />
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {currentCategory.show_secret_key && <input type="text" placeholder="共同密碼" value={singleSecret} onChange={e => setSingleSecret(e.target.value)} />}
            <input type="text" placeholder="提交人名稱" value={contributorInput} onChange={e => setContributorInput(e.target.value)} />
            <button type="submit" style={{ backgroundColor: '#4caf50', color: 'white' }}>⚡ 智慧分割上架</button>
          </div>
        </form>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#f1f1f1', padding: '12px', borderRadius: '6px', marginBottom: '15px', flexWrap: 'wrap', fontSize: '14px' }}>
        📅 日期：<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /> 至 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /> | 
        隱藏檢舉 ≧ <input type="number" style={{ width: '50px' }} value={reportThreshold} onChange={e => setReportThreshold(parseInt(e.target.value) || 0)} /> 次 |
        <label style={{ fontWeight: 'bold', color: '#673ab7', cursor: 'pointer' }}><input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} /> 👁️ 顯示已隱藏的項目</label>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#eaeaea', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>分割提取兌換碼</th>{currentCategory.show_secret_key && <th style={{ padding: '10px' }}>密碼</th>}
            <th>提交人</th><th>提交日期</th><th>被檢舉</th><th>目前狀態</th><th>已使用 (複製)</th><th>過期檢舉</th>{isAdmin && <th>🛠️ 操作</th>}
          </tr>
        </thead>
        <tbody>
          {codes.length === 0 ? <tr><td colSpan={isAdmin ? 9 : 8} style={{ padding: '20px', textAlign: 'center' }}>暫無代碼</td></tr> : codes.map((item, index) => {
            const isEdit = editingId === item.id;
            return (
              <tr key={item.id} style={item.localHiddenReason ? { opacity: 0.45, backgroundColor: '#fdfdfd', borderBottom: '1px solid #ddd' } : { borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px', fontFamily: 'monospace' }}>{isEdit ? <input type="text" value={editFields.code} onChange={e => setEditFields({ ...editFields, code: e.target.value })} /> : <span style={{ fontWeight: 'bold', color: item.localHiddenReason ? '#7f8c8d' : '#16a085' }}>{item.code}</span>}</td>
                {currentCategory.show_secret_key && <td style={{ padding: '10px' }}>{isEdit ? <input type="text" value={editFields.secret_key} onChange={e => setEditFields({ ...editFields, secret_key: e.target.value })} /> : (item.secret_key || '無')}</td>}
                <td>{item.contributor || '匿名訪客'}</td>
                <td>{new Date(item.created_at).toLocaleString(navigator.language, { hour12: false })}</td>
                <td style={{ color: item.report_count > 0 ? '#e74c3c' : '#7f8c8d' }}>⚠️ {item.report_count} 次</td>
                <td style={{ fontSize: '12px', fontWeight: 'bold' }}>{item.localHiddenReason ? (item.localHiddenReason === 'used' ? '🚫 本地已領取' : '⚠️ 已提報檢舉') : '🟢 可用中'}</td>
                <td><input type="checkbox" checked={item.isUsed} disabled={item.localHiddenReason === 'used'} onChange={() => handleCheckboxChange(index, 'isUsed', item.code)} /></td>
                <td><input type="checkbox" checked={item.isReported} disabled={item.localHiddenReason === 'reported'} onChange={() => handleCheckboxChange(index, 'isReported', item.code)} /></td>
                {isAdmin && <td>{isEdit ? <><button onClick={() => saveInlineEdit(item.id)}>儲存</button><button onClick={() => setEditingId(null)}>取消</button></> : <><button onClick={() => { setEditingId(item.id); setEditFields({ code: item.code, secret_key: item.secret_key || '' }); }}>編輯</button><button onClick={async () => { if (window.confirm('確定刪除？')) await supabase.from('codes').delete().eq('id', item.id); loadData(); }}>刪除</button></>}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      {codes.length > 0 && <button onClick={async () => { try { await CryptoCodeService.batchSubmitChanges(codes); showMsg('變更已同步！'); loadData(); } catch(e) { showMsg(e.message, 'error'); } }} style={{ marginTop: '20px', float: 'right', backgroundColor: '#ff5722', color: 'white', padding: '10px 20px' }}>💾 提交變更</button>}
    </div>
  );
}
