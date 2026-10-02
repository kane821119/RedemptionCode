import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { getLocaleText } from '../i18n/languageStore';

const isMissingTableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('could not find the table') ||
    (message.includes('relation') && message.includes('does not exist'));
};

const isMissingFunctionError = (error, functionName) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes(functionName.toLowerCase()) && (
    message.includes('could not find the function') ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  );
};

const deletePendingCategoryRequest = async (requestId) => {
  const { error } = await supabase.rpc('api_delete_pending_category_request', {
    p_request_id: requestId,
  });

  if (error) {
    if (isMissingFunctionError(error, 'api_delete_pending_category_request')) {
      throw new Error(getLocaleText('missingAdminDeletePendingMigration'), { cause: error });
    }
    throw error;
  }
};

export const useCategoryStore = create((set, get) => ({
  categories: [],
  announcements: [],
  pendingCategoryQueue: [],

  fetchCategories: async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, show_secret_key, keep_letters, keep_numbers, keep_symbols, force_uppercase, keep_chinese, web_url, total_clicks')
      .order('name');
    if (error) throw error;

    set({ categories: data || [] });
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

  fetchPendingCategoryQueue: async (includeSubmitterInfo = false) => {
    const { data, error } = await supabase.rpc('api_get_pending_category_queue', {
      p_include_admin_info: includeSubmitterInfo,
    });

    if (error) {
      if (isMissingFunctionError(error, 'api_get_pending_category_queue')) {
        throw new Error(getLocaleText('missingPendingCategoryRpcMigration'), { cause: error });
      }
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
      submittedByName: item.submitted_by_name ?? null,
      submittedByUserId: item.submitted_by_user_id ?? null,
      submittedByEmail: item.submitted_by_email ?? null,
      createdAt: item.created_at ?? new Date().toISOString(),
      supportCount: item.support_count ?? 0,
    }));

    set({ pendingCategoryQueue: queue });
    return queue;
  },

  supportPendingCategoryRequest: async (requestId, includeSubmitterInfo = false) => {
    const { data, error } = await supabase.rpc('api_support_pending_category_request', {
      p_request_id: requestId,
    });
    if (error) throw error;
    await get().fetchPendingCategoryQueue(includeSubmitterInfo);
    return data;
  },

  submitPendingCategoryRequest: async (payload, includeSubmitterInfo = false) => {
    try {
      const { data, error } = await supabase.rpc('api_submit_pending_category_request', {
        p_name: payload.name,
        p_web_url: payload.webUrl,
        p_show_secret_key: payload.showSecretKey,
        p_keep_letters: payload.keepLetters,
        p_keep_numbers: payload.keepNumbers,
        p_keep_symbols: payload.keepSymbols,
        p_force_uppercase: payload.forceUppercase,
        p_keep_chinese: payload.keepChinese,
      });

      if (error) {
        if (isMissingTableError(error)) {
          throw new Error(getLocaleText('pendingCategoryTableMissing'));
        }
        throw error;
      }

      await get().fetchPendingCategoryQueue(includeSubmitterInfo);
      return data;
    } catch (error) {
      if (isMissingTableError(error)) {
        throw new Error(getLocaleText('pendingCategoryTableMissing'), { cause: error });
      }
      throw error;
    }
  },

  approvePendingCategoryRequest: async (requestId, includeSubmitterInfo = false) => {
    const { data, error } = await supabase.rpc('api_approve_pending_category_request', {
      p_request_id: requestId,
    });
    if (error) throw error;

    set((state) => ({
      pendingCategoryQueue: state.pendingCategoryQueue.filter((item) => item.id !== requestId),
    }));
    await get().fetchCategories();
    await get().fetchPendingCategoryQueue(includeSubmitterInfo).catch(() => {});
    return data;
  },

  rejectPendingCategoryRequest: async (requestId, includeSubmitterInfo = false) => {
    await deletePendingCategoryRequest(requestId);
    set((state) => ({
      pendingCategoryQueue: state.pendingCategoryQueue.filter((item) => item.id !== requestId),
    }));
    await get().fetchPendingCategoryQueue(includeSubmitterInfo).catch(() => {});
  },

  fetchAnnouncements: async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, content, created_at')
      .order('created_at', { ascending: false });
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
