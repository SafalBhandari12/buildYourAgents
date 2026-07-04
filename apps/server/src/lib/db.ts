import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import type { D1Database } from '@cloudflare/workers-types';

export function getDB(DB: D1Database) {
  return drizzle(DB, { schema });
}
