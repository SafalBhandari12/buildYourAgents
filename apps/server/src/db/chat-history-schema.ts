import { relations, sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './auth-schema';

export const chatHistory = sqliteTable('chat_history', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  response: text('response').notNull(),
  // Which candidate actually served the response — "platform", an LlmProvider value, or
  // null when every configured provider failed (response is the fallback error message).
  provider: text('provider'),
  model: text('model'),
  // JSON array of { provider, model, reason } for every candidate that was tried (or
  // skipped for still being rate-limited) before the one that ultimately served — or
  // before giving up entirely.
  failedAttempts: text('failed_attempts'),
  durationMs: integer('duration_ms').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const chatHistoryRelations = relations(chatHistory, ({ one }) => ({
  user: one(users, {
    fields: [chatHistory.userId],
    references: [users.id],
  }),
}));
