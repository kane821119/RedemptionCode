import React from 'react';
import { useSystemStore } from '../store/systemStore';

export default function Toast() {
  const toast = useSystemStore((state) => state.toast);

  if (!toast.show) return null;

  const bgStyle = toast.type === 'success' 
    ? 'bg-gradient-to-r from-emerald-500 to-teal-600' 
    : 'bg-gradient-to-r from-rose-500 to-red-600';

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-white font-medium text-sm z-[9999] shadow-xl animate-bounce max-w-[calc(100vw-32px)] text-center ${bgStyle}`}>
      {toast.message}
    </div>
  );
}
