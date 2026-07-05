import { Env, Hono } from 'hono';
import { globalErrorHandler } from './lib/errorHandler';
import v1 from './routes';
import { rateLimiterMiddleware } from './middleware/rateLimiter';

const app = new Hono<Env>();

app.onError(globalErrorHandler);

app.use(rateLimiterMiddleware);

app.route('/api/v1', v1);

export default app;
