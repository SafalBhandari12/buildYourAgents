import { Env, Hono } from 'hono';
import { streamText } from 'hono/streaming';
import { openaiMiddleware } from './lib/gpt';
import { chatInputSchema } from './schema';
import { llammaParseMiddleware, parseFile } from './lib/llamaParse';
import { asyncHandler, globalErrorHandler } from './lib/errorHandler';
import { BadRequestError } from './lib/errors';
import { BetterAuthEnv, chatEnv, cloudflareAiEnv, DBEnv, llamaParseEnv } from './lib/env';
import { splitMarkdownDocument } from './lib/splitter';
import { vectorizeDocuments } from './lib/vectorizeDocuments';
import { semanticSearch } from './lib/search';
import { createAuth } from '../auth';

const app = new Hono<Env>();

app.onError(globalErrorHandler);

app.post(
  '/ingest',
  llammaParseMiddleware,
  asyncHandler<llamaParseEnv & cloudflareAiEnv>(async (c) => {
    c.env.VECTORIZE.deleteByIds(['*']);
    const form = await c.req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      throw new BadRequestError('Missing file: Please upload a valid file');
    }

    const llamaParse = c.get('llamaParse');

    const markdown = await parseFile(llamaParse, file);

    const chunks = await splitMarkdownDocument(markdown, file.name);

    await vectorizeDocuments(c.env, chunks);

    return c.json({ msg: 'Hello world from cloudflare ai' });
  }),
);

app.post(
  '/chat',
  openaiMiddleware,
  asyncHandler<chatEnv>(async (c) => {
    const body = await c.req.json();
    const { message } = await chatInputSchema.parseAsync(body);

    const results = await semanticSearch(c.env.AI, c.env.VECTORIZE, message);

    const context =
      results.length > 0
        ? results.map((r) => `[${r.source}] ${r.pageContent}`).join('\n\n---\n\n')
        : 'No relevant context found.';

    const ai = c.get('openai');

    return streamText(c, async (streamWriter) => {
      const llmResponse = await ai.responses.create({
        model: 'gpt-5.4-mini',
        input: [
          {
            role: 'system',
            content: `You are a helpful assistant. Use the following context to answer the user's question. If the context doesn't contain relevant information, just answer based on your own knowledge.

Context:
${context}`,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        stream: true,
      });

      for await (const event of llmResponse) {
        if (event.type === 'response.output_text.delta') {
          await streamWriter.write(event.delta);
        }
      }
    });
  }),
);

app.on(
  ['GET', 'POST'],
  '/api/auth/*',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const auth = createAuth(c.env);
    return await auth.handler(c.req.raw);
  }),
);

export default app;
