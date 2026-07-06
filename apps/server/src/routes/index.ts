import { Context, Hono } from 'hono';
import ai from './ai';
import authRoute from './auth';
import apiKeys from './api-keys';

const v1 = new Hono();

v1.route('/auth', authRoute);

v1.route('/api-keys', apiKeys);

v1.route('/', ai);

export default v1;
