ALTER TABLE `metrics` ADD `max_input_tokens` integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE `metrics` ADD `max_output_tokens` integer DEFAULT 500 NOT NULL;