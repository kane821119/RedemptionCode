import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const CryptoCodeService = {
  CACHE_KEY: 'used_codes_pool_v2',

  getLocalCache() {
    return JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}');
  },

  saveToLocalCache(code, statusType) {
    const pool = this.getLocalCache();
    pool[code] = statusType;
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(pool));
  },

  async fetchCategories() {
    const { data: remoteData, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return remoteData;
  },

  async createCategory(payload) {
    const { error } = await supabase.rpc('api_create_category', {
      p_name: payload.name, p_show_secret: payload.showSecretKey, p_keep_letters: payload.keepLetters,
      p_keep_numbers: payload.keepNumbers, p_keep_symbols: payload.keepSymbols, p_force_upper: payload.forceUppercase
    });
    if (error) throw error;
  },

  async updateCategory(id, payload) {
    const { error } = await supabase.rpc('api_update_category', {
      p_id: id, p_name: payload.name, p_show_secret: payload.showSecretKey, p_keep_letters: payload.keepLetters,
      p_keep_numbers: payload.keepNumbers, p_keep_symbols: payload.keepSymbols, p_force_upper: payload.forceUppercase
    });
    if (error) throw error;
  },

  async deleteCategory(id) {
    const { error } = await supabase.rpc('api_delete_category', { p_id: id });
    if (error) throw error;
  },

  async fetchSystemSettings() {
    const { data: remoteData, error } = await supabase.from('system_settings').select('*');
    if (error) throw error;
    return remoteData.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
  },

  async updateCleanupRules(reportThreshold) {
    const { error } = await supabase.rpc('api_update_system_settings', { p_key: 'cleanup_report_threshold', p_value: reportThreshold.toString() });
    if (error) throw error;
  },

  async fetchAvailableCodes({ startDate = '', endDate = '', reportThreshold = 20 }) {
    let query = supabase.from('codes').select('*, categories(*)');
    if (startDate) query = query.gte('created_at', new Date(`${startDate}T00:00:00`).toISOString());
    if (endDate) query = query.lte('created_at', new Date(`${endDate}T23:59:59`).toISOString());
    const { data: remoteCodes, error } = await query;
    if (error) throw error;
    return remoteCodes.filter(item => item.report_count < reportThreshold);
  },

  async insertCodesBulk({ categoryId, codesArray, secretsArray, contributorName }) {
    const { error } = await supabase.rpc('api_insert_codes_bulk', {
      p_category_id: categoryId, p_codes: codesArray, p_secrets: secretsArray, p_contributor: contributorName
    });
    if (error) throw error;
  },

  // 🔄 終極修正：打破登入障礙！只要有勾選檢舉，不論是否登入，一律收集發送至雲端累加
  async batchSubmitChanges(items) {
    const reportedIds = [];
    const localCache = this.getLocalCache();

    items.forEach(item => {
      if (item.isReported) {
        // 關鍵防禦：只有當這個瀏覽器「過去從來沒有檢舉過這組代碼」時，才允許去雲端 +1
        if (localCache[item.code] !== 'reported') {
          this.saveToLocalCache(item.code, 'reported'); // 先就地鎖死本地快取，防止同瀏覽器重複灌票
          reportedIds.push(item.id);                    // 🔄 修正：無條件收集，不再受到 if (user) 的封鎖限制！
        }
      } else if (item.isUsed && localCache[item.code] !== 'used') {
        this.saveToLocalCache(item.code, 'used');
      }
    });

    // 呼叫全新的安全定義檢舉 RPC
    if (reportedIds.length > 0) {
      const { error } = await supabase.rpc('batch_report_codes', { code_ids: reportedIds });
      if (error) throw error;
    }
  },

  async checkIsAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase.from('admin_users').select('id').eq('email', user.email).maybeSingle();
    return !error && !!data;
  }
};
