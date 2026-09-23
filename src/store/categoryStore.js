import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

export const useCategoryStore = create((set, get) => ({
  categories: [],
  systemSettings: { cleanup_report_threshold: '20' },

  fetchCategories: async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    set({ categories: data || [] });
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
      p_web_url: payload.webUrl,
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
      p_web_url: payload.webUrl,
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

    const settings = (data || []).reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    set({ systemSettings: settings });
  },

  updateCleanupRules: async (threshold) => {
    const { error } = await supabase.rpc('api_update_system_settings', {
      p_key: 'cleanup_report_threshold',
      p_value: threshold.toString(),
    });

    if (error) throw error;
    set((state) => ({
      systemSettings: {
        ...state.systemSettings,
        cleanup_report_threshold: threshold.toString(),
      },
    }));
  },

  trackCategoryClick: async (categoryId) => {
    const { error } = await supabase.rpc('api_track_category_click', { p_category_id: categoryId });
    if (error) console.error('流量統計追蹤失敗:', error.message);
  },
}));
