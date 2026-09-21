import React, { useState } from 'react';
import HomePage from './pages/HomePage.jsx';
import CategoryDetailPage from './pages/CategoryDetailPage.jsx';

export default function App() {
  const [viewState, setViewState] = useState({ view: 'home', categoryId: null });

  const handleNavigateToDetail = (catId) => {
    setViewState({ view: 'detail', categoryId: catId });
  };

  const handleNavigateToHome = () => {
    setViewState({ view: 'home', categoryId: null });
  };

  return (
    <div>
      {viewState.view === 'home' ? (
        <HomePage onSelectCategory={handleNavigateToDetail} />
      ) : (
        <CategoryDetailPage 
          categoryId={viewState.categoryId} 
          onNavigateBack={handleNavigateToHome} 
        />
      )}
    </div>
  );
}
