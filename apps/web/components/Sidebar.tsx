'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useAuthModal } from '@/components/AuthModalContext';

export type PageId = 'playground' | 'integrations' | 'api-keys' | 'chat-history';

const NAV_ITEMS: { id: PageId; label: string; icon: string }[] = [
  { id: 'playground', label: 'Playground', icon: 'hub' },
  { id: 'integrations', label: 'Integrations', icon: 'api' },
  { id: 'api-keys', label: 'API Keys', icon: 'key' },
  { id: 'chat-history', label: 'Chat History', icon: 'history' },
];

type Session = { user: { name: string } };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Sidebar({
  orientation,
  active,
  onSelect,
  session,
}: {
  orientation: 'vertical' | 'horizontal';
  active: PageId;
  onSelect: (id: PageId) => void;
  session: Session | null;
}) {
  const { open } = useAuthModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const isVertical = orientation === 'vertical';

  async function handleSignOut() {
    setMenuOpen(false);
    await authClient.signOut();
  }

  return (
    <nav
      className={
        isVertical
          ? 'w-56 flex-shrink-0 flex flex-col border-r border-gray-alpha-300 h-full'
          : 'flex-shrink-0 flex items-center border-b border-gray-alpha-300 px-2'
      }
    >
      <div
        className={
          isVertical
            ? 'flex flex-col gap-0.5 p-2 flex-grow overflow-y-auto'
            : 'flex items-center gap-1 py-2 flex-grow overflow-x-auto'
        }
      >
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            data-tour-id={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-label-14 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              active === item.id
                ? 'bg-gray-alpha-200 text-gray-1000'
                : 'text-gray-900 hover:text-gray-1000 hover:bg-gray-alpha-100'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div
        className={
          isVertical ? 'p-2 border-t border-gray-alpha-300 flex-shrink-0' : 'flex-shrink-0 pl-2'
        }
      >
        {!session ? (
          <button
            onClick={() => open('signin')}
            className={`btn-primary px-3 h-9 whitespace-nowrap ${isVertical ? 'w-full' : ''}`}
          >
            Sign In
          </button>
        ) : (
          <div className="relative">
            <button
              className="flex items-center gap-2.5 w-full cursor-pointer group rounded-md px-2 py-1.5 hover:bg-gray-alpha-100 transition-colors"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-1000 text-background-100 flex items-center justify-center text-button-12">
                {initials(session.user.name)}
              </div>
              {isVertical && (
                <span className="text-label-14 font-medium text-gray-1000 truncate flex-grow text-left">
                  {session.user.name}
                </span>
              )}
              <span className="material-symbols-outlined text-gray-600 group-hover:text-gray-1000 transition-colors">
                expand_more
              </span>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div
                  className={`absolute z-50 w-48 bg-gray-100 rounded-md shadow-popover py-1 ${
                    isVertical ? 'left-0 bottom-12' : 'right-0 top-12'
                  }`}
                >
                  <div className="px-3 py-2 text-copy-13 text-gray-1000 truncate">
                    {session.user.name}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-label-14 text-gray-1000 hover:bg-gray-alpha-200 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
