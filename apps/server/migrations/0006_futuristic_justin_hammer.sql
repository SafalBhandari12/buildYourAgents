PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_llm_api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`name` text NOT NULL,
	`model` text NOT NULL,
	`base_url` text,
	`encrypted_api_key` text NOT NULL,
	`expiry_date` integer,
	`rate_limit_timestamp` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_llm_api_keys`("id", "user_id", "provider", "name", "model", "encrypted_api_key", "expiry_date", "rate_limit_timestamp") SELECT "id", "user_id", "provider", "name", '', "encrypted_api_key", "expiry_date", "rate_limit_timestamp" FROM `llm_api_keys` WHERE "user_id" IS NOT NULL;--> statement-breakpoint
DROP TABLE `llm_api_keys`;--> statement-breakpoint
ALTER TABLE `__new_llm_api_keys` RENAME TO `llm_api_keys`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `metrics` ADD `llm_chain_order` text;