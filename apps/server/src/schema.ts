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

export type chatInputType = z.infer<typeof chatInputSchema>;
export type ingestInputType = z.infer<typeof ingestInputSchema>;
