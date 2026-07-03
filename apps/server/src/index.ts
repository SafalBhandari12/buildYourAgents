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
import { checkMetrics, deductMetrics, refundMetrics } from './lib/metrics';
import { auth } from '../auth';
import { authenticationMiddleware } from './middleware/authenticationMiddleware';

import { readPdfPages } from 'pdf-text-reader';

const app = new Hono<Env>();

app.onError(globalErrorHandler);

app.post(
  '/ingest',
  authenticationMiddleware,
  llammaParseMiddleware,
  asyncHandler<llamaParseEnv & cloudflareAiEnv & BetterAuthEnv>(async (c) => {
    const form = await c.req.formData();
    const file = form.get('file');
    const user = c.get('user');

    if (user.tier !== 'free') {
      return c.json({ error: 'Only free tier users can ingest documents' }, 403);
    }

    if (!(file instanceof File)) {
      throw new BadRequestError('Missing file: Please upload a valid file');
    }

    const bytes = await file.arrayBuffer();
    const pdfPages = await readPdfPages(bytes);
    const pages = pdfPages.length;

    const MAX_PAGES = 10;
    if (pages > MAX_PAGES) {
      throw new BadRequestError(`File has too many pages. Maximum allowed is ${MAX_PAGES}`);
    }

    // Check page quota before any external API calls
    await checkMetrics(c.env.DB, user.id, pages, 0);

    const llamaParse = c.get('llamaParse');

    try {
      const markdown = await parseFile(llamaParse, file);
      const chunks = await splitMarkdownDocument(markdown, file.name, user.id, user.tier);

      // Check + deduct chunks (only known after split)
      await checkMetrics(c.env.DB, user.id, 0, chunks.length);
      await deductMetrics(c.env.DB, user.id, pages, chunks.length);

      await vectorizeDocuments(c.env, chunks);

      return c.json({ msg: 'Document ingested successfully', pages, chunks: chunks.length });
    } catch (err) {
      await refundMetrics(c.env.DB, user.id, pages, 0);
      throw err;
    }
  }),
);

app.post(
  '/chat',
  openaiMiddleware,
  asyncHandler<chatEnv>(async (c) => {
    const body = await c.req.json();
    const { message } = await chatInputSchema.parseAsync(body);

    const results = await semanticSearch(c.env.AI, c.env.VECTORIZE, message, undefined);

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
    const client = auth(c.env);
    return await client.handler(c.req.raw);
  }),
);

export default app;
