import { relations } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const metrics = sqliteTable("metrics", {
  id: text("id").primaryKey(),
  pagesParsed: integer("pages_parsed").notNull().default(0),
  pagesRemaining: integer("pages_remaining").notNull().default(40),
  chunksGenerated: integer("chunks_generated").notNull().default(0),
  chunksRemaining: integer("chunks_remaining").notNull().default(40),
  queriesExecuted: integer("queries_executed").notNull().default(0),
  queriesRemaining: integer("queries_remaining").notNull().default(100),
  tokensUsed: integer("tokens_used").notNull().default(0),
  tokensRemaining: integer("tokens_remaining").notNull().default(100),
});

export const llmApiKeys = sqliteTable("llm_api_keys", {
  id: text("id").primaryKey(),
  provider: text("provider", {
    enum: ["gemini", "openAi", "openAiCompatible", "claude", "deepseek", "groq"],
  }).notNull(),
  name: text("name").notNull(),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  expiryDate: integer("expiry_date", { mode: "timestamp_ms" }),
  rateLimitTimestamp: integer("rate_limit_timestamp", { mode: "timestamp_ms" }),
  metricsId: text("metrics_id").references(() => metrics.id, { onDelete: "cascade" }),
});

export const metricsRelations = relations(metrics, ({ many }) => ({
  llmApiKeys: many(llmApiKeys),
}));

export const llmApiKeysRelations = relations(llmApiKeys, ({ one }) => ({
  metrics: one(metrics, {
    fields: [llmApiKeys.metricsId],
    references: [metrics.id],
  }),
}));
