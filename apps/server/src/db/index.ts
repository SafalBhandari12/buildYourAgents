import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import * as blogSchema from './schema';

/**
 * Connects to Cloudflare D1 and returns a typed Drizzle ORM instance.
 * Uses the spread operator to automatically ingest all schemas and relations.
 */
export function getDb(d1: D1Database) {
  return drizzle(d1, {
    schema: {
      ...blogSchema,
    },
  });
}

// Optional: Export a type helper for your database instance across the app
export type AppDb = ReturnType<typeof getDb>;
