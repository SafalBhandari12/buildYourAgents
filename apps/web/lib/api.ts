const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const isFormData = options.body instanceof FormData;

  return fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
}

async function throwIfNotOk(res: Response, fallbackMessage: string) {
  if (res.ok) return;
  const body = await res.json().catch(() => ({}) as { message?: string });
  throw new ApiError(body.message ?? fallbackMessage, res.status);
}

export type Metrics = {
  chunksGenerated: number;
  chunksRemaining: number;
  queriesExecuted: number;
  queriesRemaining: number;
  tokensUsed: number;
  tokensRemaining: number;
  pagesCrawled: number;
  pagesCrawledRemaining: number;
};

export async function getMetrics(): Promise<Metrics> {
  const res = await request('/metrics');
  await throwIfNotOk(res, 'Failed to load usage metrics');
  return res.json();
}

export type DocumentItem = {
  id: string;
  name: string;
  type: 'file' | 'url';
  sizeBytes: number | null;
  chunkCount: number;
  createdAt: number;
};

export async function listDocuments(): Promise<DocumentItem[]> {
  const res = await request('/documents');
  await throwIfNotOk(res, 'Failed to load documents');
  const data = await res.json();
  return data.documents;
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await request(`/documents/${id}`, { method: 'DELETE' });
  await throwIfNotOk(res, 'Failed to delete document');
}

export async function ingestFile(file: File): Promise<{ chunks: number }> {
  const form = new FormData();
  form.append('file', file);
  const res = await request('/ingest', { method: 'POST', body: form });
  await throwIfNotOk(res, 'Failed to ingest file');
  return res.json();
}

export async function ingestUrl(webUrl: string): Promise<{ chunks: number }> {
  const form = new FormData();
  form.append('webUrl', webUrl);
  const res = await request('/ingest', { method: 'POST', body: form });
  await throwIfNotOk(res, 'Failed to ingest URL');
  return res.json();
}

export type ApiKeyItem = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: number | null;
  createdAt: number;
  expiresAt: number | null;
};

export type CreatedApiKey = {
  id: string;
  name: string;
  key: string;
  prefix: string;
  createdAt: string;
};

export async function listApiKeys(): Promise<ApiKeyItem[]> {
  const res = await request('/api-keys');
  await throwIfNotOk(res, 'Failed to load API keys');
  const data = await res.json();
  return data.keys;
}

export async function createApiKey(name: string): Promise<CreatedApiKey> {
  const res = await request('/api-keys', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  await throwIfNotOk(res, 'Failed to create API key');
  return res.json();
}

export async function deleteApiKey(id: string): Promise<void> {
  const res = await request(`/api-keys/${id}`, { method: 'DELETE' });
  await throwIfNotOk(res, 'Failed to delete API key');
}

export type ChatSource = {
  source: string;
  documentTitle: string;
};

export async function sendChatMessage(message: string): Promise<Response> {
  const res = await request('/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  await throwIfNotOk(res, 'Failed to send message');
  return res;
}

export function parseRagSources(res: Response): ChatSource[] {
  const header = res.headers.get('X-RAG-Sources');
  if (!header) return [];
  try {
    return JSON.parse(header);
  } catch {
    return [];
  }
}

export type LlmProvider = 'gemini' | 'openAi' | 'openAiCompatible' | 'claude' | 'deepseek' | 'groq';

export type LlmKeyItem = {
  id: string;
  provider: LlmProvider;
  name: string;
  model: string;
  baseUrl: string | null;
  createdAt: number;
  rateLimitTimestamp: number | null;
};

export type LlmKeysResponse = {
  keys: LlmKeyItem[];
  order: string[];
};

export async function listLlmKeys(): Promise<LlmKeysResponse> {
  const res = await request('/llm-keys');
  await throwIfNotOk(res, 'Failed to load provider keys');
  return res.json();
}

export async function createLlmKey(input: {
  provider: LlmProvider;
  name: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
}): Promise<{ id: string }> {
  const res = await request('/llm-keys', { method: 'POST', body: JSON.stringify(input) });
  await throwIfNotOk(res, 'Failed to add provider key');
  return res.json();
}

export async function deleteLlmKey(id: string): Promise<void> {
  const res = await request(`/llm-keys/${id}`, { method: 'DELETE' });
  await throwIfNotOk(res, 'Failed to delete provider key');
}

export async function updateLlmKeyOrder(order: string[]): Promise<void> {
  const res = await request('/llm-keys/order', { method: 'PUT', body: JSON.stringify({ order }) });
  await throwIfNotOk(res, 'Failed to save provider order');
}

export type FailedAttempt = {
  provider: string;
  model: string | null;
  reason: string;
};

export type ChatHistoryItem = {
  id: string;
  message: string;
  response: string;
  provider: string | null;
  model: string | null;
  failedAttempts: string | null;
  durationMs: number;
  createdAt: number;
};

export type ChatHistoryPage = {
  history: ChatHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export async function listChatHistory(page = 1): Promise<ChatHistoryPage> {
  const res = await request(`/chat-history?page=${page}`);
  await throwIfNotOk(res, 'Failed to load chat history');
  return res.json();
}

export type AgentSettings = {
  temperature: number;
  systemPrompt: string | null;
  maxInputTokens: number;
  maxOutputTokens: number;
  minTokenLimit: number;
  maxTokenLimit: number;
};

export async function getAgentSettings(): Promise<AgentSettings> {
  const res = await request('/agent-settings');
  await throwIfNotOk(res, 'Failed to load agent settings');
  return res.json();
}

export async function updateAgentSettings(input: {
  temperature: number;
  systemPrompt: string;
  maxInputTokens: number;
  maxOutputTokens: number;
}): Promise<void> {
  const res = await request('/agent-settings', { method: 'PUT', body: JSON.stringify(input) });
  await throwIfNotOk(res, 'Failed to save agent settings');
}

export type KnowledgeBaseSettings = {
  chunkSize: number;
  chunkOverlap: number;
  minChunkSize: number;
  maxChunkSize: number;
  minChunkOverlap: number;
  maxChunkOverlap: number;
  isFreeTier: boolean;
};

export async function getKnowledgeBaseSettings(): Promise<KnowledgeBaseSettings> {
  const res = await request('/knowledge-settings');
  await throwIfNotOk(res, 'Failed to load knowledge base settings');
  return res.json();
}

export async function updateKnowledgeBaseSettings(input: {
  chunkSize: number;
  chunkOverlap: number;
}): Promise<void> {
  const res = await request('/knowledge-settings', { method: 'PUT', body: JSON.stringify(input) });
  await throwIfNotOk(res, 'Failed to save knowledge base settings');
}

export async function submitOnboardingAnswer(isNewToAgents: boolean): Promise<void> {
  const res = await request('/onboarding', {
    method: 'PUT',
    body: JSON.stringify({ isNewToAgents }),
  });
  await throwIfNotOk(res, 'Failed to save onboarding answer');
}
