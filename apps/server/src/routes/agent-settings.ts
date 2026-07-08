import { Hono, Env } from 'hono';
import { eq } from 'drizzle-orm';
import { asyncHandler } from '../lib/errorHandler';
import { sessionOnlyMiddleware } from '../middleware/authenticationMiddleware';
import { agentSettingsInputSchema, MIN_TOKEN_LIMIT, MAX_TOKEN_LIMIT } from '../schema';
import { ensureMetrics } from '../lib/metrics';
import { getDb } from '../db';
import { metrics } from '../db/metrics-schema';
import { BetterAuthEnv } from '../lib/env';

const agentSettingsRoute = new Hono<Env>();

agentSettingsRoute.use(sessionOnlyMiddleware);

agentSettingsRoute.get(
  '/',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const user = c.get('user');
    const m = await ensureMetrics(c.env.DB, user.id);

    return c.json({
      temperature: m.temperature,
      systemPrompt: m.systemPrompt,
      maxInputTokens: m.maxInputTokens,
      maxOutputTokens: m.maxOutputTokens,
      minTokenLimit: MIN_TOKEN_LIMIT,
      maxTokenLimit: MAX_TOKEN_LIMIT,
    });
  }),
);

agentSettingsRoute.put(
  '/',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const { temperature, systemPrompt, maxInputTokens, maxOutputTokens } =
      agentSettingsInputSchema.parse(body);

    await ensureMetrics(c.env.DB, user.id);
    const db = getDb(c.env.DB);
    await db
      .update(metrics)
      .set({
        temperature,
        systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : null,
        maxInputTokens,
        maxOutputTokens,
      })
      .where(eq(metrics.userId, user.id));

    return c.json({ success: true });
  }),
);

export default agentSettingsRoute;
