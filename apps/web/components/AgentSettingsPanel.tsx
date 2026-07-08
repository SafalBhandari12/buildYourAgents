'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, getAgentSettings, updateAgentSettings } from '@/lib/api';
import { estimateTokenCount } from '@/lib/tokenEstimate';

const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful assistant. Use the following context to answer the user's question. If the context doesn't contain relevant information, just answer based on your own knowledge.";

const FALLBACK_MIN_TOKEN_LIMIT = 50;
const FALLBACK_MAX_TOKEN_LIMIT = 4000;

function temperatureLabel(value: number): string {
  if (value <= 0.2) return 'Focused & deterministic';
  if (value <= 0.5) return 'Balanced';
  if (value <= 0.8) return 'Creative';
  return 'Highly creative';
}

export function AgentSettingsPanel({ isAuthenticated }: { isAuthenticated: boolean }) {
  const queryClient = useQueryClient();
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [maxInputTokens, setMaxInputTokens] = useState(1000);
  const [maxOutputTokens, setMaxOutputTokens] = useState(500);
  const [saved, setSaved] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['agent-settings'],
    queryFn: getAgentSettings,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!data) return;
    setTemperature(data.temperature);
    setSystemPrompt(data.systemPrompt ?? '');
    setMaxInputTokens(data.maxInputTokens);
    setMaxOutputTokens(data.maxOutputTokens);
  }, [data]);

  const minTokenLimit = data?.minTokenLimit ?? FALLBACK_MIN_TOKEN_LIMIT;
  const maxTokenLimit = data?.maxTokenLimit ?? FALLBACK_MAX_TOKEN_LIMIT;

  const promptTokenCount = estimateTokenCount(systemPrompt);
  const promptOverLimit = promptTokenCount > maxTokenLimit;
  const inputOutOfRange = maxInputTokens < minTokenLimit || maxInputTokens > maxTokenLimit;
  const outputOutOfRange = maxOutputTokens < minTokenLimit || maxOutputTokens > maxTokenLimit;
  const isDirty = data
    ? temperature !== data.temperature ||
      systemPrompt !== (data.systemPrompt ?? '') ||
      maxInputTokens !== data.maxInputTokens ||
      maxOutputTokens !== data.maxOutputTokens
    : false;
  const canSave = !promptOverLimit && !inputOutOfRange && !outputOutOfRange && isDirty;

  const saveMutation = useMutation({
    mutationFn: updateAgentSettings,
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['agent-settings'] });
      setTimeout(() => setSaved(false), 1500);
    },
  });

  function handleSave() {
    if (!canSave) return;
    setSaved(false);
    saveMutation.mutate({ temperature, systemPrompt, maxInputTokens, maxOutputTokens });
  }

  const error =
    saveMutation.error instanceof ApiError
      ? saveMutation.error.message
      : saveMutation.isError
        ? 'Failed to save agent settings.'
        : isError
          ? 'Failed to load agent settings.'
          : null;

  return (
    <div className="px-4 py-4 flex-grow overflow-y-auto flex flex-col gap-5">
      <p className="text-copy-13 text-gray-900 leading-relaxed">
        Configure how the orchestrator calls the model for every request in the chain, regardless of
        which provider ends up serving it.
      </p>

      {error && <div className="text-copy-13 text-red-900 bg-red-100 rounded-sm px-3 py-2">{error}</div>}

      {isLoading && <p className="text-copy-13 text-gray-900 py-2">Loading…</p>}

      {!isLoading && !isAuthenticated && (
        <p className="text-copy-13 text-gray-900 py-2">Sign in to configure the AI agent.</p>
      )}

      {!isLoading && isAuthenticated && (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-label-12 uppercase tracking-wider text-gray-600">Temperature</h3>
              <span className="text-label-12-mono text-gray-1000 font-semibold bg-gray-100 border border-gray-alpha-400 rounded-sm px-1.5 py-0.5">
                {temperature.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-blue-900"
            />
            <span className="text-copy-13 text-gray-600">{temperatureLabel(temperature)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-label-12 uppercase tracking-wider text-gray-600">Max Input Tokens</h3>
              <input
                type="number"
                className="input-field"
                min={minTokenLimit}
                max={maxTokenLimit}
                value={maxInputTokens}
                onChange={(e) => setMaxInputTokens(Number(e.target.value))}
              />
              <span className={`text-copy-13 ${inputOutOfRange ? 'text-red-700' : 'text-gray-600'}`}>
                Between {minTokenLimit} and {maxTokenLimit}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-label-12 uppercase tracking-wider text-gray-600">Max Output Tokens</h3>
              <input
                type="number"
                className="input-field"
                min={minTokenLimit}
                max={maxTokenLimit}
                value={maxOutputTokens}
                onChange={(e) => setMaxOutputTokens(Number(e.target.value))}
              />
              <span className={`text-copy-13 ${outputOutOfRange ? 'text-red-700' : 'text-gray-600'}`}>
                Between {minTokenLimit} and {maxTokenLimit}
              </span>
            </div>
          </div>
          <p className="text-copy-13 text-gray-600 leading-relaxed -mt-3">
            These caps only apply once one of your own provider keys serves the response. The
            platform&rsquo;s default model is always fixed at 1,000 input / 500 output tokens.
          </p>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-label-12 uppercase tracking-wider text-gray-600">System Prompt</h3>
              <span className={`text-label-12-mono ${promptOverLimit ? 'text-red-700' : 'text-gray-600'}`}>
                {promptTokenCount} / {maxTokenLimit} tokens
              </span>
            </div>
            <textarea
              className="input-field min-h-32 resize-y"
              placeholder={DEFAULT_SYSTEM_PROMPT}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <span className="text-copy-13 text-gray-600">
              Leave blank to use the default assistant prompt shown above as a placeholder.
            </span>
          </div>

          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || !canSave}
            className="btn-primary px-3 py-1.5 self-start disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving…' : saved ? 'Saved' : 'Save Settings'}
          </button>
        </>
      )}
    </div>
  );
}
