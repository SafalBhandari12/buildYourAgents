import { z } from 'zod';

export const chatInputSchema = z.object({
  message: z.string().min(1),
});

export const ingestInputSchema = z
  .object({
    file: z.instanceof(File).optional(),
    webUrl: z.url().optional(),
  })
  .refine((data) => data.file || data.webUrl, {
    message: 'Either file or webUrl must be provided',
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
    (data) => (data.provider === 'openAiCompatible' || data.provider === 'claude' ? !!data.baseUrl : true),
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
