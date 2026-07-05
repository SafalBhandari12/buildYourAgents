import { Env, Hono } from 'hono';
import { streamText } from 'hono/streaming';
import { openaiMiddleware } from './lib/gpt';
import { chatInputSchema, ingestInputSchema } from './schema';
import { llammaParseMiddleware, parseFile } from './lib/llamaParse';
import { asyncHandler, globalErrorHandler } from './lib/errorHandler';
import { BadRequestError } from './lib/errors';
import { BetterAuthEnv, chatEnv, cloudflareAiEnv, firecrawlEnv, llamaParseEnv } from './lib/env';
import { splitMarkdownDocument } from './lib/splitter';
import { vectorizeDocuments } from './lib/vectorizeDocuments';
import { semanticSearch } from './lib/search';
import { FirecrawlClient } from 'firecrawl';

import {
  checkMetrics,
  checkQueryMetrics,
  deductMetrics,
  deductQueryMetrics,
  ensureMetrics,
  refundMetrics,
} from './lib/metrics';
import { auth } from '../auth';
import { authenticationMiddleware } from './middleware/authenticationMiddleware';
import { getDocumentProxy } from 'unpdf';

const app = new Hono<Env>();

app.onError(globalErrorHandler);

app.post(
  '/ingest',
  authenticationMiddleware,
  llammaParseMiddleware,
  asyncHandler<llamaParseEnv & cloudflareAiEnv & BetterAuthEnv & firecrawlEnv>(async (c) => {
    const form = await c.req.formData();
    const { file, webUrl } = ingestInputSchema.parse({
      file: form.get('file') ?? undefined,
      webUrl: form.get('webUrl') ?? undefined,
    });
    const user = c.get('user');

    const llamaParse = c.get('llamaParse');
    let pages = 0;

    let markdown: string;
    let sourceName: string;

    let deductedParsedPages = 0;
    let deductedChunks = 0;
    let deductedPagesCrawled = 0;

    try {
      if (file) {
        // PDF pipeline
        const bytes = await file.arrayBuffer();
        const pdfPages = await getDocumentProxy(bytes);
        pages = pdfPages.numPages;

        const MAX_PAGES = 10;
        if (pages > MAX_PAGES) {
          throw new BadRequestError(`File has too many pages. Maximum allowed is ${MAX_PAGES}`);
        }

        await checkMetrics(c.env.DB, user.id, pages, 0);

        markdown = await parseFile(llamaParse, file);
        sourceName = file.name;
      } else {
        // Web URL pipeline using Firecrawl
        const m = await ensureMetrics(c.env.DB, user.id);
        const pagesCrawledRemaining = m.pagesCrawledRemaining;
        const app = new FirecrawlClient({ apiKey: c.env.FIRECRAWL_API_KEY });

        const crawl = await app.crawl(webUrl!, {
          limit: pagesCrawledRemaining,
          maxDiscoveryDepth: 3,
          ignoreQueryParameters: true,
          scrapeOptions: {
            formats: ['markdown'],
          },
        });

        const successfulPages = crawl.data.filter((d) => d.metadata?.statusCode === 200);
        deductedPagesCrawled = successfulPages.length;

        markdown = successfulPages
          .map((d) => d.markdown)
          .filter(Boolean)
          .join('\n\n---\n\n');
        sourceName = webUrl!;
      }

      const chunks = await splitMarkdownDocument(markdown, sourceName, user.id, user.tier);

      await checkMetrics(c.env.DB, user.id, pages, chunks.length, deductedPagesCrawled);
      await deductMetrics(c.env.DB, user.id, pages, chunks.length, deductedPagesCrawled);
      deductedParsedPages = pages;
      deductedChunks = chunks.length;
      console.log('Chunks to be vectorized:', chunks.length, 'for user:', user.id);
      console.log('First chunk metadata:', chunks[0]?.metadata);

      await vectorizeDocuments(c.env, chunks);

      return c.json({ msg: 'Document ingested successfully', pages, chunks: chunks.length });
    } catch (err) {
      await refundMetrics(
        c.env.DB,
        user.id,
        deductedParsedPages,
        deductedChunks,
        deductedPagesCrawled,
      );
      throw err;
    }
  }),
);

app.post(
  '/chat',
  authenticationMiddleware,
  openaiMiddleware,
  asyncHandler<chatEnv>(async (c) => {
    const body = await c.req.json();
    const { message } = await chatInputSchema.parseAsync(body);
    const user = c.get('user');

    // Check query (1) and token (10) quota before any API calls
    await checkQueryMetrics(c.env.DB, user.id, 10);

    const results = await semanticSearch(c.env.AI, c.env.VECTORIZE, message, user.id);

    const context =
      results.length > 0
        ? results.map((r) => `[${r.source}] ${r.pageContent}`).join('\n\n---\n\n')
        : 'No relevant context found.';

    const ai = c.get('openai');

    // Deduct 1 query and 10 tokens
    await deductQueryMetrics(c.env.DB, user.id, 10);

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
