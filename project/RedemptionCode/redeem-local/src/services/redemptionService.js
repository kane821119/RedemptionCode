import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const createSafeClient = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("⚠️ 警告: 未組態連線憑證，目前為展示模式。");
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
};

export const supabase = createSafeClient();

const checkConnection = () => {
  if (!supabase) throw new Error("前端尚未組態正確的 .env 憑證！");
};

export const redemptionService = {
  // 獲取所有種類清單
  async getCategories() {
    checkConnection();
    const { data, error } = await supabase.from('redemption_categories').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  // 新增種類
  async addCategory(id, name) {
    checkConnection();
    const { error } = await supabase.rpc('insert_category', { p_id: id, p_name: name });
    if (error) throw error;
    return true;
  },

  // 修改種類名稱
  async editCategory(id, name) {
    checkConnection();
    const { error } = await supabase.rpc('update_category', { p_id: id, p_name: name });
    if (error) throw error;
    return true;
  },

  // 刪除種類
  async removeCategory(id) {
    checkConnection();
    const { error } = await supabase.rpc('delete_category', { p_id: id });
    if (error) throw error;
    return true;
  },

  // 新增發行兌換碼
  async insertCode({ categoryId, code, password = null, expiryDate = null, metadata = {}, login_date = null, login_user = null }) {
    checkConnection();
    const { error } = await supabase.rpc('insert_redemption_code', {
      p_category_id: categoryId, p_code: code, p_password: password, p_expiry_date: expiryDate, p_metadata: metadata, p_login_date: login_date, p_login_user: login_user
    });
    if (error) throw error;
    return true;
  },

  // 獲取可用清單（單純拉取主表，過濾交給前端 LocalStorage）
  async getFilteredCodes({ categoryId, startDate = null, endDate = null, maxFailedAttempts = 20, username = null }) {
    checkConnection();
    const { data, error } = await supabase.rpc('get_filtered_redemption_codes', {
      p_category_id: categoryId,
      p_start_date: startDate ? new Date(startDate).toISOString() : null,
      p_end_date: endDate ? new Date(endDate).toISOString() : null,
      p_max_failed_attempts: maxFailedAttempts,
      p_username: username || null
    });
    if (error) throw error;
    return data;
  },

  // 僅保留檢舉過期的後端通訊（已使用狀態將完全改由 LocalStorage 處理）
  async submitReport({ categoryId, code, username = null, reportType }) {
    checkConnection();
    const { error } = await supabase.rpc('submit_user_report', {
      p_category_id: categoryId, p_code: code, p_username: username || null, p_report_type: reportType
    });
    if (error) throw error;
    return true;
  }
};
