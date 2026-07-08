'use client';

import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, createApiKey } from '@/lib/api';
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

function CopyableRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2 bg-gray-200 border border-gray-alpha-400 rounded-sm px-3 py-2 w-fit max-w-full">
      <code className="font-mono text-xs text-gray-1000 truncate min-w-0">{value}</code>
      <button
        onClick={handleCopy}
        className="material-symbols-outlined text-gray-600 hover:text-gray-1000 text-sm flex-shrink-0 transition-colors"
      >
        {copied ? 'check' : 'content_copy'}
      </button>
    </div>
  );
}

export function IntegrationsPage({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { open } = useAuthModal();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('cURL');
  const [copied, setCopied] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  function handleCreateKey() {
    if (!newKeyName.trim()) return;
    setError(null);
    createMutation.mutate(newKeyName.trim());
  }

  return (
    <section className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-alpha-400 flex-shrink-0 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-1000 text-lg">api</span>
            <h2 className="text-heading-16 text-gray-1000">Integrations</h2>
          </div>
          <p className="text-copy-13 text-gray-900 leading-relaxed mt-1">
            Call your agent programmatically from any backend or script.
          </p>
        </div>
        <button
          onClick={handleOpenCreateKey}
          className="flex-shrink-0 whitespace-nowrap btn-primary px-3 py-1.5 flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Create API Key
        </button>
      </div>

      <div className="px-6 py-5 flex-grow overflow-y-auto flex flex-col gap-6 w-full">
        {error && (
          <div className="text-copy-13 text-red-900 bg-red-100 rounded-sm px-3 py-2">{error}</div>
        )}

        <div className="flex flex-col gap-2">
          <h3 className="text-label-12 uppercase tracking-wider text-gray-600">Base URL</h3>
          <CopyableRow value={`${API_URL}/api/v1`} />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-label-12 uppercase tracking-wider text-gray-600">Authentication</h3>
          <p className="text-copy-13 text-gray-900 leading-relaxed">
            Every request must include your API key as a Bearer token in the{' '}
            <code className="font-mono text-xs text-gray-1000 bg-gray-100 border border-gray-alpha-400 px-1 py-0.5 rounded-sm">
              Authorization
            </code>{' '}
            header. Keys are only shown once at creation &mdash; store them securely.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-label-12 uppercase tracking-wider text-gray-600">Send a Message</h3>
          <p className="text-copy-13 text-gray-900 leading-relaxed">
            <code className="font-mono text-xs text-gray-1000 bg-gray-100 border border-gray-alpha-400 px-1 py-0.5 rounded-sm">
              POST /chat
            </code>{' '}
            with a JSON{' '}
            <code className="font-mono text-xs text-gray-1000 bg-gray-100 border border-gray-alpha-400 px-1 py-0.5 rounded-sm">
              message
            </code>{' '}
            field. The response streams back as plain text; retrieved document sources are returned
            in the{' '}
            <code className="font-mono text-xs text-gray-1000 bg-gray-100 border border-gray-alpha-400 px-1 py-0.5 rounded-sm">
              X-RAG-Sources
            </code>{' '}
            response header as JSON.
          </p>
          <div className="bg-gray-100 border border-gray-alpha-400 rounded-md overflow-hidden flex flex-col self-start w-fit max-w-full">
            <div className="flex items-center min-w-0 border-b border-gray-alpha-400">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-3 py-2 text-xs text-label-12-mono transition-colors border-b-2 -mb-px whitespace-nowrap ${
                    activeTab === tab
                      ? 'text-gray-1000 border-gray-1000'
                      : 'text-gray-600 border-transparent hover:text-gray-1000'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 z-10 flex-shrink-0 whitespace-nowrap rounded-md bg-gray-200 hover:bg-gray-300 px-2 py-1 text-gray-600 hover:text-gray-1000 transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span className="text-label-12">{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <pre className="px-3 pt-3 pb-3 pr-24">
                <code className="font-mono text-xs text-gray-1000 whitespace-pre-wrap break-all">
                  {SNIPPETS[activeTab].split('\n').map((line, i) => highlightLine(line, i))}
                </code>
              </pre>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pb-4">
          <h3 className="text-label-12 uppercase tracking-wider text-gray-600">
            Ingest a Document
          </h3>
          <p className="text-copy-13 text-gray-900 leading-relaxed">
            <code className="font-mono text-xs text-gray-1000 bg-gray-100 border border-gray-alpha-400 px-1 py-0.5 rounded-sm">
              POST /ingest
            </code>{' '}
            with multipart form data &mdash; either a{' '}
            <code className="font-mono text-xs text-gray-1000 bg-gray-100 border border-gray-alpha-400 px-1 py-0.5 rounded-sm">
              file
            </code>{' '}
            field (PDF) or a{' '}
            <code className="font-mono text-xs text-gray-1000 bg-gray-100 border border-gray-alpha-400 px-1 py-0.5 rounded-sm">
              webUrl
            </code>{' '}
            field to crawl and index a page.
          </p>
        </div>
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
            <CopyableRow value={revealedKey} />
            <button className="btn-primary px-3 py-2 self-end" onClick={() => setRevealedKey(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
