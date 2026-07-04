import type { MiddlewareHandler } from 'hono';
import { auth } from '../../auth';
import { BetterAuthEnv } from '../lib/env';
import { User } from '../db/auth-schema';

export const authenticationMiddleware: MiddlewareHandler<BetterAuthEnv> = async (c, next) => {
  try {
    const client = auth(c.env);

    const session = await client.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    c.set('user', {
      ...session.user,
    } as User);

    await next();
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    return c.json({ error: 'Unauthorized' }, 500);
  }
};
