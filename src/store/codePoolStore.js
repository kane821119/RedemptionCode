import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { CACHE_KEYS, readStorage, writeStorage } from '../lib/storage';

export const useCodePoolStore = create((set, get) => ({
  codesByCategory: {},

  getLocalCache: () => readStorage(CACHE_KEYS.usedCodes, {}),

  saveToLocalCache: (categoryId, code, statusType) => {
    const pool = get().getLocalCache();
    pool[`${categoryId}_${code}`] = statusType;
    writeStorage(CACHE_KEYS.usedCodes, pool);
  },

  fetchCodesOfCategory: async () => {
    const { data, error } = await supabase
      .from('codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
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
