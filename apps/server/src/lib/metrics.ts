import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { D1Database } from '@cloudflare/workers-types';
import { metrics } from '../db/metrics-schema';

async function getDB(DB: D1Database) {
  return drizzle(DB, { schema });
}

async function ensureMetrics(DB: D1Database, userId: string) {
  const db = await getDB(DB);
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
  pages: number,
  chunks: number,
) {
  const m = await ensureMetrics(DB, userId);

  if (m.pagesRemaining < pages) {
    throw new Error(
      `Page quota exceeded: you have ${m.pagesRemaining} pages remaining but need ${pages}.`,
    );
  }

  if (m.chunksRemaining < chunks) {
    throw new Error(
      `Chunk quota exceeded: you have ${m.chunksRemaining} chunks remaining but need ${chunks}.`,
    );
  }
}

export async function deductMetrics(
  DB: D1Database,
  userId: string,
  pages: number,
  chunks: number,
) {
  const db = await getDB(DB);

  await db.transaction(async (tx) => {
    const m = await tx.select().from(metrics).where(eq(metrics.userId, userId)).get();
    if (!m) return;

    await tx
      .update(metrics)
      .set({
        pagesParsed: m.pagesParsed + pages,
        pagesRemaining: m.pagesRemaining - pages,
        chunksGenerated: m.chunksGenerated + chunks,
        chunksRemaining: m.chunksRemaining - chunks,
      })
      .where(eq(metrics.userId, userId))
      .run();
  });
}

export async function refundMetrics(
  DB: D1Database,
  userId: string,
  pages: number,
  chunks: number,
) {
  const db = await getDB(DB);

  await db.transaction(async (tx) => {
    const m = await tx.select().from(metrics).where(eq(metrics.userId, userId)).get();
    if (!m) return;

    await tx
      .update(metrics)
      .set({
        pagesParsed: Math.max(0, m.pagesParsed - pages),
        pagesRemaining: m.pagesRemaining + pages,
        chunksGenerated: Math.max(0, m.chunksGenerated - chunks),
        chunksRemaining: m.chunksRemaining + chunks,
      })
      .where(eq(metrics.userId, userId))
      .run();
  });
}
