import { Hono, Env } from 'hono';
import { streamText } from 'hono/streaming';
import { openaiMiddleware } from '../lib/gpt';
import { chatInputSchema, ingestInputSchema } from '../schema';
import { parseFile } from '../lib/llamaParse';
import { asyncHandler } from '../lib/errorHandler';
import { BadRequestError } from '../lib/errors';
import { BetterAuthEnv, chatEnv, cloudflareAiEnv, firecrawlEnv } from '../lib/env';
import { splitMarkdownDocument } from '../lib/splitter';
import { vectorizeDocuments } from '../lib/vectorizeDocuments';
import { semanticSearch } from '../lib/search';
import { FirecrawlClient } from 'firecrawl';

import {
  checkMetrics,
  checkQueryMetrics,
  deductMetrics,
  deductQueryMetrics,
  ensureMetrics,
  refundMetrics,
} from '../lib/metrics';
import { authenticationMiddleware } from '../middleware/authenticationMiddleware';
import { rateLimiterMiddleware } from '../middleware/rateLimiter';

const ai = new Hono<Env>();

ai.use(authenticationMiddleware);
ai.use(rateLimiterMiddleware);

ai.post(
  '/ingest',
  asyncHandler<cloudflareAiEnv & BetterAuthEnv & firecrawlEnv>(async (c) => {
    const form = await c.req.formData();
    const { file, webUrl } = ingestInputSchema.parse({
      file: form.get('file') ?? undefined,
      webUrl: form.get('webUrl') ?? undefined,
    });
    const user = c.get('user');

    let markdown: string;
    let sourceName: string;

    let deductedChunks = 0;
    let deductedPagesCrawled = 0;

    try {
      if (file) {
        // PDF pipeline — local LiteParse
        markdown = await parseFile(file);
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

      await checkMetrics(c.env.DB, user.id, chunks.length, deductedPagesCrawled);
      await deductMetrics(c.env.DB, user.id, chunks.length, deductedPagesCrawled);
      deductedChunks = chunks.length;

      await vectorizeDocuments(c.env, chunks);

      return c.json({ msg: 'Document ingested successfully', chunks: chunks.length });
    } catch (err) {
      await refundMetrics(
        c.env.DB,
        user.id,
        deductedChunks,
        deductedPagesCrawled,
      );
      throw err;
    }
  }),
);

ai.post(
  '/chat',
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

    return streamText(c, async (streamWriter) => {
      try {
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

        // Deduct only after a successful stream
        await deductQueryMetrics(c.env.DB, user.id, 10);
      } catch (err) {
        console.error('Chat stream failed:', err);
        throw err;
      }
    });
  }),
);

export default ai;
