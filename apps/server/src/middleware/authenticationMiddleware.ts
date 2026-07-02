import type { MiddlewareHandler } from 'hono';
import { createAuth } from '../../auth';
import { BetterAuthEnv } from '../lib/env';

export const authenticationMiddleware: MiddlewareHandler<BetterAuthEnv> = async (c, next) => {
  try {
    const auth = createAuth(c.env);

    const session = await auth.api.getSession(c.req.raw);
    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    c.set('userId', session.user.id);

    await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized' }, 500);
  }
};
