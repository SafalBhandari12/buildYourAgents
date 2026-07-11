import { Hono, Env } from 'hono';
import { eq } from 'drizzle-orm';
import { asyncHandler } from '../lib/errorHandler';
import { sessionOnlyMiddleware } from '../middleware/authenticationMiddleware';
import { onboardingInputSchema } from '../schema';
import { getDb } from '../db';
import { users } from '../db/auth-schema';
import { BetterAuthEnv } from '../lib/env';

const onboardingRoute = new Hono<Env>();

onboardingRoute.use(sessionOnlyMiddleware);

onboardingRoute.put(
  '/',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const { isNewToAgents } = onboardingInputSchema.parse(body);

    const db = getDb(c.env.DB);
    await db
      .update(users)
      .set({
        onboardingAnsweredAt: new Date(),
        isNewToAgents,
      })
      .where(eq(users.id, user.id));

    return c.json({ success: true });
  }),
);

export default onboardingRoute;
