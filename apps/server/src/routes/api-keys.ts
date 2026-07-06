import { Hono, Env } from 'hono';
import { eq, and } from 'drizzle-orm';
import { asyncHandler } from '../lib/errorHandler';
import { generateApiKey } from '../lib/api-key-utils';
import { createApiKeySchema } from '../schema';
import { sessionOnlyMiddleware } from '../middleware/authenticationMiddleware';
import { getDb } from '../db';
import { apiKeys } from '../db/api-key-schema';
import { BetterAuthEnv } from '../lib/env';

const apiKeysRoute = new Hono<Env>();

apiKeysRoute.use(sessionOnlyMiddleware);

apiKeysRoute.post(
  '/',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const body = await c.req.json();
    const { name } = createApiKeySchema.parse(body);
    const user = c.get('user');

    const { rawKey, hash, prefix } = await generateApiKey();
    const db = getDb(c.env.DB);

    const id = crypto.randomUUID();
    await db.insert(apiKeys).values({
      id,
      userId: user.id,
      name,
      keyHash: hash,
      prefix,
    });

    return c.json({
      id,
      name,
      key: rawKey,
      prefix,
      createdAt: new Date().toISOString(),
    }, 201);
  }),
);

apiKeysRoute.get(
  '/',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const user = c.get('user');
    const db = getDb(c.env.DB);

    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, user.id));

    return c.json({ keys });
  }),
);

apiKeysRoute.delete(
  '/:id',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const keyId = c.req.param('id');
    if (!keyId) {
      return c.json({ error: 'Missing key id' }, 400);
    }
    const user = c.get('user');
    const db = getDb(c.env.DB);

    await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, user.id)));

    return c.json({ success: true });
  }),
);

export default apiKeysRoute;
