import LlamaCloud from '@llamaindex/llama-cloud';
import { createMiddleware } from 'hono/factory';
import { llamaParseEnv } from './env';

export const llammaParseMiddleware = createMiddleware<llamaParseEnv>(async (c, next) => {
  c.set('llamaParse', new LlamaCloud({ apiKey: c.env.LLAMAPARSE_API_KEY }));
  await next();
});

// console.log(result.markdown_full);
