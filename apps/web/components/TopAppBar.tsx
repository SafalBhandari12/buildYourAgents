'use client';

import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useAuthModal } from '@/components/AuthModalContext';
import { getMetrics, type Metrics } from '@/lib/api';

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function formatRemaining(remaining: number, used: number): string {
  return `${formatCompact(remaining)}/${formatCompact(remaining + used)}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

type Session = { user: { name: string } };

export function TopAppBar({ session, refreshKey }: { session: Session | null; refreshKey: number }) {
  const { open } = useAuthModal();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      setMetrics(null);
      return;
    }
    getMetrics()
      .then(setMetrics)
      .catch(() => setMetrics(null));
  }, [refreshKey, session]);

  async function handleSignOut() {
    setMenuOpen(false);
    await authClient.signOut();
  }

  return (
    <header className="bg-background-100 fixed top-0 w-full z-50 border-b border-gray-alpha-300 flex justify-between items-center px-4 md:px-6 h-16">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-gray-1000">dataset</span>
        <span className="text-heading-16 text-gray-1000">RAGFlow</span>
      </div>

      <div className="flex items-center">
        <div className="hidden md:flex items-center gap-6 mr-6 border-r border-gray-alpha-300 pr-6">
          <div className="flex flex-col items-end">
            <span className="text-label-12 uppercase tracking-wider text-gray-600">Chunks</span>
            <span className="text-label-13-mono text-gray-900">
              {metrics ? formatRemaining(metrics.chunksRemaining, metrics.chunksGenerated) : '—'}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-label-12 uppercase tracking-wider text-gray-600">Query</span>
            <span className="text-label-13-mono text-gray-900">
              {metrics ? formatRemaining(metrics.queriesRemaining, metrics.queriesExecuted) : '—'}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-label-12 uppercase tracking-wider text-gray-600">Tokens</span>
            <span className="text-label-13-mono text-gray-900">
              {metrics ? formatRemaining(metrics.tokensRemaining, metrics.tokensUsed) : '—'}
            </span>
          </div>
        </div>

        {!session ? (
          <button onClick={() => open('signin')} className="btn-primary px-4 h-9">
            Sign In
          </button>
        ) : (
          <div className="relative">
            <button
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <div className="w-8 h-8 rounded-full bg-gray-1000 text-background-100 flex items-center justify-center text-button-12">
                {initials(session.user.name)}
              </div>
              <span className="material-symbols-outlined text-gray-600 group-hover:text-gray-1000 transition-colors">
                expand_more
              </span>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-12 z-50 w-48 bg-gray-100 rounded-md shadow-popover py-1">
                  <div className="px-3 py-2 text-copy-13 text-gray-900 truncate">
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
    </header>
  );
}
