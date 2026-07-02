CREATE TABLE `llm_api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`name` text NOT NULL,
	`encrypted_api_key` text NOT NULL,
	`expiry_date` integer,
	`rate_limit_timestamp` integer,
	`metrics_id` text,
	FOREIGN KEY (`metrics_id`) REFERENCES `metrics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`pages_parsed` integer DEFAULT 0 NOT NULL,
	`pages_remaining` integer DEFAULT 40 NOT NULL,
	`chunks_generated` integer DEFAULT 0 NOT NULL,
	`chunks_remaining` integer DEFAULT 40 NOT NULL,
	`queries_executed` integer DEFAULT 0 NOT NULL,
	`queries_remaining` integer DEFAULT 100 NOT NULL,
	`tokens_used` integer DEFAULT 0 NOT NULL,
	`tokens_remaining` integer DEFAULT 100 NOT NULL
);
