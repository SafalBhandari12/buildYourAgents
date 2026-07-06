import type { MiddlewareHandler } from 'hono';
import { auth } from '../../auth';
import { BetterAuthEnv, DBEnv } from '../lib/env';
import { User } from '../db/auth-schema';
import { validateApiKey } from '../lib/api-key-utils';

export const authenticationMiddleware: MiddlewareHandler<BetterAuthEnv & DBEnv> = async (
  c,
  next,
) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (authHeader?.startsWith('Bearer sabai_')) {
      const rawKey = authHeader.slice(7);
      const user = await validateApiKey(c.env.DB, rawKey);

      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      c.set('user', user);
      await next();
      return;
    }

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

export const sessionOnlyMiddleware: MiddlewareHandler<BetterAuthEnv> = async (c, next) => {
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
    console.error('Error in session-only middleware:', error);
    return c.json({ error: 'Unauthorized' }, 500);
  }
};
