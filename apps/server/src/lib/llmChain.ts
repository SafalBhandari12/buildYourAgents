import OpenAI from 'openai';
import { decryptApiKey } from './llm-key-crypto';

export type LlmProvider = 'gemini' | 'openAi' | 'openAiCompatible' | 'claude' | 'deepseek' | 'groq';

export type LlmKeyRow = {
  id: string;
  provider: LlmProvider;
  name: string;
  model: string;
  baseUrl: string | null;
  encryptedApiKey: string;
  rateLimitTimestamp: Date | null;
};

const PROVIDER_BASE_URLS: Partial<Record<LlmProvider, string>> = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  deepseek: 'https://api.deepseek.com',
  groq: 'https://api.groq.com/openai/v1',
};

/**
 * Resolves the saved chain order (a mix of llmApiKeys ids and the literal "platform")
 * against the user's current keys — drops stale ids, keeps user-chosen positions
 * (including intentionally omitting "platform"), and appends any newly-created keys
 * that aren't in the saved order yet.
 */
export function resolveOrder(saved: string | null, keyIds: string[]): string[] {
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const validIds = new Set(keyIds);
        const filtered = parsed.filter(
          (id): id is string => typeof id === 'string' && (id === 'platform' || validIds.has(id)),
        );
        const missing = keyIds.filter((id) => !filtered.includes(id));
        return [...filtered, ...missing];
      }
    } catch {
      // malformed JSON — fall through to the default order below
    }
  }
  return ['platform', ...keyIds];
}

function resolveBaseUrl(provider: LlmProvider, customBaseUrl: string | null): string | undefined {
  if (provider === 'openAiCompatible' || provider === 'claude') {
    return customBaseUrl ?? undefined;
  }
  return PROVIDER_BASE_URLS[provider];
}

export async function buildClientForKey(
  row: LlmKeyRow,
  secret: string,
): Promise<{ client: OpenAI; model: string }> {
  const apiKey = await decryptApiKey(row.encryptedApiKey, secret);
  return {
    client: new OpenAI({ apiKey, baseURL: resolveBaseUrl(row.provider, row.baseUrl) }),
    model: row.model,
  };
}

export function isCoolingDown(row: LlmKeyRow, now: number): boolean {
  return !!row.rateLimitTimestamp && row.rateLimitTimestamp.getTime() > now;
}
