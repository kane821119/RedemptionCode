import React, { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import CategoryDetailPage from './pages/CategoryDetailPage';
import LobbyChatPage from './pages/LobbyChatPage';
import Toast from './components/Toast';
import { useAuthStore } from './store/authStore';

export default function App() {
  const initAuth = useAuthStore((state) => state.initAuth);
  const [viewState, setViewState] = useState({ view: 'home', categoryId: null });

  useEffect(() => {
    initAuth();
  }, []);

  const handleNavigateToDetail = (catId) => {
    setViewState({ view: 'detail', categoryId: catId });
  };

  const handleNavigateToChat = () => {
    setViewState({ view: 'chat', categoryId: null });
  };

  const handleNavigateToHome = () => {
    setViewState({ view: 'home', categoryId: null });
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <Toast />
      
      {/* 🚀 精確路由分支渲染控制，確保首頁大廳與留言板能正常顯示 */}
      {viewState.view === 'home' && (
        <HomePage 
          onSelectCategory={handleNavigateToDetail} 
          onNavigateToChat={handleNavigateToChat} 
        />
      )}
      
      {viewState.view === 'detail' && (
        <CategoryDetailPage 
          categoryId={viewState.categoryId} 
          onNavigateBack={handleNavigateToHome} 
        />
      )}
      
      {viewState.view === 'chat' && (
        <LobbyChatPage 
          onNavigateBack={handleNavigateToHome} 
        />
      )}
    </div>
  );
}
