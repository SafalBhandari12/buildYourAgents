import { Hono, Env } from 'hono';
import { asyncHandler } from '../lib/errorHandler';
import { sessionOnlyMiddleware } from '../middleware/authenticationMiddleware';
import { ensureMetrics } from '../lib/metrics';
import { BetterAuthEnv } from '../lib/env';

const metricsRoute = new Hono<Env>();

metricsRoute.use(sessionOnlyMiddleware);

metricsRoute.get(
  '/',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const user = c.get('user');
    const m = await ensureMetrics(c.env.DB, user.id);

    return c.json({
      chunksGenerated: m.chunksGenerated,
      chunksRemaining: m.chunksRemaining,
      queriesExecuted: m.queriesExecuted,
      queriesRemaining: m.queriesRemaining,
      tokensUsed: m.tokensUsed,
      tokensRemaining: m.tokensRemaining,
      pagesCrawled: m.pagesCrawled,
      pagesCrawledRemaining: m.pagesCrawledRemaining,
    });
  }),
);

export default metricsRoute;
