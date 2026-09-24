import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

const isMissingTableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('could not find the table') ||
    (message.includes('relation') && message.includes('does not exist')) ||
    message.includes('schema cache');
};

export const useCategoryStore = create((set, get) => ({
  categories: [],
  announcements: [],
  pendingCategoryQueue: [],

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

  fetchPendingCategoryQueue: async () => {
    try {
      const { data, error } = await supabase
        .from('pending_category_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        if (isMissingTableError(error)) {
          set({ pendingCategoryQueue: [] });
          return [];
        }
        throw error;
      }

      const queue = (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        showSecretKey: item.show_secret_key ?? false,
        keepLetters: item.keep_letters ?? true,
        keepNumbers: item.keep_numbers ?? true,
        keepSymbols: item.keep_symbols ?? false,
        forceUppercase: item.force_uppercase ?? true,
        keepChinese: item.keep_chinese ?? false,
        webUrl: item.web_url ?? '',
        submittedBy: item.submitted_by ?? 'user',
        createdAt: item.created_at ?? new Date().toISOString(),
        supportCount: item.support_count ?? 0,
      }));

      set({ pendingCategoryQueue: queue });
      return queue;
    } catch (error) {
      if (isMissingTableError(error)) {
        set({ pendingCategoryQueue: [] });
        return [];
      }
      throw error;
    }
  },

  supportPendingCategoryRequest: async (requestId) => {
    const { data, error } = await supabase.rpc('api_support_pending_category_request', {
      p_request_id: requestId,
    });
    if (error) throw error;
    await get().fetchPendingCategoryQueue();
    return data;
  },

  submitPendingCategoryRequest: async (payload) => {
    const insertPayload = {
      name: payload.name,
      show_secret_key: payload.showSecretKey,
      keep_letters: payload.keepLetters,
      keep_numbers: payload.keepNumbers,
      keep_symbols: payload.keepSymbols,
      force_uppercase: payload.forceUppercase,
      keep_chinese: payload.keepChinese,
      web_url: payload.webUrl,
      status: 'pending',
      submitted_by: 'user',
    };

    try {
      const { data, error } = await supabase
        .from('pending_category_requests')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          throw new Error('資料表 pending_category_requests 尚未建立，請先在 Supabase 建立這張表。');
        }
        throw error;
      }

      await get().fetchPendingCategoryQueue();
      return data;
    } catch (error) {
      if (isMissingTableError(error)) {
        throw new Error('資料表 pending_category_requests 尚未建立，請先在 Supabase 建立這張表。');
      }
      throw error;
    }
  },

  approvePendingCategoryRequest: async (requestId, payload) => {
    const { data: userData } = await supabase.auth.getUser();
    const reviewerId = userData?.user?.id ?? null;

    await get().createCategory(payload);

    try {
      const { error } = await supabase
        .from('pending_category_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewerId,
        })
        .eq('id', requestId);

      if (error) {
        if (isMissingTableError(error)) {
          throw new Error('資料表 pending_category_requests 尚未建立，請先在 Supabase 建立這張表。');
        }
        throw error;
      }

      await get().fetchPendingCategoryQueue();
    } catch (error) {
      if (isMissingTableError(error)) {
        throw new Error('資料表 pending_category_requests 尚未建立，請先在 Supabase 建立這張表。');
      }
      throw error;
    }
  },

  rejectPendingCategoryRequest: async (requestId) => {
    const { data: userData } = await supabase.auth.getUser();
    const reviewerId = userData?.user?.id ?? null;

    try {
      const { error } = await supabase
        .from('pending_category_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewerId,
        })
        .eq('id', requestId);

      if (error) {
        if (isMissingTableError(error)) {
          throw new Error('資料表 pending_category_requests 尚未建立，請先在 Supabase 建立這張表。');
        }
        throw error;
      }

      await get().fetchPendingCategoryQueue();
    } catch (error) {
      if (isMissingTableError(error)) {
        throw new Error('資料表 pending_category_requests 尚未建立，請先在 Supabase 建立這張表。');
      }
      throw error;
    }
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
