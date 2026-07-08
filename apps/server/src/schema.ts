import { z } from 'zod';

// Simple character-count heuristic for estimating input size without depending on a real
// tokenizer library — ~4 characters per token is the standard rough approximation.
const CHARS_PER_TOKEN = 4;

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// Users can tune their own input/output token caps (enforced per-request in ai.ts against
// their saved metrics row), bounded by these hard platform ceilings.
export const MIN_TOKEN_LIMIT = 50;
export const MAX_TOKEN_LIMIT = 4000;
export const DEFAULT_MAX_INPUT_TOKENS = 1000;
export const DEFAULT_MAX_OUTPUT_TOKENS = 500;

export const chatInputSchema = z.object({
  message: z.string().min(1),
});

export const agentSettingsInputSchema = z.object({
  temperature: z.number().min(0).max(1),
  systemPrompt: z.string().refine((val) => estimateTokenCount(val) <= MAX_TOKEN_LIMIT, {
    message: `System prompt exceeds the ${MAX_TOKEN_LIMIT} token limit`,
  }),
  maxInputTokens: z.number().int().min(MIN_TOKEN_LIMIT).max(MAX_TOKEN_LIMIT),
  maxOutputTokens: z.number().int().min(MIN_TOKEN_LIMIT).max(MAX_TOKEN_LIMIT),
});

export const ingestInputSchema = z
  .object({
    file: z.instanceof(File).optional(),
    webUrl: z.url().optional(),
  })
  .refine((data) => data.file || data.webUrl, {
    message: 'Either file or webUrl must be provided',
  });

// User-tunable chunking parameters for document ingestion, bounded by these hard ceilings.
export const MIN_CHUNK_SIZE = 200;
export const MAX_CHUNK_SIZE = 4000;
export const MIN_CHUNK_OVERLAP = 0;
export const MAX_CHUNK_OVERLAP = 1000;

export const knowledgeBaseSettingsInputSchema = z
  .object({
    chunkSize: z.number().int().min(MIN_CHUNK_SIZE).max(MAX_CHUNK_SIZE),
    chunkOverlap: z.number().int().min(MIN_CHUNK_OVERLAP).max(MAX_CHUNK_OVERLAP),
  })
  .refine((data) => data.chunkOverlap < data.chunkSize, {
    message: 'Chunk overlap must be smaller than chunk size',
    path: ['chunkOverlap'],
  });

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(64),
});

export const llmProviderSchema = z.enum([
  'gemini',
  'openAi',
  'openAiCompatible',
  'claude',
  'deepseek',
  'groq',
]);

export const createLlmKeySchema = z
  .object({
    provider: llmProviderSchema,
    name: z.string().min(1).max(64),
    model: z.string().min(1).max(128),
    apiKey: z.string().min(1),
    baseUrl: z.url().optional(),
  })
  .refine(
    (data) =>
      data.provider === 'openAiCompatible' || data.provider === 'claude' ? !!data.baseUrl : true,
    { message: 'baseUrl is required for openAiCompatible and claude providers', path: ['baseUrl'] },
  );

export const llmKeyOrderSchema = z.object({
  order: z.array(z.string()).min(1),
});

export type chatInputType = z.infer<typeof chatInputSchema>;
export type ingestInputType = z.infer<typeof ingestInputSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type CreateLlmKeyInput = z.infer<typeof createLlmKeySchema>;
export type LlmKeyOrderInput = z.infer<typeof llmKeyOrderSchema>;
export type AgentSettingsInput = z.infer<typeof agentSettingsInputSchema>;
export type KnowledgeBaseSettingsInput = z.infer<typeof knowledgeBaseSettingsInputSchema>;
