import { Env, Hono } from 'hono';
import { globalErrorHandler } from './lib/errorHandler';
import v1 from './routes';

const app = new Hono<Env>();

app.onError(globalErrorHandler);

app.route('/api/v1', v1);

export default app;
