import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

/**
 * Connects to Cloudflare D1 and returns a typed Drizzle ORM instance.
 * Uses the spread operator to automatically ingest all schemas and relations.
 */
export function getDb(d1: D1Database) {
  return drizzle(d1, {
    schema: { ...schema },
  });
}

// Optional: Export a type helper for your database instance across the app
export type AppDb = ReturnType<typeof getDb>;
