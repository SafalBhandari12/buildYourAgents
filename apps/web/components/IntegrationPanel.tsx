'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ApiError, createApiKey, deleteApiKey, listApiKeys, type ApiKeyItem } from '@/lib/api';
import { useAuthModal } from '@/components/AuthModalContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const TABS = ['cURL', 'Python', 'TypeScript'] as const;
type Tab = (typeof TABS)[number];

const SNIPPETS: Record<Tab, string> = {
  cURL: `# cURL Example
curl -X POST "${API_URL}/api/v1/chat" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "What was our gross margin in Q3?"}'`,
  Python: `# Python Example
import requests

url = "${API_URL}/api/v1/chat"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {
    "message": "What was our gross margin in Q3?"
}

response = requests.post(url, headers=headers, json=data)
print(response.text)`,
  TypeScript: `// TypeScript Example
const response = await fetch("${API_URL}/api/v1/chat", {
  method: "POST",
  headers: {
    Authorization: "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ message: "What was our gross margin in Q3?" }),
});

console.log(await response.text());`,
};

function highlightLine(line: string, key: number): ReactNode {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return (
      <span key={key} className="text-gray-600">
        {line}
        {'\n'}
      </span>
    );
  }

  const parts = line.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g);
  return (
    <span key={key}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-green-700">
            {part}
          </span>
        ) : (
          <span key={i} className="text-gray-1000">
            {part}
          </span>
        ),
      )}
      {'\n'}
    </span>
  );
}

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

export function IntegrationPanel({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { open } = useAuthModal();
  const [activeTab, setActiveTab] = useState<Tab>('cURL');
  const [copied, setCopied] = useState(false);
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  async function refreshKeys() {
    setIsLoadingKeys(true);
    try {
      const list = await listApiKeys();
      setKeys(list.sort((a, b) => b.createdAt - a.createdAt));
    } catch {
      setError('Failed to load API keys.');
    } finally {
      setIsLoadingKeys(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setKeys([]);
      setIsLoadingKeys(false);
      return;
    }
    refreshKeys();
  }, [isAuthenticated]);

  async function handleCopy() {
    await navigator.clipboard.writeText(SNIPPETS[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleOpenCreateKey() {
    if (!isAuthenticated) {
      open('signin');
      return;
    }
    setIsCreateOpen(true);
  }

  async function handleCreateKey() {
    if (!newKeyName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      const created = await createApiKey(newKeyName.trim());
      setRevealedKey(created.key);
      setIsCreateOpen(false);
      setNewKeyName('');
      await refreshKeys();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create API key.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteKey(id: string) {
    try {
      await deleteApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete API key.');
    }
  }

  return (
    <section className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-alpha-200">
        <span className="material-symbols-outlined text-gray-600 text-lg">api</span>
        <h2 className="text-heading-14 text-gray-1000">Integration</h2>
      </div>

      <div className="px-4 pb-4 flex-grow overflow-y-auto flex flex-col gap-5">
        {error && (
          <div className="text-copy-13 text-red-900 bg-red-100 rounded-sm px-3 py-2">{error}</div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-copy-13 text-gray-600 leading-relaxed">
            Send a POST request to your agent&rsquo;s endpoint to interact programmatically.
          </p>
          <div className="bg-background-100 rounded-md overflow-hidden flex flex-col">
            <div className="flex items-center">
              <div className="flex items-center overflow-x-auto min-w-0">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 px-3 py-2 text-xs text-label-12-mono transition-colors border-b-2 whitespace-nowrap ${
                      activeTab === tab
                        ? 'text-gray-1000 border-gray-1000'
                        : 'text-gray-600 border-transparent hover:text-gray-1000'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex-grow" />
              <button
                onClick={handleCopy}
                className="flex-shrink-0 whitespace-nowrap text-gray-600 hover:text-gray-1000 transition-colors flex items-center gap-1 px-3"
              >
                <span className="material-symbols-outlined text-xs">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span className="text-label-12">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="px-3 pb-3 overflow-x-auto">
              <code className="font-mono text-xs text-gray-1000 whitespace-pre-wrap">
                {SNIPPETS[activeTab].split('\n').map((line, i) => highlightLine(line, i))}
              </code>
            </pre>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-label-12 uppercase tracking-wider text-gray-600 truncate min-w-0">
              API Keys
            </h3>
            <button
              onClick={handleOpenCreateKey}
              className="flex-shrink-0 whitespace-nowrap btn-primary px-3 py-1.5 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Create API Key
            </button>
          </div>

          {isLoadingKeys && <p className="text-copy-13 text-gray-600 py-2">Loading…</p>}

          {!isLoadingKeys && keys.length === 0 && (
            <p className="text-copy-13 text-gray-600 py-2">
              {isAuthenticated
                ? 'No API keys yet. Create one to call your agent programmatically.'
                : 'Sign in to create and manage API keys.'}
            </p>
          )}

          <div className="flex flex-col divide-y divide-gray-alpha-200">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between py-2.5 group">
                <div className="flex flex-col min-w-0">
                  <span className="text-label-13-mono text-gray-1000 truncate">{key.name}</span>
                  <span className="text-copy-13 text-gray-600">
                    Created {formatDate(key.createdAt)} • Last used {formatRelative(key.lastUsedAt)}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="material-symbols-outlined text-gray-600 hover:text-red-700 cursor-pointer text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm bg-gray-100 rounded-md shadow-modal p-6 flex flex-col gap-4">
            <h3 className="text-heading-16 text-gray-1000">Create API Key</h3>
            <label className="flex flex-col gap-1">
              <span className="text-label-14 text-gray-900">Key Name</span>
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
                disabled={isCreating || !newKeyName.trim()}
                onClick={handleCreateKey}
              >
                {isCreating ? 'Creating…' : 'Create API Key'}
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
            <div className="flex items-center gap-2 bg-background-100 rounded-sm px-3 py-2">
              <code className="font-mono text-xs text-gray-1000 truncate flex-grow">{revealedKey}</code>
              <button
                className="material-symbols-outlined text-gray-600 hover:text-gray-1000 text-sm"
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
