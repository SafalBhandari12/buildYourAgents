import { Env, Hono } from 'hono';
import { cors } from 'hono/cors';
import { globalErrorHandler } from './lib/errorHandler';
import v1 from './routes';

const app = new Hono<Env>();

app.onError(globalErrorHandler);

function normalizeOrigin(url: string): string {
  return url.replace(/\/$/, '');
}

app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const frontendUrl = normalizeOrigin(c.env.FRONTEND_URL);
      const allowed = new Set([
        frontendUrl,
        frontendUrl.replace('://localhost', '://127.0.0.1'),
        frontendUrl.replace('://127.0.0.1', '://localhost'),
      ]);
      return allowed.has(normalizeOrigin(origin)) ? origin : '';
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['X-RAG-Sources'],
  }),
);

app.route('/api/v1', v1);

export default app;
