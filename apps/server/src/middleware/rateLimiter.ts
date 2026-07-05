import { Context, MiddlewareHandler, Next } from 'hono';
import { BetterAuthEnv, RateLimitEnv } from '../lib/env';

export const rateLimiterMiddleware: MiddlewareHandler<RateLimitEnv & BetterAuthEnv> = async (
  c,
  next,
) => {
  const url = new URL(c.req.url);

  const limiter = c.env.GENERAL_RATE_LIMIT;

  let key;

  if (c.get('user') === undefined) {
    key = `${c.req.method}:${url.pathname}:${c.header('cf-connecting-ip')}`;
  } else {
    key = `${c.req.method}:${url.pathname}:${c.get('user')!.id}`;
  }

  const { success } = await limiter.limit({ key });
  if (!success) {
    return c.json({ error: 'Too many requests' }, 429);
  }

  await next();
};
