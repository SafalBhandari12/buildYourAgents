import { Hono, Env } from 'hono';
import { asyncHandler } from '../lib/errorHandler';
import { BetterAuthEnv } from '../lib/env';
import { auth } from '../../auth';

const authRoute = new Hono<Env>();

authRoute.on(
  ['GET', 'POST'],
  '/*',
  asyncHandler<BetterAuthEnv>(async (c) => {
    const client = auth(c.env);
    return await client.handler(c.req.raw);
  }),
);

export default authRoute;
