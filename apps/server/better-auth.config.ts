import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './src/db/schema';
import { jwt } from 'better-auth/plugins';

// Create a dummy DB only so the CLI can inspect the config.
// It won't actually connect when generating schema.
const db = drizzle({} as D1Database, { schema });

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
    usePlural: true,
  }),
  secret: '',
  baseURL: '',
  plugins: [jwt()],
});
