import { eq, sql } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { metrics } from '../db/metrics-schema';
import { getDB } from './db';

export async function ensureMetrics(DB: D1Database, userId: string) {
  const db = getDB(DB);
  let row = await db.select().from(metrics).where(eq(metrics.userId, userId)).get();

  if (!row) {
    const id = crypto.randomUUID();
    await db.insert(metrics).values({ id, userId }).run();
    row = await db.select().from(metrics).where(eq(metrics.userId, userId)).get();
  }

  return row!;
}

export async function checkMetrics(
  DB: D1Database,
  userId: string,
  chunks: number,
  pagesCrawled: number = 0,
) {
  const m = await ensureMetrics(DB, userId);

  if (m.pagesCrawledRemaining < pagesCrawled) {
    throw new Error(
      `Page crawl quota exceeded: you have ${m.pagesCrawledRemaining} pages remaining but need ${pagesCrawled}.`,
    );
  }

  if (m.chunksRemaining < chunks) {
    throw new Error(
      `Chunk quota exceeded: you have ${m.chunksRemaining} chunks remaining but need ${chunks}.`,
    );
  }
}

export async function checkQueryMetrics(DB: D1Database, userId: string, requiredTokens: number) {
  const m = await ensureMetrics(DB, userId);

  if (m.queriesRemaining < 1) {
    throw new Error('Query quota exceeded: you have 0 queries remaining.');
  }

  if (m.tokensRemaining < requiredTokens) {
    throw new Error(
      `Token quota exceeded: you have ${m.tokensRemaining} tokens remaining but need ${requiredTokens}.`,
    );
  }
}

export async function deductMetrics(
  DB: D1Database,
  userId: string,
  chunks: number,
  pagesCrawled: number = 0,
) {
  const db = getDB(DB);

  await db.batch([
    db
      .update(metrics)
      .set({
        pagesCrawled: sql`pages_crawled + ${pagesCrawled}`,
        pagesCrawledRemaining: sql`pages_crawled_remaining - ${pagesCrawled}`,
      })
      .where(eq(metrics.userId, userId)),
    db
      .update(metrics)
      .set({
        chunksGenerated: sql`chunks_generated + ${chunks}`,
        chunksRemaining: sql`chunks_remaining - ${chunks}`,
      })
      .where(eq(metrics.userId, userId)),
  ]);
}

export async function refundMetrics(
  DB: D1Database,
  userId: string,
  chunks: number,
  pagesCrawled: number = 0,
) {
  const db = getDB(DB);

  await db.batch([
    db
      .update(metrics)
      .set({
        pagesCrawled: sql`MAX(0, pages_crawled - ${pagesCrawled})`,
        pagesCrawledRemaining: sql`pages_crawled_remaining + ${pagesCrawled}`,
      })
      .where(eq(metrics.userId, userId)),
    db
      .update(metrics)
      .set({
        chunksGenerated: sql`MAX(0, chunks_generated - ${chunks})`,
        chunksRemaining: sql`chunks_remaining + ${chunks}`,
      })
      .where(eq(metrics.userId, userId)),
  ]);
}

export async function deductQueryMetrics(DB: D1Database, userId: string, amount: number) {
  const db = getDB(DB);

  await db.batch([
    db
      .update(metrics)
      .set({
        queriesExecuted: sql`queries_executed + 1`,
        queriesRemaining: sql`queries_remaining - 1`,
      })
      .where(eq(metrics.userId, userId)),
    db
      .update(metrics)
      .set({
        tokensUsed: sql`tokens_used + ${amount}`,
        tokensRemaining: sql`tokens_remaining - ${amount}`,
      })
      .where(eq(metrics.userId, userId)),
  ]);
}
