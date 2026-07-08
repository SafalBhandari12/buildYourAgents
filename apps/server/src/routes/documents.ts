import { Hono, Env } from 'hono';
import { eq, and } from 'drizzle-orm';
import { asyncHandler } from '../lib/errorHandler';
import { BadRequestError, NotFoundError } from '../lib/errors';
import { sessionOnlyMiddleware } from '../middleware/authenticationMiddleware';
import { getDb } from '../db';
import { documents } from '../db/document-schema';
import { BetterAuthEnv, cloudflareAiEnv } from '../lib/env';

const documentsRoute = new Hono<Env>();

documentsRoute.use(sessionOnlyMiddleware);

documentsRoute.get(
  '/',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const user = c.get('user');
    const db = getDb(c.env.DB);

    const rows = await db
      .select({
        id: documents.id,
        name: documents.name,
        type: documents.type,
        sizeBytes: documents.sizeBytes,
        chunkCount: documents.chunkCount,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(eq(documents.userId, user.id));

    return c.json({ documents: rows });
  }),
);

documentsRoute.delete(
  '/:id',
  asyncHandler<BetterAuthEnv & cloudflareAiEnv>(async (c) => {
    const docId = c.req.param('id');
    if (!docId) {
      throw new BadRequestError('Missing document id');
    }
    const user = c.get('user');
    const db = getDb(c.env.DB);

    const row = await db
      .select({ chunkIds: documents.chunkIds })
      .from(documents)
      .where(and(eq(documents.id, docId), eq(documents.userId, user.id)))
      .get();

    if (!row) {
      throw new NotFoundError('Document not found');
    }

    const chunkIds: string[] = JSON.parse(row.chunkIds);
    if (chunkIds.length > 0) {
      await c.env.VECTORIZE.deleteByIds(chunkIds);
    }

    await db
      .delete(documents)
      .where(and(eq(documents.id, docId), eq(documents.userId, user.id)));

    return c.json({ success: true });
  }),
);

export default documentsRoute;
