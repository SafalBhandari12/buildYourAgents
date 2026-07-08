import { Hono, Env } from 'hono';
import { eq, and, asc } from 'drizzle-orm';
import { asyncHandler } from '../lib/errorHandler';
import { BadRequestError, NotFoundError } from '../lib/errors';
import { createLlmKeySchema, llmKeyOrderSchema } from '../schema';
import { sessionOnlyMiddleware } from '../middleware/authenticationMiddleware';
import { getDb } from '../db';
import { llmApiKeys as llmApiKeysTable, metrics } from '../db/metrics-schema';
import { ensureMetrics } from '../lib/metrics';
import { encryptApiKey } from '../lib/llm-key-crypto';
import { resolveOrder } from '../lib/llmChain';
import { BetterAuthEnv, llmKeyEnv } from '../lib/env';

const llmKeysRoute = new Hono<Env>();

llmKeysRoute.use(sessionOnlyMiddleware);

llmKeysRoute.get(
  '/',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const user = c.get('user');
    const db = getDb(c.env.DB);

    const [keys, m] = await Promise.all([
      db
        .select({
          id: llmApiKeysTable.id,
          provider: llmApiKeysTable.provider,
          name: llmApiKeysTable.name,
          model: llmApiKeysTable.model,
          baseUrl: llmApiKeysTable.baseUrl,
          createdAt: llmApiKeysTable.createdAt,
          rateLimitTimestamp: llmApiKeysTable.rateLimitTimestamp,
        })
        .from(llmApiKeysTable)
        .where(eq(llmApiKeysTable.userId, user.id))
        .orderBy(asc(llmApiKeysTable.createdAt)),
      ensureMetrics(c.env.DB, user.id),
    ]);

    const order = resolveOrder(m.llmChainOrder, keys.map((k) => k.id));

    return c.json({ keys, order });
  }),
);

llmKeysRoute.post(
  '/',
  asyncHandler<BetterAuthEnv & llmKeyEnv>(async (c) => {
    const body = await c.req.json();
    const { provider, name, model, apiKey, baseUrl } = createLlmKeySchema.parse(body);
    const user = c.get('user');
    const db = getDb(c.env.DB);

    const encryptedApiKey = await encryptApiKey(apiKey, c.env.LLM_KEY_ENCRYPTION_SECRET);
    const id = crypto.randomUUID();

    await db.insert(llmApiKeysTable).values({
      id,
      userId: user.id,
      provider,
      name,
      model,
      baseUrl: baseUrl ?? null,
      encryptedApiKey,
    });

    const m = await ensureMetrics(c.env.DB, user.id);
    const existingIds = await db
      .select({ id: llmApiKeysTable.id })
      .from(llmApiKeysTable)
      .where(eq(llmApiKeysTable.userId, user.id))
      .orderBy(asc(llmApiKeysTable.createdAt));
    const order = resolveOrder(m.llmChainOrder, existingIds.map((k) => k.id));

    await db.update(metrics).set({ llmChainOrder: JSON.stringify(order) }).where(eq(metrics.userId, user.id));

    return c.json({ id, provider, name, model, baseUrl: baseUrl ?? null, createdAt: new Date().toISOString() }, 201);
  }),
);

llmKeysRoute.delete(
  '/:id',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const keyId = c.req.param('id');
    if (!keyId) {
      throw new BadRequestError('Missing key id');
    }
    const user = c.get('user');
    const db = getDb(c.env.DB);

    const existing = await db
      .select({ id: llmApiKeysTable.id })
      .from(llmApiKeysTable)
      .where(and(eq(llmApiKeysTable.id, keyId), eq(llmApiKeysTable.userId, user.id)))
      .get();

    if (!existing) {
      throw new NotFoundError('LLM key not found');
    }

    await db
      .delete(llmApiKeysTable)
      .where(and(eq(llmApiKeysTable.id, keyId), eq(llmApiKeysTable.userId, user.id)));

    const m = await ensureMetrics(c.env.DB, user.id);
    if (m.llmChainOrder) {
      try {
        const parsed = JSON.parse(m.llmChainOrder);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((id) => id !== keyId);
          await db
            .update(metrics)
            .set({ llmChainOrder: JSON.stringify(filtered) })
            .where(eq(metrics.userId, user.id));
        }
      } catch {
        // malformed saved order — nothing to clean up
      }
    }

    return c.json({ success: true });
  }),
);

llmKeysRoute.put(
  '/order',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const body = await c.req.json();
    const { order } = llmKeyOrderSchema.parse(body);
    const user = c.get('user');
    const db = getDb(c.env.DB);

    const ownedKeys = await db
      .select({ id: llmApiKeysTable.id })
      .from(llmApiKeysTable)
      .where(eq(llmApiKeysTable.userId, user.id));
    const ownedIds = new Set(ownedKeys.map((k) => k.id));

    const invalid = order.filter((id) => id !== 'platform' && !ownedIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestError('Order contains keys that do not belong to you');
    }

    await ensureMetrics(c.env.DB, user.id);
    await db
      .update(metrics)
      .set({ llmChainOrder: JSON.stringify(order) })
      .where(eq(metrics.userId, user.id));

    return c.json({ success: true, order });
  }),
);

export default llmKeysRoute;
