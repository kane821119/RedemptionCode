import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { getLocaleText } from '../i18n/languageStore';

export const useChatStore = create((set, get) => ({
  messages: [],
  bannedEmails: [],

  fetchMessages: async () => {
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    set({ messages: data || [] });
  },

  fetchBannedUsers: async () => {
    const { data, error } = await supabase.from('banned_users').select('email');
    if (error) throw error;
    set({ bannedEmails: (data || []).map((item) => item.email) });
  },

  createMessage: async (content, userName) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error(getLocaleText('pleaseLoginFirst'));

    const { error } = await supabase.from('messages').insert({
      user_id: user.id,
      user_name: userName,
      user_email: user.email,
      content: content.trim(),
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
}));
