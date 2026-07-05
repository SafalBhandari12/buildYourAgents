import { Hono } from 'hono';
import ai from './ai';
import authRoute from './auth';

const v1 = new Hono();

v1.route('/', ai);
v1.route('/auth', authRoute);

export default v1;
