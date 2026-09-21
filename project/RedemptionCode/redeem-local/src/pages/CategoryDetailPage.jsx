import React, { useState, useEffect } from 'react';
import { CryptoCodeService, supabase } from '../services/cryptoCodeService.js';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .cc-detail * { box-sizing: border-box; }

  .cc-detail {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    max-width: 1100px;
    margin: 0 auto;
    padding: 28px 20px 80px;
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

  .cc-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
    gap: 16px;
    flex-wrap: wrap;
  }

  .cc-topbar h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
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

  .cc-btn-back {
    background: #fff;
    color: #475569;
    border: 1px solid #e2e8f0;
  }

  .cc-btn-primary {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: #fff;
  }
  .cc-btn-primary:hover { box-shadow: 0 4px 16px rgba(79,70,229,0.4); }

  .cc-btn-success {
    background: linear-gradient(135deg, #10b981, #059669);
    color: #fff;
  }
  .cc-btn-success:hover { box-shadow: 0 4px 16px rgba(16,185,129,0.35); }

  .cc-btn-warn {
    background: linear-gradient(135deg, #f97316, #ea580c);
    color: #fff;
  }
  .cc-btn-warn:hover { box-shadow: 0 4px 16px rgba(249,115,22,0.35); }

  .cc-btn-sm {
    padding: 6px 12px;
    font-size: 12px;
    border-radius: 8px;
  }

  .cc-btn-ghost {
    background: #fff;
    color: #475569;
    border: 1px solid #e2e8f0;
  }

  .cc-upload-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .cc-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .cc-textarea {
    width: 100%;
    padding: 14px 16px;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    min-height: 90px;
    transition: border-color 0.2s, box-shadow 0.2s;
    outline: none;
    background: #f8fafc;
  }

  .cc-textarea:focus {
    border-color: #818cf8;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
    background: #fff;
  }

  .cc-form-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }

  .cc-input {
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

  .cc-filter-bar {
    display: flex;
    gap: 14px;
    align-items: center;
    background: #fff;
    border: 1px solid #e2e8f0;
    padding: 14px 18px;
    border-radius: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    font-size: 13px;
    color: #475569;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }

  .cc-filter-bar input[type="date"],
  .cc-filter-bar input[type="number"] {
    padding: 8px 12px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    background: #f8fafc;
  }

  .cc-filter-bar input[type="number"] {
    width: 56px;
    text-align: center;
  }

  .cc-check-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: #5b21b6;
    cursor: pointer;
    user-select: none;
  }

  .cc-check-label input {
    width: 16px;
    height: 16px;
    accent-color: #7c3aed;
    cursor: pointer;
  }

  .cc-table-wrap {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .cc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .cc-table thead {
    background: linear-gradient(180deg, #f1f5f9, #e2e8f0);
  }

  .cc-table th {
    padding: 14px 12px;
    text-align: left;
    font-weight: 600;
    color: #475569;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
  }

  .cc-table td {
    padding: 12px;
    border-top: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  .cc-table tbody tr {
    transition: background 0.15s;
  }

  .cc-table tbody tr:hover {
    background: #f8fafc;
  }

  .cc-table tbody tr.hidden-row {
    opacity: 0.5;
    background: #fafafa;
  }

  .cc-code {
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-weight: 600;
    font-size: 13px;
    color: #0d9488;
    letter-spacing: 0.02em;
  }

  .cc-code.muted {
    color: #94a3b8;
  }

  .cc-report {
    font-weight: 600;
  }
  .cc-report.warn { color: #ef4444; }
  .cc-report.ok { color: #94a3b8; }

  .cc-status {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;
    display: inline-block;
  }
  .cc-status.available {
    background: #d1fae5;
    color: #065f46;
  }
  .cc-status.used {
    background: #fee2e2;
    color: #991b1b;
  }
  .cc-status.reported {
    background: #fef3c7;
    color: #92400e;
  }

  .cc-table input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #6366f1;
    cursor: pointer;
  }

  .cc-table input[type="checkbox"]:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .cc-inline-input {
    padding: 6px 10px;
    border: 1.5px solid #c7d2fe;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    width: 100%;
    max-width: 180px;
  }

  .cc-empty {
    padding: 48px 20px;
    text-align: center;
    color: #94a3b8;
    font-size: 14px;
  }

  .cc-submit-bar {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
  }

  .cc-loading {
    padding: 60px 20px;
    text-align: center;
    color: #64748b;
    font-size: 15px;
  }
`;

export default function CategoryDetailPage({ categoryId, onNavigateBack }) {
  const [currentCategory, setCurrentCategory] = useState(null);
  const [codes, setCodes] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState({ show: false, message: '', type: 'success' });
  const [reportThreshold, setReportThreshold] = useState(20);
  const [bulkInput, setBulkInput] = useState('');
  const [singleSecret, setSingleSecret] = useState('');
  const [contributorInput, setContributorInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(() =>
    new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')
  );
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({ code: '', secret_key: '' });
  const [showHidden, setShowHidden] = useState(false);

  const showMsg = (message, type = 'success') => {
    setStatus({ show: true, message, type });
    setTimeout(() => setStatus(prev => ({ ...prev, show: false })), 3000);
  };

  const loadData = async () => {
    try {
      const cats = await CryptoCodeService.fetchCategories();
      setCurrentCategory(cats.find(c => c.id === categoryId));
      const raw = await CryptoCodeService.fetchAvailableCodes({ startDate, endDate, reportThreshold });
      const cache = CryptoCodeService.getLocalCache();
      const mapped = raw
        .filter(c => c.category_id === categoryId)
        .map(c => ({
          ...c,
          isUsed: cache[c.code] === 'used',
          isReported: cache[c.code] === 'reported',
          localHiddenReason: cache[c.code] || null
        }))
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setCodes(showHidden ? mapped : mapped.filter(item => !item.localHiddenReason));
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryId, startDate, endDate, reportThreshold, showHidden]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) setContributorInput(user.user_metadata.full_name);
      setIsAdmin(await CryptoCodeService.checkIsAdmin());
    })();
  }, [categoryId]);

  const handleBulkInsert = async (e) => {
    e.preventDefault();
    if (!bulkInput.trim()) return showMsg('請貼入兌換碼文字', 'error');
    let rules = [
      currentCategory.keep_letters && 'A-Za-z',
      currentCategory.keep_numbers && '0-9',
      currentCategory.keep_symbols && '\\-[_\\*\\!\\@\\#]'
    ].filter(Boolean);
    let matches = [
      ...new Set(
        (bulkInput.match(new RegExp(`[${rules.length ? rules.join('') : 'A-Za-z0-9'}]+`, 'g')) || [])
          .map(c => (currentCategory.force_uppercase ? c.toUpperCase() : c))
          .filter(c => c.length >= 4)
      )
    ];
    if (!matches.length) return showMsg('未能分割出任何有效代碼', 'error');
    try {
      await CryptoCodeService.insertCodesBulk({
        categoryId,
        codesArray: matches,
        secretsArray: new Array(matches.length).fill(singleSecret.trim()),
        contributorName: contributorInput.trim()
      });
      showMsg(`成功上架 ${matches.length} 組兌換碼！`);
      setBulkInput('');
      setSingleSecret('');
      loadData();
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleCheckboxChange = async (index, field, codeText) => {
    const val = !codes[index][field];
    if (field === 'isUsed' && val) {
      await navigator.clipboard.writeText(codeText);
      showMsg(`📋 已複製：${codeText}`);
    }
    setCodes(prev => prev.map((item, idx) => (idx === index ? { ...item, [field]: val } : item)));
  };

  const saveInlineEdit = async (id) => {
    if (!editFields.code.trim()) return showMsg('兌換碼不能留空', 'error');
    try {
      const { error } = await supabase
        .from('codes')
        .update({
          code: editFields.code.trim(),
          secret_key: currentCategory.show_secret_key ? editFields.secret_key.trim() || null : null
        })
        .eq('id', id);
      if (error) throw error;
      showMsg('儲存成功！');
      setEditingId(null);
      loadData();
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  if (!currentCategory) {
    return (
      <div className="cc-detail">
        <style>{styles}</style>
        <div className="cc-loading">載入中...</div>
      </div>
    );
  }

  const colSpan = isAdmin ? 9 : 8;

  return (
    <div className="cc-detail">
      <style>{styles}</style>

      {status.show && (
        <div className={`cc-toast ${status.type}`}>{status.message}</div>
      )}

      <div className="cc-topbar">
        <button className="cc-btn cc-btn-back" onClick={onNavigateBack}>
          ⬅️ 返回大廳
        </button>
        <h2>【{currentCategory.name}】</h2>
        <div style={{ width: 100 }} />
      </div>

      <div className="cc-upload-card">
        <form className="cc-form" onSubmit={handleBulkInsert}>
          <textarea
            className="cc-textarea"
            rows={3}
            placeholder="請在此貼上雜亂文字，系統會自動智慧分割兌換碼..."
            value={bulkInput}
            onChange={e => setBulkInput(e.target.value)}
          />
          <div className="cc-form-row">
            {currentCategory.show_secret_key && (
              <input
                className="cc-input"
                type="text"
                placeholder="共同密碼"
                value={singleSecret}
                onChange={e => setSingleSecret(e.target.value)}
                style={{ minWidth: 140 }}
              />
            )}
            <input
              className="cc-input"
              type="text"
              placeholder="提交人名稱"
              value={contributorInput}
              onChange={e => setContributorInput(e.target.value)}
              style={{ minWidth: 140 }}
            />
            <button type="submit" className="cc-btn cc-btn-success">
              ⚡ 智慧分割上架
            </button>
          </div>
        </form>
      </div>

      <div className="cc-filter-bar">
        <span>📅 日期：</span>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <span>至</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <span style={{ marginLeft: 8 }}>|</span>
        <span>隱藏檢舉 ≧</span>
        <input
          type="number"
          value={reportThreshold}
          onChange={e => setReportThreshold(parseInt(e.target.value) || 0)}
        />
        <span>次</span>
        <span style={{ marginLeft: 8 }}>|</span>
        <label className="cc-check-label">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={e => setShowHidden(e.target.checked)}
          />
          👁️ 顯示已隱藏的項目
        </label>
      </div>

      <div className="cc-table-wrap">
        <table className="cc-table">
          <thead>
            <tr>
              <th>分割提取兌換碼</th>
              {currentCategory.show_secret_key && <th>密碼</th>}
              <th>提交人</th>
              <th>提交日期</th>
              <th>被檢舉</th>
              <th>目前狀態</th>
              <th>已使用 (複製)</th>
              <th>過期檢舉</th>
              {isAdmin && <th>🛠️ 操作</th>}
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="cc-empty">
                  暫無代碼
                </td>
              </tr>
            ) : (
              codes.map((item, index) => {
                const isEdit = editingId === item.id;
                return (
                  <tr key={item.id} className={item.localHiddenReason ? 'hidden-row' : ''}>
                    <td>
                      {isEdit ? (
                        <input
                          className="cc-inline-input"
                          type="text"
                          value={editFields.code}
                          onChange={e => setEditFields({ ...editFields, code: e.target.value })}
                        />
                      ) : (
                        <span className={`cc-code ${item.localHiddenReason ? 'muted' : ''}`}>
                          {item.code}
                        </span>
                      )}
                    </td>
                    {currentCategory.show_secret_key && (
                      <td>
                        {isEdit ? (
                          <input
                            className="cc-inline-input"
                            type="text"
                            value={editFields.secret_key}
                            onChange={e => setEditFields({ ...editFields, secret_key: e.target.value })}
                          />
                        ) : (
                          item.secret_key || '無'
                        )}
                      </td>
                    )}
                    <td>{item.contributor || '匿名訪客'}</td>
                    <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>
                      {new Date(item.created_at).toLocaleString(navigator.language, { hour12: false })}
                    </td>
                    <td>
                      <span className={`cc-report ${item.report_count > 0 ? 'warn' : 'ok'}`}>
                        ⚠️ {item.report_count} 次
                      </span>
                    </td>
                    <td>
                      {item.localHiddenReason ? (
                        item.localHiddenReason === 'used' ? (
                          <span className="cc-status used">🚫 本地已領取</span>
                        ) : (
                          <span className="cc-status reported">⚠️ 已提報檢舉</span>
                        )
                      ) : (
                        <span className="cc-status available">🟢 可用中</span>
                      )}
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.isUsed}
                        disabled={item.localHiddenReason === 'used'}
                        onChange={() => handleCheckboxChange(index, 'isUsed', item.code)}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.isReported}
                        disabled={item.localHiddenReason === 'reported'}
                        onChange={() => handleCheckboxChange(index, 'isReported', item.code)}
                      />
                    </td>
                    {isAdmin && (
                      <td>
                        {isEdit ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="cc-btn cc-btn-sm cc-btn-primary" onClick={() => saveInlineEdit(item.id)}>
                              儲存
                            </button>
                            <button className="cc-btn cc-btn-sm cc-btn-ghost" onClick={() => setEditingId(null)}>
                              取消
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="cc-btn cc-btn-sm"
                              style={{ background: '#f59e0b', color: '#fff' }}
                              onClick={() => {
                                setEditingId(item.id);
                                setEditFields({ code: item.code, secret_key: item.secret_key || '' });
                              }}
                            >
                              編輯
                            </button>
                            <button
                              className="cc-btn cc-btn-sm"
                              style={{ background: '#ef4444', color: '#fff' }}
                              onClick={async () => {
                                if (window.confirm('確定刪除？')) {
                                  await supabase.from('codes').delete().eq('id', item.id);
                                  loadData();
                                }
                              }}
                            >
                              刪除
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {codes.length > 0 && (
        <div className="cc-submit-bar">
          <button
            className="cc-btn cc-btn-warn"
            onClick={async () => {
              try {
                await CryptoCodeService.batchSubmitChanges(codes);
                showMsg('變更已同步！');
                loadData();
              } catch (e) {
                showMsg(e.message, 'error');
              }
            }}
          >
            💾 提交變更
          </button>
        </div>
      )}
    </div>
  );
}