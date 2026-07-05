import { MiddlewareHandler } from 'hono';
import { BetterAuthEnv, RateLimitEnv } from '../lib/env';

export const rateLimiterMiddleware: MiddlewareHandler<RateLimitEnv & BetterAuthEnv> = async (
  c,
  next,
) => {
  const url = new URL(c.req.url);
  const limiter = c.env.GENERAL_RATE_LIMIT;

  const user = c.get('user');
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  const key = user
    ? `${c.req.method}:${url.pathname}:${user.id}`
    : `${c.req.method}:${url.pathname}:${ip}`;

  const { success } = await limiter.limit({ key });
  if (!success) {
    return c.json({ error: 'Too many requests' }, 429);
  }

  await next();
};
