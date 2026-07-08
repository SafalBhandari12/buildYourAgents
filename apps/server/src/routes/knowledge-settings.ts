import { Hono, Env } from 'hono';
import { eq } from 'drizzle-orm';
import { asyncHandler } from '../lib/errorHandler';
import { sessionOnlyMiddleware } from '../middleware/authenticationMiddleware';
import {
  knowledgeBaseSettingsInputSchema,
  MIN_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
  MIN_CHUNK_OVERLAP,
  MAX_CHUNK_OVERLAP,
} from '../schema';
import { ensureMetrics } from '../lib/metrics';
import { getDb } from '../db';
import { metrics } from '../db/metrics-schema';
import { BetterAuthEnv } from '../lib/env';

const knowledgeSettingsRoute = new Hono<Env>();

knowledgeSettingsRoute.use(sessionOnlyMiddleware);

knowledgeSettingsRoute.get(
  '/',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const user = c.get('user');
    const m = await ensureMetrics(c.env.DB, user.id);

    return c.json({
      chunkSize: m.chunkSize,
      chunkOverlap: m.chunkOverlap,
      minChunkSize: MIN_CHUNK_SIZE,
      maxChunkSize: MAX_CHUNK_SIZE,
      minChunkOverlap: MIN_CHUNK_OVERLAP,
      maxChunkOverlap: MAX_CHUNK_OVERLAP,
      isFreeTier: user.tier === 'free',
    });
  }),
);

knowledgeSettingsRoute.put(
  '/',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const { chunkSize, chunkOverlap } = knowledgeBaseSettingsInputSchema.parse(body);

    await ensureMetrics(c.env.DB, user.id);
    const db = getDb(c.env.DB);
    await db.update(metrics).set({ chunkSize, chunkOverlap }).where(eq(metrics.userId, user.id));

    return c.json({ success: true });
  }),
);

export default knowledgeSettingsRoute;
