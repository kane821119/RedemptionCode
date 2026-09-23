import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

const HomePage = lazy(() => import('../pages/HomePage'));
const CategoryDetailPage = lazy(() => import('../pages/CategoryDetailPage'));
const LobbyChatPage = lazy(() => import('../pages/LobbyChatPage'));

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
    Loading...
  </div>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/category/:routeKey" element={<CategoryDetailPage />} />
        <Route path="/lobby" element={<LobbyChatPage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
}
