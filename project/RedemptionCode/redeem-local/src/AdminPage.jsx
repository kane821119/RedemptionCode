import React, { useState } from 'react';
import { redemptionService } from './services/redemptionService';

export default function AdminPage({ categories, fetchCategories, triggerStatus }) {
  const [newCatId, setNewCatId] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatId.trim() || !newCatName.trim()) return;
    try {
      await redemptionService.addCategory(newCatId.trim(), newCatName.trim());
      setNewCatId('');
      setNewCatName('');
      triggerStatus(`成功建立新種類: ${newCatName.trim()}`);
      fetchCategories();
    } catch (err) { triggerStatus(err.message, 'error'); }
  };

  const handleUpdateCategory = async (id) => {
    if (!editingCatName.trim()) return;
    try {
      await redemptionService.editCategory(id, editingCatName.trim());
      setEditingCatId(null);
      triggerStatus('種類名稱已成功修改');
      fetchCategories();
    } catch (err) { triggerStatus(err.message, 'error'); }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm(`警告：確定要刪除種類 [${id}] 嗎？這會自動連帶秒殺清除該分類下的所有兌換碼！`)) return;
    try {
      await redemptionService.removeCategory(id);
      triggerStatus(`種類 [${id}] 與旗下數據已全數安全清理`);
      fetchCategories();
    } catch (err) { triggerStatus(err.message, 'error'); }
  };

  return (
    <div style={{ maxWidth: '600px', background: '#fff8f8', padding: '20px', borderRadius: '8px', border: '1px solid #f5c6cb', margin: '0 auto' }}>
      <h4 style={{ margin: '0 0 15px 0', color: '#dc3545' }}>🛠️ 兌換碼動態種類（Category）增減維護</h4>
      
      {/* 新增種類表單 */}
      <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        <input type="text" placeholder="種類ID (如: game_wow)" value={newCatId} onChange={(e) => setNewCatId(e.target.value)} required style={{ flex: 1, padding: '6px' }} />
        <input type="text" placeholder="顯示名稱" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} required style={{ flex: 1, padding: '6px' }} />
        <button type="submit" style={{ background: '#28a745', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>新增種類</button>
      </form>

      {/* 分類維護清單 */}
      <ul style={{ paddingLeft: '0', listStyleType: 'none', margin: 0 }}>
        {categories.map(cat => (
          <li key={cat.id} style={{ padding: '10px', borderBottom: '1px solid #ddd', background: '#fff', marginBottom: '4px', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><b>{cat.name}</b> <small style={{ color: '#777' }}>({cat.id})</small></span>
              <div>
                <button onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }} style={{ fontSize: '12px', marginRight: '5px', padding: '2px 6px' }}>更名</button>
                <button onClick={() => handleDeleteCategory(cat.id)} style={{ fontSize: '12px', color: 'red', padding: '2px 6px' }}>刪除</button>
              </div>
            </div>
            {editingCatId === cat.id && (
              <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
                <input type="text" value={editingCatName} onChange={(e) => setEditingCatName(e.target.value)} style={{ flex: 1, padding: '4px' }} />
                <button onClick={() => handleUpdateCategory(cat.id)} style={{ fontSize: '12px', background: '#333', color: '#fff', padding: '4px 8px' }}>儲存</button>
                <button onClick={() => setEditingCatId(null)} style={{ fontSize: '12px', padding: '4px 8px' }}>取消</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
