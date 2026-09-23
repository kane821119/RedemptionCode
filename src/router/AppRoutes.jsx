import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import CategoryDetailPage from '../pages/CategoryDetailPage';
import LobbyChatPage from '../pages/LobbyChatPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/category/:routeKey" element={<CategoryDetailPage />} />
      <Route path="/lobby" element={<LobbyChatPage />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
