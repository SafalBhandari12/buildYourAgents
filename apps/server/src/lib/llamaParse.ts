import LlamaCloud from '@llamaindex/llama-cloud';
import { createMiddleware } from 'hono/factory';
import { BetterAuthEnv, llamaParseEnv } from './env';

export const llammaParseMiddleware = createMiddleware<llamaParseEnv & BetterAuthEnv>(
  async (c, next) => {
    c.set('llamaParse', new LlamaCloud({ apiKey: c.env.LLAMAPARSE_API_KEY }));
    await next();
  },
);

export async function parseFile(llamaParse: LlamaCloud, file: File): Promise<string> {
  const fileObj = await llamaParse.files.create({
    file,
    purpose: 'parse',
  });

  const result = await llamaParse.parsing.parse({
    file_id: fileObj.id,
    tier: 'cost_effective',
    expand: ['markdown_full'],
    version: '2026-06-26',
  });

  if (result.markdown_full === undefined || result.markdown_full === null) {
    throw new Error('Parsing failed: No markdown content returned');
  }

  return result.markdown_full;
}
