import { Env, Hono } from 'hono';
import { cors } from 'hono/cors';
import { globalErrorHandler } from './lib/errorHandler';
import v1 from './routes';

const app = new Hono<Env>();

app.onError(globalErrorHandler);

app.use(
  '*',
  cors({
    origin: (origin, c) => (origin === c.env.FRONTEND_URL ? origin : ''),
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['X-RAG-Sources'],
  }),
);

app.route('/api/v1', v1);

export default app;
