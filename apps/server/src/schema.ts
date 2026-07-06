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

export type chatInputType = z.infer<typeof chatInputSchema>;
export type ingestInputType = z.infer<typeof ingestInputSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
