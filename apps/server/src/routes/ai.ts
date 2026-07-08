import { Hono, Env } from 'hono';
import OpenAI, { RateLimitError as OpenAIRateLimitError } from 'openai';
import { eq, asc } from 'drizzle-orm';
import {
  chatInputSchema,
  ingestInputSchema,
  estimateTokenCount,
  DEFAULT_MAX_INPUT_TOKENS,
  DEFAULT_MAX_OUTPUT_TOKENS,
} from '../schema';
import { parseFile } from '../lib/llamaParse';
import { asyncHandler } from '../lib/errorHandler';
import { BetterAuthEnv, chatEnv, cloudflareAiEnv, firecrawlEnv } from '../lib/env';
import { splitMarkdownDocument } from '../lib/splitter';
import { vectorizeDocuments } from '../lib/vectorizeDocuments';
import { semanticSearch } from '../lib/search';
import { FirecrawlClient } from 'firecrawl';
import { getDb } from '../db';
import { documents } from '../db/document-schema';
import { llmApiKeys } from '../db/metrics-schema';
import { chatHistory } from '../db/chat-history-schema';
import { buildClientForKey, isCoolingDown, resolveOrder } from '../lib/llmChain';

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
    const sourceType: 'file' | 'url' = file ? 'file' : 'url';

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

      const m = await ensureMetrics(c.env.DB, user.id);
      console.log(markdown);
      const chunks = await splitMarkdownDocument(
        markdown,
        sourceName,
        user.id,
        { chunkSize: m.chunkSize, chunkOverlap: m.chunkOverlap, strategy: m.chunkingStrategy },
        user.tier,
      );
      console.log(chunks);

      await checkMetrics(c.env.DB, user.id, chunks.length, deductedPagesCrawled);
      await deductMetrics(c.env.DB, user.id, chunks.length, deductedPagesCrawled);
      deductedChunks = chunks.length;

      await vectorizeDocuments(c.env, chunks);

      const db = getDb(c.env.DB);
      await db.insert(documents).values({
        id: crypto.randomUUID(),
        userId: user.id,
        name: sourceName,
        type: sourceType,
        sizeBytes: file ? file.size : null,
        chunkCount: chunks.length,
        chunkIds: JSON.stringify(chunks.map((c) => c.metadata.chunkId)),
      });

      return c.json({ msg: 'Document ingested successfully', chunks: chunks.length });
    } catch (err) {
      await refundMetrics(c.env.DB, user.id, deductedChunks, deductedPagesCrawled);
      throw err;
    }
  }),
);

ai.post(
  '/chat',
  asyncHandler<chatEnv>(async (c) => {
    const body = await c.req.json();
    const { message } = await chatInputSchema.parseAsync(body);
    const user = c.get('user');

    const db = getDb(c.env.DB);
    const [keys, m] = await Promise.all([
      db
        .select()
        .from(llmApiKeys)
        .where(eq(llmApiKeys.userId, user.id))
        .orderBy(asc(llmApiKeys.createdAt)),
      ensureMetrics(c.env.DB, user.id),
    ]);

    const results = await semanticSearch(c.env.AI, c.env.VECTORIZE, message, user.id);

    const context =
      results.length > 0
        ? results.map((r) => `[${r.source}] ${r.pageContent}`).join('\n\n---\n\n')
        : 'No relevant context found.';

    const sources = Array.from(
      new Map(
        results.map((r) => [r.source, { source: r.source, documentTitle: r.documentTitle }]),
      ).values(),
    );

    const systemPromptText = m.systemPrompt?.trim()
      ? m.systemPrompt
      : "You are a helpful assistant. Use the following context to answer the user's question. If the context doesn't contain relevant information, just answer based on your own knowledge.";

    const messages = [
      {
        role: 'system' as const,
        content: `${systemPromptText}

Context:
${context}`,
      },
      { role: 'user' as const, content: message },
    ];

    const order = resolveOrder(
      m.llmChainOrder,
      keys.map((k) => k.id),
    );
    const keyById = new Map(keys.map((k) => [k.id, k]));
    const now = Date.now();

    // Hono's streamText() (and the underlying c.newResponse()) can't skip Cloudflare's
    // automatic response compression, which buffers the *entire* body before compressing
    // it — defeating streaming outright for any client that sends Accept-Encoding (i.e.
    // every browser). Building the Response by hand lets us pass the Workers-specific
    // `encodeBody: 'manual'` option, which opts this response out of that compression.
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const startedAt = Date.now();
    let responseText = '';
    const failedAttempts: { provider: string; model: string | null; reason: string }[] = [];

    function errorReason(err: unknown): string {
      if (err instanceof OpenAIRateLimitError) return 'Rate limited by provider';
      if (err instanceof Error) return err.message;
      return 'Unknown error';
    }

    async function logHistory(provider: string | null, model: string | null) {
      await db.insert(chatHistory).values({
        id: crypto.randomUUID(),
        userId: user.id,
        message,
        response: responseText,
        provider,
        model,
        failedAttempts: failedAttempts.length > 0 ? JSON.stringify(failedAttempts) : null,
        durationMs: Date.now() - startedAt,
      });
    }

    (async () => {
      try {
        for (const candidateId of order) {
          if (candidateId === 'platform') {
            // The platform's own model has a fixed, non-configurable cap — user-tunable
            // maxInputTokens/maxOutputTokens only apply once one of their own keys is serving.
            if (estimateTokenCount(message) > DEFAULT_MAX_INPUT_TOKENS) {
              failedAttempts.push({
                provider: 'platform',
                model: 'gpt-5.4-mini',
                reason: `Message exceeds the platform's ${DEFAULT_MAX_INPUT_TOKENS} token input limit`,
              });
              continue;
            }

            try {
              await checkQueryMetrics(c.env.DB, user.id, 10);
            } catch {
              failedAttempts.push({
                provider: 'platform',
                model: 'gpt-5.4-mini',
                reason: 'Query quota exceeded',
              });
              continue; // no platform quota left — try the next candidate
            }

            try {
              const client = new OpenAI({
                apiKey: c.env.OPENAI_API_KEY,
                baseURL: c.env.AZURE_BASE_URl,
              });
              const stream = await client.chat.completions.create({
                model: 'gpt-5.4-mini',
                messages,
                stream: true,
                max_completion_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
                temperature: m.temperature,
              });

              for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content;
                if (delta) {
                  responseText += delta;
                  await writer.write(encoder.encode(delta));
                }
              }

              // Deduct only after a successful stream, and only for the platform's own key
              await deductQueryMetrics(c.env.DB, user.id, 10);
              await logHistory('platform', 'gpt-5.4-mini');
              return;
            } catch (err) {
              console.error('Platform LLM failed:', err);
              failedAttempts.push({
                provider: 'platform',
                model: 'gpt-5.4-mini',
                reason: errorReason(err),
              });
              continue;
            }
          }

          const row = keyById.get(candidateId);
          if (!row) continue;
          if (isCoolingDown(row, now)) {
            failedAttempts.push({
              provider: row.provider,
              model: row.model,
              reason: 'Skipped — still cooling down from a recent rate limit',
            });
            continue;
          }
          if (estimateTokenCount(message) > m.maxInputTokens) {
            failedAttempts.push({
              provider: row.provider,
              model: row.model,
              reason: `Message exceeds your configured ${m.maxInputTokens} token input limit`,
            });
            continue;
          }

          try {
            const { client, model } = await buildClientForKey(row, c.env.LLM_KEY_ENCRYPTION_SECRET);
            const stream = await client.chat.completions.create({
              model,
              messages,
              stream: true,
              temperature: m.temperature,
              max_tokens: m.maxOutputTokens,
            });

            for await (const chunk of stream) {
              const delta = chunk.choices[0]?.delta?.content;
              if (delta) {
                responseText += delta;
                await writer.write(encoder.encode(delta));
              }
            }
            await logHistory(row.provider, model);
            return;
          } catch (err) {
            if (err instanceof OpenAIRateLimitError) {
              await db
                .update(llmApiKeys)
                .set({ rateLimitTimestamp: new Date(now + 60_000) })
                .where(eq(llmApiKeys.id, row.id));
            }
            console.error(`LLM key ${row.id} (${row.provider}) failed:`, err);
            failedAttempts.push({
              provider: row.provider,
              model: row.model,
              reason: errorReason(err),
            });
            continue;
          }
        }

        responseText =
          'All configured LLM providers failed or are rate-limited. Please try again shortly.';
        await writer.write(encoder.encode(responseText));
        await logHistory(null, null);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8',
        'X-Content-Type-Options': 'nosniff',
        'X-RAG-Sources': JSON.stringify(sources),
        'Cache-Control': 'no-cache, no-transform',
        // `wrangler dev` has a known bug (cloudflare/workers-sdk#5614, #6577) where it
        // buffers the *entire* body before gzip/br-compressing it, defeating streaming
        // for any client that sends Accept-Encoding (every browser) — even though real
        // deployed Workers stream compressed responses fine. Declaring the body as
        // already "identity"-encoded stops the dev proxy from attempting to (re)compress
        // it, which is the documented workaround. Combined with encodeBody: 'manual' so
        // the runtime doesn't second-guess that declaration.
        'Content-Encoding': 'identity',
      },
      encodeBody: 'manual',
    } as ResponseInit);
  }),
);

export default ai;
