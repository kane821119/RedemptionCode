import React, { useState, useEffect } from 'react';
import { CryptoCodeService, supabase } from '../services/cryptoCodeService.js';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .cc-detail * { box-sizing: border-box; }

  .cc-detail {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    max-width: 720px;
    margin: 0 auto;
    padding: 16px 14px 80px;
    color: #0f172a;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    min-height: 100vh;
  }

  .cc-toast {
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 20px;
    border-radius: 12px;
    color: #fff;
    font-weight: 500;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    animation: slideDown 0.3s ease;
    max-width: calc(100vw - 32px);
    text-align: center;
  }
  .cc-toast.success { background: linear-gradient(135deg, #10b981, #059669); }
  .cc-toast.error { background: linear-gradient(135deg, #ef4444, #dc2626); }

  @keyframes slideDown {
    from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  .cc-topbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .cc-topbar h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cc-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 16px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
  }

  .cc-btn:active { transform: scale(0.97); }

  .cc-btn-back {
    background: #fff;
    color: #475569;
    border: 1px solid #e2e8f0;
    padding: 10px 12px;
    flex-shrink: 0;
  }

  .cc-btn-primary {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: #fff;
  }

  .cc-btn-success {
    background: linear-gradient(135deg, #10b981, #059669);
    color: #fff;
    width: 100%;
  }

  .cc-btn-warn {
    background: linear-gradient(135deg, #f97316, #ea580c);
    color: #fff;
    width: 100%;
    padding: 14px 20px;
    font-size: 15px;
  }

  .cc-btn-sm {
    padding: 8px 12px;
    font-size: 13px;
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
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .cc-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .cc-textarea {
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    font-size: 15px;
    font-family: inherit;
    resize: vertical;
    min-height: 88px;
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
    flex-direction: column;
    gap: 10px;
  }

  .cc-input {
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 15px;
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
    flex-direction: column;
    gap: 12px;
    background: #fff;
    border: 1px solid #e2e8f0;
    padding: 14px;
    border-radius: 14px;
    margin-bottom: 16px;
    font-size: 13px;
    color: #475569;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }

  .cc-filter-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .cc-filter-bar input[type="date"],
  .cc-filter-bar input[type="number"] {
    padding: 10px 12px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    background: #f8fafc;
    min-height: 42px;
  }

  .cc-filter-bar input[type="date"] {
    flex: 1;
    min-width: 0;
  }

  .cc-filter-bar input[type="number"] {
    width: 64px;
    text-align: center;
  }

  .cc-check-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #5b21b6;
    cursor: pointer;
    user-select: none;
    padding: 4px 0;
  }

  .cc-check-label input {
    width: 18px;
    height: 18px;
    accent-color: #7c3aed;
    cursor: pointer;
  }

  .cc-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .cc-code-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    transition: border-color 0.15s;
  }

  .cc-code-card.hidden-card {
    opacity: 0.55;
    background: #fafafa;
  }

  .cc-code-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .cc-code {
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-weight: 700;
    font-size: 16px;
    color: #0d9488;
    letter-spacing: 0.03em;
    word-break: break-all;
    line-height: 1.4;
  }

  .cc-code.muted { color: #94a3b8; }

  .cc-status {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .cc-status.available { background: #d1fae5; color: #065f46; }
  .cc-status.used { background: #fee2e2; color: #991b1b; }
  .cc-status.reported { background: #fef3c7; color: #92400e; }

  .cc-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    font-size: 13px;
    color: #64748b;
    margin-bottom: 12px;
    line-height: 1.5;
  }

  .cc-meta span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .cc-report-count.warn { color: #ef4444; font-weight: 600; }
  .cc-report-count.ok { color: #94a3b8; }

  .cc-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid #f1f5f9;
  }

  .cc-action-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: #334155;
    cursor: pointer;
    user-select: none;
    padding: 6px 10px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    min-height: 40px;
  }

  .cc-action-item input[type="checkbox"] {
    width: 20px;
    height: 20px;
    accent-color: #6366f1;
    cursor: pointer;
    flex-shrink: 0;
  }

  .cc-action-item input[type="checkbox"]:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .cc-action-item.disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .cc-admin-row {
    display: flex;
    gap: 8px;
    margin-top: 10px;
    flex-wrap: wrap;
  }

  .cc-inline-input {
    width: 100%;
    padding: 10px 12px;
    border: 1.5px solid #c7d2fe;
    border-radius: 8px;
    font-size: 15px;
    font-family: inherit;
    margin-bottom: 8px;
  }

  .cc-empty {
    padding: 48px 20px;
    text-align: center;
    color: #94a3b8;
    font-size: 14px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
  }

  .cc-submit-bar {
    margin-top: 20px;
    position: sticky;
    bottom: 16px;
  }

  .cc-loading {
    padding: 60px 20px;
    text-align: center;
    color: #64748b;
    font-size: 15px;
  }

  .cc-secret {
    font-size: 13px;
    color: #475569;
    background: #f1f5f9;
    padding: 2px 8px;
    border-radius: 6px;
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
          // 過期檢舉一律不預設勾選
          isReported: false,
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

  return (
    <div className="cc-detail">
      <style>{styles}</style>

      {status.show && (
        <div className={`cc-toast ${status.type}`}>{status.message}</div>
      )}

      <div className="cc-topbar">
        <button className="cc-btn cc-btn-back" onClick={onNavigateBack}>
          ⬅️
        </button>
        <h2>【{currentCategory.name}】</h2>
      </div>

      <div className="cc-upload-card">
        <form className="cc-form" onSubmit={handleBulkInsert}>
          <textarea
            className="cc-textarea"
            rows={3}
            placeholder="貼上雜亂文字，自動智慧分割兌換碼..."
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
              />
            )}
            <input
              className="cc-input"
              type="text"
              placeholder="提交人名稱"
              value={contributorInput}
              onChange={e => setContributorInput(e.target.value)}
            />
            <button type="submit" className="cc-btn cc-btn-success">
              ⚡ 智慧分割上架
            </button>
          </div>
        </form>
      </div>

      <div className="cc-filter-bar">
        <div className="cc-filter-row">
          <span>📅</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span>至</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="cc-filter-row">
          <span>隱藏檢舉 ≧</span>
          <input
            type="number"
            value={reportThreshold}
            onChange={e => setReportThreshold(parseInt(e.target.value) || 0)}
          />
          <span>次</span>
        </div>
        <label className="cc-check-label">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={e => setShowHidden(e.target.checked)}
          />
          👁️ 顯示已隱藏的項目
        </label>
      </div>

      {codes.length === 0 ? (
        <div className="cc-empty">暫無代碼</div>
      ) : (
        <div className="cc-list">
          {codes.map((item, index) => {
            const isEdit = editingId === item.id;
            return (
              <div
                key={item.id}
                className={`cc-code-card ${item.localHiddenReason ? 'hidden-card' : ''}`}
              >
                {isEdit ? (
                  <>
                    <input
                      className="cc-inline-input"
                      type="text"
                      value={editFields.code}
                      onChange={e => setEditFields({ ...editFields, code: e.target.value })}
                      placeholder="兌換碼"
                    />
                    {currentCategory.show_secret_key && (
                      <input
                        className="cc-inline-input"
                        type="text"
                        value={editFields.secret_key}
                        onChange={e => setEditFields({ ...editFields, secret_key: e.target.value })}
                        placeholder="密碼"
                      />
                    )}
                    <div className="cc-admin-row">
                      <button className="cc-btn cc-btn-sm cc-btn-primary" onClick={() => saveInlineEdit(item.id)}>
                        儲存
                      </button>
                      <button className="cc-btn cc-btn-sm cc-btn-ghost" onClick={() => setEditingId(null)}>
                        取消
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="cc-code-main">
                      <span className={`cc-code ${item.localHiddenReason ? 'muted' : ''}`}>
                        {item.code}
                      </span>
                      {item.localHiddenReason ? (
                        item.localHiddenReason === 'used' ? (
                          <span className="cc-status used">🚫 已領取</span>
                        ) : (
                          <span className="cc-status reported">⚠️ 已檢舉</span>
                        )
                      ) : (
                        <span className="cc-status available">🟢 可用</span>
                      )}
                    </div>

                    <div className="cc-meta">
                      {currentCategory.show_secret_key && (
                        <span>
                          🔑 <span className="cc-secret">{item.secret_key || '無'}</span>
                        </span>
                      )}
                      <span>👤 {item.contributor || '匿名訪客'}</span>
                      <span>
                        📅 {new Date(item.created_at).toLocaleString(navigator.language, {
                          hour12: false,
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className={`cc-report-count ${item.report_count > 0 ? 'warn' : 'ok'}`}>
                        ⚠️ {item.report_count} 次
                      </span>
                    </div>

                    <div className="cc-actions">
                      <label
                        className={`cc-action-item ${item.localHiddenReason === 'used' ? 'disabled' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={item.isUsed}
                          disabled={item.localHiddenReason === 'used'}
                          onChange={() => handleCheckboxChange(index, 'isUsed', item.code)}
                        />
                        已使用（複製）
                      </label>
                      <label
                        className={`cc-action-item ${item.localHiddenReason === 'reported' ? 'disabled' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={item.isReported}
                          disabled={item.localHiddenReason === 'reported'}
                          onChange={() => handleCheckboxChange(index, 'isReported', item.code)}
                        />
                        過期檢舉
                      </label>
                    </div>

                    {isAdmin && (
                      <div className="cc-admin-row">
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

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