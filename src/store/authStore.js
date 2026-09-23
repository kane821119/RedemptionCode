import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { getLocaleText } from '../i18n/languageStore';

export const useAuthStore = create((set, get) => ({
  user: null,
  userName: null,
  isAdmin: false,
  loading: true,

  initAuth: async () => {
    // 獲取當前登入者
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: isAdmin } = await supabase.rpc('is_admin');
      // 僅提取 full_name 作為顯示稱呼，絕不在前端儲存與展示 email 資訊
      const name = user.user_metadata?.full_name || getLocaleText('loggedInUser');
      set({ user, userName: name, isAdmin, loading: false });
    } else {
      set({ user: null, userName: null, isAdmin: false, loading: false });
    }

    // 監聽身份狀態異動（如：登入、登出、權限變更）
    supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        const { data: isAdmin } = await supabase.rpc('is_admin');
        const name = session.user.user_metadata?.full_name || getLocaleText('loggedInUser');
        set({ user: session.user, userName: name, isAdmin });
      } else {
        set({ user: null, userName: null, isAdmin: false });
      }
    });
  },

  // ⚡ 終極完全體：自動適配 Netlify 網址，並強制 Google 跳出帳號選擇器切換測試新帳號
  loginWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        // 1. 自動抓取當前網址（本地是 localhost，線上自動變 Netlify 網址），發布再也不會掛掉
        redirectTo: window.location.origin,
        queryParams: {
          // 2. 強制 Google 每次登入都要彈出「請選擇帳號」的清單視窗
          prompt: 'select_account', 
          access_type: 'offline'
        }
      }
    });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, userName: null, isAdmin: false });
  }
}));
