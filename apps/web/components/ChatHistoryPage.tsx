'use client';

import { useEffect, useState } from 'react';
import { listChatHistory, type ChatHistoryItem, type FailedAttempt } from '@/lib/api';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseFailedAttempts(json: string | null): FailedAttempt[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ModelBadge({ provider, model }: { provider: string | null; model: string | null }) {
  if (!provider) {
    return (
      <span className="text-label-12 text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded-sm flex-shrink-0">
        Failed
      </span>
    );
  }
  return (
    <span className="text-label-12-mono text-gray-900 bg-gray-100 border border-gray-alpha-400 px-1.5 py-0.5 rounded-sm flex-shrink-0 whitespace-nowrap">
      {capitalize(provider)}
      {model ? ` · ${model}` : ''}
    </span>
  );
}

function FailedAttemptsList({ attempts }: { attempts: FailedAttempt[] }) {
  const [isOpen, setIsOpen] = useState(false);
  if (attempts.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1 text-label-12 text-amber-700 hover:underline self-start"
      >
        <span className="material-symbols-outlined text-sm">warning</span>
        {attempts.length} provider{attempts.length === 1 ? '' : 's'} failed before this response
        <span className="material-symbols-outlined text-sm">{isOpen ? 'expand_less' : 'expand_more'}</span>
      </button>
      {isOpen && (
        <div className="flex flex-col gap-1.5 pl-1">
          {attempts.map((attempt, i) => (
            <div key={i} className="flex items-start gap-2 text-copy-13">
              <span className="text-label-12-mono text-gray-900 bg-gray-100 border border-gray-alpha-400 px-1.5 py-0.5 rounded-sm flex-shrink-0 whitespace-nowrap">
                {capitalize(attempt.provider)}
                {attempt.model ? ` · ${attempt.model}` : ''}
              </span>
              <span className="text-gray-600">{attempt.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatHistoryPage({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      setHistory([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    listChatHistory(page)
      .then((data) => {
        setHistory(data.history);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      })
      .catch(() => setError('Failed to load chat history.'))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, page]);

  useEffect(() => {
    setPage(1);
  }, [isAuthenticated]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-alpha-400 flex-shrink-0 flex items-center gap-2">
        <span className="material-symbols-outlined text-gray-600 text-lg">history</span>
        <h2 className="text-heading-16 text-gray-1000">Chat History</h2>
        {!isLoading && total > 0 && (
          <span className="text-label-12-mono text-gray-900 bg-gray-100 border border-gray-alpha-400 rounded-full px-2 py-0.5">
            {total}
          </span>
        )}
      </div>

      <div className="px-6 py-5 flex-grow overflow-y-auto flex flex-col">
        {error && (
          <div className="text-copy-13 text-red-900 bg-red-100 rounded-sm px-3 py-2 mb-4">{error}</div>
        )}

        {isLoading && <p className="text-copy-13 text-gray-900 py-2">Loading…</p>}

        {!isLoading && history.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-16 max-w-sm mx-auto">
            <span className="material-symbols-outlined text-gray-600 text-3xl">history</span>
            <p className="text-copy-13 text-gray-900 leading-relaxed">
              {isAuthenticated
                ? 'No chat history yet. Send a message from the Playground to see it here.'
                : 'Sign in to see your chat history.'}
            </p>
          </div>
        )}

        {!isLoading && history.length > 0 && (
          <>
            <div className="flex flex-col divide-y divide-gray-alpha-400">
              {history.map((item) => {
                const isExpanded = expanded.has(item.id);
                const failedAttempts = parseFailedAttempts(item.failedAttempts);
                return (
                  <div key={item.id} className="py-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <ModelBadge provider={item.provider} model={item.model} />
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-label-12-mono text-gray-1000 font-semibold">
                          {formatDuration(item.durationMs)}
                        </span>
                        <span className="text-label-12 text-gray-600">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-label-12 uppercase tracking-wider text-gray-600">Query</span>
                      <p className="text-copy-14 text-gray-1000 leading-relaxed">{item.message}</p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-label-12 uppercase tracking-wider text-gray-600">Answer</span>
                      <p
                        className={`text-copy-14 text-gray-1000 leading-relaxed whitespace-pre-wrap ${
                          isExpanded ? '' : 'line-clamp-3'
                        }`}
                      >
                        {item.response}
                      </p>
                      {item.response.length > 200 && (
                        <button
                          onClick={() => toggleExpanded(item.id)}
                          className="text-label-12 text-blue-900 hover:underline self-start"
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>

                    <FailedAttemptsList attempts={failedAttempts} />
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 pt-4 flex-shrink-0">
                <span className="text-copy-13 text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn-secondary px-3 py-1.5 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="btn-secondary px-3 py-1.5 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
