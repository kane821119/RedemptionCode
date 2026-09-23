import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

export const useCategoryStore = create((set, get) => ({
  categories: [],
  announcements: [],
  systemSettings: { cleanup_report_threshold: '10', cleanup_report_time: '00:00' },

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
    set({ systemSettings: { cleanup_report_threshold: '10', cleanup_report_time: '00:00', announcement_text: '', ...settings } });
  },

  updateCleanupRules: async (threshold, timePoint = '00:00') => {
    const normalizedThreshold = Math.max(1, Number(threshold) || 10).toString();
    const normalizedTime = timePoint || '00:00';

    const { error: thresholdError } = await supabase.rpc('api_update_system_settings', {
      p_key: 'cleanup_report_threshold',
      p_value: normalizedThreshold,
    });

    if (thresholdError) throw thresholdError;

    const { error: timeError } = await supabase.rpc('api_update_system_settings', {
      p_key: 'cleanup_report_time',
      p_value: normalizedTime,
    });

    if (timeError) throw timeError;

    set((state) => ({
      systemSettings: {
        ...state.systemSettings,
        cleanup_report_threshold: normalizedThreshold,
        cleanup_report_time: normalizedTime,
      },
    }));
  },

  fetchAnnouncements: async () => {
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    set({ announcements: data || [] });
  },

  createAnnouncement: async (content) => {
    const normalizedText = String(content ?? '').trim();
    if (!normalizedText) throw new Error('公告內容不能為空');

    const { error } = await supabase.from('announcements').insert({
      content: normalizedText,
    });

    if (error) throw error;
    await get().fetchAnnouncements();
  },

  updateAnnouncement: async (id, content) => {
    const normalizedText = String(content ?? '').trim();
    if (!normalizedText) throw new Error('公告內容不能為空');

    const { error } = await supabase.from('announcements').update({
      content: normalizedText,
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    if (error) throw error;
    await get().fetchAnnouncements();
  },

  deleteAnnouncement: async (id) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
    await get().fetchAnnouncements();
  },

  trackCategoryClick: async (categoryId) => {
    const { error } = await supabase.rpc('api_track_category_click', { p_category_id: categoryId });
    if (error) console.error('流量統計追蹤失敗:', error.message);
  },
}));
