import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { CACHE_KEYS, readStorage, writeStorage } from '../lib/storage';

const PUBLIC_CODE_COLUMNS = 'id, code, secret_key, contributor, report_count, created_at, claim_count, note';

export const useCodePoolStore = create((set, get) => ({
  codesByCategory: {},

  getLocalCache: () => readStorage(CACHE_KEYS.usedCodes, {}),

  saveToLocalCache: (categoryId, code, statusType) => {
    const pool = get().getLocalCache();
    pool[`${categoryId}_${code}`] = statusType;
    writeStorage(CACHE_KEYS.usedCodes, pool);
  },

  fetchCodesOfCategory: async (categoryId, includeAdminInfo = false) => {
    const { data, error } = await supabase
      .from('codes')
      .select(includeAdminInfo ? `${PUBLIC_CODE_COLUMNS}, publisher_id` : PUBLIC_CODE_COLUMNS)
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const codes = data || [];
    if (!includeAdminInfo || codes.length === 0) return codes;

    const bannedPublisherIds = new Set((await get().fetchBannedCodePublishers()).map((publisher) => publisher.user_id));
    return codes.map((code) => ({
      ...code,
      publisher_banned: bannedPublisherIds.has(code.publisher_id),
    }));
  },

  fetchCodePublisherCounts: async () => {
    const { data, error } = await supabase.rpc('api_get_code_publisher_counts');
    if (error) throw error;
    return Object.fromEntries((data || []).map(({ publisher_id, code_count }) => [publisher_id, Number(code_count)]));
  },

  fetchBannedCodePublishers: async () => {
    const { data, error } = await supabase.rpc('api_list_banned_code_publishers');
    if (error) throw error;
    return data || [];
  },

  banCodePublisher: async (publisherId, categoryId) => {
    const { error } = await supabase.rpc('api_ban_code_publisher', {
      p_publisher_id: publisherId,
      p_category_id: categoryId,
    });
    if (error) throw error;
  },

  unbanCodePublisher: async (publisherId) => {
    const { error } = await supabase
      .from('banned_users')
      .delete()
      .eq('user_id', publisherId);
    if (error) throw error;
  },

  insertCodesBulk: async (payload) => {
    const { data, error } = await supabase.rpc('api_insert_codes_bulk', {
      p_category_id: payload.categoryId,
      p_codes: payload.codesArray,
      p_secrets: payload.secretsArray,
      p_contributor: payload.contributorName,
      p_notes: payload.notesArray || new Array(payload.codesArray.length).fill(null),
    });

    if (error) throw error;
    return data;
  },

  deleteCode: async (codeId) => {
    const { error } = await supabase.from('codes').delete().eq('id', codeId);
    if (error) throw error;
  },

  batchSubmitChanges: async (categoryId, items) => {
    const reportedIds = new Set();
    const claimedIds = new Set();
    const localCache = get().getLocalCache();

    items.forEach((item) => {
      const compositeKey = `${categoryId}_${item.code}`;

      if (item.isReported) {
        localCache[compositeKey] = 'reported';
        get().saveToLocalCache(categoryId, item.code, 'reported');
        reportedIds.add(item.id);
      } else if (item.isUsed) {
        localCache[compositeKey] = 'used';
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
}));
