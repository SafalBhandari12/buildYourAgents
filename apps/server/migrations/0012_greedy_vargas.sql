PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`chunks_generated` integer DEFAULT 0 NOT NULL,
	`chunks_remaining` integer DEFAULT 40 NOT NULL,
	`queries_executed` integer DEFAULT 0 NOT NULL,
	`queries_remaining` integer DEFAULT 100 NOT NULL,
	`tokens_used` integer DEFAULT 0 NOT NULL,
	`tokens_remaining` integer DEFAULT 100 NOT NULL,
	`pages_crawled` integer DEFAULT 0 NOT NULL,
	`pages_crawled_remaining` integer DEFAULT 40 NOT NULL,
	`llm_chain_order` text,
	`temperature` real DEFAULT 0.7 NOT NULL,
	`system_prompt` text,
	`max_input_tokens` integer DEFAULT 1000 NOT NULL,
	`max_output_tokens` integer DEFAULT 500 NOT NULL,
	`chunk_size` integer DEFAULT 1200 NOT NULL,
	`chunk_overlap` integer DEFAULT 200 NOT NULL,
	`chunking_strategy` text DEFAULT 'simple' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_metrics`("id", "user_id", "chunks_generated", "chunks_remaining", "queries_executed", "queries_remaining", "tokens_used", "tokens_remaining", "pages_crawled", "pages_crawled_remaining", "llm_chain_order", "temperature", "system_prompt", "max_input_tokens", "max_output_tokens", "chunk_size", "chunk_overlap", "chunking_strategy") SELECT "id", "user_id", "chunks_generated", "chunks_remaining", "queries_executed", "queries_remaining", "tokens_used", "tokens_remaining", "pages_crawled", "pages_crawled_remaining", "llm_chain_order", "temperature", "system_prompt", "max_input_tokens", "max_output_tokens", "chunk_size", "chunk_overlap", "chunking_strategy" FROM `metrics`;--> statement-breakpoint
UPDATE `__new_metrics` SET `chunking_strategy` = 'structured' WHERE `chunking_strategy` = 'markdown';--> statement-breakpoint
UPDATE `__new_metrics` SET `chunking_strategy` = 'simple' WHERE `chunking_strategy` = 'recursive';--> statement-breakpoint
DROP TABLE `metrics`;--> statement-breakpoint
ALTER TABLE `__new_metrics` RENAME TO `metrics`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `metrics_user_id_unique` ON `metrics` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `metrics_user_id_idx` ON `metrics` (`user_id`);