import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { getLocaleText } from '../i18n/languageStore';

export const useSystemStore = create((set, get) => ({
  categories: [],
  systemSettings: { cleanup_report_threshold: '10' },
  messages: [],
  bannedEmails: [],
  toast: { show: false, message: '', type: 'success' },

  showToast: (message, type = 'success') => {
    set({ toast: { show: true, message, type } });
    setTimeout(() => set({ toast: { show: false, message: '', type: 'success' } }), 3000);
  },

  CACHE_KEY: 'used_codes_pool_v3',
  getLocalCache: () => JSON.parse(localStorage.getItem(get().CACHE_KEY) || '{}'),
  
  saveToLocalCache: (categoryId, code, statusType) => {
    const pool = get().getLocalCache();
    const compositeKey = `${categoryId}_${code}`;
    pool[compositeKey] = statusType;
    localStorage.setItem(get().CACHE_KEY, JSON.stringify(pool));
  },

  fetchCategories: async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    set({ categories: data });
  },

  createCategory: async (payload) => {
    const { error } = await supabase.rpc('api_create_category', {
      p_name: payload.name, 
      p_show_secret: payload.showSecretKey, 
      p_keep_letters: payload.keepLetters,
      p_keep_numbers: payload.keepNumbers, 
      p_keep_symbols: payload.keepSymbols, 
      p_force_upper: payload.forceUppercase,
      p_keep_chinese: payload.keepChinese,
      p_web_url: payload.webUrl // ⚡ 支援外部直兌網址
    });
    if (error) throw error;
    await get().fetchCategories();
  },

  updateCategory: async (id, payload) => {
    const { error } = await supabase.rpc('api_update_category', {
      p_id: id, 
      p_name: payload.name, 
      p_show_secret: payload.showSecretKey, 
      p_keep_letters: payload.keepLetters,
      p_keep_numbers: payload.keepNumbers, 
      p_keep_symbols: payload.keepSymbols, 
      p_force_upper: payload.forceUppercase,
      p_keep_chinese: payload.keepChinese,
      p_web_url: payload.webUrl // ⚡ 支援外部直兌網址
    });
    if (error) throw error;
    await get().fetchCategories();
  },

  deleteCategory: async (id) => {
    const { error } = await supabase.rpc('api_delete_category', { p_id: id });
    if (error) throw error;
    await get().fetchCategories();
  },

  fetchSystemSettings: async () => {
    const { data, error } = await supabase.from('system_settings').select('*');
    if (error) throw error;
    const settings = data.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    set({ systemSettings: settings });
  },

  updateCleanupRules: async (threshold) => {
    const { error } = await supabase.rpc('api_update_system_settings', { p_key: 'cleanup_report_threshold', p_value: threshold.toString() });
    if (error) throw error;
    set((state) => ({ systemSettings: { ...state.systemSettings, cleanup_report_threshold: threshold.toString() } }));
  },

  fetchCodesOfCategory: async () => {
    const { data, error } = await supabase.from('codes').select('*');
    if (error) throw error;
    return data;
  },

  insertCodesBulk: async (payload) => {
    const { data, error } = await supabase.rpc('api_insert_codes_bulk', {
      p_category_id: payload.categoryId,
      p_codes: payload.codesArray,
      p_secrets: payload.secretsArray,
      p_contributor: payload.contributorName,
      p_notes: payload.notesArray || new Array(payload.codesArray.length).fill(null)
    });
    if (error) throw error;
    return data;
  },

  batchSubmitChanges: async (categoryId, items) => {
    const reportedIds = new Set();
    const claimedIds = new Set();
    const localCache = get().getLocalCache();

    items.forEach(item => {
      const compositeKey = `${categoryId}_${item.code}`;
      if (item.isReported) {
        if (localCache[compositeKey] !== 'reported') {
          get().saveToLocalCache(categoryId, item.code, 'reported');
          reportedIds.add(item.id);
        }
      } else if (item.isUsed && localCache[compositeKey] !== 'used') {
        get().saveToLocalCache(categoryId, item.code, 'used');
        claimedIds.add(item.id);
      }
    });

    if (claimedIds.size > 0) {
      const { error } = await supabase.rpc('batch_claim_codes', { code_ids: [...claimedIds] });
      if (error) throw error;
    }

    if (reportedIds.size > 0) {
      const { error } = await supabase.rpc('batch_report_codes', { code_ids: [...reportedIds] });
      if (error) throw error;
    }
  },

  fetchMessages: async () => {
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    set({ messages: data });
  },

  fetchBannedUsers: async () => {
    const { data, error } = await supabase.from('banned_users').select('email');
    if (error) throw error;
    set({ bannedEmails: (data || []).map(b => b.email) });
  },

  createMessage: async (content, userName) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error(getLocaleText('pleaseLoginFirst'));
    const { error } = await supabase.from('messages').insert({
      user_id: user.id, user_name: userName, user_email: user.email, content: content.trim()
    });
    if (error) throw error;
    await get().fetchMessages();
  },

  banUserEmail: async (email) => {
    const { error } = await supabase.from('banned_users').insert({ email });
    if (error) throw error;
    await get().fetchBannedUsers(); 
  },

  removeBanUserEmail: async (email) => {
    const { error } = await supabase.from('banned_users').delete().eq('email', email);
    if (error) throw error;
    await get().fetchBannedUsers(); 
  },

  deleteMessage: async (id) => {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) throw error;
    await get().fetchMessages();
  },

  trackCategoryClick: async (categoryId) => {
    const { error } = await supabase.rpc('api_track_category_click', { p_category_id: categoryId });
    if (error) console.error("流量統計追蹤失敗:", error.message);
  }
}));
