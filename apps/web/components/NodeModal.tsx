'use client';

import type { ReactNode } from 'react';

export function NodeModal({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-2xl h-[min(85vh,720px)] bg-gray-100 rounded-md shadow-modal flex flex-col overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-alpha-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-600 text-lg">{icon}</span>
            <h2 className="text-heading-14 text-gray-1000">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-1000 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="flex-grow min-h-0 flex flex-col">{children}</div>
      </div>
    </div>
  );
}
