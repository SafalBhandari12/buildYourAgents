import { Hono, Env } from 'hono';
import { eq, desc, count } from 'drizzle-orm';
import { asyncHandler } from '../lib/errorHandler';
import { sessionOnlyMiddleware } from '../middleware/authenticationMiddleware';
import { getDb } from '../db';
import { chatHistory } from '../db/chat-history-schema';
import { BetterAuthEnv } from '../lib/env';

const chatHistoryRoute = new Hono<Env>();

chatHistoryRoute.use(sessionOnlyMiddleware);

const PAGE_SIZE = 20;

chatHistoryRoute.get(
  '/',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const user = c.get('user');
    const db = getDb(c.env.DB);

    const requestedPage = Number(c.req.query('page'));
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

    const [rows, totalRow] = await Promise.all([
      db
        .select({
          id: chatHistory.id,
          message: chatHistory.message,
          response: chatHistory.response,
          provider: chatHistory.provider,
          model: chatHistory.model,
          failedAttempts: chatHistory.failedAttempts,
          durationMs: chatHistory.durationMs,
          createdAt: chatHistory.createdAt,
        })
        .from(chatHistory)
        .where(eq(chatHistory.userId, user.id))
        .orderBy(desc(chatHistory.createdAt))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      db.select({ total: count() }).from(chatHistory).where(eq(chatHistory.userId, user.id)),
    ]);

    const total = totalRow[0]?.total ?? 0;

    return c.json({
      history: rows,
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  }),
);

export default chatHistoryRoute;
