'use client';

import { useEffect, useState } from 'react';
import {
  ApiError,
  createLlmKey,
  deleteLlmKey,
  listLlmKeys,
  updateLlmKeyOrder,
  type LlmKeyItem,
  type LlmProvider,
} from '@/lib/api';
import { useAuthModal } from '@/components/AuthModalContext';

const PROVIDER_LABELS: Record<LlmProvider, string> = {
  openAi: 'OpenAI',
  openAiCompatible: 'OpenAI-Compatible',
  gemini: 'Gemini',
  claude: 'Claude',
  deepseek: 'DeepSeek',
  groq: 'Groq',
};

const MODEL_PLACEHOLDERS: Record<LlmProvider, string> = {
  openAi: 'gpt-4o-mini',
  openAiCompatible: 'your-model-name',
  gemini: 'gemini-2.0-flash',
  claude: 'claude-3-5-sonnet-20241022',
  deepseek: 'deepseek-chat',
  groq: 'llama-3.3-70b-versatile',
};

const PROVIDERS_REQUIRING_BASE_URL = new Set<LlmProvider>(['openAiCompatible', 'claude']);

function moveItem(order: string[], index: number, direction: -1 | 1): string[] {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= order.length) return order;
  const copy = [...order];
  const current = copy[index];
  const target = copy[newIndex];
  if (current === undefined || target === undefined) return order;
  copy[index] = target;
  copy[newIndex] = current;
  return copy;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ModelKeysPanel({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { open } = useAuthModal();
  const [keys, setKeys] = useState<LlmKeyItem[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [provider, setProvider] = useState<LlmProvider>('openAi');
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  async function refresh() {
    setIsLoading(true);
    try {
      const data = await listLlmKeys();
      setKeys(data.keys);
      setOrder(data.order);
    } catch {
      setError('Failed to load provider keys.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setKeys([]);
      setOrder([]);
      setIsLoading(false);
      return;
    }
    refresh();
  }, [isAuthenticated]);

  async function saveOrder(next: string[]) {
    setOrder(next);
    try {
      await updateLlmKeyOrder(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save order.');
      refresh();
    }
  }

  function handleMove(index: number, direction: -1 | 1) {
    saveOrder(moveItem(order, index, direction));
  }

  function handleTogglePlatform(enabled: boolean) {
    if (enabled) {
      saveOrder([...order, 'platform']);
    } else {
      saveOrder(order.filter((id) => id !== 'platform'));
    }
  }

  function handleOpenAdd() {
    if (!isAuthenticated) {
      open('signin');
      return;
    }
    setProvider('openAi');
    setName('');
    setModel('');
    setApiKey('');
    setBaseUrl('');
    setIsAddOpen(true);
  }

  async function handleCreate() {
    if (!name.trim() || !model.trim() || !apiKey.trim()) return;
    if (PROVIDERS_REQUIRING_BASE_URL.has(provider) && !baseUrl.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      await createLlmKey({
        provider,
        name: name.trim(),
        model: model.trim(),
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined,
      });
      setIsAddOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add provider key.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLlmKey(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete provider key.');
    }
  }

  const platformIncluded = order.includes('platform');
  const rows = order
    .map((id, index) => ({ id, index }))
    .filter(({ id }) => id === 'platform' || keys.some((k) => k.id === id));

  return (
    <div className="px-4 py-4 flex-grow overflow-y-auto flex flex-col gap-4">
      <p className="text-copy-13 text-gray-600 leading-relaxed">
        Requests try each provider below in order. If one fails or is rate-limited, the next one is
        used automatically. Your own keys are never billed against your platform quota.
      </p>

      {error && (
        <div className="text-copy-13 text-red-900 bg-red-100 rounded-sm px-3 py-2">{error}</div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-label-12 uppercase tracking-wider text-gray-600">Execution Order</h3>
        <button onClick={handleOpenAdd} className="btn-primary px-3 py-1.5 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">add</span>
          Add Provider Key
        </button>
      </div>

      {isLoading && <p className="text-copy-13 text-gray-600 py-2">Loading…</p>}

      {!isLoading && !isAuthenticated && (
        <p className="text-copy-13 text-gray-600 py-2">Sign in to configure your model providers.</p>
      )}

      <div className="flex flex-col divide-y divide-gray-alpha-200">
        {rows.map(({ id, index }) => {
          const key = id === 'platform' ? null : keys.find((k) => k.id === id)!;
          const isCoolingDown = !!key?.rateLimitTimestamp && key.rateLimitTimestamp > Date.now();

          return (
            <div key={id} className="flex items-center justify-between py-2.5 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-label-12 text-gray-600 w-4 flex-shrink-0">{index + 1}</span>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-label-14 text-gray-1000 truncate">
                      {key ? key.name : 'Platform Default'}
                    </span>
                    <span className="text-label-12 text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded-sm">
                      {key ? PROVIDER_LABELS[key.provider] : 'Platform'}
                    </span>
                    {isCoolingDown && (
                      <span className="text-label-12 text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-sm">
                        Rate limited
                      </span>
                    )}
                  </div>
                  <span className="text-copy-13 text-gray-600">
                    {key ? `${key.model} • Added ${formatDate(key.createdAt)}` : 'Included in the platform plan'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0}
                  className="material-symbols-outlined text-gray-600 hover:text-gray-1000 text-lg disabled:opacity-30"
                >
                  arrow_upward
                </button>
                <button
                  onClick={() => handleMove(index, 1)}
                  disabled={index === order.length - 1}
                  className="material-symbols-outlined text-gray-600 hover:text-gray-1000 text-lg disabled:opacity-30"
                >
                  arrow_downward
                </button>
                {key ? (
                  <button
                    onClick={() => handleDelete(key.id)}
                    className="material-symbols-outlined text-gray-600 hover:text-red-700 text-lg"
                  >
                    delete
                  </button>
                ) : (
                  <button
                    onClick={() => handleTogglePlatform(false)}
                    className="material-symbols-outlined text-gray-600 hover:text-red-700 text-lg"
                    title="Disable platform default"
                  >
                    toggle_on
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {!platformIncluded && (
          <div className="flex items-center justify-between py-2.5 gap-3 opacity-50">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-label-14 text-gray-1000">Platform Default</span>
                <span className="text-label-12 text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded-sm">
                  Platform
                </span>
              </div>
              <span className="text-copy-13 text-gray-600">Currently disabled</span>
            </div>
            <button
              onClick={() => handleTogglePlatform(true)}
              className="material-symbols-outlined text-gray-600 hover:text-gray-1000 text-lg"
              title="Enable platform default"
            >
              toggle_off
            </button>
          </div>
        )}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm bg-gray-100 rounded-md shadow-modal p-6 flex flex-col gap-4">
            <h3 className="text-heading-16 text-gray-1000">Add Provider Key</h3>

            <label className="flex flex-col gap-1">
              <span className="text-label-14 text-gray-900">Provider</span>
              <select
                className="input-field"
                value={provider}
                onChange={(e) => {
                  const next = e.target.value as LlmProvider;
                  setProvider(next);
                  setModel('');
                }}
              >
                {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-label-14 text-gray-900">Name</span>
              <input
                className="input-field"
                placeholder="Personal Groq Key"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-label-14 text-gray-900">Model</span>
              <input
                className="input-field"
                placeholder={MODEL_PLACEHOLDERS[provider]}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-label-14 text-gray-900">API Key</span>
              <input
                className="input-field"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </label>

            {PROVIDERS_REQUIRING_BASE_URL.has(provider) && (
              <label className="flex flex-col gap-1">
                <span className="text-label-14 text-gray-900">Base URL</span>
                <input
                  className="input-field"
                  placeholder="https://your-endpoint.example.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </label>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button className="btn-tertiary px-3 py-2" onClick={() => setIsAddOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary px-3 py-2 disabled:opacity-50"
                disabled={
                  isCreating ||
                  !name.trim() ||
                  !model.trim() ||
                  !apiKey.trim() ||
                  (PROVIDERS_REQUIRING_BASE_URL.has(provider) && !baseUrl.trim())
                }
                onClick={handleCreate}
              >
                {isCreating ? 'Adding…' : 'Add Provider Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
