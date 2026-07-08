'use client';

import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, createApiKey, deleteApiKey, listApiKeys } from '@/lib/api';
import { useAuthModal } from '@/components/AuthModalContext';

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(ms: number | null): string {
  if (ms === null) return 'Never';
  const diffMs = Date.now() - ms;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatExpiry(ms: number | null): ReactNode {
  if (ms === null) return <span className="text-gray-600">Never</span>;
  const isExpired = ms < Date.now();
  return (
    <span className={isExpired ? 'text-red-700' : 'text-gray-600'}>
      {isExpired ? 'Expired ' : ''}
      {formatDate(ms)}
    </span>
  );
}

export function ApiKeysPage({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { open } = useAuthModal();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const { data: keys = [], isLoading: isLoadingKeys, isError: isLoadError } = useQuery({
    queryKey: ['api-keys'],
    queryFn: listApiKeys,
    enabled: isAuthenticated,
    select: (list) => [...list].sort((a, b) => b.createdAt - a.createdAt),
  });

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (created) => {
      setRevealedKey(created.key);
      setIsCreateOpen(false);
      setNewKeyName('');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to create API key.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to delete API key.'),
  });

  function handleOpenCreateKey() {
    if (!isAuthenticated) {
      open('signin');
      return;
    }
    setIsCreateOpen(true);
  }

  function handleCreateKey() {
    if (!newKeyName.trim()) return;
    setError(null);
    createMutation.mutate(newKeyName.trim());
  }

  function handleDeleteKey(id: string) {
    setError(null);
    deleteMutation.mutate(id);
  }

  return (
    <section className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-alpha-400 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-gray-600 text-lg">key</span>
          <h2 className="text-heading-16 text-gray-1000">API Keys</h2>
          {!isLoadingKeys && keys.length > 0 && (
            <span className="text-label-12-mono text-gray-900 bg-gray-100 border border-gray-alpha-400 rounded-full px-2 py-0.5">
              {keys.length}
            </span>
          )}
        </div>
        <button
          onClick={handleOpenCreateKey}
          className="flex-shrink-0 whitespace-nowrap btn-primary px-3 py-1.5 flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Create API Key
        </button>
      </div>

      <div className="px-6 py-5 flex-grow overflow-y-auto">
        {(error || isLoadError) && (
          <div className="text-copy-13 text-red-900 bg-red-100 rounded-sm px-3 py-2 mb-4">
            {error ?? 'Failed to load API keys.'}
          </div>
        )}

        {isLoadingKeys && <p className="text-copy-13 text-gray-900 py-2">Loading…</p>}

        {!isLoadingKeys && keys.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-16 max-w-sm mx-auto">
            <span className="material-symbols-outlined text-gray-600 text-3xl">key_off</span>
            <p className="text-copy-13 text-gray-900 leading-relaxed">
              {isAuthenticated
                ? 'No API keys yet. Create one to call your agent programmatically from the Integrations page.'
                : 'Sign in to create and manage API keys.'}
            </p>
            {isAuthenticated && (
              <button
                onClick={handleOpenCreateKey}
                className="btn-primary px-3 py-1.5 flex items-center gap-1 mt-1"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Create API Key
              </button>
            )}
          </div>
        )}

        {!isLoadingKeys && keys.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-alpha-400">
                  <th className="text-left text-label-12 uppercase tracking-wider text-gray-600 font-normal py-2 pr-4">
                    Name
                  </th>
                  <th className="text-left text-label-12 uppercase tracking-wider text-gray-600 font-normal py-2 pr-4">
                    Key
                  </th>
                  <th className="text-left text-label-12 uppercase tracking-wider text-gray-600 font-normal py-2 pr-4">
                    Created
                  </th>
                  <th className="text-left text-label-12 uppercase tracking-wider text-gray-600 font-normal py-2 pr-4">
                    Last Used
                  </th>
                  <th className="text-left text-label-12 uppercase tracking-wider text-gray-600 font-normal py-2 pr-4">
                    Expires
                  </th>
                  <th className="w-10 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-alpha-400">
                {keys.map((key) => (
                  <tr key={key.id} className="group">
                    <td className="py-3 pr-4 text-label-14 text-gray-1000 font-medium">{key.name}</td>
                    <td className="py-3 pr-4">
                      <code className="font-mono text-xs text-gray-900 bg-gray-100 border border-gray-alpha-400 rounded-sm px-2 py-1">
                        {key.prefix}&hellip;
                      </code>
                    </td>
                    <td className="py-3 pr-4 text-copy-13 text-gray-600">{formatDate(key.createdAt)}</td>
                    <td className="py-3 pr-4 text-copy-13 text-gray-600">
                      {formatRelative(key.lastUsedAt)}
                    </td>
                    <td className="py-3 pr-4 text-copy-13">{formatExpiry(key.expiresAt)}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        className="material-symbols-outlined text-gray-600 hover:text-red-700 cursor-pointer text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm bg-gray-100 rounded-md shadow-modal p-6 flex flex-col gap-4">
            <h3 className="text-heading-16 text-gray-1000">Create API Key</h3>
            <label className="flex flex-col gap-1">
              <span className="text-label-14 text-gray-1000">Key Name</span>
              <input
                autoFocus
                className="input-field"
                placeholder="Production Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
              />
            </label>
            <div className="flex justify-end gap-2 mt-2">
              <button className="btn-tertiary px-3 py-2" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary px-3 py-2 disabled:opacity-50"
                disabled={createMutation.isPending || !newKeyName.trim()}
                onClick={handleCreateKey}
              >
                {createMutation.isPending ? 'Creating…' : 'Create API Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {revealedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md bg-gray-100 rounded-md shadow-modal p-6 flex flex-col gap-4">
            <h3 className="text-heading-16 text-gray-1000">API Key Created</h3>
            <p className="text-copy-13 text-amber-700">
              Copy this key now. For your security, it won&rsquo;t be shown again.
            </p>
            <div className="flex items-center gap-2 bg-gray-200 border border-gray-alpha-400 rounded-sm px-3 py-2">
              <code className="font-mono text-xs text-gray-1000 truncate flex-grow">{revealedKey}</code>
              <button
                className="material-symbols-outlined text-gray-600 hover:text-gray-1000 text-sm transition-colors"
                onClick={() => navigator.clipboard.writeText(revealedKey)}
              >
                content_copy
              </button>
            </div>
            <button className="btn-primary px-3 py-2 self-end" onClick={() => setRevealedKey(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
