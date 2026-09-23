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

      const pendingRedirect = sessionStorage.getItem('auth_redirect_target');
      if (pendingRedirect) {
        sessionStorage.removeItem('auth_redirect_target');
        const nextUrl = pendingRedirect.startsWith('http') ? pendingRedirect : `${window.location.origin}${pendingRedirect}`;
        window.history.pushState({}, '', nextUrl);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } else {
      set({ user: null, userName: null, isAdmin: false, loading: false });
    }

    // 監聽身份狀態異動（如：登入、登出、權限變更）
    supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        const { data: isAdmin } = await supabase.rpc('is_admin');
        const name = session.user.user_metadata?.full_name || getLocaleText('loggedInUser');
        set({ user: session.user, userName: name, isAdmin });

        const pendingRedirect = sessionStorage.getItem('auth_redirect_target');
        if (pendingRedirect) {
          sessionStorage.removeItem('auth_redirect_target');
          const nextUrl = pendingRedirect.startsWith('http') ? pendingRedirect : `${window.location.origin}${pendingRedirect}`;
          window.history.pushState({}, '', nextUrl);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      } else {
        set({ user: null, userName: null, isAdmin: false });
      }
    });
  },

  // 保持目前頁面不變，登入完成後回到現在所在頁面
  loginWithGoogle: async () => {
    const currentPagePath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    sessionStorage.setItem('auth_redirect_target', currentPagePath || '/home');

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
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
