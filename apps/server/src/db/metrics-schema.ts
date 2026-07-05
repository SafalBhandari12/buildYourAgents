import { relations } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { users } from './auth-schema';

export const metrics = sqliteTable(
  'metrics',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    pagesParsed: integer('pages_parsed').notNull().default(0),
    pagesParsedRemaining: integer('pages_parsed_remaining').notNull().default(40),
    chunksGenerated: integer('chunks_generated').notNull().default(0),
    chunksRemaining: integer('chunks_remaining').notNull().default(40),
    queriesExecuted: integer('queries_executed').notNull().default(0),
    queriesRemaining: integer('queries_remaining').notNull().default(100),
    tokensUsed: integer('tokens_used').notNull().default(0),
    tokensRemaining: integer('tokens_remaining').notNull().default(100),
    pagesCrawled: integer('pages_crawled').notNull().default(0),
    pagesCrawledRemaining: integer('pages_crawled_remaining').notNull().default(40),
  },
  (table) => [uniqueIndex('metrics_user_id_idx').on(table.userId)],
);

export const llmApiKeys = sqliteTable('llm_api_keys', {
  id: text('id').primaryKey(),
  provider: text('provider', {
    enum: ['gemini', 'openAi', 'openAiCompatible', 'claude', 'deepseek', 'groq'],
  }).notNull(),
  name: text('name').notNull(),
  encryptedApiKey: text('encrypted_api_key').notNull(),
  expiryDate: integer('expiry_date', { mode: 'timestamp_ms' }),
  rateLimitTimestamp: integer('rate_limit_timestamp', { mode: 'timestamp_ms' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
});

export const metricsRelations = relations(metrics, ({ one }) => ({
  user: one(users, {
    fields: [metrics.userId],
    references: [users.id],
  }),
}));

export const llmApiKeysRelations = relations(llmApiKeys, ({ one }) => ({
  user: one(users, {
    fields: [llmApiKeys.userId],
    references: [users.id],
  }),
}));
